import { ExportDiagramImages, ThemeSetting } from "@message/messageTypeToExtention";
import { useCallback, useMemo, useRef } from "react";
import { ContextMenuItem } from "../components/ContextMenu";
import type { ThemeKind } from "../constants/themeColors";
import { resolveExportTheme } from "../utilities/exportTheme";
import { extractMermaidBlocks } from "../utilities/extractMermaidBlocks";
import { extractPlantUmlBlocks } from "../utilities/extractPlantUmlBlocks";
import { renderMermaidToPng } from "../utilities/mermaidToPng";
import { renderPlantUmlToPng } from "../utilities/plantUmlToPng";
import { vscode } from "../utilities/vscode";

interface UseExportParams {
  markdown: string;
  themeSetting: ThemeSetting;
  theme: ThemeKind;
}

interface UseExportResult {
  handleExportHtml: () => Promise<void>;
  handleExportPdf: () => Promise<void>;
  handleExportBlogHtml: () => Promise<void>;
  contextMenuItems: ContextMenuItem[];
}

type ExportMessageType = "exportHtml" | "exportBlogHtml" | "exportPdf";

/**
 * 図のコードを順次（for...of await）画像化する。
 * 失敗（null）したブロックは除外し、レンダリング成功分のみを返す。
 * 図の並行レンダリングは避ける。
 */
async function renderBlocks(
  blocks: string[],
  render: (code: string) => Promise<string | null>
): Promise<Array<{ code: string; dataUri: string }>> {
  const images: Array<{ code: string; dataUri: string }> = [];
  for (const code of blocks) {
    const dataUri = await render(code);
    if (dataUri !== null) {
      images.push({ code, dataUri });
    }
  }
  return images;
}

/**
 * 現在のmarkdownからMermaid / PlantUMLのブロックを抽出し、PNG化する。
 * Mermaidはエクスポートテーマで描画する。画像化できた図が無い種類のキーは含めない。
 */
async function collectDiagramImages(
  markdown: string,
  themeSetting: ThemeSetting,
  theme: ThemeKind
): Promise<ExportDiagramImages> {
  const exportTheme = resolveExportTheme(themeSetting, theme);
  const mermaidImages = await renderBlocks(extractMermaidBlocks(markdown), (code) =>
    renderMermaidToPng(code, exportTheme)
  );
  const plantUmlImages = await renderBlocks(extractPlantUmlBlocks(markdown), (code) =>
    renderPlantUmlToPng(code)
  );

  const images: ExportDiagramImages = {};
  if (mermaidImages.length > 0) {
    images.mermaidImages = mermaidImages;
  }
  if (plantUmlImages.length > 0) {
    images.plantUmlImages = plantUmlImages;
  }
  return images;
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

  const exportWithDiagrams = useCallback(async (type: ExportMessageType) => {
    const images = await collectDiagramImages(
      markdownRef.current,
      themeSettingRef.current,
      themeRef.current
    );

    if (Object.keys(images).length === 0) {
      vscode.postMessage({ type });
      return;
    }

    vscode.postMessage({ type, payload: images });
  }, []);

  const handleExportHtml = useCallback(
    () => exportWithDiagrams("exportHtml"),
    [exportWithDiagrams]
  );
  const handleExportPdf = useCallback(() => exportWithDiagrams("exportPdf"), [exportWithDiagrams]);
  const handleExportBlogHtml = useCallback(
    () => exportWithDiagrams("exportBlogHtml"),
    [exportWithDiagrams]
  );

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
        onClick: () => {
          void handleExportPdf();
        },
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
