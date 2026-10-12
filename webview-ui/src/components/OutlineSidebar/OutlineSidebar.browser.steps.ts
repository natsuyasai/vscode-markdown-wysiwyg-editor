import { After, Before, Given, When } from "quickpickle";
import { page } from "vitest/browser";
import { installScrollSpy, restoreScrollSpy } from "../../test/gherkin/scrollSpy";

// quickpickleのstepタイムアウト（既定3秒）より短くし、失敗時にアサーションの内容が出るようにする
const ASSERTION_TIMEOUT_MS = 1_000;

Before("@outline", () => {
  installScrollSpy();
  return Promise.resolve();
});

After("@outline", () => {
  restoreScrollSpy();
  return Promise.resolve();
});

Given("アウトラインを開く", async () => {
  await page.getByRole("button", { name: "Open outline" }).click({ timeout: ASSERTION_TIMEOUT_MS });
});

When("アウトラインの{string}をクリックする", async (_world: unknown, text: string) => {
  await page
    .getByRole("navigation", { name: "Outline" })
    .getByRole("link", { name: text, exact: true })
    .click({ timeout: ASSERTION_TIMEOUT_MS });
});

When(
  "アウトラインの{int}番目の{string}をクリックする",
  async (_world: unknown, nth: number, text: string) => {
    await page
      .getByRole("navigation", { name: "Outline" })
      .getByRole("link", { name: text, exact: true })
      .nth(nth - 1)
      .click({ timeout: ASSERTION_TIMEOUT_MS });
  }
);
