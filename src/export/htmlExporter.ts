import * as fs from "fs";
import * as path from "path";
import { Marked, type Tokens } from "marked";
import { embedImagesInMarkdown, embedImagesInHtml } from "./imageEmbedder";
import { generateHtmlDocument, generateScopedHtmlDocument } from "./htmlTemplate";

export interface ExportOptions {
  theme: "light" | "dark";
  title?: string;
  embedImages?: boolean;
  customCss?: string;
  scopedCss?: boolean;
  useShadowDom?: boolean;
  mermaidImages?: Map<string, string>;
}

/**
 * WebViewから送られたMermaid画像配列を、コード（trim済み）をキーとした
 * Mapへ変換する。imagesが未指定または空配列の場合はundefinedを返す。
 * 同一trimキーが重複した場合は後勝ちで格納する。
 */
export function buildMermaidImageMap(
  images?: Array<{ code: string; dataUri: string }>
): Map<string, string> | undefined {
  if (!images || images.length === 0) {
    return undefined;
  }
  const map = new Map<string, string>();
  for (const { code, dataUri } of images) {
    map.set(code.trim(), dataUri);
  }
  return map;
}

/**
 * infostringの先頭トークン（言語指定）を抽出する。
 * marked既定のコードレンダラと同じ正規表現で先頭の言語トークンを取り出す。
 */
function extractLang(infostring: string | undefined): string {
  return (infostring || "").match(/\S*/)?.[0] ?? "";
}

/**
 * MarkdownをHTMLへ変換する。
 * mermaidImagesが指定されている場合、mermaidのコードブロックのうち
 * ソース（trim済み）がマップのキーと一致するものをimg要素に置換する。
 * 一致しないmermaidブロックや、mermaid以外のコードブロックは
 * marked既定のコードブロック出力にフォールバックする。
 */
export function renderMarkdownToHtml(
  markdown: string,
  mermaidImages?: Map<string, string>
): string {
  const instance = new Marked({ gfm: true, breaks: false });
  instance.use({
    renderer: {
      code({ text, lang }: Tokens.Code): string | false {
        const language = extractLang(lang);
        if (language.toLowerCase() === "mermaid" && mermaidImages) {
          const dataUri = mermaidImages.get(text.trim());
          if (dataUri) {
            return `<img src="${dataUri}" alt="mermaid diagram" style="display:block;max-width:100%;" />\n`;
          }
        }
        return false;
      },
    },
  });

  return instance.parse(markdown, { async: false });
}

export function exportToHtml(
  markdown: string,
  basePath: string,
  outputPath: string,
  options: ExportOptions
): void {
  const { theme, title, embedImages = true, mermaidImages } = options;

  // Process markdown to embed images if enabled
  let processedMarkdown = markdown;
  if (embedImages) {
    processedMarkdown = embedImagesInMarkdown(markdown, basePath);
  }

  // Convert Markdown to HTML using marked
  const htmlContent = renderMarkdownToHtml(processedMarkdown, mermaidImages);

  // Embed images in HTML (for HTML img tags in markdown)
  let processedHtml = htmlContent;
  if (embedImages) {
    processedHtml = embedImagesInHtml(htmlContent, basePath);
  }

  // Generate the final document title
  const documentTitle = title || path.basename(outputPath, ".html");

  // Generate the complete HTML document
  const fullHtml = options.scopedCss
    ? generateScopedHtmlDocument(
        processedHtml,
        documentTitle,
        theme,
        options.useShadowDom ?? false,
        options.customCss
      )
    : generateHtmlDocument(processedHtml, documentTitle, theme, options.customCss);

  // Write to file
  fs.writeFileSync(outputPath, fullHtml, "utf-8");
}

export function generateHtmlForPdf(
  markdown: string,
  basePath: string,
  options: ExportOptions
): string {
  const { theme, title = "Document", embedImages = true } = options;

  // Process markdown to embed images if enabled
  let processedMarkdown = markdown;
  if (embedImages) {
    processedMarkdown = embedImagesInMarkdown(markdown, basePath);
  }

  // Convert Markdown to HTML using marked
  const htmlContent = new Marked({ gfm: true, breaks: false }).parse(processedMarkdown, {
    async: false,
  });

  // Embed images in HTML (for HTML img tags in markdown)
  let processedHtml = htmlContent;
  if (embedImages) {
    processedHtml = embedImagesInHtml(htmlContent, basePath);
  }

  // Generate the complete HTML document
  return generateHtmlDocument(processedHtml, title, theme, options.customCss);
}
