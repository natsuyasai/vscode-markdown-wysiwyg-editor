import * as fs from "fs";
import * as path from "path";
import { marked } from "marked";
import { embedImagesInMarkdown, embedImagesInHtml } from "./imageEmbedder";
import { generateHtmlDocument } from "./htmlTemplate";

export interface ExportOptions {
  theme: "light" | "dark";
  title?: string;
  embedImages?: boolean;
  customCss?: string;
}

export function exportToHtml(
  markdown: string,
  basePath: string,
  outputPath: string,
  options: ExportOptions
): void {
  const { theme, title, embedImages = true } = options;

  // Process markdown to embed images if enabled
  let processedMarkdown = markdown;
  if (embedImages) {
    processedMarkdown = embedImagesInMarkdown(markdown, basePath);
  }

  // Convert Markdown to HTML using marked
  const htmlContent = marked.parse(processedMarkdown, {
    gfm: true,
    breaks: false,
  });

  // Embed images in HTML (for HTML img tags in markdown)
  let processedHtml = htmlContent;
  if (embedImages) {
    processedHtml = embedImagesInHtml(htmlContent, basePath);
  }

  // Generate the final document title
  const documentTitle = title || path.basename(outputPath, ".html");

  // Generate the complete HTML document
  const fullHtml = generateHtmlDocument(processedHtml, documentTitle, theme, options.customCss);

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
  const htmlContent = marked.parse(processedMarkdown, {
    gfm: true,
    breaks: false,
  });

  // Embed images in HTML (for HTML img tags in markdown)
  let processedHtml = htmlContent;
  if (embedImages) {
    processedHtml = embedImagesInHtml(htmlContent, basePath);
  }

  // Generate the complete HTML document
  return generateHtmlDocument(processedHtml, title, theme, options.customCss);
}
