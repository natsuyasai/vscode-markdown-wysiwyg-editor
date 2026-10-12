import fc from "fast-check";

/**
 * 往復（開く→保存）のプロパティテストで使う、Markdown文書の生成器。
 * 文書は /work/docs/doc.md にある前提で、PROPERTY_FILES のファイルが存在するものとする。
 */

/** 存在するファイル（絶対パス） */
export const PROPERTY_FILES = [
  "/work/docs/img.png",
  "/work/docs/images/画像.png",
  "/work/docs/images/my image.png",
  "/work/docs/images/shot (1).png",
  "/work/docs/images/100%.png",
  "/work/docs/images/a#b.png",
  "/work/docs/other.md",
  "/work/docs/sub/child.md",
  "/work/shared/outside.png",
  "/work/shared/note.md",
  "/abs/absolute.png",
];

/** 文書からの相対パス（存在しないファイルを含む） */
const relativeTargets = [
  "img.png",
  "images/画像.png",
  "images/my image.png",
  "images/shot (1).png",
  "images/100%.png",
  "images/a#b.png",
  "other.md",
  "sub/child.md",
  "../shared/outside.png",
  "../shared/note.md",
  "missing.png",
  "画像なし.png",
];

function needsAngle(target: string): boolean {
  return /[\s()<>]/.test(target);
}

/** 1つの相対パスに対する、さまざまな宛先の表記 */
const destinationArbitrary: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom(...relativeTargets, "/abs/absolute.png", "/work/docs/img.png"),
    fc.constantFrom("plain", "dot", "redundant", "angle", "encoded")
  )
  .map(([target, style]) => {
    const isAbsolute = target.startsWith("/");
    let value = target;
    if (!isAbsolute && style === "dot") {
      value = `./${target}`;
    } else if (!isAbsolute && style === "redundant") {
      value = `sub/../${target}`;
    } else if (style === "encoded") {
      value = target.replace(/ /g, "%20");
    }
    if (style === "angle" || needsAngle(value)) {
      return `<${value}>`;
    }
    return value;
  });

const titleArbitrary = fc.constantFrom("", ' "タイトル"', " 't'", " (括弧)");
const altArbitrary = fc.constantFrom("", "画像", "alt text", "図1");
const anchorArbitrary = fc.constantFrom("", "#見出し", "#section-1");

const imageArbitrary = fc
  .tuple(altArbitrary, destinationArbitrary, titleArbitrary)
  .map(([alt, destination, title]) => `![${alt}](${destination}${title})`);

const linkArbitrary = fc
  .tuple(altArbitrary, destinationArbitrary, anchorArbitrary, titleArbitrary)
  .map(([text, destination, anchor, title]) => {
    const withAnchor = destination.endsWith(">")
      ? `${destination.slice(0, -1)}${anchor}>`
      : `${destination}${anchor}`;
    return `[${text || "リンク"}](${withAnchor}${title})`;
  });

const inlineArbitrary = fc.oneof(
  imageArbitrary,
  linkArbitrary,
  fc.constantFrom("本文", "**太字**", "_強調_", "[未完成のリンク](", "\\![エスケープ](img.png)"),
  imageArbitrary.map((image) => `\`${image}\``),
  linkArbitrary.map((link) => `\`\`${link}\`\``),
  fc.constantFrom("https://example.com/a.png", "![外部](https://example.com/x.png)", "[a](#top)")
);

/** 1行分（インライン要素を空白でつないだもの、または見出し・空行） */
export const markdownLineArbitrary: fc.Arbitrary<string> = fc.oneof(
  fc.array(inlineArbitrary, { minLength: 1, maxLength: 3 }).map((parts) => parts.join(" ")),
  fc.constantFrom("", "# 見出し", "- 箇条書き", "> 引用")
);

const fencedBlockArbitrary = fc
  .tuple(fc.constantFrom("```", "~~~", "````"), fc.array(markdownLineArbitrary, { maxLength: 3 }))
  .map(([fence, lines]) => [fence, ...lines, fence]);

const frontmatterArbitrary = fc
  .array(
    fc.oneof(
      fc.constantFrom("title: サンプル", "tags: [a, b]"),
      imageArbitrary.map((image) => `image: ${image}`)
    ),
    { maxLength: 3 }
  )
  .map((lines) => ["---", ...lines, "---"]);

/** 文書全体（LF） */
export const markdownDocumentArbitrary: fc.Arbitrary<string> = fc
  .tuple(
    fc.option(frontmatterArbitrary, { nil: undefined }),
    fc.array(
      fc.oneof(
        { weight: 4, arbitrary: markdownLineArbitrary.map((line) => [line]) },
        { weight: 1, arbitrary: fencedBlockArbitrary }
      ),
      { minLength: 1, maxLength: 8 }
    ),
    fc.boolean()
  )
  .map(([frontmatter, blocks, trailingNewline]) => {
    const lines = [...(frontmatter ?? []), ...blocks.flat()];
    return lines.join("\n") + (trailingNewline ? "\n" : "");
  });
