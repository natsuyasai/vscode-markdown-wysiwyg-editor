import { ExportHtmlMessage, ExportPdfMessage } from "@message/messageTypeToExtention";
import { useCallback, useMemo } from "react";
import { ContextMenuItem } from "../components/ContextMenu";
import { vscode } from "../utilities/vscode";

interface UseExportResult {
  handleExportHtml: () => void;
  handleExportPdf: () => void;
  contextMenuItems: ContextMenuItem[];
}

/**
 * エクスポート機能のカスタムフック
 */
export function useExport(): UseExportResult {
  const handleExportHtml = useCallback(() => {
    vscode.postMessage({
      type: "exportHtml",
    } satisfies ExportHtmlMessage);
  }, []);

  const handleExportPdf = useCallback(() => {
    vscode.postMessage({
      type: "exportPdf",
    } satisfies ExportPdfMessage);
  }, []);

  const contextMenuItems: ContextMenuItem[] = useMemo(
    () => [
      {
        label: "HTMLとしてエクスポート",
        onClick: handleExportHtml,
      },
      {
        label: "PDFとしてエクスポート",
        onClick: handleExportPdf,
      },
    ],
    [handleExportHtml, handleExportPdf]
  );

  return {
    handleExportHtml,
    handleExportPdf,
    contextMenuItems,
  };
}
