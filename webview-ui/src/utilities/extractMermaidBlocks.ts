/**
 * フェンスドコードブロックの開始行にマッチする正規表現
 * - 先頭0〜3スペースのインデントを許容する
 * - フェンス文字はバックティック（```）のみを対象とする
 * - info stringをキャプチャする（前後の空白は呼び出し側でtrimして判定する）
 */
const FENCE_START_REGEX = /^ {0,3}```([^\n]*)\n/gm;

/**
 * info stringがmermaidブロックを示すかどうかを判定する
 * 大文字小文字は区別せず、前後の空白は無視する
 */
function isMermaidInfoString(infoString: string): boolean {
  return infoString.trim().toLowerCase() === "mermaid";
}

/**
 * Markdown文字列からMermaidフェンスドコードブロックの中身を出現順に抽出する
 * - 対象はバックティック（```）によるフェンスドコードブロックのうち、info stringが
 *   "mermaid"（大文字小文字を区別しない、前後空白は許容）であるもの
 * - 返す各要素はフェンス行を含まないブロックの中身（trimするとMermaidソースそのものになる）
 */
export function extractMermaidBlocks(markdown: string): string[] {
  const blocks: string[] = [];

  FENCE_START_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FENCE_START_REGEX.exec(markdown)) !== null) {
    const infoString = match[1];
    const contentStart = match.index + match[0].length;

    // 対応する閉じフェンスを探す（行頭0〜3スペース + ```）
    const closingFenceRegex = /^ {0,3}```\s*$/m;
    closingFenceRegex.lastIndex = 0;
    const remaining = markdown.slice(contentStart);
    const closingMatch = closingFenceRegex.exec(remaining);

    const content = closingMatch ? remaining.slice(0, closingMatch.index) : remaining;
    // 中身の末尾にある改行1個はフェンス行との区切りなので除去する
    const contentWithoutTrailingNewline = content.endsWith("\n") ? content.slice(0, -1) : content;

    if (isMermaidInfoString(infoString)) {
      blocks.push(contentWithoutTrailingNewline);
    }

    // 次の検索位置を閉じフェンスの後ろに進める（ブロック内部を誤ってフェンス開始とみなさないため）
    const nextIndex = closingMatch
      ? contentStart + closingMatch.index + closingMatch[0].length
      : markdown.length;
    FENCE_START_REGEX.lastIndex = nextIndex;
  }

  return blocks;
}
