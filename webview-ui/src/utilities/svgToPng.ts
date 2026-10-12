/** ラスタライズ時のスケール倍率（高DPI対応） */
const RASTER_SCALE = 2;

/** SVGサイズが取得できない場合のフォールバック幅・高さ */
const FALLBACK_SIZE = { width: 800, height: 600 } as const;

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
 * SVG文字列を、2倍スケールのcanvasに描画してPNGのdata URIに変換する。
 * 画像の読み込み失敗やcanvasコンテキスト取得失敗の場合は例外を投げずにnullを返す。
 */
export async function rasterizeSvgToPng(svg: string): Promise<string | null> {
  try {
    const { width, height } = extractSvgSize(svg);
    const image = await loadImage(svgToDataUri(svg));

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
  }
}
