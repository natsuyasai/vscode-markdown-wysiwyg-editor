import * as assert from "assert";
import * as vscode from "vscode";
import { Given, Then, When } from "@cucumber/cucumber";
import { getNonce } from "../../../../util/util";
import {
  getState,
  openDocumentInRoot,
  openWithFakePanel,
  type HardeningWorld,
} from "./hardeningSupport";

function htmlOf(world: HardeningWorld, index = 0): string {
  const panel = getState(world).panels.at(index);
  if (panel === undefined) {
    throw new Error(`${String(index + 1)}番目のWebViewパネルが開かれていません`);
  }
  return panel.webview.html;
}

function scriptNonceOf(html: string): string {
  const match = /<script[^>]*\snonce="([^"]*)"/.exec(html);
  assert.ok(match?.[1], `script要素のnonceが見つかりません:\n${html}`);
  return match[1];
}

function generatedNonces(world: HardeningWorld): string[] {
  return getState(world).values.nonces as string[];
}

Given(
  "文書{string}を強化検証用のWebViewパネルで開いている",
  async function (this: HardeningWorld, relativePath: string) {
    const state = getState(this);
    const document = await openDocumentInRoot(state, relativePath);
    openWithFakePanel(state, document);
  }
);

When(
  "文書{string}を強化検証用のWebViewパネルで2回開く",
  async function (this: HardeningWorld, relativePath: string) {
    const state = getState(this);
    const document = await openDocumentInRoot(state, relativePath);
    openWithFakePanel(state, document);
    openWithFakePanel(state, document);
  }
);

Then("WebViewのHTMLのタイトルは{string}である", function (this: HardeningWorld, title: string) {
  const html = htmlOf(this);
  assert.ok(
    html.includes(`<title>${title}</title>`),
    `タイトルが ${title} ではありません:\n${html}`
  );
});

Then("WebViewのHTMLのlang属性はVS Codeの表示言語と一致する", function (this: HardeningWorld) {
  const html = htmlOf(this);
  assert.ok(
    html.includes(`<html lang="${vscode.env.language}">`),
    `lang属性が ${vscode.env.language} ではありません:\n${html}`
  );
});

Then(
  "WebViewのHTMLのscript要素のnonceは、Content-Security-Policyのscript-srcで許可されている",
  function (this: HardeningWorld) {
    const html = htmlOf(this);
    const nonce = scriptNonceOf(html);
    assert.ok(nonce.length >= 32, `nonceが短すぎます: ${nonce}`);
    assert.ok(
      html.includes(`script-src 'nonce-${nonce}'`),
      `CSPのscript-srcにnonceが含まれていません:\n${html}`
    );
  }
);

Then("2つのWebViewのHTMLのnonceは異なる", function (this: HardeningWorld) {
  assert.notStrictEqual(scriptNonceOf(htmlOf(this, 0)), scriptNonceOf(htmlOf(this, 1)));
});

Given("Math.randomが常に同じ値を返す", function (this: HardeningWorld) {
  const original = Math.random;
  Math.random = () => 0.5;
  getState(this).cleanups.push(() => {
    Math.random = original;
  });
});

When("nonceを生成する", function (this: HardeningWorld) {
  getState(this).values.nonces = [getNonce()];
});

When("nonceを100回生成する", function (this: HardeningWorld) {
  getState(this).values.nonces = Array.from({ length: 100 }, () => getNonce());
});

Then("生成されたnonceは英数字32文字である", function (this: HardeningWorld) {
  for (const nonce of generatedNonces(this)) {
    assert.match(nonce, /^[A-Za-z0-9]{32}$/);
  }
});

Then("生成されたnonceはすべて異なる", function (this: HardeningWorld) {
  const nonces = generatedNonces(this);
  assert.strictEqual(new Set(nonces).size, nonces.length, "同じnonceが生成されました");
});
