import * as assert from "assert";
import * as path from "path";
import fc from "fast-check";
import { Given, Then, When } from "@cucumber/cucumber";
import { computeMinimalReplacement, toDocumentEol } from "../../../../editor/webviewDocumentSync";
import {
  convertPathsForDisplay,
  DisplayPathRegistry,
  type PathConversionEnv,
  restorePathsFromDisplay,
} from "../../../../util/imagePathConverter";
import {
  markdownDocumentArbitrary,
  markdownLineArbitrary,
  PROPERTY_FILES,
} from "../../../util/markdownArbitrary";
import {
  type DocumentSaveWorld,
  openInMarkdownEditor,
  receiveWebviewMessage,
} from "./documentSave.steps";
import { originalBytes, pathEnvFor, readFixtureBytes } from "./saveFixture";

interface RoundtripWorld extends DocumentSaveWorld {
  roundtripGenerated?: boolean;
}

/** 文書をWebView経由で開いたときと同じく、表示用に変換した内容（LF）を返す */
async function openThroughWebview(world: RoundtripWorld, name: string): Promise<string> {
  const document = await openInMarkdownEditor(world, name);
  const env = pathEnvFor(world, name);
  const registry = new DisplayPathRegistry();
  world.saveRestore = (text) => restorePathsFromDisplay(text, env, registry);
  return convertPathsForDisplay(document.getText().replace(/\r\n/g, "\n"), env, registry);
}

function splitLines(text: string): string[] {
  return text.split("\n");
}

When(
  "文書{string}をWebView経由で開き、何も編集せずに保存する",
  async function (this: RoundtripWorld, name: string) {
    const display = await openThroughWebview(this, name);
    await receiveWebviewMessage(this, name, "save", display);
  }
);

When(
  "文書{string}をWebView経由で開き、{int}行目の{string}を{string}に置き換えて保存する",
  async function (
    this: RoundtripWorld,
    name: string,
    lineNumber: number,
    search: string,
    replacement: string
  ) {
    const lines = splitLines(await openThroughWebview(this, name));
    const line = lines[lineNumber - 1];
    assert.ok(line.includes(search), `${String(lineNumber)}行目に"${search}"がありません: ${line}`);
    lines[lineNumber - 1] = line.replace(search, replacement);
    await receiveWebviewMessage(this, name, "save", lines.join("\n"));
  }
);

Then(
  "文書{string}のディスク上の内容は、{int}行目を除いて開く前とバイト単位で一致する",
  function (this: RoundtripWorld, name: string, lineNumber: number) {
    const actual = splitLines(readFixtureBytes(this, name).toString("utf8"));
    const expected = splitLines(originalBytes(this, name).toString("utf8"));
    assert.strictEqual(actual.length, expected.length, "行数が変化しています");
    expected.forEach((line, index) => {
      if (index !== lineNumber - 1) {
        assert.strictEqual(actual[index], line, `${String(index + 1)}行目が変化しています`);
      }
    });
  }
);

Then(
  "文書{string}のディスク上の{int}行目は{string}である",
  function (this: RoundtripWorld, name: string, lineNumber: number, expected: string) {
    const line = splitLines(readFixtureBytes(this, name).toString("utf8"))[lineNumber - 1];
    assert.strictEqual(line.replace(/\r$/, ""), expected);
  }
);

// ===== プロパティベース（fast-check） =====
// 実際の TextDocument の代わりに、拡張機能の保存処理と同じ純粋関数（変換・復元・改行コード・最小置換）を通す

function propertyEnv(allowedRoots: readonly string[]): PathConversionEnv {
  const existing = new Set(PROPERTY_FILES);
  return {
    documentDir: "/work/docs",
    allowedRoots,
    toWebviewUri: (fsPath) =>
      `https://file+.vscode-resource.vscode-cdn.net${fsPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")}`,
    exists: (fsPath) => existing.has(fsPath),
    pathApi: path.posix,
  };
}

/** WebViewから届いた内容（表示用URI・LF）を保存したときのファイルの内容 */
function savedText(
  documentText: string,
  webviewText: string,
  env: PathConversionEnv,
  registry: DisplayPathRegistry
) {
  const eol = documentText.includes("\r\n") ? "\r\n" : "\n";
  const target = toDocumentEol(restorePathsFromDisplay(webviewText, env, registry), eol);
  const replacement = computeMinimalReplacement(documentText, target);
  return (
    documentText.slice(0, replacement.start) +
    replacement.text +
    documentText.slice(replacement.end)
  );
}

const eolArbitrary = fc.constantFrom("\n", "\r\n");
const rootsArbitrary = fc.constantFrom(["/work/docs"], ["/work/docs", "/work"]);

Given(
  "往復検証用に、画像・リンク・コード・フロントマター・改行コードを組み合わせた文書をランダムに生成する",
  function (this: RoundtripWorld) {
    this.roundtripGenerated = true;
  }
);

Given("往復検証用に、画像とリンクのパス表記をランダムに生成する", function (this: RoundtripWorld) {
  this.roundtripGenerated = true;
});

Then(
  "どの生成文書でも、WebView経由で開いて何も編集せずに保存すると、ファイルはバイト単位で変化しない",
  function (this: RoundtripWorld) {
    assert.ok(this.roundtripGenerated);
    fc.assert(
      fc.property(
        markdownDocumentArbitrary,
        eolArbitrary,
        rootsArbitrary,
        (markdown, eol, roots) => {
          const documentText = toDocumentEol(markdown, eol);
          const env = propertyEnv(roots);
          const registry = new DisplayPathRegistry();
          const display = convertPathsForDisplay(markdown, env, registry);
          assert.strictEqual(savedText(documentText, display, env, registry), documentText);
        }
      ),
      { numRuns: 200 }
    );
  }
);

Then(
  "どの生成文書とどの1行の書き換えでも、保存後のファイルは書き換えた行以外が開く前とバイト単位で一致する",
  function (this: RoundtripWorld) {
    assert.ok(this.roundtripGenerated);
    fc.assert(
      fc.property(
        markdownDocumentArbitrary,
        eolArbitrary,
        rootsArbitrary,
        fc.nat(),
        markdownLineArbitrary,
        (markdown, eol, roots, lineSeed, replacement) => {
          const documentText = toDocumentEol(markdown, eol);
          const env = propertyEnv(roots);
          const registry = new DisplayPathRegistry();
          const lines = convertPathsForDisplay(markdown, env, registry).split("\n");
          const index = lineSeed % lines.length;
          lines[index] = replacement;

          const saved = savedText(documentText, lines.join("\n"), env, registry).split(eol);
          const original = documentText.split(eol);
          assert.strictEqual(saved.length, original.length);
          original.forEach((line, i) => {
            if (i !== index) {
              assert.strictEqual(saved[i], line);
            }
          });
        }
      ),
      { numRuns: 200 }
    );
  }
);

Then(
  "どのパス表記でも、表示用に変換してから保存用に戻すと元の表記に一致する",
  function (this: RoundtripWorld) {
    assert.ok(this.roundtripGenerated);
    fc.assert(
      fc.property(markdownLineArbitrary, rootsArbitrary, (line, roots) => {
        const env = propertyEnv(roots);
        const registry = new DisplayPathRegistry();
        const display = convertPathsForDisplay(line, env, registry);
        assert.strictEqual(restorePathsFromDisplay(display, env, registry), line);
      }),
      { numRuns: 500 }
    );
  }
);
