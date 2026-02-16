import {
  ExportBlogHtmlMessage,
  ExportHtmlMessage,
  ExportPdfMessage,
} from "@message/messageTypeToExtention";
import { useCallback, useMemo } from "react";
import { ContextMenuItem } from "../components/ContextMenu";
import { vscode } from "../utilities/vscode";

interface UseExportResult {
  handleExportHtml: () => void;
  handleExportPdf: () => void;
  handleExportBlogHtml: () => void;
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

  const handleExportBlogHtml = useCallback(() => {
    vscode.postMessage({
      type: "exportBlogHtml",
    } satisfies ExportBlogHtmlMessage);
  }, []);

  const contextMenuItems: ContextMenuItem[] = useMemo(
    () => [
      {
        label: "HTMLとしてエクスポート",
        onClick: handleExportHtml,
      },
      {
        label: "ブログ用HTMLとしてエクスポート",
        onClick: handleExportBlogHtml,
      },
      {
        label: "PDFとしてエクスポート",
        onClick: handleExportPdf,
      },
    ],
    [handleExportHtml, handleExportBlogHtml, handleExportPdf]
  );

  return {
    handleExportHtml,
    handleExportPdf,
    handleExportBlogHtml,
    contextMenuItems,
  };
}
