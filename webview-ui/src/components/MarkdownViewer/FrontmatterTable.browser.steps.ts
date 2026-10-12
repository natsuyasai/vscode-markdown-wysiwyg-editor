import { composeStories } from "@storybook/react-vite";
import { render } from "@testing-library/react";
import { type DataTable, Given, Then } from "quickpickle";
import { createElement } from "react";
import { expect } from "vitest";
import { page } from "vitest/browser";
import * as stories from "./FrontmatterTable.stories";

const composedStories = composeStories(stories);

// quickpickleのstepタイムアウト（既定3秒）より短くし、失敗時にアサーションの内容が出るようにする
const ASSERTION_TIMEOUT_MS = 1_000;

type StoryName = keyof typeof composedStories;

function isStoryName(name: string): name is StoryName {
  return Object.hasOwn(composedStories, name);
}

Given("FrontmatterTableのストーリー{string}を描画する", (_world: unknown, storyName: string) => {
  if (!isStoryName(storyName)) {
    throw new Error(`FrontmatterTableに "${storyName}" というストーリーはありません`);
  }
  render(createElement(composedStories[storyName]));
});

Then(
  "表の見出しとして{string}と{string}が表示されている",
  async (_world: unknown, first: string, second: string) => {
    const header = page.getByRole("table").getByRole("row").first();
    await expect
      .element(header.getByText(first, { exact: true }), { timeout: ASSERTION_TIMEOUT_MS })
      .toBeVisible();
    await expect
      .element(header.getByText(second, { exact: true }), { timeout: ASSERTION_TIMEOUT_MS })
      .toBeVisible();
  }
);

Then("次の行が表示されている:", async (_world: unknown, table: DataTable) => {
  for (const row of table.hashes()) {
    const tableRow = page.getByRole("row").filter({ hasText: row["キー"] });
    await expect
      .element(tableRow.getByRole("cell", { name: row["キー"], exact: true }), {
        timeout: ASSERTION_TIMEOUT_MS,
      })
      .toBeVisible();
    await expect
      .element(tableRow.getByRole("cell", { name: row["値"], exact: true }), {
        timeout: ASSERTION_TIMEOUT_MS,
      })
      .toBeVisible();
  }
});
