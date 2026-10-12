import mermaid from "mermaid";
import { SVG_COLOR_REPLACEMENTS, type ThemeKind } from "../../constants/themeColors";
import { initializeMermaid } from "../../utilities/mermaidInitializer";
import {
  PLANTUML_RESPONSE_TIMEOUT_MS,
  PLANTUML_TIMEOUT_MESSAGE,
  PlantUmlCallbackManager,
} from "../../utilities/plantUmlCallbackManager";
import { vscode } from "../../utilities/vscode";

type ApplyPreview = (result: HTMLElement | null) => void;

// PlantUML結果のコールバック管理
const plantUmlCallbackManager = new PlantUmlCallbackManager<
  (svg: string | undefined, error: string | undefined) => void
>();

/**
 * 応答待ちのPlantUML描画要求（コード → 結果を反映する先）。
 * 同じコードの要求が応答前に重なった場合は、拡張機能への要求を1回にまとめる。
 */
const inFlightPlantUmlRequests = new Map<string, ApplyPreview[]>();

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
  initializeMermaid(theme);

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
 * PlantUMLプレビューをレンダリングする（Extension経由）
 *
 * 応答は {@link handlePlantUmlResult} で受け取る。
 * 応答待ちの上限（既定60秒）を過ぎた場合は、タイムアウトのエラーを表示する。
 * 同じコードの要求が応答待ちであれば、新たに要求せず、その応答を共有する。
 */
export function renderPlantUmlPreview(
  content: string,
  requestId: string,
  applyPreview: ApplyPreview,
  timeoutMs: number = PLANTUML_RESPONSE_TIMEOUT_MS
): void {
  const waiting = inFlightPlantUmlRequests.get(content);
  if (waiting) {
    waiting.push(applyPreview);
    return;
  }

  const appliers = [applyPreview];
  inFlightPlantUmlRequests.set(content, appliers);
  const applyToAll = (createElement: () => HTMLElement): void => {
    inFlightPlantUmlRequests.delete(content);
    for (const apply of appliers) {
      apply(createElement());
    }
  };

  plantUmlCallbackManager.register(
    requestId,
    (svg, error) => {
      applyToAll(() =>
        svg ? createDiagramContainer(svg) : createErrorElement("PlantUML", error ?? "Unknown error")
      );
    },
    {
      timeoutMs,
      onTimeout: () => {
        applyToAll(() => createErrorElement("PlantUML", PLANTUML_TIMEOUT_MESSAGE));
      },
    }
  );

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
  const callback = plantUmlCallbackManager.resolve(requestId);
  callback?.(svg, error);
}
