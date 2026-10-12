import * as vscode from "vscode";

/**
 * WebViewから画像の読み込みを許可するディレクトリを求める。
 * 文書のディレクトリとワークスペースフォルダに限り、任意の絶対パスは許可しない。
 * @param documentDir 文書のディレクトリ（絶対パス）
 * @param workspaceFolderPaths ワークスペースフォルダ（絶対パス）
 */
export function computeImageRoots(
  documentDir: string,
  workspaceFolderPaths: readonly string[]
): string[] {
  return [...new Set([documentDir, ...workspaceFolderPaths])];
}

/** 開いているワークスペースフォルダのうち、ローカルファイルのものの絶対パス */
export function getLocalWorkspaceFolderPaths(): string[] {
  return (vscode.workspace.workspaceFolders ?? [])
    .filter((folder) => folder.uri.scheme === "file")
    .map((folder) => folder.uri.fsPath);
}

/** WebViewの localResourceRoots（拡張機能のディレクトリと画像の読み込みを許可するディレクトリ） */
export function computeLocalResourceRoots(
  extensionUri: vscode.Uri,
  imageRoots: readonly string[]
): vscode.Uri[] {
  return [extensionUri, ...imageRoots.map((root) => vscode.Uri.file(root))];
}
