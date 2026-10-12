import { PLANTUML_RESPONSE_TIMEOUT_MS } from "./plantUmlCallbackManager";
import { sanitizeDiagramSvg } from "./sanitizeDiagramSvg";
import { rasterizeSvgToPng } from "./svgToPng";
import { vscode } from "./vscode";

interface RenderPlantUmlToPngOptions {
  /** 拡張機能からの応答を待つ上限（ミリ秒） */
  timeoutMs?: number;
}

let requestSeq = 0;

/**
 * 拡張機能へPlantUMLの描画を要求し、SVGを受け取る。
 * エラー応答または上限時間までに応答がない場合はnullを返す。
 * 画面表示用の経路とは別に、自分のrequestIdの応答だけを待つ。
 */
function requestPlantUmlSvg(code: string, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const requestId = `plantuml-export-${Date.now()}-${requestSeq++}`;

    const finish = (svg: string | null) => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(svg);
    };

    const onMessage = (event: MessageEvent) => {
      const message = event.data as {
        type?: string;
        payload?: { requestId?: string; svg?: string; error?: string };
      };
      if (message?.type !== "plantUmlResult" || message.payload?.requestId !== requestId) {
        return;
      }
      finish(message.payload.svg && !message.payload.error ? message.payload.svg : null);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    window.addEventListener("message", onMessage);
    vscode.postMessage({ type: "renderPlantUml", payload: { code, requestId } });
  });
}

/**
 * PlantUMLのコードを拡張機能で描画し、PNGのdata URIに変換する。
 *
 * 描画したSVGは無害化してから画像化する。描画の失敗・タイムアウト・画像化の失敗は
 * 例外を投げずにnullを返す。呼び出し側は元のコードブロックにフォールバックする想定。
 * PlantUMLの図はテーマに依存しないため、テーマ引数は取らない。
 */
export async function renderPlantUmlToPng(
  code: string,
  options: RenderPlantUmlToPngOptions = {}
): Promise<string | null> {
  const { timeoutMs = PLANTUML_RESPONSE_TIMEOUT_MS } = options;
  const svg = await requestPlantUmlSvg(code, timeoutMs);
  if (svg === null) {
    return null;
  }
  return rasterizeSvgToPng(sanitizeDiagramSvg(svg));
}
