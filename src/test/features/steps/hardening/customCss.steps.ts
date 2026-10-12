import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Given, Then, When } from "@cucumber/cucumber";
import {
  getCustomCssWatchTarget,
  loadCustomCss,
  type CustomCssResolveOptions,
} from "../../../../util/customCssLoader";
import {
  getState,
  resolveInRoot,
  type HardeningState,
  type HardeningWorld,
} from "./hardeningSupport";

interface CssLoadResult {
  css: string;
  errors: string[];
}

function resolveOptions(state: HardeningState): CustomCssResolveOptions {
  return {
    homeDir: state.values.cssHomeDir as string,
    baseDir: state.values.cssBaseDir as string | undefined,
  };
}

function loadResult(state: HardeningState): CssLoadResult {
  return state.values.cssResult as CssLoadResult;
}

function load(state: HardeningState, paths: string[]): void {
  state.values.cssResult = loadCustomCss(paths, resolveOptions(state));
}

Given(
  "カスタムCSSの検証用に、一時ディレクトリ内の{string}をホームディレクトリとして使う",
  function (this: HardeningWorld, relativePath: string) {
    const state = getState(this);
    const homeDir = resolveInRoot(state, relativePath);
    fs.mkdirSync(homeDir, { recursive: true });
    state.values.cssHomeDir = homeDir;
  }
);

Given(
  "カスタムCSSファイル{string}の内容が{string}である",
  function (this: HardeningWorld, relativePath: string, content: string) {
    const filePath = resolveInRoot(getState(this), relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
  }
);

Given(
  "文書はワークスペースフォルダ{string}に属している",
  function (this: HardeningWorld, relativePath: string) {
    const state = getState(this);
    state.values.cssBaseDir = resolveInRoot(state, relativePath);
  }
);

Given("文書はどのワークスペースフォルダにも属していない", function (this: HardeningWorld) {
  getState(this).values.cssBaseDir = undefined;
});

When("カスタムCSSのパス{string}を読み込む", function (this: HardeningWorld, cssPath: string) {
  load(getState(this), [cssPath]);
});

When(
  "カスタムCSSのパス{string}と{string}を読み込む",
  function (this: HardeningWorld, first: string, second: string) {
    load(getState(this), [first, second]);
  }
);

When(
  "一時ディレクトリ内の{string}の絶対パスをカスタムCSSのパスとして読み込む",
  function (this: HardeningWorld, relativePath: string) {
    const state = getState(this);
    load(state, [resolveInRoot(state, relativePath)]);
  }
);

When(
  "カスタムCSSのパス{string}の監視対象を求める",
  function (this: HardeningWorld, cssPath: string) {
    const state = getState(this);
    state.values.cssWatchTarget = getCustomCssWatchTarget(cssPath, resolveOptions(state));
  }
);

Then(
  "カスタムCSSの監視対象は一時ディレクトリ内の{string}である",
  function (this: HardeningWorld, relativePath: string) {
    const state = getState(this);
    const target = state.values.cssWatchTarget as ReturnType<typeof getCustomCssWatchTarget>;
    assert.ok(target, "監視対象が求められませんでした");
    assert.strictEqual(
      path.join(target.baseDir, target.fileName),
      resolveInRoot(state, relativePath)
    );
  }
);

Then("読み込まれたカスタムCSSに{string}が含まれる", function (this: HardeningWorld, text: string) {
  const { css } = loadResult(getState(this));
  assert.ok(css.includes(text), `カスタムCSSに ${text} が含まれていません:\n${css}`);
});

Then(
  "読み込まれたカスタムCSSに{string}が含まれない",
  function (this: HardeningWorld, text: string) {
    const { css } = loadResult(getState(this));
    assert.ok(!css.includes(text), `カスタムCSSに ${text} が含まれています:\n${css}`);
  }
);

Then("読み込まれたカスタムCSSは空である", function (this: HardeningWorld) {
  assert.strictEqual(loadResult(getState(this)).css, "");
});

Then("カスタムCSSの読み込みエラーはない", function (this: HardeningWorld) {
  assert.deepStrictEqual(loadResult(getState(this)).errors, []);
});

Then("カスタムCSSの読み込みエラーが1件ある", function (this: HardeningWorld) {
  assert.strictEqual(loadResult(getState(this)).errors.length, 1);
});
