/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useImageUpload } from "@/hooks/useImageUpload";

// vscodeモジュールをモック
vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

// FileReaderのモック状態を管理するオブジェクト
const mockState = {
  triggerError: false,
  lastInstance: null as {
    onload: ((event: ProgressEvent<FileReader>) => void) | null;
    onerror: (() => void) | null;
    result: string | null;
  } | null,
};

// FileReaderをモック
class MockFileReader {
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;

  constructor() {
    mockState.lastInstance = this;
  }

  readAsDataURL(_file: Blob): void {
    if (mockState.triggerError) {
      // エラーを発生させる
      void Promise.resolve().then(() => {
        if (this.onerror) {
          this.onerror();
        }
      });
    } else {
      // 成功時の動作
      this.result = "data:image/png;base64,dGVzdA==";
      void Promise.resolve().then(() => {
        if (this.onload) {
          this.onload({} as ProgressEvent<FileReader>);
        }
      });
    }
  }
}

describe("useImageUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.triggerError = false;
    mockState.lastInstance = null;
    // 毎回FileReaderをスタブし直す
    vi.stubGlobal("FileReader", MockFileReader);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("handleImageUploadResultが成功時にコールバックを呼び出すこと", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useImageUpload("https://example.com/webview"));

    // アップロード関数を取得してコールバックを登録
    const uploadFn = result.current.createUploadImage();

    // Promiseを作成してコールバックが登録されるのを待つ
    const mockFile = new File(["test"], "test.png", { type: "image/png" });

    // アップロードを開始
    const uploadPromise = uploadFn(mockFile);

    // FileReaderのonloadが実行されてpostMessageが呼ばれるのを待つ
    await vi.waitFor(() => {
      expect(vscode.postMessage).toHaveBeenCalled();
    });

    // handleImageUploadResultを呼び出す
    act(() => {
      result.current.handleImageUploadResult({
        type: "saveImageResult",
        payload: {
          success: true,
          localPath: "images/test.png",
        },
      });
    });

    await expect(uploadPromise).resolves.toBe("https://example.com/webview/images/test.png");
  });

  it("handleImageUploadResultが失敗時にrejectすること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useImageUpload("https://example.com/webview"));

    const uploadFn = result.current.createUploadImage();
    const mockFile = new File(["test"], "test.png", { type: "image/png" });

    const uploadPromise = uploadFn(mockFile);

    // FileReaderのonloadが実行されてpostMessageが呼ばれるのを待つ
    await vi.waitFor(() => {
      expect(vscode.postMessage).toHaveBeenCalled();
    });

    act(() => {
      result.current.handleImageUploadResult({
        type: "saveImageResult",
        payload: {
          success: false,
          error: "Upload failed",
        },
      });
    });

    await expect(uploadPromise).rejects.toThrow("Failed to save image");
  });

  it("createUploadImageがpostMessageを呼び出すこと", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useImageUpload("https://example.com/webview"));

    const uploadFn = result.current.createUploadImage();
    const mockFile = new File(["test"], "test.png", { type: "image/png" });

    void uploadFn(mockFile);

    // FileReaderのonloadが実行されてpostMessageが呼ばれるのを待つ
    await vi.waitFor(() => {
      expect(vscode.postMessage).toHaveBeenCalled();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "saveImage",
        payload: expect.objectContaining({
          imageData: "data:image/png;base64,dGVzdA==",
          fileName: "test.png",
          mimeType: "image/png",
        }),
      })
    );

    // テスト後にコールバックをクリーンアップ（handleImageUploadResultを呼ぶ）
    act(() => {
      result.current.handleImageUploadResult({
        type: "saveImageResult",
        payload: {
          success: true,
          localPath: "dummy.png",
        },
      });
    });
  });

  it("baseUriが空の場合、相対パスがそのまま返されること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useImageUpload(""));

    const uploadFn = result.current.createUploadImage();
    const mockFile = new File(["test"], "test.png", { type: "image/png" });

    const uploadPromise = uploadFn(mockFile);

    // FileReaderのonloadが実行されてpostMessageが呼ばれるのを待つ
    await vi.waitFor(() => {
      expect(vscode.postMessage).toHaveBeenCalled();
    });

    act(() => {
      result.current.handleImageUploadResult({
        type: "saveImageResult",
        payload: {
          success: true,
          localPath: "images/test.png",
        },
      });
    });

    await expect(uploadPromise).resolves.toBe("images/test.png");
  });

  // 注意: このテストはモジュールレベルのimageUploadCallbacksマップに
  // コールバックを残すため、他のテストに影響を与える可能性がある。
  // そのため最後に実行する。
  it("FileReaderのエラー時にrejectすること", async () => {
    // エラーを発生させるフラグを設定
    mockState.triggerError = true;

    const { result } = renderHook(() => useImageUpload("https://example.com/webview"));

    const uploadFn = result.current.createUploadImage();
    const mockFile = new File(["test"], "test.png", { type: "image/png" });

    const uploadPromise = uploadFn(mockFile);

    await expect(uploadPromise).rejects.toThrow("Failed to read image file");
  });

  it("handleImageUploadResultが安定した参照を持つこと", () => {
    const { result, rerender } = renderHook(() => useImageUpload("https://example.com"));

    const firstRef = result.current.handleImageUploadResult;
    rerender();
    const secondRef = result.current.handleImageUploadResult;

    expect(firstRef).toBe(secondRef);
  });

  it("createUploadImageが安定した参照を持つこと", () => {
    const { result, rerender } = renderHook(() => useImageUpload("https://example.com"));

    const firstRef = result.current.createUploadImage;
    rerender();
    const secondRef = result.current.createUploadImage;

    expect(firstRef).toBe(secondRef);
  });
});
