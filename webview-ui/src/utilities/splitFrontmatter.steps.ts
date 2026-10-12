import { type DocString, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect } from "vitest";
import { splitFrontmatter, type SplitFrontmatter } from "@/utilities/parseFrontmatter";

interface SplitFrontmatterData {
  markdown?: string;
  split?: SplitFrontmatter;
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
