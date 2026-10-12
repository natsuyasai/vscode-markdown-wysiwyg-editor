import * as assert from "assert";
import { Given, Then, When } from "@cucumber/cucumber";
import * as vscode from "vscode";
import { handleMessage } from "../../../../editor/MessageHandler";
import { type DocumentSyncOperations } from "../../../../editor/webviewDocumentSync";
import { createWebviewMessageContext } from "../shared/webviewMessageContext";
import {
  fixturePath,
  openFixtureDocument,
  originalBytes,
  readFixtureBytes,
  type SaveWorld,
} from "./saveFixture";

const VIEW_TYPE = "markdown-wysiwyg-editor.openEditor";

export interface DocumentSaveWorld extends SaveWorld {
  saveDocuments?: Map<string, vscode.TextDocument>;
  saveVersionAtOpen?: Map<string, number>;
  saveContentChangeCount?: Map<string, number>;
  saveLastChanges?: Map<string, readonly vscode.TextDocumentContentChangeEvent[]>;
  saveOperations?: Partial<DocumentSyncOperations>;
  saveErrors?: string[];
  /** 表示用URIを元の表記に戻す処理（WebView経由で開いた文書） */
  saveRestore?: (text: string) => string;
}

export function openedDocument(world: DocumentSaveWorld, relativePath: string) {
  const document = world.saveDocuments?.get(relativePath);
  if (!document) {
    throw new Error(`文書"${relativePath}"はまだMarkdownエディタで開いていません`);
  }
  return document;
}

/** 文書をMarkdownエディタで開き、開いた時点の版と、以後の変更イベントを記録する */
export async function openInMarkdownEditor(world: DocumentSaveWorld, relativePath: string) {
  const uri = vscode.Uri.file(fixturePath(world, relativePath));
  await vscode.commands.executeCommand("vscode.openWith", uri, VIEW_TYPE);
  const document = await openFixtureDocument(world, relativePath);
  world.saveDocuments ??= new Map();
  world.saveVersionAtOpen ??= new Map();
  world.saveContentChangeCount ??= new Map();
  world.saveLastChanges ??= new Map();
  world.saveDocuments.set(relativePath, document);
  world.saveVersionAtOpen.set(relativePath, document.version);
  world.saveContentChangeCount.set(relativePath, 0);
  const counts = world.saveContentChangeCount;
  const lastChanges = world.saveLastChanges;
  const subscription = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document === document && event.contentChanges.length > 0) {
      counts.set(relativePath, (counts.get(relativePath) ?? 0) + 1);
      lastChanges.set(relativePath, event.contentChanges);
    }
  });
  world.saveDisposables ??= [];
  world.saveDisposables.push(subscription);
  return document;
}

export async function receiveWebviewMessage(
  world: DocumentSaveWorld,
  relativePath: string,
  type: "update" | "save",
  payload: string
) {
  const context = createWebviewMessageContext(openedDocument(world, relativePath), {
    restore: world.saveRestore,
    operations: world.saveOperations,
  });
  await handleMessage({ type, payload }, context);
}

/** 単一の開いている文書を返す（メッセージの宛先） */
function singleOpened(world: DocumentSaveWorld): string {
  const names = [...(world.saveDocuments?.keys() ?? [])];
  if (names.length !== 1) {
    throw new Error("Markdownエディタで開いている文書が1つではありません");
  }
  return names[0];
}

function recordErrors(world: DocumentSaveWorld) {
  world.saveErrors ??= [];
  const errors = world.saveErrors;
  return (message: string) => {
    errors.push(message);
  };
}

Given(
  "文書{string}をMarkdownエディタで開く",
  async function (this: DocumentSaveWorld, name: string) {
    await openInMarkdownEditor(this, name);
  }
);

Given(
  "文書{string}を通常のテキストエディタでも開いている",
  async function (this: DocumentSaveWorld, name: string) {
    const document = await openFixtureDocument(this, name);
    await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });
  }
);

Given(
  "文書{string}の保存処理が失敗するようにする",
  function (this: DocumentSaveWorld, _name: string) {
    this.saveOperations = {
      ...this.saveOperations,
      save: () => Promise.resolve(false),
      showError: recordErrors(this),
    };
  }
);

Given(
  "文書{string}への反映処理が失敗するようにする",
  function (this: DocumentSaveWorld, _name: string) {
    this.saveOperations = {
      ...this.saveOperations,
      applyEdit: () => Promise.resolve(false),
      showError: recordErrors(this),
    };
  }
);

Given("ファイルの自動保存が無効である", function () {
  const autoSave = vscode.workspace.getConfiguration("files").get<string>("autoSave");
  assert.strictEqual(autoSave, "off");
});

When(
  "Markdownエディタが次の内容の保存メッセージを受け取る:",
  async function (this: DocumentSaveWorld, content: string) {
    await receiveWebviewMessage(this, singleOpened(this), "save", content);
  }
);

