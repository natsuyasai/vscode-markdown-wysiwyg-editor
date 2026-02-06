import type { Handle } from "mdast-util-to-markdown";
import type { Options } from "remark-stringify";

/**
 * カスタムbreakハンドラ
 * デフォルトの`\\\n`（バックスラッシュ改行）の代わりに`  \n`（trailing spaces）を出力する。
 * テーブルセル内など改行不可の文脈ではスペースを返す（デフォルト動作を維持）。
 */
const hardBreakHandler: Handle = (_node, _parent, state, info) => {
  for (const pattern of state.unsafe) {
    if (pattern.character === "\n" && patternMatchesScope(state.stack, pattern)) {
      return /[ \t]/.test(info.before) ? "" : " ";
    }
  }

  return "  \n";
};

/**
 * カスタムtextハンドラ
 * Milkdownデフォルトのtextハンドラを改善し、テーブルセル内での安全性を確保する。
 * - trailing spacesの`&#20;`エンコーディングを回避（Milkdownの本来の目的）
 * - テーブルセル内など改行が不正となる文脈では`state.safe()`を使用して安全に処理する
 */
const textHandler: Handle = (node, _parent, state, info) => {
  const value = (node as { value: string }).value;

  // テーブルセル内の場合はstate.safe()を使用して改行文字等を適切にエスケープする
  if (state.stack.includes("tableCell")) {
    return state.safe(value, { ...info, encode: [] });
  }

  // テーブル外で、改行を含まずtrailing spacesのみのテキストはそのまま返す
  // （Milkdownの&#20;エンコーディング回避のため）
  if (/^[^*_\\\n\r]*[ \t]+$/.test(value)) {
    return value;
  }

  return state.safe(value, { ...info, encode: [] });
};

/**
 * unsafeパターンがスコープに一致するか判定する
 * mdast-util-to-markdownのpatternInScopeと同等のロジック
 */
function patternMatchesScope(
  stack: string[],
  pattern: {
    inConstruct?: string | string[] | null | undefined;
    notInConstruct?: string | string[] | null | undefined;
  }
): boolean {
  return (
    listInScope(stack, pattern.inConstruct, true) &&
    !listInScope(stack, pattern.notInConstruct, false)
  );
}

function listInScope(
  stack: string[],
  list: string | string[] | null | undefined,
  none: boolean
): boolean {
  if (typeof list === "string") {
    list = [list];
  }

  if (!list || list.length === 0) {
    return none;
  }

  return list.some((item) => stack.includes(item));
}

/**
 * remark-stringifyのカスタムオプションを生成する
 */
export function createRemarkStringifyOptions(): Options {
  return {
    bullet: "-",
    bulletOther: "*",
    rule: "-",
    emphasis: "*",
    strong: "*",
    fences: true,
    listItemIndent: "one",
    handlers: {
      break: hardBreakHandler,
      text: textHandler,
    },
  };
}
