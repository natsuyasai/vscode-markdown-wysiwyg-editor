import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { After, type IWorld } from "@cucumber/cucumber";
import * as vscode from "vscode";
import {
  type ExportOperations,
  type MessageHandlerContext,
} from "../../../../editor/MessageHandler";
import { cleanupPdfTempHtml } from "../../../../export/pdfTempFile";
import { type ThemeKind } from "../../../../message/messageTypeToWebview";
import { createWebviewMessageContext } from "../shared/webviewMessageContext";

/**
 * エクスポートの検証（B2）で共有するシナリオの状態と、一時ディレクトリの操作。
 * `markdown` / `mermaidImages` / `html` は、既存の「次のMarkdown:」「HTMLに…が含まれる」stepと共通の項目。
 */
export interface ExportResultPayload {
  success: boolean;
  message: string;
  filePath?: string;
}

export interface ExportWorld extends IWorld {
  markdown?: string;
  mermaidImages?: Map<string, string>;
  html?: string;
  exportRoot?: string;
  /** 文書名 → 開いている TextDocument */
  exportDocuments?: Map<string, vscode.TextDocument>;
  /** 文書名 → 作成時のバイト列 */
  exportOriginalBytes?: Map<string, Buffer>;
  /** 保存ダイアログで選ばれたものとして返すパス（undefined のときはキャンセル） */
  exportSavePath?: string;
  /** WebViewで描画したMermaid画像（エクスポート要求のpayloadに載せる） */
  exportMermaidPayload?: { code: string; dataUri: string }[];
  exportThemeKind?: ThemeKind;
  /** openExternal に渡されたUri（PDFエクスポートで開こうとした一時HTML） */
  exportOpenedUris?: vscode.Uri[];
  /** openExternal の時点での一時HTMLの内容 */
  exportOpenedContents?: string[];
  /** WebViewへ送られた exportResult のpayload */
  exportResults?: ExportResultPayload[];
  /** シナリオの終了時に元へ戻す設定 */
  exportRestoreConfigs?: (() => PromiseLike<void>)[];
}

export function exportRoot(world: ExportWorld): string {
  world.exportRoot ??= fs.mkdtempSync(path.join(os.tmpdir(), "b2-export-"));
  return world.exportRoot;
}

export function exportPath(world: ExportWorld, relativePath: string): string {
  return path.join(exportRoot(world), ...relativePath.split("/"));
}

export function writeExportFile(
  world: ExportWorld,
  relativePath: string,
  content: Buffer | string
) {
  const filePath = exportPath(world, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

export function openedExportDocument(world: ExportWorld, name: string): vscode.TextDocument {
  const document = world.exportDocuments?.get(name);
  if (!document) {
    throw new Error(`文書"${name}"はエクスポート検証用の一時ディレクトリに作成されていません`);
  }
  return document;
}

/** エクスポートのメッセージ処理用のコンテキスト（保存ダイアログとブラウザ起動は差し替える） */
export function createExportContext(
  world: ExportWorld,
  document: vscode.TextDocument
): MessageHandlerContext {
  world.exportOpenedUris ??= [];
  world.exportResults ??= [];
  world.exportOpenedContents ??= [];
  const openedUris = world.exportOpenedUris;
  const results = world.exportResults;
  const openedContents = world.exportOpenedContents;
  const operations: ExportOperations = {
    showSaveDialog: () =>
      Promise.resolve(world.exportSavePath ? vscode.Uri.file(world.exportSavePath) : undefined),
    openExternal: (uri) => {
      openedUris.push(uri);
      openedContents.push(
        fs.existsSync(uri.fsPath) ? fs.readFileSync(uri.fsPath, "utf-8") : "(ファイルなし)"
      );
      return Promise.resolve(true);
    },
  };
  const fakePanel = {
    webview: {
      postMessage: (message: { type: string; payload: ExportResultPayload }) => {
        if (message.type === "exportResult") {
          results.push(message.payload);
        }
        return Promise.resolve(true);
      },
    },
  } as unknown as vscode.WebviewPanel;
  return {
    ...createWebviewMessageContext(document),
    webviewPanel: fakePanel,
    getThemeKind: () => world.exportThemeKind ?? "light",
    exportOperations: operations,
  };
}

async function revertDirtyDocumentsUnder(root: string) {
  for (const document of vscode.workspace.textDocuments) {
    if (document.isDirty && document.uri.fsPath.startsWith(root)) {
      await vscode.window.showTextDocument(document);
      await vscode.commands.executeCommand("workbench.action.files.revert");
    }
  }
}

After({ tags: "@B2" }, async function (this: ExportWorld) {
  cleanupPdfTempHtml();
  for (const restore of this.exportRestoreConfigs ?? []) {
    await restore();
  }
  if (this.exportRoot) {
    await revertDirtyDocumentsUnder(this.exportRoot);
  }
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  if (this.exportRoot) {
    // Windowsではファイルの解放が遅れることがあるため、再試行し、それでも消せなければ残す（OSの一時フォルダ）
    try {
      fs.rmSync(this.exportRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // 後片付けの失敗は検証結果に影響しない
    }
  }
});
