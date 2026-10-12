import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Then, When } from "@cucumber/cucumber";
import * as vscode from "vscode";
import {
  convertPathsForDisplay,
  DisplayPathRegistry,
  LOCAL_FILE_SCHEME,
  type PathConversionEnv,
} from "../../../../util/imagePathConverter";
import { computeImageRoots, computeLocalResourceRoots } from "../../../../util/localResourceRoots";
import {
  expectedDisplayUri,
  fixturePath,
  fixtureRoot,
  pathEnvFor,
  type SaveWorld,
} from "./saveFixture";

interface PathDisplayWorld extends SaveWorld {
  displaySource?: string;
  displayText?: string;
  displayEnv?: PathConversionEnv;
  localResourceRoots?: vscode.Uri[];
}

function displayed(world: PathDisplayWorld): { text: string; env: PathConversionEnv } {
  if (world.displayText === undefined || !world.displayEnv) {
    throw new Error("先に「文書…の内容を表示用に変換する」を実行してください");
  }
  return { text: world.displayText, env: world.displayEnv };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

When(
  "文書{string}の内容を表示用に変換する",
  function (this: PathDisplayWorld, relativePath: string) {
    const env = pathEnvFor(this, relativePath);
    this.displaySource = fs.readFileSync(fixturePath(this, relativePath), "utf8");
    this.displayEnv = env;
    this.displayText = convertPathsForDisplay(this.displaySource, env, new DisplayPathRegistry());
  }
);

Then(
  "表示用に変換した内容は次のとおりである:",
  function (this: PathDisplayWorld, expected: string) {
    const { text, env } = displayed(this);
    const documentDirUri = expectedDisplayUri(env, env.documentDir);
    assert.strictEqual(text, expected.split("{文書ディレクトリのURI}").join(documentDirUri));
  }
);

Then("表示用に変換した内容は元の内容と同じである", function (this: PathDisplayWorld) {
  assert.strictEqual(displayed(this).text, this.displaySource);
});

Then(
  "表示用に変換した内容の画像{string}は、ファイル{string}を指す表示用のURIである",
  function (this: PathDisplayWorld, alt: string, relativePath: string) {
    const { text, env } = displayed(this);
    const match = new RegExp(`!\\[${escapeRegExp(alt)}\\]\\(([^)\\s]+)`).exec(text);
    assert.ok(match, `画像"${alt}"が見つかりません:\n${text}`);
    assert.strictEqual(match[1], expectedDisplayUri(env, fixturePath(this, relativePath)));
  }
);

Then(
  "表示用に変換した内容のリンク{string}は、ファイル{string}を指すローカルファイル用のURIでtitle{string}を持つ",
  function (this: PathDisplayWorld, text: string, relativePath: string, title: string) {
    const { text: display } = displayed(this);
    const match = new RegExp(
      `\\[${escapeRegExp(text)}\\]\\((\\S+) "${escapeRegExp(title)}"\\)`
    ).exec(display);
    assert.ok(match, `title付きのリンク"${text}"が見つかりません:\n${display}`);
    const expected = `${LOCAL_FILE_SCHEME}:${encodeURIComponent(fixturePath(this, relativePath))}`
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29");
    assert.strictEqual(match[1], expected);
  }
);

When(
  "文書{string}に対するWebViewの読み込み許可範囲を求める",
  function (this: PathDisplayWorld, relativePath: string) {
    const extension = vscode.extensions.getExtension("natsuyasai.markdown-wysiwyg-editor");
    assert.ok(extension, "拡張機能が見つかりません");
    const documentDir = path.dirname(fixturePath(this, relativePath));
    this.localResourceRoots = computeLocalResourceRoots(
      extension.extensionUri,
      computeImageRoots(documentDir, this.saveWorkspaceFolders ?? [])
    );
  }
);

Then(
  "WebViewの読み込み許可範囲は、拡張機能のディレクトリと一時ディレクトリの{string}と一時ディレクトリ全体である",
  function (this: PathDisplayWorld, relativeDir: string) {
    const extension = vscode.extensions.getExtension("natsuyasai.markdown-wysiwyg-editor");
    assert.ok(extension && this.localResourceRoots);
    assert.deepStrictEqual(
      this.localResourceRoots.map((uri) => uri.fsPath),
      [extension.extensionUri, fixturePath(this, relativeDir), fixtureRoot(this)].map((entry) =>
        typeof entry === "string" ? vscode.Uri.file(entry).fsPath : entry.fsPath
      )
    );
  }
);
