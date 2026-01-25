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
  const mermaidTheme = theme === "dark" ? "dark" : "default";

  mermaid.initialize({
    startOnLoad: false,
    theme: mermaidTheme,
    securityLevel: "loose",
    themeVariables: {
      // テキストが確実に見えるように明示的に色を設定
      primaryTextColor: theme === "dark" ? "#ffffff" : "#333333",
      nodeTextColor: theme === "dark" ? "#ffffff" : "#333333",
      textColor: theme === "dark" ? "#ffffff" : "#333333",
    },
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

      const container = document.createElement("div");
      container.innerHTML = svg;
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
