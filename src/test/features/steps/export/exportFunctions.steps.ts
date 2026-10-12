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

/** HTML中の、指定した代替テキストを持つimgタグ（属性の順序は問わない） */
function imgTagsWithAlt(html: string, alt: string): string[] {
  const escapedAlt = alt.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return (html.match(/<img\b[^>]*>/g) ?? []).filter((tag) => tag.includes(`alt="${escapedAlt}"`));
}

Then(
  "エクスポートしたHTMLで代替テキスト{string}の画像はdata URIで埋め込まれている",
  function (this: ExportWorld, alt: string) {
    const tags = imgTagsWithAlt(this.html ?? "", alt);
    assert.ok(tags.length > 0, `代替テキスト"${alt}"の画像がありません:\n${this.html ?? ""}`);
    assert.ok(
      tags.every((tag) => /src="data:image\/png;base64,/.test(tag)),
      `data URIで埋め込まれていません: ${tags.join(" ")}`
    );
  }
);

Then(
  "エクスポートしたHTMLに、data URIで埋め込まれた画像は{int}個ある",
  function (this: ExportWorld, count: number) {
    const embedded = (this.html ?? "").match(/<img\b[^>]*src="data:image\//g) ?? [];
    assert.strictEqual(embedded.length, count);
  }
);
