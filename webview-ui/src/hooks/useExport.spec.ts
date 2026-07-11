/* eslint-disable @typescript-eslint/unbound-method */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useExport } from "@/hooks/useExport";

// vscodeモジュールをモック
vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

// mermaidToPngをモック（実際のcanvas/mermaidレンダリングは行わない）
vi.mock("@/utilities/mermaidToPng", () => ({
  renderMermaidToPng: vi.fn(),
}));

const NO_MERMAID_MARKDOWN = "# タイトル\n\n本文のみでMermaidブロックを含まない\n";

const SINGLE_MERMAID_MARKDOWN = ["# タイトル", "", "```mermaid", "graph TD;A-->B;", "```", ""].join(
  "\n"
);

const MULTI_MERMAID_MARKDOWN = [
  "# タイトル",
  "",
  "```mermaid",
  "graph TD;A-->B;",
  "```",
  "",
  "```mermaid",
  "graph TD;C-->D;",
  "```",
  "",
].join("\n");

describe("useExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handleExportHtmlがpostMessageを呼び出すこと（Mermaidを含まない場合はpayload無し）", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() =>
      useExport({ markdown: NO_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    await act(async () => {
      await result.current.handleExportHtml();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportHtml",
    });
  });

  it("handleExportPdfがpostMessageを呼び出すこと", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() =>
      useExport({ markdown: NO_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    act(() => {
      result.current.handleExportPdf();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportPdf",
    });
  });

  it("handleExportBlogHtmlがpostMessageを呼び出すこと（Mermaidを含まない場合はpayload無し）", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() =>
      useExport({ markdown: NO_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    await act(async () => {
      await result.current.handleExportBlogHtml();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportBlogHtml",
    });
  });

  it("contextMenuItemsが正しいアイテムを含むこと", () => {
    const { result } = renderHook(() =>
      useExport({ markdown: NO_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    expect(result.current.contextMenuItems).toHaveLength(3);
    expect(result.current.contextMenuItems[0].label).toBe("HTMLとしてエクスポート");
    expect(result.current.contextMenuItems[1].label).toBe("ブログ用HTMLとしてエクスポート");
    expect(result.current.contextMenuItems[2].label).toBe("PDFとしてエクスポート");
  });

  it("contextMenuItemsのonClickがハンドラを呼び出すこと", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() =>
      useExport({ markdown: NO_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    await act(async () => {
      result.current.contextMenuItems[0].onClick();
      await Promise.resolve();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportHtml",
    });

    vi.clearAllMocks();

    await act(async () => {
      result.current.contextMenuItems[1].onClick();
      await Promise.resolve();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportBlogHtml",
    });

    vi.clearAllMocks();

    act(() => {
      result.current.contextMenuItems[2].onClick();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportPdf",
    });
  });

  it("handleExportHtmlが安定した参照を持つこと", () => {
    const { result, rerender } = renderHook(() =>
      useExport({ markdown: NO_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    const firstRef = result.current.handleExportHtml;
    rerender();
    const secondRef = result.current.handleExportHtml;

    expect(firstRef).toBe(secondRef);
  });

  it("handleExportPdfが安定した参照を持つこと", () => {
    const { result, rerender } = renderHook(() =>
      useExport({ markdown: NO_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    const firstRef = result.current.handleExportPdf;
    rerender();
    const secondRef = result.current.handleExportPdf;

    expect(firstRef).toBe(secondRef);
  });

  it("handleExportBlogHtmlが安定した参照を持つこと", () => {
    const { result, rerender } = renderHook(() =>
      useExport({ markdown: NO_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    const firstRef = result.current.handleExportBlogHtml;
    rerender();
    const secondRef = result.current.handleExportBlogHtml;

    expect(firstRef).toBe(secondRef);
  });

  it("Mermaidブロックを含む場合、handleExportHtmlはmermaidImages付きでpostMessageすること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { renderMermaidToPng } = await import("@/utilities/mermaidToPng");
    vi.mocked(renderMermaidToPng).mockResolvedValue("data:image/png;base64,XXX");

    const { result } = renderHook(() =>
      useExport({ markdown: SINGLE_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    await act(async () => {
      await result.current.handleExportHtml();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportHtml",
      payload: {
        mermaidImages: [{ code: "graph TD;A-->B;", dataUri: "data:image/png;base64,XXX" }],
      },
    });
  });

  it("renderMermaidToPngがnullを返すブロックはmermaidImagesから除外されること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { renderMermaidToPng } = await import("@/utilities/mermaidToPng");
    vi.mocked(renderMermaidToPng)
      .mockResolvedValueOnce("data:image/png;base64,XXX")
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() =>
      useExport({ markdown: MULTI_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    await act(async () => {
      await result.current.handleExportHtml();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportHtml",
      payload: {
        mermaidImages: [{ code: "graph TD;A-->B;", dataUri: "data:image/png;base64,XXX" }],
      },
    });
  });

  it("Mermaidブロックが全て失敗した場合はpayload無しでpostMessageすること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { renderMermaidToPng } = await import("@/utilities/mermaidToPng");
    vi.mocked(renderMermaidToPng).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useExport({ markdown: SINGLE_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    await act(async () => {
      await result.current.handleExportHtml();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportHtml",
    });
  });

  it("Mermaidブロックを含む場合、handleExportBlogHtmlはmermaidImages付きでpostMessageすること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { renderMermaidToPng } = await import("@/utilities/mermaidToPng");
    vi.mocked(renderMermaidToPng).mockResolvedValue("data:image/png;base64,YYY");

    const { result } = renderHook(() =>
      useExport({ markdown: SINGLE_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    await act(async () => {
      await result.current.handleExportBlogHtml();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportBlogHtml",
      payload: {
        mermaidImages: [{ code: "graph TD;A-->B;", dataUri: "data:image/png;base64,YYY" }],
      },
    });
  });

  it("themeSettingが'auto'かつtheme='dark'の場合、renderMermaidToPngが'dark'で呼ばれること", async () => {
    const { renderMermaidToPng } = await import("@/utilities/mermaidToPng");
    vi.mocked(renderMermaidToPng).mockResolvedValue("data:image/png;base64,ZZZ");

    const { result } = renderHook(() =>
      useExport({ markdown: SINGLE_MERMAID_MARKDOWN, themeSetting: "auto", theme: "dark" })
    );

    await act(async () => {
      await result.current.handleExportHtml();
    });

    expect(renderMermaidToPng).toHaveBeenCalledWith("graph TD;A-->B;", "dark");
  });
});
