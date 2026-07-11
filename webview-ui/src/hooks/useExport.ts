import {
  ExportBlogHtmlMessage,
  ExportHtmlMessage,
  ExportPdfMessage,
  MermaidImagePayload,
  ThemeSetting,
} from "@message/messageTypeToExtention";
import { useCallback, useMemo, useRef } from "react";
import { ContextMenuItem } from "../components/ContextMenu";
import type { ThemeKind } from "../constants/themeColors";
import { resolveExportTheme } from "../utilities/exportTheme";
import { extractMermaidBlocks } from "../utilities/extractMermaidBlocks";
import { renderMermaidToPng } from "../utilities/mermaidToPng";
import { vscode } from "../utilities/vscode";

interface UseExportParams {
  markdown: string;
  themeSetting: ThemeSetting;
  theme: ThemeKind;
}

interface UseExportResult {
  handleExportHtml: () => Promise<void>;
  handleExportPdf: () => void;
  handleExportBlogHtml: () => Promise<void>;
  contextMenuItems: ContextMenuItem[];
}

/**
 * 現在のmarkdownからMermaidブロックを抽出し、エクスポートテーマでPNG化する。
 * 失敗（null）したブロックは除外し、レンダリング成功分のみを返す。
 * Mermaidの並行レンダリングは避け、順次（for...of await）処理する。
 */
async function collectMermaidImages(
  markdown: string,
  themeSetting: ThemeSetting,
  theme: ThemeKind
): Promise<MermaidImagePayload[]> {
  const blocks = extractMermaidBlocks(markdown);
  if (blocks.length === 0) {
    return [];
  }

  const exportTheme = resolveExportTheme(themeSetting, theme);
  const mermaidImages: MermaidImagePayload[] = [];
  for (const code of blocks) {
    const dataUri = await renderMermaidToPng(code, exportTheme);
    if (dataUri !== null) {
      mermaidImages.push({ code, dataUri });
    }
  }
  return mermaidImages;
}

/**
 * エクスポート機能のカスタムフック
 *
 * 引数の`markdown`/`themeSetting`/`theme`は各レンダーで最新値をrefへ反映する。
 * ハンドラは`useCallback([])`で安定した参照を保ち、実行時にrefから最新値を読む。
 */
export function useExport({ markdown, themeSetting, theme }: UseExportParams): UseExportResult {
  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;
  const themeSettingRef = useRef(themeSetting);
  themeSettingRef.current = themeSetting;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const handleExportHtml = useCallback(async () => {
    const mermaidImages = await collectMermaidImages(
      markdownRef.current,
      themeSettingRef.current,
      themeRef.current
    );

    if (mermaidImages.length === 0) {
      vscode.postMessage({
        type: "exportHtml",
      } satisfies ExportHtmlMessage);
      return;
    }

    vscode.postMessage({
      type: "exportHtml",
      payload: { mermaidImages },
    } satisfies ExportHtmlMessage);
  }, []);

  const handleExportPdf = useCallback(() => {
    vscode.postMessage({
      type: "exportPdf",
    } satisfies ExportPdfMessage);
  }, []);

  const handleExportBlogHtml = useCallback(async () => {
    const mermaidImages = await collectMermaidImages(
      markdownRef.current,
      themeSettingRef.current,
      themeRef.current
    );

    if (mermaidImages.length === 0) {
      vscode.postMessage({
        type: "exportBlogHtml",
      } satisfies ExportBlogHtmlMessage);
      return;
    }

    vscode.postMessage({
      type: "exportBlogHtml",
      payload: { mermaidImages },
    } satisfies ExportBlogHtmlMessage);
  }, []);

  const contextMenuItems: ContextMenuItem[] = useMemo(
    () => [
      {
        label: "HTMLとしてエクスポート",
        onClick: () => {
          void handleExportHtml();
        },
      },
      {
        label: "ブログ用HTMLとしてエクスポート",
        onClick: () => {
          void handleExportBlogHtml();
        },
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
