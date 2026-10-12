import * as fs from "fs";
import * as path from "path";
import {
  DEFAULT_MIME_TYPE,
  EXTERNAL_URL_PREFIXES,
  IMAGE_MIME_TYPES,
  SUPPORTED_IMAGE_EXTENSIONS,
} from "../constants/fileExtensions";

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_MIME_TYPES[ext] || DEFAULT_MIME_TYPE;
}

function isLocalPath(imagePath: string): boolean {
  return !EXTERNAL_URL_PREFIXES.some((prefix) => imagePath.startsWith(prefix));
}

function isSupportedImage(imagePath: string): boolean {
  const ext = path.extname(imagePath).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.has(ext);
}

function imageToBase64(imagePath: string): string | null {
  try {
    if (!fs.existsSync(imagePath)) {
      return null;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString("base64");
    const mimeType = getMimeType(imagePath);

    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
}

/** パーセントエンコードされたパスを元に戻す。不正なエンコードのときは undefined */
function safeDecode(imagePath: string): string | undefined {
  try {
    return decodeURIComponent(imagePath);
  } catch {
    return undefined;
  }
}

function resolveImagePath(imagePath: string, basePath: string): string {
  if (path.isAbsolute(imagePath)) {
    return imagePath;
  }
  return path.resolve(basePath, imagePath);
}

/**
 * 画像の参照先（Markdownの画像記法やimgタグのsrc）から、埋め込み用のdata URIを求める。
 * ローカルの対応画像で、実在するものだけが対象。それ以外は null を返す。
 * `%20` などのパーセントエンコードは元に戻したパスを優先し、
 * 該当するファイルがなければ表記どおりのパスも試す（実際のファイル名に `%` を含む場合）。
 */
export function resolveImageDataUri(imagePath: string, basePath: string): string | null {
  if (!isLocalPath(imagePath) || !isSupportedImage(imagePath)) {
    return null;
  }
  const decoded = safeDecode(imagePath);
  const candidates =
    decoded !== undefined && decoded !== imagePath ? [decoded, imagePath] : [imagePath];
  for (const candidate of candidates) {
    const base64Data = imageToBase64(resolveImagePath(candidate, basePath));
    if (base64Data) {
      return base64Data;
    }
  }
  return null;
}

/**
 * HTML中のimgタグのsrcにあるローカル画像を、data URIとして埋め込む。
 * （Markdownの画像記法は、Markdownの構文解析の段階で htmlExporter が埋め込む）
 */
export function embedImagesInHtml(html: string, basePath: string): string {
  // HTML img tag pattern: <img ... src="path" ...>
  const htmlImageRegex = /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>/gi;

  // 関数で置換する（文字列だと、data URIなどの `$` が置換パターンとして解釈されるため）
  return html.replace(
    htmlImageRegex,
    (fullMatch, beforeSrc: string, imagePath: string, afterSrc: string) => {
      const base64Data = resolveImageDataUri(imagePath, basePath);
      return base64Data ? `<img ${beforeSrc}src="${base64Data}"${afterSrc}>` : fullMatch;
    }
  );
}
