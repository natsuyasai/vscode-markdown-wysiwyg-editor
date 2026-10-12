import * as assert from "assert";
import * as vscode from "vscode";
import { Given, Then } from "@cucumber/cucumber";
import { getState, updateGlobalConfig, type HardeningWorld } from "./hardeningSupport";

const SECTION = "markdownWysiwygEditor";

function globalTheme(): unknown {
  return vscode.workspace.getConfiguration(SECTION).inspect("theme")?.globalValue;
}

Given("強化検証の前提としてワークスペースフォルダが開かれていない", function () {
  assert.strictEqual(
    vscode.workspace.workspaceFolders,
    undefined,
    "このシナリオはワークスペースフォルダを開いていない環境を前提としています"
  );
});

Given(
  "強化検証でユーザー設定のエディタテーマが{string}である",
  async function (this: HardeningWorld, theme: string) {
    await updateGlobalConfig(getState(this), SECTION, "theme", theme);
  }
);

Then(
  "強化検証でユーザー設定のエディタテーマは{string}である",
  function (this: HardeningWorld, theme: string) {
    assert.strictEqual(globalTheme(), theme);
  }
);

Then(
  "強化検証でユーザー設定のエディタテーマは{string}のままである",
  function (this: HardeningWorld, theme: string) {
    assert.strictEqual(globalTheme(), theme);
  }
);
