import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { Then, When } from "@cucumber/cucumber";
import {
  getState,
  resolveInRoot,
  type HardeningState,
  type HardeningWorld,
} from "./hardeningSupport";
import { receiveMessage, setMessageTarget } from "./messageValidation.steps";

function normalizePath(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function activeEditorPath(): string | undefined {
  const uri = vscode.window.activeTextEditor?.document.uri;
  return uri === undefined ? undefined : normalizePath(uri.fsPath);
}

async function requestOpenFile(state: HardeningState, filePath: string): Promise<void> {
  // 要求を受け取る前のアクティブなエディタを記録する
  state.values.activeEditorBefore = activeEditorPath();
  await setMessageTarget(state, "docs/doc.md");
  await receiveMessage(state, { type: "openFile", payload: { filePath } });
  // vscode.open の反映を待つ
  await new Promise((resolve) => setTimeout(resolve, 300));
}

When(
  "WebViewから、強化検証用の一時ディレクトリ内の{string}を開く要求を受け取る",
  async function (this: HardeningWorld, relativePath: string) {
    const state = getState(this);
    await requestOpenFile(state, resolveInRoot(state, relativePath));
  }
);

When(
  "WebViewから、パス{string}をそのまま開く要求を受け取る",
  async function (this: HardeningWorld, filePath: string) {
    await requestOpenFile(getState(this), filePath);
  }
);

Then(
  "強化検証用の一時ディレクトリ内の{string}がアクティブなエディタで開かれている",
  function (this: HardeningWorld, relativePath: string) {
    const expected = normalizePath(resolveInRoot(getState(this), relativePath));
    assert.strictEqual(activeEditorPath(), expected);
  }
);

Then("アクティブなエディタは要求を受け取る前から変わっていない", function (this: HardeningWorld) {
  assert.strictEqual(activeEditorPath(), getState(this).values.activeEditorBefore);
});
