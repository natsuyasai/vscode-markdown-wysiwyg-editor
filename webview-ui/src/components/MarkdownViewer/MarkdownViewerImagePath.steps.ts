import { render } from "@testing-library/react";
import { Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { createElement } from "react";
import { expect } from "vitest";
import { MarkdownViewer } from "@/components/MarkdownViewer";

interface ImagePathData {
  baseUri?: string;
  container?: HTMLElement;
}

function data(world: QuickPickleWorldInterface): ImagePathData {
  return world.data as ImagePathData;
}

function renderViewer(world: QuickPickleWorldInterface, markdown: string) {
  const { container } = render(
    createElement(MarkdownViewer, { value: markdown, theme: "light", baseUri: data(world).baseUri })
  );
  data(world).container = container;
}

function imageSource(world: QuickPickleWorldInterface): string {
  const img = data(world).container?.querySelector("img");
  if (!img) {
    throw new Error("画像が描画されていません");
  }
  return img.getAttribute("src") ?? "";
}

Given("文書のディレクトリが{string}である", (world: QuickPickleWorldInterface, baseUri: string) => {
  data(world).baseUri = baseUri;
});

When("Readonly表示で画像{string}を描画する", (world: QuickPickleWorldInterface, src: string) => {
  renderViewer(world, `![代替テキスト](${src})`);
});

When(
  "Readonly表示でHTMLの画像{string}を描画する",
  (world: QuickPickleWorldInterface, src: string) => {
    renderViewer(world, `<img src="${src}" alt="代替テキスト">`);
  }
);

Then("画像の参照先は{string}になる", (world: QuickPickleWorldInterface, expected: string) => {
  expect(imageSource(world)).toBe(expected);
});

Then("画像の参照先に文書のディレクトリは含まれない", (world: QuickPickleWorldInterface) => {
  const baseUri = data(world).baseUri ?? "";
  expect(baseUri).not.toBe("");
  expect(imageSource(world)).not.toContain(baseUri);
});
