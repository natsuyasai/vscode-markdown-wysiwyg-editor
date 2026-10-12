import { type DocString, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect } from "vitest";
import {
  splitForEditor,
  splitFrontmatter,
  type SplitFrontmatter,
} from "@/utilities/parseFrontmatter";

interface SplitFrontmatterData {
  markdown?: string;
  split?: SplitFrontmatter;
  editorSplit?: { prefix: string; body: string };
}

function data(world: QuickPickleWorldInterface): SplitFrontmatterData {
  return world.data as SplitFrontmatterData;
}

function result(world: QuickPickleWorldInterface): SplitFrontmatter {
  const { split } = data(world);
  if (!split) {
    throw new Error("フロントマターの切り出しが行われていません");
  }
  return split;
}

Given(
  "フロントマター切り出し対象のMarkdown:",
  (world: QuickPickleWorldInterface, markdown: DocString) => {
    data(world).markdown = markdown.toString();
  }
);

When("フロントマターを切り出す", (world: QuickPickleWorldInterface) => {
  data(world).split = splitFrontmatter(data(world).markdown ?? "");
});

Then(
  "切り出したフロントマターは次の文字列である:",
  (world: QuickPickleWorldInterface, expected: DocString) => {
    expect(result(world).raw).toBe(expected.toString());
  }
);

Then(
  "切り出した本文は次の文字列である:",
  (world: QuickPickleWorldInterface, expected: DocString) => {
    expect(result(world).body).toBe(expected.toString());
  }
);

Then("フロントマターは切り出されない", (world: QuickPickleWorldInterface) => {
  expect(result(world).raw).toBe("");
  expect(result(world).body).toBe(data(world).markdown);
});

When("編集領域に渡す形に切り出す", (world: QuickPickleWorldInterface) => {
  data(world).editorSplit = splitForEditor(data(world).markdown ?? "");
});

Then(
  "編集領域に渡す前置きは次の文字列である:",
  (world: QuickPickleWorldInterface, expected: DocString) => {
    expect(data(world).editorSplit?.prefix).toBe(expected.toString());
  }
);

Then("編集領域に渡す前置きは空である", (world: QuickPickleWorldInterface) => {
  expect(data(world).editorSplit?.prefix).toBe("");
});

Then(
  "編集領域に渡す本文は次の文字列である:",
  (world: QuickPickleWorldInterface, expected: DocString) => {
    expect(data(world).editorSplit?.body).toBe(expected.toString());
  }
);
