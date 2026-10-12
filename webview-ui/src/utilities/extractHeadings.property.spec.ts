import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { extractHeadings, generateHeadingId } from "@/utilities/extractHeadings";

/**
 * extractHeadings のプロパティベーステスト（H-02 / H-04）。
 *
 * 文書を「ブロックの列」として組み立て、各ブロックが持つ期待値（見出しなら level / text）を
 * 組み立て側で決める。パーサ（remark）の結果と比較しないので、実装の写しにならない。
 * 検証する性質: 抽出結果の level / text / 件数 / 順序が、組み立て側の期待値と一致する。
 */

interface Block {
  source: string;
  expected: { level: number; text: string }[];
  /** 未終了のフェンスなど、文書の末尾にしか置けないブロック */
  mustBeLast?: boolean;
}

const wordArb = fc
  .array(fc.constantFrom(..."abcxyzABC019あいう漢字".split("")), { minLength: 1, maxLength: 6 })
  .map((chars) => chars.join(""));
const textArb = fc.array(wordArb, { minLength: 1, maxLength: 3 }).map((words) => words.join(" "));
const levelArb = fc.integer({ min: 1, max: 6 });
const indentArb = fc.constantFrom("", " ", "  ", "   ");

const atxArb: fc.Arbitrary<Block> = fc
  .tuple(levelArb, textArb, indentArb, fc.constantFrom("", " ##", " #####"))
  .map(([level, text, indent, closing]) => ({
    source: `${indent}${"#".repeat(level)} ${text}${closing}`,
    expected: [{ level, text }],
  }));

const decoratedArb: fc.Arbitrary<Block> = fc
  .tuple(levelArb, textArb, fc.constantFrom("bold", "link", "code", "em"))
  .map(([level, text, kind]) => {
    const decorated = {
      bold: `**${text}**`,
      link: `[${text}](https://example.com)`,
      code: `\`${text}\``,
      em: `*${text}*`,
    }[kind];
    return { source: `${"#".repeat(level)} ${decorated}`, expected: [{ level, text }] };
  });

const setextArb: fc.Arbitrary<Block> = fc
  .tuple(textArb, fc.constantFrom(1, 2))
  .map(([text, level]) => ({
    source: `${text}\n${level === 1 ? "=".repeat(5) : "-".repeat(5)}`,
    expected: [{ level, text }],
  }));

const emptyHeadingArb: fc.Arbitrary<Block> = fc
  .tuple(levelArb, fc.constantFrom("", " ", " ##"))
  .map(([level, rest]) => ({ source: `${"#".repeat(level)}${rest}`, expected: [] }));

const htmlHeadingArb: fc.Arbitrary<Block> = fc
  .tuple(levelArb, textArb)
  .map(([level, text]) => ({ source: `<h${level}>${text}</h${level}>`, expected: [] }));

const paragraphArb: fc.Arbitrary<Block> = textArb.map((text) => ({
  source: `段落 ${text}`,
  expected: [],
}));

/** フェンスの内側にある "# ..." 行（見出しではない） */
const fenceArb: fc.Arbitrary<Block> = fc
  .tuple(
    fc.constantFrom("```", "~~~", "````", "~~~~~"),
    fc.array(textArb, { minLength: 1, maxLength: 3 }),
    fc.boolean()
  )
  .map(([fence, lines, nestedShorterFence]) => {
    const inner = lines.map((line) => `# ${line}`);
    if (nestedShorterFence && fence.length > 3) {
      inner.push(fence.slice(0, 3));
      inner.push("## 内側の見出しに見えるもの");
    }
    return { source: [fence, ...inner, fence].join("\n"), expected: [] };
  });

const unclosedFenceArb: fc.Arbitrary<Block> = fc
  .tuple(fc.constantFrom("```", "~~~"), textArb)
  .map(([fence, line]) => ({
    source: `${fence}\n# ${line}`,
    expected: [],
    mustBeLast: true,
  }));

// 字下げコードは、直前のリスト項目の続きと解釈されないよう、段落を先頭に付けて作る
const indentedCodeArb: fc.Arbitrary<Block> = textArb.map((text) => ({
  source: `段落

    # ${text}`,
  expected: [],
}));

const wrapArb = (inner: fc.Arbitrary<Block>): fc.Arbitrary<Block> =>
  fc.tuple(inner, fc.constantFrom("quote", "list")).map(([block, kind]) => {
    const lines = block.source.split("\n");
    const wrapped =
      kind === "quote"
        ? lines.map((line) => `> ${line}`)
        : lines.map((line, index) => (index === 0 ? `- ${line}` : `  ${line}`));
    return { ...block, source: wrapped.join("\n") };
  });

// setext見出しは、段落の続きとして解釈されるのを避けるため、入れ子では ATX のみ使う
const nestableArb = fc.oneof(atxArb, decoratedArb, fenceArb);

const blockArb: fc.Arbitrary<Block> = fc.oneof(
  atxArb,
  decoratedArb,
  setextArb,
  emptyHeadingArb,
  htmlHeadingArb,
  paragraphArb,
  fenceArb,
  indentedCodeArb,
  wrapArb(nestableArb)
);

const documentArb = fc
  .tuple(fc.array(blockArb, { maxLength: 8 }), fc.option(unclosedFenceArb, { nil: undefined }))
  .map(([blocks, tail]) => (tail ? [...blocks, tail] : blocks));

describe("extractHeadings のプロパティ", () => {
  it("組み立てた文書の見出しと、抽出結果の level / text / 件数 / 順序が一致する", () => {
    fc.assert(
      fc.property(documentArb, (blocks) => {
        const markdown = blocks.map((block) => block.source).join("\n\n");
        const expected = blocks.flatMap((block) => block.expected);
        const actual = extractHeadings(markdown).map(({ level, text }) => ({ level, text }));
        expect(actual).toEqual(expected);
      }),
      { numRuns: 300 }
    );
  });

  it("IDはテキストから作られ、同じテキストの2件目以降だけに連番が付く", () => {
    fc.assert(
      fc.property(documentArb, (blocks) => {
        const markdown = blocks.map((block) => block.source).join("\n\n");
        const seen = new Map<string, number>();
        for (const heading of extractHeadings(markdown)) {
          const base = generateHeadingId(heading.text);
          const count = seen.get(base) ?? 0;
          expect(heading.id).toBe(count > 0 ? `${base}-${count}` : base);
          seen.set(base, count + 1);
        }
      }),
      { numRuns: 200 }
    );
  });
});
