import { After, Before, Given, When } from "quickpickle";
import { vi } from "vitest";
import { page } from "vitest/browser";
import { installScrollSpy, restoreScrollSpy } from "../../test/gherkin/scrollSpy";

// quickpickleのstepタイムアウト（既定3秒）より短くし、失敗時にアサーションの内容が出るようにする
const WAIT_TIMEOUT_MS = 2_500;

Before("@outline", () => {
  installScrollSpy();
  return Promise.resolve();
});

After("@outline", () => {
  restoreScrollSpy();
  return Promise.resolve();
});

/**
 * 要素のクリックを、DOMのclick()で行う。
 * サイドバーはスライドのアニメーションを持ち、並列実行中のタブではアニメーションが進まず、
 * 座標クリックでは「安定するまで待つ」が終わらないため。
 */
async function domClick(locator: ReturnType<typeof page.getByRole>): Promise<void> {
  await vi.waitFor(
    () => {
      const element = locator.element();
      if (!(element instanceof HTMLElement)) {
        throw new Error("クリックできる要素がありません");
      }
      element.click();
    },
    { timeout: WAIT_TIMEOUT_MS }
  );
}

Given("アウトラインを開く", async () => {
  await domClick(page.getByRole("button", { name: "Open outline" }));
});

function outlineLink(text: string) {
  return page
    .getByRole("navigation", { name: "Outline", includeHidden: true })
    .getByRole("link", { name: text, exact: true, includeHidden: true });
}

When("アウトラインの{string}をクリックする", async (_world: unknown, text: string) => {
  await domClick(outlineLink(text));
});

When(
  "アウトラインの{int}番目の{string}をクリックする",
  async (_world: unknown, nth: number, text: string) => {
    await domClick(outlineLink(text).nth(nth - 1));
  }
);
