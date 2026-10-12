import { render } from "@testing-library/react";
import { type DocString, Given, Then } from "quickpickle";
import { createElement } from "react";
import { expect } from "vitest";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { scrolledElements } from "../../test/gherkin/scrollSpy";

Given("Readonly表示で次のMarkdownを開く:", (_world: unknown, markdown: DocString) => {
  render(createElement(MarkdownViewer, { value: markdown.toString(), theme: "light" }));
});

Then("本文の見出し{string}だけがスクロール先になる", (_world: unknown, text: string) => {
  const targets = scrolledElements();
  expect(targets).toHaveLength(1);
  expect(targets[0].textContent).toBe(text);
  expect(targets[0].closest(".markdown-viewer")).not.toBeNull();
});

Then("Markdownで書いた見出し{string}だけがスクロール先になる", (_world: unknown, text: string) => {
  const targets = scrolledElements();
  expect(targets).toHaveLength(1);
  expect(targets[0].textContent).toBe(text);
  // HTMLで書いた見出しはIDを持たない。ジャンプ先はIDを持つMarkdown側の見出しである
  expect(targets[0].id).not.toBe("");
});
