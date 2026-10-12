import * as assert from "assert";
import { Given, Then, When } from "@cucumber/cucumber";
import { handleMessage } from "../../../../editor/MessageHandler";
import { isValidWebviewMessage } from "../../../../message/validateWebviewMessage";
import {
  FakeWebviewPanel,
  createFakeMessageContext,
  getState,
  openDocumentInRoot,
  takeSnapshotOnce,
  type HardeningState,
  type HardeningWorld,
} from "./hardeningSupport";
import type { TextDocument } from "vscode";

interface MessageTarget {
  document: TextDocument;
  panel: FakeWebviewPanel;
}

export function getMessageTarget(state: HardeningState): MessageTarget {
  const target = state.values.messageTarget as MessageTarget | undefined;
  if (target === undefined) {
    throw new Error("メッセージ処理の対象の文書が設定されていません");
  }
  return target;
}

export async function setMessageTarget(
  state: HardeningState,
  relativePath: string
): Promise<MessageTarget> {
  const target = {
    document: await openDocumentInRoot(state, relativePath),
    panel: new FakeWebviewPanel(),
  };
  state.values.messageTarget = target;
  return target;
}

/** WebView からのメッセージを処理し、例外を記録する */
export async function receiveMessage(state: HardeningState, message: unknown): Promise<void> {
  const { document, panel } = getMessageTarget(state);
  try {
    await handleMessage(message, createFakeMessageContext(document, panel));
    state.values.messageError = undefined;
  } catch (error) {
    state.values.messageError = error;
  }
}

Given(
  "強化検証で文書{string}をメッセージ処理の対象にしている",
  async function (this: HardeningWorld, relativePath: string) {
    await setMessageTarget(getState(this), relativePath);
  }
);

When("次のWebViewメッセージの形式を検証する:", function (this: HardeningWorld, json: string) {
  getState(this).values.validationResult = isValidWebviewMessage(JSON.parse(json));
});

Then("WebViewメッセージは受け付けられる", function (this: HardeningWorld) {
  assert.strictEqual(getState(this).values.validationResult, true);
});

Then("WebViewメッセージは受け付けられない", function (this: HardeningWorld) {
  assert.strictEqual(getState(this).values.validationResult, false);
});

When(
  "強化検証で次のWebViewメッセージを受け取る:",
  async function (this: HardeningWorld, json: string) {
    const state = getState(this);
    takeSnapshotOnce(state);
    await receiveMessage(state, JSON.parse(json));
  }
);

Then("WebViewメッセージの処理は例外なく完了する", function (this: HardeningWorld) {
  const error = getState(this).values.messageError;
  assert.strictEqual(error, undefined, `例外が発生しました: ${String(error)}`);
});

Then("強化検証のWebViewにメッセージは送られない", function (this: HardeningWorld) {
  const { panel } = getMessageTarget(getState(this));
  assert.deepStrictEqual(panel.posted, []);
});
