/* eslint-disable @typescript-eslint/unbound-method */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useMarkdownSync } from "@/hooks/useMarkdownSync";

// vscodeモジュールをモック
vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

describe("useMarkdownSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態で空のMarkdownが設定されること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    expect(result.current.markdown).toBe("");
  });

  it("setMarkdownでMarkdownを更新できること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.setMarkdown("# Hello World");
    });

    expect(result.current.markdown).toBe("# Hello World");
  });

  it("updateMarkdownFromExtensionでMarkdownを更新できること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.updateMarkdownFromExtension("# Test Content");
    });

    expect(result.current.markdown).toBe("# Test Content");
  });

  it("updateMarkdownFromExtensionでisInitがtrueの場合、改行コードが検出されること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.updateMarkdownFromExtension("Line1\r\nLine2", true);
    });

    expect(result.current.originalLineEndingRef.current).toBe("\r\n");
  });

  it("LFのみの場合、originalLineEndingRefがLFになること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.updateMarkdownFromExtension("Line1\nLine2", true);
    });

    expect(result.current.originalLineEndingRef.current).toBe("\n");
  });

  // baseline未設定時のhandleApplyは従来フロー（revert→cleanupMarkdown）にフォールバックする
  it("baseline未設定時、handleApplyがpostMessageを呼び出すこと", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.setMarkdown("# Test");
    });

    act(() => {
      result.current.handleApply();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "save",
      payload: "# Test",
    });
  });

  it("baseline未設定時、handleApplyで<br>タグが改行に変換されること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.setMarkdown("Line1<br>Line2");
    });

    act(() => {
      result.current.handleApply();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "save",
      payload: "Line1\nLine2",
    });
  });

  it("baseline未設定時、handleApplyで&nbsp;がスペースに変換されること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.setMarkdown("Hello&nbsp;World");
    });

    act(() => {
      result.current.handleApply();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "save",
      payload: "Hello World",
    });
  });

  it("baseline未設定時、handleApplyでノーブレークスペースが通常スペースに変換されること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.setMarkdown("Hello\u00A0World");
    });

    act(() => {
      result.current.handleApply();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "save",
      payload: "Hello World",
    });
  });

  it("handleImageInsertedで画像がMarkdownに追加されること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.setMarkdown("# Title\n");
    });

    act(() => {
      result.current.handleImageInserted("![image](path/to/image.png)");
    });

    expect(result.current.markdown).toBe("# Title\n![image](path/to/image.png)\n");
  });

  it("handleImageInsertedで末尾に改行がない場合、改行が追加されること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    act(() => {
      result.current.setMarkdown("# Title");
    });

    act(() => {
      result.current.handleImageInserted("![image](path/to/image.png)");
    });

    expect(result.current.markdown).toBe("# Title\n![image](path/to/image.png)\n");
  });

  it("baseUriRefとdocumentDirRefが初期化されること", () => {
    const { result } = renderHook(() => useMarkdownSync());

    expect(result.current.baseUriRef.current).toBe("");
    expect(result.current.documentDirRef.current).toBe("");
  });

  describe("3-wayマージ保存（baseline設定後のhandleApply）", () => {
    it("未編集行の正規化差分が保存されないこと", async () => {
      const { vscode } = await import("@/utilities/vscode");
      const { result } = renderHook(() => useMarkdownSync());

      // 拡張機能から元テキストを受信（`*`箇条書き）
      act(() => {
        result.current.updateMarkdownFromExtension("* item1\n* item2\n", true);
      });
      // エディタのラウンドトリップ結果（`-`箇条書きへ正規化）
      act(() => {
        result.current.handleBaselineLoaded("- item1\n- item2\n");
      });
      // ユーザーがitem2のみ編集
      act(() => {
        result.current.setMarkdown("- item1\n- item2 edited\n");
      });

      act(() => {
        result.current.handleApply();
      });

      // 未編集のitem1行は元の`* `のまま、編集行のみエディタ出力で置き換わる
      expect(vscode.postMessage).toHaveBeenCalledWith({
        type: "save",
        payload: "* item1\n- item2 edited\n",
      });
    });

    it("空行挿入の正規化があっても未編集のitem1行が`* `のまま保存されること", async () => {
      const { vscode } = await import("@/utilities/vscode");
      const { result } = renderHook(() => useMarkdownSync());

      act(() => {
        result.current.updateMarkdownFromExtension("* item1\n* item2\n", true);
      });
      // ラウンドトリップで空行が挿入されるケース
      act(() => {
        result.current.handleBaselineLoaded("- item1\n\n- item2\n");
      });
      act(() => {
        result.current.setMarkdown("- item1\n\n- item2 edited\n");
      });

      act(() => {
        result.current.handleApply();
      });

      const [message] = vi.mocked(vscode.postMessage).mock.calls[0] as [
        { type: string; payload: string },
      ];
      expect(message.type).toBe("save");
      // 未編集のitem1行は正規化されず元の記号のまま
      expect(message.payload.split("\n")[0]).toBe("* item1");
      expect(message.payload).toContain("- item2 edited");
    });

    it("編集なしの場合、payloadがoriginalと完全一致すること", async () => {
      const { vscode } = await import("@/utilities/vscode");
      const { result } = renderHook(() => useMarkdownSync());

      act(() => {
        result.current.updateMarkdownFromExtension("* item1\n* item2\n", true);
      });
      act(() => {
        result.current.handleBaselineLoaded("- item1\n\n- item2\n");
      });
      // エディタの出力はbaselineと同一（＝ユーザー編集なし）
      act(() => {
        result.current.setMarkdown("- item1\n\n- item2\n");
      });

      act(() => {
        result.current.handleApply();
      });

      expect(vscode.postMessage).toHaveBeenCalledWith({
        type: "save",
        payload: "* item1\n* item2\n",
      });
    });

    it("CRLF文書の場合、3-wayマージ保存のpayloadがCRLFになること", async () => {
      const { vscode } = await import("@/utilities/vscode");
      const { result } = renderHook(() => useMarkdownSync());

      act(() => {
        result.current.updateMarkdownFromExtension("* item1\r\n* item2\r\n", true);
      });
      act(() => {
        result.current.handleBaselineLoaded("- item1\n- item2\n");
      });
      act(() => {
        result.current.setMarkdown("- item1\n- item2 edited\n");
      });

      act(() => {
        result.current.handleApply();
      });

      expect(vscode.postMessage).toHaveBeenCalledWith({
        type: "save",
        payload: "* item1\r\n- item2 edited\r\n",
      });
    });
  });

  describe("保存エコーの吸収", () => {
    // 3-wayマージ保存後の状態を作る共通セットアップ
    function setupAfterMergeSave(result: { current: ReturnType<typeof useMarkdownSync> }): string {
      act(() => {
        result.current.updateMarkdownFromExtension("* item1\n* item2\n", true);
      });
      act(() => {
        result.current.handleBaselineLoaded("- item1\n- item2\n");
      });
      act(() => {
        result.current.setMarkdown("- item1\n- item2 edited\n");
      });
      act(() => {
        result.current.handleApply();
      });
      // 保存されたテキストのWebView表現（LF）
      return "* item1\n- item2 edited\n";
    }

    it("保存後に同じテキストを受信してもmarkdown stateが変わらないこと", () => {
      const { result } = renderHook(() => useMarkdownSync());
      const savedText = setupAfterMergeSave(result);

      // 拡張機能からのエコー（保存したテキストと同一）を受信
      act(() => {
        result.current.updateMarkdownFromExtension(savedText);
      });

      // エディタのreplaceAllを誘発しないよう、markdownは編集中の内容のまま
      expect(result.current.markdown).toBe("- item1\n- item2 edited\n");
    });

    it("エコー吸収後に再度handleApplyしても同じpayloadが保存されること（冪等）", async () => {
      const { vscode } = await import("@/utilities/vscode");
      const { result } = renderHook(() => useMarkdownSync());
      const savedText = setupAfterMergeSave(result);

      act(() => {
        result.current.updateMarkdownFromExtension(savedText);
      });
      vi.mocked(vscode.postMessage).mockClear();

      act(() => {
        result.current.handleApply();
      });

      expect(vscode.postMessage).toHaveBeenCalledWith({
        type: "save",
        payload: savedText,
      });
    });

    it("エコー吸収後、異なるテキスト（外部変更）を受信したらmarkdown stateが更新されること", () => {
      const { result } = renderHook(() => useMarkdownSync());
      const savedText = setupAfterMergeSave(result);

      // エコーを吸収
      act(() => {
        result.current.updateMarkdownFromExtension(savedText);
      });
      // 外部変更（保存したテキストと異なる）を受信
      act(() => {
        result.current.updateMarkdownFromExtension("external change\n");
      });

      expect(result.current.markdown).toBe("external change\n");
    });
  });
});
