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

  it("handleApplyがpostMessageを呼び出すこと", async () => {
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

  it("handleApplyで<br>タグが改行に変換されること", async () => {
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

  it("handleApplyで&nbsp;がスペースに変換されること", async () => {
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

  it("handleApplyでノーブレークスペースが通常スペースに変換されること", async () => {
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
});
