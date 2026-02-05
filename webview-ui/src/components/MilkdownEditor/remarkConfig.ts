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
    },
  };
}
