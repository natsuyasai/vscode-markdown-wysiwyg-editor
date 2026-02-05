import mermaid from "mermaid";
import {
  getMermaidThemeColors,
  MERMAID_THEME,
  SVG_COLOR_REPLACEMENTS,
  type ThemeKind,
} from "../../constants/themeColors";
import { vscode } from "../../utilities/vscode";

// PlantUML結果のコールバック管理
const plantUmlCallbacks = new Map<string, (result: HTMLElement | null) => void>();

/** ダイアグラムコンテナのスタイル */
const DIAGRAM_CONTAINER_STYLE = "padding: 16px; background: var(--crepe-color-surface);";

/** エラー表示のスタイル */
const ERROR_STYLE = "color: var(--crepe-color-error, red); padding: 8px;";

/**
 * エラー表示用のHTML要素を作成する
 */
function createErrorElement(type: string, message: string): HTMLDivElement {
  const errorDiv = document.createElement("div");
  errorDiv.textContent = `${type} Error: ${message}`;
  errorDiv.style.cssText = ERROR_STYLE;
  return errorDiv;
}

/**
 * ダイアグラムコンテナを作成する
 */
function createDiagramContainer(svgContent: string, additionalStyle = ""): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = svgContent;
  container.style.cssText = DIAGRAM_CONTAINER_STYLE + additionalStyle;
  return container;
}

/**
 * Mermaidプレビューをレンダリングする
 */
export function renderMermaidPreview(
  content: string,
  id: string,
  theme: ThemeKind,
  applyPreview: (result: HTMLElement | null) => void
): void {
  const mermaidTheme = MERMAID_THEME[theme];
  const themeColors = getMermaidThemeColors(theme);

  mermaid.initialize({
    startOnLoad: false,
    theme: mermaidTheme,
    securityLevel: "loose",
    // foreignObjectの代わりにSVGテキスト要素を使用
    // これによりWebView環境でもテキストが正しく表示される
    htmlLabels: false,
    flowchart: {
      htmlLabels: false,
    },
    sequence: {
      actorFontFamily: "inherit",
      messageFontFamily: "inherit",
      noteFontFamily: "inherit",
    },
    themeVariables: themeColors,
  });

  // Mermaid v10+では一時的なコンテナをDOMに追加する必要がある
  const tempContainer = document.createElement("div");
  tempContainer.id = `mermaid-container-${id}`;
  tempContainer.style.cssText = "position: absolute; left: -9999px; visibility: hidden;";
  document.body.appendChild(tempContainer);

  mermaid
    .render(`mermaid-${id}`, content, tempContainer)
    .then(({ svg, bindFunctions }) => {
      // 一時コンテナを削除
      tempContainer.remove();

      // ダークテーマの場合、SVGの文字列を直接置換
      let processedSvg = svg;
      if (theme === "dark") {
        for (const { from, to } of SVG_COLOR_REPLACEMENTS) {
          processedSvg = processedSvg.replace(from, to);
        }
      }

      const container = createDiagramContainer(
        processedSvg,
        " width: 100%; min-width: 100%; overflow-x: auto; box-sizing: border-box;"
      );

      // SVGに適切なスタイルを適用
      const svgElement = container.querySelector("svg");
      if (svgElement) {
        svgElement.style.display = "block";
        svgElement.style.minWidth = "fit-content";
      }

      // インタラクティブな要素のバインド（存在する場合）
      if (bindFunctions) {
        bindFunctions(container);
      }

      applyPreview(container);
    })
    .catch((err: Error) => {
      // 一時コンテナを削除
      tempContainer.remove();
      applyPreview(createErrorElement("Mermaid", err.message));
    });
}

/**
 * PlantUMLプレビューのコールバックを登録する
 */
export function registerPlantUmlCallback(
  requestId: string,
  callback: (result: HTMLElement | null) => void
): void {
  plantUmlCallbacks.set(requestId, callback);
}

/**
 * PlantUMLプレビューをレンダリングする（Extension経由）
 */
export function renderPlantUmlPreview(
  content: string,
  requestId: string,
  applyPreview: (result: HTMLElement | null) => void
): void {
  // コールバックを登録
  registerPlantUmlCallback(requestId, applyPreview);

  // Extension経由でレンダリングをリクエスト
  vscode.postMessage({
    type: "renderPlantUml",
    payload: { code: content, requestId },
  });
}

/**
 * PlantUML結果を処理する（メッセージハンドラから呼び出す）
 */
export function handlePlantUmlResult(requestId: string, svg?: string, error?: string): void {
  const callback = plantUmlCallbacks.get(requestId);
  if (callback) {
    if (svg) {
      callback(createDiagramContainer(svg));
    } else {
      callback(createErrorElement("PlantUML", error ?? "Unknown error"));
    }
    plantUmlCallbacks.delete(requestId);
  }
}
