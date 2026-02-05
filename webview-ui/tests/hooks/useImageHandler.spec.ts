import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useImageHandler } from "@/hooks/useImageHandler";
import * as vscodeModule from "@/utilities/vscode";

// vscodeモジュールをモック
vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

// モックの参照を取得（vscodeオブジェクトを経由してアクセス）
// eslint-disable-next-line @typescript-eslint/unbound-method
const getMockPostMessage = () => vi.mocked(vscodeModule.vscode.postMessage);

// jsdomにClipboardEventがないため、カスタムイベントを作成するヘルパー
function createPasteEvent(items: { type: string; getAsFile: () => File | null }[]) {
  const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & {
    clipboardData: { items: typeof items };
  };
  Object.defineProperty(event, "clipboardData", {
    value: { items },
    writable: false,
  });
  return event;
}

// jsdomにDragEventがないため、カスタムイベントを作成するヘルパー
function createDragEvent(type: string, dataTransferTypes: string[]) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    dataTransfer: { types: string[] };
  };
  Object.defineProperty(event, "dataTransfer", {
    value: { types: dataTransferTypes },
    writable: false,
  });
  return event;
}

describe("useImageHandler", () => {
  let mockOnImageInserted: (markdownImage: string) => void;

  beforeEach(() => {
    mockOnImageInserted = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("初期化", () => {
    it("初期状態でisPendingがfalseであること", () => {
      const { result } = renderHook(() =>
        useImageHandler({ onImageInserted: mockOnImageInserted })
      );

      expect(result.current.isPending).toBe(false);
    });

    it("enabledがfalseの場合でもフックが正常に初期化されること", () => {
      const { result } = renderHook(() =>
        useImageHandler({ onImageInserted: mockOnImageInserted, enabled: false })
      );

      expect(result.current.isPending).toBe(false);
    });
  });

  describe("ペーストイベント", () => {
    it("画像のペーストイベントでイベントがキャプチャされること", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      renderHook(() => useImageHandler({ onImageInserted: mockOnImageInserted }));

      // pasteイベントリスナーがキャプチャフェーズで登録されていることを確認
      expect(addEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function), true);

      addEventListenerSpy.mockRestore();
    });

    it("enabledがfalseの場合はペーストイベントを処理しないこと", () => {
      renderHook(() => useImageHandler({ onImageInserted: mockOnImageInserted, enabled: false }));

      const mockItem = {
        type: "image/png",
        getAsFile: () => new File([""], "test.png", { type: "image/png" }),
      };

      const clipboardEvent = createPasteEvent([mockItem]);

      act(() => {
        document.dispatchEvent(clipboardEvent);
      });

      expect(getMockPostMessage()).not.toHaveBeenCalled();
    });

    it("画像以外のペーストイベントは処理しないこと", () => {
      renderHook(() => useImageHandler({ onImageInserted: mockOnImageInserted }));

      const mockItem = {
        type: "text/plain",
        getAsFile: () => null,
      };

      const clipboardEvent = createPasteEvent([mockItem]);

      act(() => {
        document.dispatchEvent(clipboardEvent);
      });

      expect(getMockPostMessage()).not.toHaveBeenCalled();
    });
  });

  describe("メッセージ受信", () => {
    it("saveImageResultメッセージで成功時にonImageInsertedが呼ばれること", () => {
      renderHook(() => useImageHandler({ onImageInserted: mockOnImageInserted }));

      const messageEvent = new MessageEvent("message", {
        data: {
          type: "saveImageResult",
          payload: {
            success: true,
            markdownImage: "![image](./images/test.png)",
          },
        },
      });

      act(() => {
        window.dispatchEvent(messageEvent);
      });

      expect(mockOnImageInserted).toHaveBeenCalledWith("![image](./images/test.png)");
    });

    it("saveImageResultメッセージでエラー時はonImageInsertedが呼ばれないこと", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(() => useImageHandler({ onImageInserted: mockOnImageInserted }));

      const messageEvent = new MessageEvent("message", {
        data: {
          type: "saveImageResult",
          payload: {
            success: false,
            error: "Failed to save image",
          },
        },
      });

      act(() => {
        window.dispatchEvent(messageEvent);
      });

      expect(mockOnImageInserted).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to save image:", "Failed to save image");

      consoleErrorSpy.mockRestore();
    });

    it("他のタイプのメッセージは無視されること", () => {
      renderHook(() => useImageHandler({ onImageInserted: mockOnImageInserted }));

      const messageEvent = new MessageEvent("message", {
        data: {
          type: "update",
          payload: { text: "some text" },
        },
      });

      act(() => {
        window.dispatchEvent(messageEvent);
      });

      expect(mockOnImageInserted).not.toHaveBeenCalled();
    });
  });

  describe("ドラッグ&ドロップ", () => {
    it("dragoverイベントでファイルがある場合はpreventDefaultが呼ばれること", () => {
      renderHook(() => useImageHandler({ onImageInserted: mockOnImageInserted }));

      const dragEvent = createDragEvent("dragover", ["Files"]);
      const preventDefaultSpy = vi.spyOn(dragEvent, "preventDefault");

      act(() => {
        document.dispatchEvent(dragEvent);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("enabledがfalseの場合はdragoverイベントを処理しないこと", () => {
      renderHook(() => useImageHandler({ onImageInserted: mockOnImageInserted, enabled: false }));

      const dragEvent = createDragEvent("dragover", ["Files"]);
      const preventDefaultSpy = vi.spyOn(dragEvent, "preventDefault");

      act(() => {
        document.dispatchEvent(dragEvent);
      });

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にイベントリスナーが削除されること", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      const { unmount } = renderHook(() =>
        useImageHandler({ onImageInserted: mockOnImageInserted })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith("drop", expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith("dragover", expect.any(Function), true);

      removeEventListenerSpy.mockRestore();
    });

    it("windowのメッセージリスナーもアンマウント時に削除されること", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() =>
        useImageHandler({ onImageInserted: mockOnImageInserted })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("message", expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("enabled切り替え", () => {
    it("enabledがtrueからfalseに変更されたときにイベントリスナーが削除されること", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      const { rerender } = renderHook(
        ({ enabled }) => useImageHandler({ onImageInserted: mockOnImageInserted, enabled }),
        { initialProps: { enabled: true } }
      );

      rerender({ enabled: false });

      expect(removeEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith("drop", expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith("dragover", expect.any(Function), true);

      removeEventListenerSpy.mockRestore();
    });
  });
});
