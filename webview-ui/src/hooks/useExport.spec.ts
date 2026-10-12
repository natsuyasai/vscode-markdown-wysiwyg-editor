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

// plantUmlToPngをモック（拡張機能への描画要求は行わない）
vi.mock("@/utilities/plantUmlToPng", () => ({
  renderPlantUmlToPng: vi.fn(),
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

  it("handleExportPdfがpostMessageを呼び出すこと（Mermaidを含まない場合はpayload無し）", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() =>
      useExport({ markdown: NO_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    await act(async () => {
      await result.current.handleExportPdf();
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

    await act(async () => {
      result.current.contextMenuItems[2].onClick();
      await Promise.resolve();
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

  it("Mermaidブロックを含む場合、handleExportPdfはmermaidImages付きでpostMessageすること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { renderMermaidToPng } = await import("@/utilities/mermaidToPng");
    vi.mocked(renderMermaidToPng).mockResolvedValue("data:image/png;base64,PPP");

    const { result } = renderHook(() =>
      useExport({ markdown: SINGLE_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    await act(async () => {
      await result.current.handleExportPdf();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportPdf",
      payload: {
        mermaidImages: [{ code: "graph TD;A-->B;", dataUri: "data:image/png;base64,PPP" }],
      },
    });
  });

  it("Mermaidブロックが全て失敗した場合、handleExportPdfはpayload無しでpostMessageすること", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { renderMermaidToPng } = await import("@/utilities/mermaidToPng");
    vi.mocked(renderMermaidToPng).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useExport({ markdown: SINGLE_MERMAID_MARKDOWN, themeSetting: "auto", theme: "light" })
    );

    await act(async () => {
      await result.current.handleExportPdf();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportPdf",
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

  describe("PlantUMLの画像化", () => {
    const PLANTUML_CODE = "@startuml\nA -> B\n@enduml";
    const PLANTUML_MARKDOWN = ["# タイトル", "", "```plantuml", PLANTUML_CODE, "```", ""].join(
      "\n"
    );
    const MIXED_MARKDOWN = [PLANTUML_MARKDOWN, "```mermaid", "graph TD;A-->B;", "```", ""].join(
      "\n"
    );

    it.each([
      ["handleExportHtml", "exportHtml"],
      ["handleExportBlogHtml", "exportBlogHtml"],
      ["handleExportPdf", "exportPdf"],
    ] as const)("%sがPlantUMLの画像をplantUmlImagesとして送ること", async (handler, type) => {
      const { vscode } = await import("@/utilities/vscode");
      const { renderPlantUmlToPng } = await import("@/utilities/plantUmlToPng");
      vi.mocked(renderPlantUmlToPng).mockResolvedValue("data:image/png;base64,PUML");
      const { result } = renderHook(() =>
        useExport({ markdown: PLANTUML_MARKDOWN, themeSetting: "auto", theme: "light" })
      );

      await act(async () => {
        await result.current[handler]();
      });

      expect(renderPlantUmlToPng).toHaveBeenCalledWith(PLANTUML_CODE);
      expect(vscode.postMessage).toHaveBeenCalledWith({
        type,
        payload: {
          plantUmlImages: [{ code: PLANTUML_CODE, dataUri: "data:image/png;base64,PUML" }],
        },
      });
    });

    it("MermaidとPlantUMLが混在する場合は両方を送ること", async () => {
      const { vscode } = await import("@/utilities/vscode");
      const { renderMermaidToPng } = await import("@/utilities/mermaidToPng");
      const { renderPlantUmlToPng } = await import("@/utilities/plantUmlToPng");
      vi.mocked(renderMermaidToPng).mockResolvedValue("data:image/png;base64,MMD");
      vi.mocked(renderPlantUmlToPng).mockResolvedValue("data:image/png;base64,PUML");
      const { result } = renderHook(() =>
        useExport({ markdown: MIXED_MARKDOWN, themeSetting: "auto", theme: "light" })
      );

      await act(async () => {
        await result.current.handleExportHtml();
      });

      expect(vscode.postMessage).toHaveBeenCalledWith({
        type: "exportHtml",
        payload: {
          mermaidImages: [{ code: "graph TD;A-->B;", dataUri: "data:image/png;base64,MMD" }],
          plantUmlImages: [{ code: PLANTUML_CODE, dataUri: "data:image/png;base64,PUML" }],
        },
      });
    });

    it("PlantUMLの画像化に失敗したブロックは除外し、全て失敗ならpayload無しで送ること", async () => {
      const { vscode } = await import("@/utilities/vscode");
      const { renderPlantUmlToPng } = await import("@/utilities/plantUmlToPng");
      vi.mocked(renderPlantUmlToPng).mockResolvedValue(null);
      const { result } = renderHook(() =>
        useExport({ markdown: PLANTUML_MARKDOWN, themeSetting: "auto", theme: "light" })
      );

      await act(async () => {
        await result.current.handleExportHtml();
      });

      expect(vscode.postMessage).toHaveBeenCalledWith({ type: "exportHtml" });
    });
  });
});
