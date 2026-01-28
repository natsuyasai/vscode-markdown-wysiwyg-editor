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

describe("useExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handleExportHtmlがpostMessageを呼び出すこと", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.handleExportHtml();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportHtml",
    });
  });

  it("handleExportPdfがpostMessageを呼び出すこと", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.handleExportPdf();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportPdf",
    });
  });

  it("contextMenuItemsが正しいアイテムを含むこと", () => {
    const { result } = renderHook(() => useExport());

    expect(result.current.contextMenuItems).toHaveLength(2);
    expect(result.current.contextMenuItems[0].label).toBe("HTMLとしてエクスポート");
    expect(result.current.contextMenuItems[1].label).toBe("PDFとしてエクスポート");
  });

  it("contextMenuItemsのonClickがハンドラを呼び出すこと", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.contextMenuItems[0].onClick();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportHtml",
    });

    vi.clearAllMocks();

    act(() => {
      result.current.contextMenuItems[1].onClick();
    });

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "exportPdf",
    });
  });

  it("handleExportHtmlが安定した参照を持つこと", () => {
    const { result, rerender } = renderHook(() => useExport());

    const firstRef = result.current.handleExportHtml;
    rerender();
    const secondRef = result.current.handleExportHtml;

    expect(firstRef).toBe(secondRef);
  });

  it("handleExportPdfが安定した参照を持つこと", () => {
    const { result, rerender } = renderHook(() => useExport());

    const firstRef = result.current.handleExportPdf;
    rerender();
    const secondRef = result.current.handleExportPdf;

    expect(firstRef).toBe(secondRef);
  });
});