When(
  "Markdownエディタが改行コード{string}で次の内容の保存メッセージを受け取る:",
  async function (this: DocumentSaveWorld, eol: string, content: string) {
    const lf = content.replace(/\r\n/g, "\n");
    const payload = eol === "CRLF" ? lf.replace(/\n/g, "\r\n") : lf;
    await receiveWebviewMessage(this, singleOpened(this), "save", payload);
  }
);

When(
  "Markdownエディタが次の内容の更新メッセージを受け取る:",
  async function (this: DocumentSaveWorld, content: string) {
    await receiveWebviewMessage(this, singleOpened(this), "update", content);
  }
);

When(
  "VS Codeの保存コマンドの実行と並行して、Markdownエディタが次の内容の保存メッセージを受け取る:",
  async function (this: DocumentSaveWorld, content: string) {
    await Promise.all([
      vscode.commands.executeCommand("workbench.action.files.save"),
      receiveWebviewMessage(this, singleOpened(this), "save", content),
    ]);
  }
);

When("VS Codeの保存コマンドを実行する", async function () {
  await vscode.commands.executeCommand("workbench.action.files.save");
});

When(
  "文書{string}の変更を破棄してMarkdownエディタを閉じる",
  async function (this: DocumentSaveWorld, name: string) {
    await vscode.commands.executeCommand(
      "vscode.openWith",
      vscode.Uri.file(fixturePath(this, name)),
      VIEW_TYPE
    );
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
  }
);

Then("文書{string}は未保存の状態ではない", function (this: DocumentSaveWorld, name: string) {
  assert.strictEqual(openedDocument(this, name).isDirty, false);
});

Then(
  "文書{string}のタブは未保存の状態として表示される",
  function (this: DocumentSaveWorld, name: string) {
    const uri = openedDocument(this, name).uri.toString();
    const tab = vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .find((candidate) => {
        const input: unknown = candidate.input;
        return input instanceof vscode.TabInputCustom && input.uri.toString() === uri;
      });
    assert.ok(tab, `文書"${name}"のMarkdownエディタのタブが見つかりません`);
    assert.strictEqual(tab.isDirty, true);
  }
);

Then(
  "文書{string}のディスク上の内容は次のとおりである:",
  function (this: DocumentSaveWorld, name: string, expected: string) {
    assert.strictEqual(readFixtureBytes(this, name).toString("utf8"), expected);
  }
);

Then(
  "文書{string}のディスク上の内容は、改行コードCRLFで次のとおりである:",
  function (this: DocumentSaveWorld, name: string, expected: string) {
    assert.strictEqual(
      readFixtureBytes(this, name).toString("utf8"),
      expected.replace(/\r?\n/g, "\r\n")
    );
  }
);

Then(
  "文書{string}のディスク上の内容は、開く前からバイト単位で変化していない",
  function (this: DocumentSaveWorld, name: string) {
    const actual = readFixtureBytes(this, name);
    const expected = originalBytes(this, name);
    assert.ok(
      actual.equals(expected),
      `ファイルが変化しています:\n期待: ${JSON.stringify(expected.toString("utf8"))}\n実際: ${JSON.stringify(actual.toString("utf8"))}`
    );
  }
);

Then(
  "文書{string}のTextDocumentは開いたときから変更されていない",
  function (this: DocumentSaveWorld, name: string) {
    const document = openedDocument(this, name);
    assert.strictEqual(document.version, this.saveVersionAtOpen?.get(name));
    assert.strictEqual(this.saveContentChangeCount?.get(name), 0);
  }
);

Then(
  "文書{string}のTextDocumentの内容は次のとおりである:",
  function (this: DocumentSaveWorld, name: string, expected: string) {
    assert.strictEqual(openedDocument(this, name).getText(), expected);
  }
);

Then(
  "文書{string}への直前の変更は{int}行目だけを置き換えている",
  function (this: DocumentSaveWorld, name: string, lineNumber: number) {
    const changes = this.saveLastChanges?.get(name);
    assert.ok(changes && changes.length === 1, "直前の変更が1件ではありません");
    const { range } = changes[0];
    assert.strictEqual(range.start.line, lineNumber - 1);
    assert.strictEqual(range.end.line, lineNumber - 1);
  }
);

Then("保存に失敗したことを示すエラーメッセージが表示される", function (this: DocumentSaveWorld) {
  assert.ok(
    this.saveErrors?.some((message) => message.includes("保存できませんでした")),
    `保存の失敗が通知されていません: ${JSON.stringify(this.saveErrors)}`
  );
});

Then("反映に失敗したことを示すエラーメッセージが表示される", function (this: DocumentSaveWorld) {
  assert.ok(
    this.saveErrors?.some((message) => message.includes("反映できませんでした")),
    `反映の失敗が通知されていません: ${JSON.stringify(this.saveErrors)}`
  );
});
