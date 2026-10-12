import * as path from "path";
import * as vscode from "vscode";
import { type MessageHandlerContext } from "../../../../editor/MessageHandler";
import {
  type DocumentSyncOperations,
  WebviewDocumentSync,
} from "../../../../editor/webviewDocumentSync";

/**
 * WebViewからのメッセージを、実際のエディタと同じ処理（handleMessage + WebviewDocumentSync）で
 * 扱うための検証用コンテキスト。step定義から共通で使う。
 */

let sharedPanel: vscode.WebviewPanel | undefined;

/** メッセージ処理の宛先として使う検証用WebViewパネル（テスト実行中に1つだけ作る） */
function messagePanel(): vscode.WebviewPanel {
  if (!sharedPanel) {
    const panel = vscode.window.createWebviewPanel(
      "markdown-wysiwyg-editor.test-messages",
      "メッセージ検証用",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {}
    );
    panel.onDidDispose(() => {
      sharedPanel = undefined;
    });
    sharedPanel = panel;
  }
  return sharedPanel;
}

export interface WebviewMessageContextOptions {
  /** 表示用URIを元の表記に戻す処理（既定は何もしない） */
  restore?: (text: string) => string;
  /** VS Codeの操作の差し替え（失敗の注入など） */
  operations?: Partial<DocumentSyncOperations>;
}

export function createWebviewMessageContext(
  document: vscode.TextDocument,
  options: WebviewMessageContextOptions = {}
): MessageHandlerContext {
  const sync = new WebviewDocumentSync(document, options.restore ?? ((text) => text), {
    applyEdit: (edit) => vscode.workspace.applyEdit(edit),
    save: (target) => target.save(),
    showError: (message) => {
      void vscode.window.showErrorMessage(message);
    },
    ...options.operations,
  });
  const noop = () => undefined;
  return {
    document,
    webviewPanel: messagePanel(),
    extensionPath: path.resolve(__dirname, "..", "..", "..", "..", ".."),
    applyWebviewText: (text) => sync.apply(text),
    saveWebviewText: (text) => sync.save(text),
    updateWebview: noop,
    updateTheme: noop,
    sendDocumentInfo: noop,
    sendSettings: noop,
    getThemeKind: () => "light",
  };
}

/** 開いている TextDocument のうち、パスの末尾が name（/ 区切り）に一致するものを返す */
export function findOpenDocument(name: string): vscode.TextDocument {
  const suffix = `/${name.replace(/^\/+/, "")}`;
  const matches = vscode.workspace.textDocuments.filter(
    (document) =>
      document.uri.scheme === "file" &&
      `/${document.uri.fsPath.split(path.sep).join("/")}`.endsWith(suffix)
  );
  // 閉じたエディタの文書がしばらく残ることがあるため、タブで開いているものを優先する
  const openInTabs = new Set(
    vscode.window.tabGroups.all.flatMap((group) =>
      group.tabs.flatMap((tab) => {
        const input: unknown = tab.input;
        return input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom
          ? [input.uri.toString()]
          : [];
      })
    )
  );
  const preferred = matches.filter((document) => openInTabs.has(document.uri.toString()));
  const document = (preferred.length > 0 ? preferred : matches).at(-1);
  if (!document) {
    throw new Error(
      `文書"${name}"に一致する開いている TextDocument がありません。先に文書を開いてください`
    );
  }
  return document;
}
