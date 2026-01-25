import mermaid from "mermaid";
import { vscode } from "../../utilities/vscode";

type ThemeKind = "light" | "dark";

// PlantUML結果のコールバック管理
const plantUmlCallbacks = new Map<string, (result: HTMLElement | null) => void>();

/**
 * Mermaidプレビューをレンダリングする
 */
export function renderMermaidPreview(
  content: string,
  id: string,
  theme: ThemeKind,
  applyPreview: (result: HTMLElement | null) => void
): void {
  // darkテーマでは"dark"を使用
  const mermaidTheme = theme === "dark" ? "dark" : "default";

  // テーマに応じた色を設定
  const themeColors =
    theme === "dark"
      ? {
          primaryTextColor: "#e0e0e0",
          textColor: "#e0e0e0",
          primaryColor: "#3d3d3d",
          primaryBorderColor: "#6a6a6a",
          lineColor: "#a0a0a0",
          secondaryColor: "#4a4a4a",
          tertiaryColor: "#2d2d2d",
          background: "#1e1e1e",
          mainBkg: "#3d3d3d",
          nodeBorder: "#6a6a6a",
          clusterBkg: "#2d2d2d",
          titleColor: "#e0e0e0",
          // シーケンス図用
          actorBkg: "#3d3d3d",
          actorBorder: "#6a6a6a",
          actorTextColor: "#e0e0e0",
          actorLineColor: "#a0a0a0",
          signalColor: "#a0a0a0",
          signalTextColor: "#e0e0e0",
          labelTextColor: "#e0e0e0",
          labelBoxBkgColor: "#3d3d3d",
          labelBoxBorderColor: "#6a6a6a",
          loopTextColor: "#e0e0e0",
          noteBkgColor: "#4a4a4a",
          noteTextColor: "#e0e0e0",
          noteBorderColor: "#6a6a6a",
          activationBkgColor: "#4a4a4a",
          activationBorderColor: "#6a6a6a",
          sequenceNumberColor: "#e0e0e0",
        }
      : {
          primaryTextColor: "#333333",
          textColor: "#333333",
          primaryColor: "#ECECFF",
          primaryBorderColor: "#9370DB",
          lineColor: "#333333",
        };

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
        // シーケンス図のアクターボックスの色を置換
        processedSvg = processedSvg.replace(/fill="#eaeaea"/g, 'fill="#3d3d3d"');
        processedSvg = processedSvg.replace(/fill="#EAEAEA"/g, 'fill="#3d3d3d"');
        processedSvg = processedSvg.replace(/stroke="#666"/g, 'stroke="#6a6a6a"');
      }

      const container = document.createElement("div");
      container.innerHTML = processedSvg;
      container.style.cssText = "padding: 16px; background: var(--crepe-color-surface);";

      // インタラクティブな要素のバインド（存在する場合）
      if (bindFunctions) {
        bindFunctions(container);
      }

      applyPreview(container);
    })
    .catch((err: Error) => {
      // 一時コンテナを削除
      tempContainer.remove();

      const errorDiv = document.createElement("div");
      errorDiv.textContent = `Mermaid Error: ${err.message}`;
      errorDiv.style.cssText = "color: var(--crepe-color-error, red); padding: 8px;";
      applyPreview(errorDiv);
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
      const container = document.createElement("div");
      container.innerHTML = svg;
      container.style.cssText = "padding: 16px; background: var(--crepe-color-surface);";
      callback(container);
    } else {
      const errorDiv = document.createElement("div");
      errorDiv.textContent = `PlantUML Error: ${error ?? "Unknown error"}`;
      errorDiv.style.cssText = "color: var(--crepe-color-error, red); padding: 8px;";
      callback(errorDiv);
    }
    plantUmlCallbacks.delete(requestId);
  }
}
