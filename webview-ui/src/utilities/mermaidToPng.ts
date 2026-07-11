import mermaid from "mermaid";
import { SVG_COLOR_REPLACEMENTS, type ThemeKind } from "@/constants/themeColors";
import { initializeMermaid } from "@/utilities/mermaidInitializer";

/** ラスタライズ時のスケール倍率（高DPI対応） */
const RASTER_SCALE = 2;

/** SVGサイズが取得できない場合のフォールバック幅・高さ */
const FALLBACK_SIZE = { width: 800, height: 600 } as const;

let containerSeq = 0;

/**
 * SVG文字列からwidth/height属性、無ければviewBox属性からサイズを決定する。
 * どちらも取得できない場合はフォールバック値を返す。
 */
function extractSvgSize(svg: string): { width: number; height: number } {
  const widthMatch = /width="([\d.]+)(?:px)?"/.exec(svg);
  const heightMatch = /height="([\d.]+)(?:px)?"/.exec(svg);
  if (widthMatch && heightMatch) {
    const width = Number.parseFloat(widthMatch[1]);
    const height = Number.parseFloat(heightMatch[1]);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  const viewBoxMatch = /viewBox="[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)"/.exec(svg);
  if (viewBoxMatch) {
    const width = Number.parseFloat(viewBoxMatch[1]);
    const height = Number.parseFloat(viewBoxMatch[2]);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  return { ...FALLBACK_SIZE };
}

/** SVG文字列をdata URI（base64）に変換する */
function svgToDataUri(svg: string): string {
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

/** data URIから`Image`要素を読み込む */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load SVG image"));
    image.src = src;
  });
}

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

    const { width, height } = extractSvgSize(processedSvg);
    const image = await loadImage(svgToDataUri(processedSvg));

    const canvas = document.createElement("canvas");
    canvas.width = width * RASTER_SCALE;
    canvas.height = height * RASTER_SCALE;

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    tempContainer.remove();
  }
}
