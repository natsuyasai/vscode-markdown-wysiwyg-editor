import { cleanup, render } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownViewer } from "@/components/MarkdownViewer";

/**
 * Readonly表示のプロパティベーステスト（H-01）。
 * 検証する性質: どんな文書でも、アウトラインの各項目のリンク先IDは、
 * 本文に描画された（Markdownで書いた）見出し要素のIDと、同じ順序で一致する。
 * HTMLで書いた見出しはIDを持たず、同名のMarkdown見出しの連番にも影響しない。
 */

const wordArb = fc
  .array(fc.constantFrom(..."abNote太字リンク12".split("")), { minLength: 1, maxLength: 4 })
  .map((chars) => chars.join(""));
// 重複が起きやすいよう、少ない語彙から選ぶ
const textArb = fc.oneof(fc.constantFrom("Note", "Intro", "太字"), wordArb);

const blockArb = fc.oneof(
  fc.tuple(fc.integer({ min: 1, max: 6 }), textArb).map(([n, t]) => `${"#".repeat(n)} ${t}`),
  fc.tuple(fc.integer({ min: 1, max: 6 }), textArb).map(([n, t]) => `${"#".repeat(n)} **${t}**`),
  fc.tuple(fc.integer({ min: 1, max: 6 }), textArb).map(([n, t]) => `${"#".repeat(n)} [${t}](#x)`),
  fc.tuple(fc.integer({ min: 1, max: 6 }), textArb).map(([n, t]) => `<h${n}>${t}</h${n}>`),
  textArb.map((t) => `${t}\n====`),
  textArb.map((t) => `> ## ${t}`),
  textArb.map((t) => `段落 ${t}`)
);

describe("MarkdownViewer の見出しID", () => {
  afterEach(cleanup);

  it("アウトラインのIDと、本文のMarkdown見出しのIDが同じ並びで一致する", () => {
    fc.assert(
      fc.property(fc.array(blockArb, { maxLength: 8 }), (blocks) => {
        const { container, unmount } = render(
          <MarkdownViewer value={blocks.join("\n\n")} theme="light" />
        );
        const outlineIds = [...container.querySelectorAll<HTMLAnchorElement>("nav a")].map((a) =>
          (a.getAttribute("href") ?? "").replace(/^#/, "")
        );
        const body = container.querySelector(".markdown-viewer");
        const bodyIds = [...(body?.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6") ?? [])]
          .map((heading) => heading.id)
          .filter((id) => id !== "");
        unmount();
        expect(bodyIds).toEqual(outlineIds);
      }),
      { numRuns: 40 }
    );
  });
});
