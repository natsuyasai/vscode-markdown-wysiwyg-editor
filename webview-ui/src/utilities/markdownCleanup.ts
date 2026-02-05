export type LineEnding = "\r\n" | "\n";

/**
 * テキストから改行コードを検出する
 * CRLFが含まれていればCRLF、それ以外はLFを返す
 */
export function detectLineEnding(text: string): LineEnding {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * WYSIWYGエディタから出力されたMarkdownをクリーンアップする
 * - <br />、<br>タグを改行に変換
 * - &nbsp; を通常のスペースに変換
 * - Unicode ノーブレークスペース（\u00A0）を通常のスペースに変換
 * - バックスラッシュ改行をtrailing spaces方式に変換
 * - 連続する空行を正規化
 * - 末尾の余分な空行を除去
 * - 改行コードを元ファイルの形式に統一
 */
export function cleanupMarkdown(text: string, lineEnding: LineEnding): string {
  return (
    text
      // <br />、<br>、<br/>タグを改行に変換
      .replace(/<br\s*\/?>/gi, "\n")
      // HTMLエンティティの&nbsp;を通常のスペースに変換
      .replace(/&nbsp;/g, " ")
      // Unicode ノーブレークスペース（\u00A0）を通常のスペースに変換
      .replace(/\u00A0/g, " ")
      // まずCRLFをLFに統一（後続の処理をLFベースで行うため）
      .replace(/\r\n/g, "\n")
      // バックスラッシュ改行をtrailing spaces（スペース2つ+改行）に変換
      .replace(/\\\n/g, "  \n")
      // 3つ以上の連続空行を2つの空行（1つの空行）に正規化
      .replace(/\n{3,}/g, "\n\n")
      // 末尾の余分な空行を1つの改行に正規化
      .replace(/\n{2,}$/, "\n")
      // 改行コードを元ファイルの形式に統一
      .replace(/\n/g, lineEnding)
  );
}
