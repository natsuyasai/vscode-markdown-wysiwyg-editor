import { act, renderHook, type RenderHookResult } from "@testing-library/react";
import { After, Before, type DataTable, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect, vi } from "vitest";
import { EXTENSION_UPDATE_DEBOUNCE_MS, useExtensionMessages } from "@/hooks/useExtensionMessages";
import { vscode } from "@/utilities/vscode";

interface ExtensionMessagesData {
  hook?: RenderHookResult<void, unknown>;
  loaded?: string[];
  posted?: { type: string }[];
}

function data(world: QuickPickleWorldInterface): ExtensionMessagesData {
  return world.data as ExtensionMessagesData;
}

function receive(message: { type: string; payload: string }) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: message }));
  });
}

Before("@extension-messages", () => {
  vi.useFakeTimers();
  return Promise.resolve();
});

After("@extension-messages", () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  return Promise.resolve();
});

Given(
  "拡張機能からのメッセージを受け取るWebViewが起動している",
  (world: QuickPickleWorldInterface) => {
    const loaded: string[] = [];
    const posted: { type: string }[] = [];
    vi.spyOn(vscode, "postMessage").mockImplementation((message) => {
      posted.push(message);
    });
    data(world).loaded = loaded;
    data(world).posted = posted;
    data(world).hook = renderHook(() =>
      useExtensionMessages({
        vscodeThemeRef: { current: "light" },
        baseUriRef: { current: "" },
        documentDirRef: { current: "" },
        setTheme: () => undefined,
        setThemeSetting: () => undefined,
        setCustomCss: () => undefined,
        updateMarkdownFromExtension: (text) => {
          loaded.push(text);
        },
      })
    );
  }
);

When(
  "拡張機能から内容{string}の更新メッセージが届く",
  (_world: QuickPickleWorldInterface, text: string) => {
    receive({ type: "update", payload: text });
  }
);

When(
  "拡張機能から内容{string}のinitメッセージが届く",
  (_world: QuickPickleWorldInterface, text: string) => {
    receive({ type: "init", payload: text });
  }
);

When("{int}ミリ秒が過ぎる", (_world: QuickPickleWorldInterface, ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
});

When("受信の待ち時間が過ぎる", () => {
  act(() => {
    vi.advanceTimersByTime(EXTENSION_UPDATE_DEBOUNCE_MS);
  });
});

When("受信の待ち時間が過ぎる前にWebViewが閉じられる", (world: QuickPickleWorldInterface) => {
  data(world).hook?.unmount();
  act(() => {
    vi.advanceTimersByTime(EXTENSION_UPDATE_DEBOUNCE_MS * 2);
  });
});

Then("取り込まれた内容は次の順である:", (world: QuickPickleWorldInterface, table: DataTable) => {
  expect(data(world).loaded).toEqual(table.hashes().map((row) => row["内容"]));
});

Then("取り込まれた内容はない", (world: QuickPickleWorldInterface) => {
  expect(data(world).loaded).toEqual([]);
});

Then("拡張機能へ init メッセージが送られている", (world: QuickPickleWorldInterface) => {
  expect(data(world).posted).toContainEqual({ type: "init" });
});
