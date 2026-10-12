import { render } from "@testing-library/react";
import { type DataTable, type DocString, Given, Then } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { createElement } from "react";
import { expect } from "vitest";
import { MarkdownViewer } from "@/components/MarkdownViewer";

const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";

type RenderResult = ReturnType<typeof render>;

interface ViewerData {
  rendered?: RenderResult;
}

function rendered(world: QuickPickleWorldInterface): RenderResult {
  const { rendered: result } = world.data as ViewerData;
  if (!result) {
    throw new Error("Readonly表示が描画されていません");
  }
  return result;
}

/** アウトライン（nav）の項目: リンク先のIDとテキスト */
function outlineItems(world: QuickPickleWorldInterface): { id: string; text: string }[] {
  const links = rendered(world).container.querySelectorAll<HTMLAnchorElement>("nav a");
  return [...links].map((link) => ({
    id: (link.getAttribute("href") ?? "").replace(/^#/, ""),
    text: link.textContent ?? "",
  }));
}

/** 本文の見出し要素（アウトラインの見出しは含めない） */
function bodyHeadings(world: QuickPickleWorldInterface): HTMLElement[] {
  const body = rendered(world).container.querySelector(".markdown-viewer");
  if (!body) {
    throw new Error("本文の領域がありません");
  }
  return [...body.querySelectorAll<HTMLElement>(HEADING_SELECTOR)];
}

Given(
  "Readonly表示で次のMarkdownを描画する:",
  (world: QuickPickleWorldInterface, markdown: DocString) => {
    (world.data as ViewerData).rendered = render(
      createElement(MarkdownViewer, { value: markdown.toString(), theme: "light" })
    );
  }
);

Then(
  "アウトラインの各項目のIDを持つ見出しが本文にアウトラインと同じ順序で存在する",
  (world: QuickPickleWorldInterface) => {
    const outlineIds = outlineItems(world).map((item) => item.id);
    expect(outlineIds.length).toBeGreaterThan(0);
    const bodyIds = bodyHeadings(world)
      .map((heading) => heading.id)
      .filter((id) => id !== "");
    expect(bodyIds).toEqual(outlineIds);
  }
);

Then("本文の見出しIDは次のとおり:", (world: QuickPickleWorldInterface, table: DataTable) => {
  const bodyIds = bodyHeadings(world)
    .map((heading) => heading.id)
    .filter((id) => id !== "");
  expect(bodyIds).toEqual(table.hashes().map((row) => row.id));
});

Then(
  "アウトラインの{string}のリンク先はMarkdownで書いた見出しである",
  (world: QuickPickleWorldInterface, text: string) => {
    const item = outlineItems(world).find((candidate) => candidate.text === text);
    expect(item).toBeDefined();
    const sameText = bodyHeadings(world).filter((heading) => heading.textContent === text);
    // HTMLで書いた見出しが先にあり、リンク先は2番目（Markdownで書いた方）になる
    expect(sameText.length).toBe(2);
    expect(sameText[0].id).toBe("");
    expect(sameText[1].id).toBe(item?.id);
  }
);
