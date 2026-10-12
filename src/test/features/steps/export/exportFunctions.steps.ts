import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Given, Then, When } from "@cucumber/cucumber";
import { exportToHtml, generateHtmlForPdf } from "../../../../export/htmlExporter";
import { exportPath, exportRoot, writeExportFile, type ExportWorld } from "./exportSupport";

// 最小限のPNG（1x1）。内容は検証に使わない
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

Given("改行コードをCRLFにした次のMarkdown:", function (this: ExportWorld, markdown: string) {
  this.markdown = markdown.replace(/\r?\n/g, "\r\n");
});

Given(
  "エクスポート元のフォルダに画像ファイル{string}がある",
  function (this: ExportWorld, relativePath: string) {
    writeExportFile(this, relativePath, PNG_BYTES);
  }
);

/** 文書のあるフォルダ（画像などの相対パスの基準）。文書は「次のMarkdown:」で与える */
function baseDir(world: ExportWorld): string {
  return exportRoot(world);
}

function exportFile(world: ExportWorld, options: { scopedCss: boolean }) {
  const outputPath = exportPath(world, "out/exported.html");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  exportToHtml(world.markdown ?? "", baseDir(world), outputPath, {
    theme: "light",
    title: "exported",
    embedImages: true,
    mermaidImages: world.mermaidImages,
    ...options,
  });
  world.html = fs.readFileSync(outputPath, "utf-8");
}

When("HTMLファイルとしてエクスポートする", function (this: ExportWorld) {
  exportFile(this, { scopedCss: false });
});

When("ブログ用HTMLファイルとしてエクスポートする", function (this: ExportWorld) {
  exportFile(this, { scopedCss: true });
});

When("PDF用のHTMLを生成する", function (this: ExportWorld) {
  this.html = generateHtmlForPdf(this.markdown ?? "", baseDir(this), {
    theme: "light",
    title: "exported",
    embedImages: true,
    mermaidImages: this.mermaidImages,
  });
});

Then("HTMLのタイトルは{string}である", function (this: ExportWorld, title: string) {
  assert.ok(
    this.html?.includes(`<title>${title}</title>`),
    `HTMLのタイトルが ${title} ではありません:\n${this.html ?? ""}`
  );
});
