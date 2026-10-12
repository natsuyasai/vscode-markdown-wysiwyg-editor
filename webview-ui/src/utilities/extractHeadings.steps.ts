import { type DataTable, type DocString, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect } from "vitest";
import { extractHeadings, type HeadingItem } from "@/utilities/extractHeadings";

interface ExtractHeadingsData {
  markdown?: string;
  headings?: HeadingItem[];
}

function data(world: QuickPickleWorldInterface): ExtractHeadingsData {
  return world.data as ExtractHeadingsData;
}

Given("次のMarkdown:", (world: QuickPickleWorldInterface, markdown: DocString) => {
  data(world).markdown = markdown.toString();
});

When("見出しを抽出する", (world: QuickPickleWorldInterface) => {
  data(world).headings = extractHeadings(data(world).markdown ?? "");
});

Then("次の見出しが得られる:", (world: QuickPickleWorldInterface, table: DataTable) => {
  const expected = table.hashes().map((row) => ({
    level: Number(row.level),
    text: row.text,
    id: row.id,
  }));
  expect(data(world).headings).toEqual(expected);
});

Then("見出しは1件も得られない", (world: QuickPickleWorldInterface) => {
  expect(data(world).headings).toEqual([]);
});
