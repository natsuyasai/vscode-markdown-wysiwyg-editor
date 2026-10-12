import * as assert from "assert";
import * as vscode from "vscode";
import { Given, Then, When } from "@cucumber/cucumber";
import { chooseThemeConfigurationTarget } from "../../../../editor/MessageHandler";
import { getState, type HardeningWorld } from "./hardeningSupport";

function toInspectValue(label: string): string | undefined {
  return label === "未設定" ? undefined : label;
}

const TARGET_LABELS = new Map<vscode.ConfigurationTarget, string>([
  [vscode.ConfigurationTarget.Global, "ユーザー設定"],
  [vscode.ConfigurationTarget.Workspace, "ワークスペース設定"],
  [vscode.ConfigurationTarget.WorkspaceFolder, "ワークスペースフォルダ設定"],
]);

Given(
  "エディタテーマのユーザー設定値が{string}、ワークスペース設定値が{string}である",
  function (this: HardeningWorld, globalValue: string, workspaceValue: string) {
    getState(this).values.themeInspect = {
      globalValue: toInspectValue(globalValue),
      workspaceValue: toInspectValue(workspaceValue),
    };
  }
);

When("エディタテーマの保存先を決める", function (this: HardeningWorld) {
  const state = getState(this);
  state.values.themeTarget = chooseThemeConfigurationTarget(
    state.values.themeInspect as { workspaceValue?: unknown }
  );
});

Then("エディタテーマの保存先は{string}である", function (this: HardeningWorld, label: string) {
  const target = getState(this).values.themeTarget as vscode.ConfigurationTarget;
  assert.strictEqual(TARGET_LABELS.get(target), label);
});
