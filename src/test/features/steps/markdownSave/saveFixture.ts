import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { After, type IWorld } from "@cucumber/cucumber";
import * as vscode from "vscode";
import { type PathConversionEnv } from "../../../../util/imagePathConverter";
import { computeImageRoots } from "../../../../util/localResourceRoots";

/**
 * 保存・往復の検証（B1）で共有するシナリオの状態と、一時ディレクトリの操作。
 * 「保存検証用の一時ディレクトリ」に文書と画像を置き、相対パスで指定する。
 */
export interface SaveWorld extends IWorld {
  saveRoot?: string;
  /** 文書の相対パス → 作成時のバイト列 */
  saveOriginalBytes?: Map<string, Buffer>;
  /** ワークスペースフォルダとして扱うディレクトリ（絶対パス） */
  saveWorkspaceFolders?: string[];
  /** asWebviewUri を使うための検証用WebViewパネル */
  savePanel?: vscode.WebviewPanel;
  /** シナリオの終了時に破棄する購読 */
  saveDisposables?: vscode.Disposable[];
}

/** 文書の内容に書く、一時ディレクトリの絶対パスのプレースホルダ */
const ROOT_PLACEHOLDER = "{一時ディレクトリ}";

export function fixtureRoot(world: SaveWorld): string {
  world.saveRoot ??= fs.mkdtempSync(path.join(os.tmpdir(), "b1-save-"));
  return world.saveRoot;
}

export function fixturePath(world: SaveWorld, relativePath: string): string {
  return path.join(fixtureRoot(world), ...relativePath.split("/"));
}

/** 内容中のプレースホルダを、一時ディレクトリの絶対パス（区切りは /）に置き換える */
export function expandPlaceholders(world: SaveWorld, text: string): string {
  return text.split(ROOT_PLACEHOLDER).join(fixtureRoot(world).split(path.sep).join("/"));
}

export function writeFixtureFile(world: SaveWorld, relativePath: string, content: Buffer | string) {
  const filePath = fixturePath(world, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

/** 文書を作成し、作成時のバイト列を記録する */
export function writeFixtureDocument(world: SaveWorld, relativePath: string, content: string) {
  const bytes = Buffer.from(content, "utf8");
  writeFixtureFile(world, relativePath, bytes);
  world.saveOriginalBytes ??= new Map();
  world.saveOriginalBytes.set(relativePath, bytes);
}

export function originalBytes(world: SaveWorld, relativePath: string): Buffer {
  const bytes = world.saveOriginalBytes?.get(relativePath);
  if (!bytes) {
    throw new Error(`文書"${relativePath}"は保存検証用の一時ディレクトリに作成されていません`);
  }
  return bytes;
}

export function readFixtureBytes(world: SaveWorld, relativePath: string): Buffer {
  return fs.readFileSync(fixturePath(world, relativePath));
}

export async function openFixtureDocument(
  world: SaveWorld,
  relativePath: string
): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath(world, relativePath)));
}

function webviewPanel(world: SaveWorld): vscode.WebviewPanel {
  world.savePanel ??= vscode.window.createWebviewPanel(
    "b1-save-test",
    "保存検証用",
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {}
  );
  return world.savePanel;
}

/** 文書に対する、実際のエディタと同じ設定のパス変換環境 */
export function pathEnvFor(world: SaveWorld, relativePath: string): PathConversionEnv {
  const panel = webviewPanel(world);
  const documentDir = path.dirname(fixturePath(world, relativePath));
  return {
    documentDir,
    allowedRoots: computeImageRoots(documentDir, world.saveWorkspaceFolders ?? []),
    toWebviewUri: (fsPath) => panel.webview.asWebviewUri(vscode.Uri.file(fsPath)).toString(),
    exists: (fsPath) => fs.existsSync(fsPath),
  };
}

/** 表示用URIの形式（括弧はエンコードする） */
export function expectedDisplayUri(env: PathConversionEnv, fsPath: string): string {
  return env.toWebviewUri(fsPath).replace(/\(/g, "%28").replace(/\)/g, "%29");
}

async function revertDirtyDocumentsUnder(root: string) {
  for (const document of vscode.workspace.textDocuments) {
    if (document.isDirty && document.uri.fsPath.startsWith(root)) {
      await vscode.window.showTextDocument(document);
      await vscode.commands.executeCommand("workbench.action.files.revert");
    }
  }
}

After({ tags: "@B1" }, async function (this: SaveWorld) {
  this.savePanel?.dispose();
  for (const disposable of this.saveDisposables ?? []) {
    disposable.dispose();
  }
  if (this.saveRoot) {
    await revertDirtyDocumentsUnder(this.saveRoot);
  }
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  if (this.saveRoot) {
    // Windowsではファイルの解放が遅れることがあるため、再試行し、それでも消せなければ残す（OSの一時フォルダ）
    try {
      fs.rmSync(this.saveRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // 後片付けの失敗は検証結果に影響しない
    }
  }
});
