import * as vscode from "vscode";

/** 置き換え範囲（文字オフセット）と、その範囲に入れるテキスト */
export interface TextReplacement {
  start: number;
  end: number;
  text: string;
}

/** 改行コードを、文書の改行コードに揃える（WebViewは常にLFで扱う） */
export function toDocumentEol(text: string, eol: "\n" | "\r\n"): string {
  const lf = text.replace(/\r\n/g, "\n");
  return eol === "\n" ? lf : lf.replace(/\n/g, "\r\n");
}

/**
 * oldText を newText にするための最小の置き換え（共通の前方・後方を除いた範囲）を求める。
 * 全文置換を避け、Undo履歴や並べて開いたテキストエディタのカーソルへの影響を小さくする。
 * サロゲートペアやCRLFの途中で分割しないよう、境界を調整する。
 */
export function computeMinimalReplacement(oldText: string, newText: string): TextReplacement {
  const maxPrefix = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) {
    prefix++;
  }
  const maxSuffix = Math.min(oldText.length, newText.length) - prefix;
  let suffix = 0;
  while (
    suffix < maxSuffix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix++;
  }
  const isSplitPoint = (text: string, index: number) => {
    const before = text.charCodeAt(index - 1);
    const after = text.charCodeAt(index);
    const splitsSurrogate = before >= 0xd800 && before <= 0xdbff && after >= 0xdc00;
    const splitsCrlf = text[index - 1] === "\r" && text[index] === "\n";
    return splitsSurrogate || splitsCrlf;
  };
  while (prefix > 0 && (isSplitPoint(oldText, prefix) || isSplitPoint(newText, prefix))) {
    prefix--;
  }
  while (
    suffix > 0 &&
    (isSplitPoint(oldText, oldText.length - suffix) ||
      isSplitPoint(newText, newText.length - suffix))
  ) {
    suffix--;
  }
  return {
    start: prefix,
    end: oldText.length - suffix,
    text: newText.slice(prefix, newText.length - suffix),
  };
}

/** WebViewDocumentSync が使うVS Codeの操作（テストで失敗を注入できるようにする） */
export interface DocumentSyncOperations {
  applyEdit: (edit: vscode.WorkspaceEdit) => PromiseLike<boolean>;
  save: (document: vscode.TextDocument) => PromiseLike<boolean>;
  showError: (message: string) => void;
}

const defaultOperations: DocumentSyncOperations = {
  applyEdit: (edit) => vscode.workspace.applyEdit(edit),
  save: (document) => document.save(),
  showError: (message) => {
    void vscode.window.showErrorMessage(message);
  },
};

/**
 * WebViewから届いたMarkdownを TextDocument に反映・保存する。
 * - 反映（update）: TextDocument を更新するだけで保存しない。VS Code が未保存状態を管理する
 * - 保存（save）: 反映してから TextDocument を保存する
 * - WebViewの内容（表示用URI・LF）は restore で元の表記に戻し、文書の改行コードに揃える
 * - 自分が反映した変更（エコー）をWebViewへ送り返さないよう判定できる
 */
export class WebviewDocumentSync {
  /** 自分の反映によって TextDocument がなるはずのテキスト（エコー判定用） */
  private expectedText: string | undefined;

  constructor(
    private readonly document: vscode.TextDocument,
    private readonly restore: (webviewText: string) => string,
    private readonly operations: DocumentSyncOperations = defaultOperations
  ) {}

  /** WebViewの内容を TextDocument に反映する。反映できなければ通知して false を返す */
  async apply(webviewText: string): Promise<boolean> {
    const eol = this.document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
    const target = toDocumentEol(this.restore(webviewText.replace(/\r\n/g, "\n")), eol);
    const current = this.document.getText();
    if (target === current) {
      return true;
    }

    const replacement = computeMinimalReplacement(current, target);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      this.document.uri,
      new vscode.Range(
        this.document.positionAt(replacement.start),
        this.document.positionAt(replacement.end)
      ),
      replacement.text
    );

    // 変更イベントは applyEdit の完了前に届くことがあるため、先に期待値を記録する
    this.expectedText = target;
    let applied: boolean;
    try {
      applied = await this.operations.applyEdit(edit);
    } catch {
      applied = false;
    }
    if (!applied) {
      this.expectedText = undefined;
      this.operations.showError("Markdown WYSIWYG Editor: 編集内容を文書に反映できませんでした。");
    }
    return applied;
  }

  /** WebViewの内容を反映してから保存する。失敗したら通知して false を返す */
  async save(webviewText: string): Promise<boolean> {
    if (!(await this.apply(webviewText))) {
      return false;
    }
    if (!this.document.isDirty) {
      // 内容がファイルと同じで未保存の変更もない（保存済み）
      return true;
    }
    let saved: boolean;
    try {
      saved = await this.operations.save(this.document);
    } catch {
      saved = false;
    }
    if (!saved) {
      this.operations.showError(
        `Markdown WYSIWYG Editor: ${this.document.uri.fsPath} を保存できませんでした。`
      );
    }
    return saved;
  }

  /**
   * 変更イベントをWebViewへ送る必要がないか（自分の反映のエコー、または内容の変わらない状態変化か）。
   * 外部での変更（他のエディタ・Undoなど）のときだけ false を返す。
   */
  isOwnChange(event: vscode.TextDocumentChangeEvent): boolean {
    if (event.contentChanges.length === 0) {
      return true;
    }
    if (this.expectedText !== undefined && event.document.getText() === this.expectedText) {
      this.expectedText = undefined;
      return true;
    }
    return false;
  }
}
