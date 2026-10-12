import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Given, Then, When } from "@cucumber/cucumber";
import { cleanupPdfTempHtml, writePdfTempHtml } from "../../../../export/pdfTempFile";
import { type ExportWorld } from "./exportSupport";

interface PdfTempWorld extends ExportWorld {
  /** 書き出した一時HTMLのパス（書き出した順） */
  pdfTempPaths?: string[];
  /** 書き出したものではないファイル */
  pdfUnrelatedFile?: string;
}

function isInsideOsTemp(filePath: string): boolean {
  const relative = path.relative(fs.realpathSync(os.tmpdir()), fs.realpathSync(filePath));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function openedPaths(world: ExportWorld): string[] {
  return (world.exportOpenedUris ?? []).map((uri) => uri.fsPath);
}

function writeWith(world: PdfTempWorld, title: string, html: string) {
  world.pdfTempPaths ??= [];
  world.pdfTempPaths.push(writePdfTempHtml(html, title));
}

Given(
  "タイトル{string}のPDF用の一時HTMLを内容{string}で書き出す",
  function (this: PdfTempWorld, title: string, html: string) {
    writeWith(this, title, html);
  }
);

Given(
  "OSの一時フォルダに、書き出したものではない{string}で終わるファイルがある",
  function (this: PdfTempWorld, suffix: string) {
    this.pdfUnrelatedFile = path.join(os.tmpdir(), `b2-unrelated-${process.pid}${suffix}`);
    fs.writeFileSync(this.pdfUnrelatedFile, "無関係なファイル", "utf-8");
    this.exportRestoreConfigs ??= [];
    const target = this.pdfUnrelatedFile;
    this.exportRestoreConfigs.push(() => {
      fs.rmSync(target, { force: true });
      return Promise.resolve();
    });
  }
);

When("PDF用の一時HTMLを後片付けする", function () {
  cleanupPdfTempHtml();
});

Then("書き出したPDF用の一時HTMLのパスはすべて異なる", function (this: PdfTempWorld) {
  const paths = this.pdfTempPaths ?? [];
  assert.ok(paths.length >= 2);
  assert.strictEqual(new Set(paths).size, paths.length);
});

Then("書き出したPDF用の一時HTMLはすべてOSの一時フォルダ内にある", function (this: PdfTempWorld) {
  // 続けて書き出すと前のものは削除されるため、最後のものだけを確認する
  const last = this.pdfTempPaths?.at(-1);
  assert.ok(last && isInsideOsTemp(last), `OSの一時フォルダ内ではありません: ${last}`);
});

Then(
  "最後に書き出したPDF用の一時HTMLの内容は{string}である",
  function (this: PdfTempWorld, html: string) {
    const last = this.pdfTempPaths?.at(-1);
    assert.ok(last);
    assert.strictEqual(fs.readFileSync(last, "utf-8"), html);
  }
);

Then("最後に書き出したPDF用の一時HTMLだけが存在する", function (this: PdfTempWorld) {
  const paths = this.pdfTempPaths ?? [];
  paths.forEach((filePath, index) => {
    assert.strictEqual(fs.existsSync(filePath), index === paths.length - 1, filePath);
  });
});

Then("書き出したPDF用の一時HTMLはすべて存在しない", function (this: PdfTempWorld) {
  for (const filePath of this.pdfTempPaths ?? []) {
    assert.ok(!fs.existsSync(filePath), `削除されていません: ${filePath}`);
  }
});

Then("OSの一時フォルダの書き出したものではないファイルは残っている", function (this: PdfTempWorld) {
  assert.ok(this.pdfUnrelatedFile && fs.existsSync(this.pdfUnrelatedFile));
});

Then("ブラウザで開いたPDF用の一時HTMLのパスはすべて異なる", function (this: PdfTempWorld) {
  const paths = openedPaths(this);
  assert.ok(paths.length >= 2);
  assert.strictEqual(new Set(paths).size, paths.length);
});

Then(
  "ブラウザで開いたPDF用の一時HTMLはすべてOSの一時フォルダ内にある",
  function (this: PdfTempWorld) {
    const last = openedPaths(this).at(-1);
    assert.ok(last && isInsideOsTemp(last), `OSの一時フォルダ内ではありません: ${last}`);
  }
);

Then("最後にブラウザで開いたPDF用の一時HTMLだけが存在する", function (this: PdfTempWorld) {
  const paths = openedPaths(this);
  paths.forEach((filePath, index) => {
    assert.strictEqual(fs.existsSync(filePath), index === paths.length - 1, filePath);
  });
});

Then(
  "最後にブラウザで開いたPDF用の一時HTMLの内容に{string}が含まれる",
  function (this: PdfTempWorld, text: string) {
    const last = openedPaths(this).at(-1);
    assert.ok(last);
    assert.ok(fs.readFileSync(last, "utf-8").includes(text));
  }
);

Then("ブラウザで開いたPDF用の一時HTMLはすべて存在しない", function (this: PdfTempWorld) {
  for (const filePath of openedPaths(this)) {
    assert.ok(!fs.existsSync(filePath), `削除されていません: ${filePath}`);
  }
});
