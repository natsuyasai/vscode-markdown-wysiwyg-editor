export type LineEnding = "\r\n" | "\n";

/**
 * テキストから改行コードを検出する
 * CRLFが含まれていればCRLF、それ以外はLFを返す
 */
export function detectLineEnding(text: string): LineEnding {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * テーブル行かどうかを判定する
 * GFMテーブル行は `|` で始まるか、アライメント行（`| --- |` 等）であること
 */
function isTableRow(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("|");
}

/**
 * テーブル行内のクリーンアップを行う
 * テーブル構造を壊さないよう、改行を挿入する変換は行わない
 * - <br>タグはスペースに変換（改行に変換するとテーブルが壊れる）
 * - &nbsp; やノーブレークスペースはスペースに変換
 */
function cleanupTableRow(line: string): string {
  return (
    line
      // テーブル行内の<br>タグはスペースに変換（改行するとテーブルが壊れる）
      .replace(/<br\s*\/?>/gi, " ")
      // HTMLエンティティの&nbsp;を通常のスペースに変換
      .replace(/&nbsp;/g, " ")
      // Unicode ノーブレークスペース（\u00A0）を通常のスペースに変換
      .replace(/\u00A0/g, " ")
  );
}

/**
 * 非テーブル行のクリーンアップを行う
 */
function cleanupNonTableLine(line: string): string {
  return (
    line
      // <br />、<br>、<br/>タグを改行に変換
      .replace(/<br\s*\/?>/gi, "\n")
      // HTMLエンティティの&nbsp;を通常のスペースに変換
      .replace(/&nbsp;/g, " ")
      // Unicode ノーブレークスペース（\u00A0）を通常のスペースに変換
      .replace(/\u00A0/g, " ")
  );
}

/**
 * WYSIWYGエディタから出力されたMarkdownをクリーンアップする
 * - テーブル行を保護しながらクリーンアップを適用
 * - <br />、<br>タグを改行に変換（テーブル行内ではスペースに変換）
 * - &nbsp; を通常のスペースに変換
 * - Unicode ノーブレークスペース（\u00A0）を通常のスペースに変換
 * - バックスラッシュ改行をtrailing spaces方式に変換
 * - 連続する空行を正規化
 * - 末尾の余分な空行を除去
 * - 改行コードを元ファイルの形式に統一
 */
export function cleanupMarkdown(text: string, lineEnding: LineEnding): string {
  // まずCRLFをLFに統一（後続の処理をLFベースで行うため）
  let normalized = text.replace(/\r\n/g, "\n");

  // 行ごとにテーブル行かどうかを判定し、適切なクリーンアップを適用
  const lines = normalized.split("\n");
  const cleanedLines = lines.map((line) => {
    if (isTableRow(line)) {
      return cleanupTableRow(line);
    }
    return cleanupNonTableLine(line);
  });
  normalized = cleanedLines.join("\n");

  return (
    normalized
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
