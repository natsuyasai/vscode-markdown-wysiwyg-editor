import * as vscode from "vscode";

const reportedErrors = new Set<string>();

/**
 * カスタムCSSの読み込みエラーを警告として表示する。
 * 設定の変更やファイルの監視のたびに同じ警告が出ないよう、同じ内容の警告はセッション中に1回だけ表示する。
 */
export function reportCustomCssErrorsOnce(errors: readonly string[]): void {
  for (const error of errors) {
    if (reportedErrors.has(error)) {
      continue;
    }
    reportedErrors.add(error);
    void vscode.window.showWarningMessage(`Markdown WYSIWYG Editor: ${error}`);
  }
}

/**
 * カスタムCSSの相対パスの基準ディレクトリ（文書が属するワークスペースフォルダ）を返す。
 */
export function getCustomCssBaseDir(document: vscode.TextDocument): string | undefined {
  return vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
}
