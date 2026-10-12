import * as assert from "assert";
import * as vscode from "vscode";
import { Given, Then, When } from "@cucumber/cucumber";
import { EditorProvider, type EditorRegistrationApi } from "../../../../editor/editorProvider";
import {
  createFakeExtensionContext,
  delay,
  getState,
  openDocumentInRoot,
  openWithFakePanel,
  updateGlobalConfig,
  waitFor,
  type HardeningState,
  type HardeningWorld,
} from "./hardeningSupport";

interface RecordedDisposable {
  kind: "command" | "customEditor";
  id: string;
  disposed: boolean;
  disposable: vscode.Disposable;
}

interface RegistrationRecord {
  context: vscode.ExtensionContext;
  returned: vscode.Disposable;
  recorded: RecordedDisposable[];
}

function getRegistration(state: HardeningState): RegistrationRecord {
  return state.values.registration as RegistrationRecord;
}

function record(
  recorded: RecordedDisposable[],
  kind: RecordedDisposable["kind"],
  id: string
): vscode.Disposable {
  const entry: RecordedDisposable = {
    kind,
    id,
    disposed: false,
    disposable: new vscode.Disposable(() => {
      entry.disposed = true;
    }),
  };
  recorded.push(entry);
  return entry.disposable;
}

/** 閉じたパネルの、閉じた時点の送信件数 */
function closedPanelCounts(state: HardeningState): Map<number, number> {
  state.values.closedPanelCounts ??= new Map<number, number>();
  return state.values.closedPanelCounts as Map<number, number>;
}

function closePanel(state: HardeningState, index: number): void {
  const panel = state.panels[index];
  assert.ok(panel, "閉じるパネルがありません");
  panel.dispose();
  closedPanelCounts(state).set(index, panel.posted.length);
}

When("記録用の登録APIを使って、拡張機能の登録処理を実行する", function (this: HardeningWorld) {
  const state = getState(this);
  const recorded: RecordedDisposable[] = [];
  const api: EditorRegistrationApi = {
    registerCommand: (command) => record(recorded, "command", command),
    registerCustomEditorProvider: (viewType) => record(recorded, "customEditor", viewType),
  };
  const context = createFakeExtensionContext(state);
  const returned = EditorProvider.register(context, api);
  state.values.registration = { context, returned, recorded } satisfies RegistrationRecord;
});

Then(
  "強化検証の登録処理でコマンド{string}が登録されている",
  function (this: HardeningWorld, id: string) {
    const { recorded } = getRegistration(getState(this));
    assert.ok(recorded.some((entry) => entry.kind === "command" && entry.id === id));
  }
);

Then(
  "強化検証の登録処理でカスタムエディタ{string}が登録されている",
  function (this: HardeningWorld, id: string) {
    const { recorded } = getRegistration(getState(this));
    assert.ok(recorded.some((entry) => entry.kind === "customEditor" && entry.id === id));
  }
);

When("拡張機能のsubscriptionsと登録処理の戻り値をすべて破棄する", function (this: HardeningWorld) {
  const { context, returned } = getRegistration(getState(this));
  for (const subscription of context.subscriptions) {
    subscription.dispose();
  }
  returned.dispose();
});

Then("登録処理で作成されたDisposableはすべて破棄されている", function (this: HardeningWorld) {
  const { recorded } = getRegistration(getState(this));
  assert.ok(recorded.length > 0, "登録処理でDisposableが作成されていません");
  const remaining = recorded.filter((entry) => !entry.disposed).map((entry) => entry.id);
  assert.deepStrictEqual(remaining, [], "破棄されていない登録があります");
});

Given(
  "文書{string}を強化検証用のWebViewパネルで開いて閉じる操作を5回繰り返す",
  async function (this: HardeningWorld, relativePath: string) {
    const state = getState(this);
    const document = await openDocumentInRoot(state, relativePath);
    for (let i = 0; i < 5; i++) {
      openWithFakePanel(state, document);
      closePanel(state, state.panels.length - 1);
    }
  }
);

Given("強化検証用のWebViewパネルを閉じる", function (this: HardeningWorld) {
  const state = getState(this);
  closePanel(state, state.panels.length - 1);
});

When(
  "強化検証でVS Codeのカラーテーマを切り替える",
  { timeout: 30_000 },
  async function (this: HardeningWorld) {
    const state = getState(this);
    const isDark =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
    let changed = false;
    const subscription = vscode.window.onDidChangeActiveColorTheme(() => {
      changed = true;
    });
    try {
      await updateGlobalConfig(
        state,
        "workbench",
        "colorTheme",
        isDark ? "Default Light Modern" : "Default Dark Modern"
      );
      await waitFor(() => changed, 20_000, "カラーテーマの変更イベントが発生しませんでした");
    } finally {
      subscription.dispose();
    }
    await delay(200);
  }
);

When("強化検証でユーザー設定のカスタムCSSのパスを変更する", async function (this: HardeningWorld) {
  const state = getState(this);
  let changed = false;
  const subscription = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("markdownWysiwygEditor.customCssPaths")) changed = true;
  });
  try {
    await updateGlobalConfig(state, "markdownWysiwygEditor", "customCssPaths", [
      "~/md-wysiwyg-hardening-not-found.css",
    ]);
    await waitFor(() => changed, 5_000, "設定の変更イベントが発生しませんでした");
  } finally {
    subscription.dispose();
  }
  await delay(200);
});

When(
  "強化検証で文書{string}の内容を編集する",
  async function (this: HardeningWorld, relativePath: string) {
    const document = await openDocumentInRoot(getState(this), relativePath);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, new vscode.Position(0, 0), "追記\n");
    assert.ok(await vscode.workspace.applyEdit(edit), "文書の編集に失敗しました");
    await delay(200);
    // 未保存の変更を残さない
    await document.save();
  }
);

Then("強化検証用のWebViewパネルにテーマ更新メッセージが送られる", function (this: HardeningWorld) {
  const state = getState(this);
  const openPanel = state.panels.find((panel) => !panel.disposed);
  assert.ok(openPanel, "開いているパネルがありません");
  assert.ok(
    openPanel.postedOfType("updateTheme").length >= 1,
    "テーマ更新メッセージが送られていません"
  );
});

Then("閉じた強化検証用のWebViewパネルにはメッセージが送られない", function (this: HardeningWorld) {
  const state = getState(this);
  const counts = closedPanelCounts(state);
  assert.ok(counts.size > 0, "閉じたパネルがありません");
  for (const [index, countAtClose] of counts) {
    const panel = state.panels[index];
    assert.ok(panel);
    assert.deepStrictEqual(
      panel.posted.slice(countAtClose),
      [],
      `${String(index + 1)}番目の閉じたパネルにメッセージが送られました`
    );
  }
});
