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

function resolveImagePath(imagePath: string, basePath: string): string {
  if (path.isAbsolute(imagePath)) {
    return imagePath;
  }
  return path.resolve(basePath, imagePath);
}

export function embedImagesInMarkdown(markdown: string, basePath: string): string {
  // Markdown image pattern: ![alt](path) or ![alt](path "title")
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  let result = markdown;
  const matches = [...markdown.matchAll(markdownImageRegex)];

  for (const match of matches) {
    const fullMatch = match[0];
    const alt = match[1];
    const imagePath = match[2];

    if (!isLocalPath(imagePath) || !isSupportedImage(imagePath)) {
      continue;
    }

    const absolutePath = resolveImagePath(imagePath, basePath);
    const base64Data = imageToBase64(absolutePath);

    if (base64Data) {
      const replacement = `![${alt}](${base64Data})`;
      result = result.replace(fullMatch, replacement);
    }
  }

  return result;
}

export function embedImagesInHtml(html: string, basePath: string): string {
  // HTML img tag pattern: <img ... src="path" ...>
  const htmlImageRegex = /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>/gi;

  let result = html;
  const matches = [...html.matchAll(htmlImageRegex)];

  for (const match of matches) {
    const fullMatch = match[0];
    const beforeSrc = match[1];
    const imagePath = match[2];
    const afterSrc = match[3];

    if (!isLocalPath(imagePath) || !isSupportedImage(imagePath)) {
      continue;
    }

    const absolutePath = resolveImagePath(imagePath, basePath);
    const base64Data = imageToBase64(absolutePath);

    if (base64Data) {
      const replacement = `<img ${beforeSrc}src="${base64Data}"${afterSrc}>`;
      result = result.replace(fullMatch, replacement);
    }
  }

  return result;
}
