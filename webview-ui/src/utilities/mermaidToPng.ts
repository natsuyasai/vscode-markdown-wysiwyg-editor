import mermaid from "mermaid";
import { SVG_COLOR_REPLACEMENTS, type ThemeKind } from "@/constants/themeColors";
import { initializeMermaid } from "@/utilities/mermaidInitializer";
import { rasterizeSvgToPng } from "@/utilities/svgToPng";

let containerSeq = 0;

/**
 * MermaidのコードをテーマcolorでレンダリングしPNGのdata URIに変換する。
 *
 * 1. `initializeMermaid`でテーマに応じた設定を行う
 * 2. `mermaid.render`でSVG文字列を取得する（一時コンテナをbodyに追加し、終了後に必ず削除する）
 * 3. ダークテーマの場合は`SVG_COLOR_REPLACEMENTS`でSVG文字列を置換する
 * 4. SVGを`Image`に読み込み、2倍スケールで`canvas`に描画し、PNGのdata URIを返す
 *
 * レンダリング失敗・画像読み込み失敗・canvasコンテキスト取得失敗など、
 * いずれかの段階で失敗した場合は例外を投げずに`null`を返す。
 * 呼び出し側は`null`の場合、元のコードブロックにフォールバックする想定。
 */
export async function renderMermaidToPng(code: string, theme: ThemeKind): Promise<string | null> {
  initializeMermaid(theme);

  const id = `mermaid-export-${Date.now()}-${containerSeq++}`;
  const tempContainer = document.createElement("div");
  tempContainer.id = `mermaid-container-${id}`;
  tempContainer.style.cssText = "position: absolute; left: -9999px; visibility: hidden;";
  document.body.appendChild(tempContainer);

  try {
    const { svg } = await mermaid.render(`mermaid-${id}`, code, tempContainer);

    let processedSvg = svg;
    if (theme === "dark") {
      for (const { from, to } of SVG_COLOR_REPLACEMENTS) {
        processedSvg = processedSvg.replace(from, to);
      }
    }

    return await rasterizeSvgToPng(processedSvg);
  } catch {
    return null;
  } finally {
    tempContainer.remove();
  }
}
