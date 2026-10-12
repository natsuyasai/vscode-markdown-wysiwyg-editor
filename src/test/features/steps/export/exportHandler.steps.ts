import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Given, Then, When } from "@cucumber/cucumber";
import * as vscode from "vscode";
import { handleMessage } from "../../../../editor/MessageHandler";
import {
  createExportContext,
  exportPath,
  openedExportDocument,
  writeExportFile,
  type ExportWorld,
} from "./exportSupport";

const EXPORT_MESSAGE_TYPES: Record<string, string> = {
  HTMLエクスポート: "exportHtml",
  ブログ用HTMLエクスポート: "exportBlogHtml",
  PDFエクスポート: "exportPdf",
};

const EXPORT_LABELS = "(HTMLエクスポート|ブログ用HTMLエクスポート|PDFエクスポート)";
const CONFIG_SECTION = "markdownWysiwygEditor";

Given(
  "エクスポート検証用の一時ディレクトリに、次の内容の文書{string}がある:",
  async function (this: ExportWorld, name: string, content: string) {
    const bytes = Buffer.from(content, "utf8");
    writeExportFile(this, name, bytes);
    this.exportOriginalBytes ??= new Map();
    this.exportOriginalBytes.set(name, bytes);
    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(exportPath(this, name))
    );
    // タブで開いておく（同名の文書が残っていても、この文書が優先して探されるようにする）
    await vscode.window.showTextDocument(document, { preview: false });
    this.exportDocuments ??= new Map();
    this.exportDocuments.set(name, document);
  }
);

Given(
  "エクスポート検証用の一時ディレクトリに、次の内容のCSSファイル{string}がある:",
  function (this: ExportWorld, relativePath: string, content: string) {
    writeExportFile(this, relativePath, content);
  }
);

Given(
  "エクスポートの保存先として、一時ディレクトリの{string}が選ばれる",
  function (this: ExportWorld, relativePath: string) {
    this.exportSavePath = exportPath(this, relativePath);
    // 実際の保存ダイアログで選べるように、保存先のフォルダは存在する
    fs.mkdirSync(path.dirname(this.exportSavePath), { recursive: true });
  }
);

Given(
  "エクスポートの保存先として、存在しないフォルダ内の{string}が選ばれる",
  function (this: ExportWorld, relativePath: string) {
    this.exportSavePath = exportPath(this, relativePath);
  }
);

Given("エクスポートの保存ダイアログはキャンセルされる", function (this: ExportWorld) {
  this.exportSavePath = undefined;
});

Given("VS Codeのカラーテーマはダークである", function (this: ExportWorld) {
  this.exportThemeKind = "dark";
});

Given(
  "WebViewで描画した次のMermaidコードの画像は{string}である:",
  function (this: ExportWorld, dataUri: string, code: string) {
    this.exportMermaidPayload ??= [];
    this.exportMermaidPayload.push({ code: code.trim(), dataUri });
  }
);

async function setGlobalConfig(world: ExportWorld, key: string, value: unknown) {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const original = config.inspect(key)?.globalValue;
  world.exportRestoreConfigs ??= [];
  world.exportRestoreConfigs.push(() =>
    vscode.workspace
      .getConfiguration(CONFIG_SECTION)
      .update(key, original, vscode.ConfigurationTarget.Global)
  );
  await config.update(key, value, vscode.ConfigurationTarget.Global);
}

Given(
  "ユーザー設定のカスタムCSSとして、一時ディレクトリの{string}を絶対パスで指定している",
  async function (this: ExportWorld, relativePath: string) {
    await setGlobalConfig(this, "customCssPaths", [exportPath(this, relativePath)]);
  }
);

Given(
  "ユーザー設定のカスタムCSSとして、相対パス{string}を指定している",
  async function (this: ExportWorld, relativePath: string) {
    await setGlobalConfig(this, "customCssPaths", [relativePath]);
  }
);

Given("ユーザー設定でブログ用HTMLのShadow DOMを有効にしている", async function (this: ExportWorld) {
  await setGlobalConfig(this, "blogExport.useShadowDom", true);
});

/** WebViewからのエクスポート要求を、実際のエディタと同じ処理（handleMessage）で扱う */
async function requestExport(world: ExportWorld, label: string, name: string | undefined) {
  const document = name
    ? openedExportDocument(world, name)
    : [...(world.exportDocuments?.values() ?? [])].at(-1);
  if (!document) {
    throw new Error("エクスポート対象の文書がありません");
  }
  const mermaidImages = world.exportMermaidPayload;
  const payload = mermaidImages && mermaidImages.length > 0 ? { mermaidImages } : undefined;
  await handleMessage(
    { type: EXPORT_MESSAGE_TYPES[label], payload },
    createExportContext(world, document)
  );
  if (label === "PDFエクスポート") {
    world.html = world.exportOpenedContents?.at(-1);
  } else if (world.exportSavePath && fs.existsSync(world.exportSavePath)) {
    world.html = fs.readFileSync(world.exportSavePath, "utf-8");
  }
}

When(
  new RegExp(`^WebViewから${EXPORT_LABELS}を実行する$`),
  async function (this: ExportWorld, label: string) {
    await requestExport(this, label, undefined);
  }
);

When(
  new RegExp(`^WebViewから文書"([^"]*)"の${EXPORT_LABELS}を実行する$`),
  async function (this: ExportWorld, name: string, label: string) {
    await requestExport(this, label, name);
  }
);

Then("エクスポート先のファイルは書き出されない", function (this: ExportWorld) {
  assert.ok(
    !this.exportSavePath || !fs.existsSync(this.exportSavePath),
    "エクスポート先のファイルが書き出されています"
  );
  assert.strictEqual(this.exportResults?.length ?? 0, 0, "エクスポート結果が通知されています");
});

Then("WebViewにエクスポート成功が通知される", function (this: ExportWorld) {
  const result = this.exportResults?.at(-1);
  assert.ok(result?.success, `エクスポート成功が通知されていません: ${JSON.stringify(result)}`);
});

Then(
  "WebViewにエクスポート失敗が{string}を含むメッセージで通知される",
  function (this: ExportWorld, text: string) {
    const result = this.exportResults?.at(-1);
    assert.strictEqual(result?.success, false, `通知: ${JSON.stringify(result)}`);
    assert.ok(result.message.includes(text), `通知: ${JSON.stringify(result)}`);
  }
);

Then(
  "WebViewへのエクスポート成功の通知に{string}が含まれる",
  function (this: ExportWorld, text: string) {
    const result = this.exportResults?.at(-1);
    assert.ok(result?.message.includes(text), `通知: ${JSON.stringify(result)}`);
  }
);

Then(
  "文書{string}のディスク上の内容はエクスポート前から変わっていない",
  function (this: ExportWorld, name: string) {
    const original = this.exportOriginalBytes?.get(name);
    assert.ok(original, `文書"${name}"の作成時の内容がありません`);
    const actual = fs.readFileSync(openedExportDocument(this, name).uri.fsPath);
    assert.ok(actual.equals(original), "ディスク上の内容が変化しています");
  }
);

Then(
  "文書{string}はエクスポート後も未保存の状態のままである",
  function (this: ExportWorld, name: string) {
    assert.strictEqual(openedExportDocument(this, name).isDirty, true);
  }
);
