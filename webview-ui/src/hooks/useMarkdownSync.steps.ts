import { act, renderHook, type RenderHookResult } from "@testing-library/react";
import { After, Before, type DocString, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect, vi } from "vitest";
import { UPDATE_DEBOUNCE_MS, useMarkdownSync } from "@/hooks/useMarkdownSync";
import { flushPendingEdits } from "@/utilities/pendingEditsFlusher";
import { vscode } from "@/utilities/vscode";

type SyncHook = RenderHookResult<ReturnType<typeof useMarkdownSync>, unknown>;

interface SentMessage {
  type: string;
  payload: string;
}

interface SyncHookData {
  hook?: SyncHook;
  sent?: SentMessage[];
}

function data(world: QuickPickleWorldInterface): SyncHookData {
  return world.data as SyncHookData;
}

function syncHook(world: QuickPickleWorldInterface): SyncHook {
  const { hook } = data(world);
  if (!hook) {
    throw new Error("同期フックを使うWebViewが起動していません");
  }
  return hook;
}

function sentMessages(world: QuickPickleWorldInterface, type: string): SentMessage[] {
  return (data(world).sent ?? []).filter((message) => message.type === type);
}

function advance(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

Before("@sync-hook", () => {
  vi.useFakeTimers();
  return Promise.resolve();
});

After("@sync-hook", () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  return Promise.resolve();
});

Given("同期フックを使うWebViewが起動している", (world: QuickPickleWorldInterface) => {
  const sent: SentMessage[] = [];
  vi.spyOn(vscode, "postMessage").mockImplementation((message) => {
    sent.push(message as unknown as SentMessage);
  });
  data(world).sent = sent;
  data(world).hook = renderHook(() => useMarkdownSync());
});

Given("拡張機能から次の文書を受信した:", (world: QuickPickleWorldInterface, text: DocString) => {
  act(() => {
    syncHook(world).result.current.updateMarkdownFromExtension(text.toString());
  });
});

Given(
  "エディタが次の内容を読み込んだ:",
  (world: QuickPickleWorldInterface, serialized: DocString) => {
    act(() => {
      syncHook(world).result.current.handleBaselineLoaded(serialized.toString());
    });
    // 起動時のやり取りは検証の対象にしない
    data(world).sent?.splice(0);
  }
);

When(
  "エディタの出力が次の内容に変わる:",
  (world: QuickPickleWorldInterface, markdown: DocString) => {
    act(() => {
      syncHook(world).result.current.setMarkdown(markdown.toString());
    });
  }
);

When(
  "エディタが作り直されて、次の内容を読み込んだ:",
  (world: QuickPickleWorldInterface, serialized: DocString) => {
    act(() => {
      syncHook(world).result.current.handleBaselineLoaded(serialized.toString());
    });
  }
);

When("編集が止まって{int}ミリ秒が経つ", (_world: QuickPickleWorldInterface, ms: number) => {
  advance(ms);
});

When("編集が続いたまま{int}ミリ秒が経つ", (_world: QuickPickleWorldInterface, ms: number) => {
  expect(ms).toBeLessThan(UPDATE_DEBOUNCE_MS);
  advance(ms);
});

When("保存操作をする", (world: QuickPickleWorldInterface) => {
  act(() => {
    syncHook(world).result.current.handleApply();
  });
});

When("エクスポートの前に未反映の編集を確定させる", () => {
  act(() => {
    flushPendingEdits();
  });
});

When("タブが隠れる", () => {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  visibility.mockRestore();
});

When("ページが閉じられる", () => {
  act(() => {
    window.dispatchEvent(new Event("pagehide"));
  });
});

Then(
  "更新メッセージが1回だけ送られていて、内容は次のとおりである:",
  (world: QuickPickleWorldInterface, expected: DocString) => {
    expect(sentMessages(world, "update")).toEqual([
      { type: "update", payload: expected.toString() },
    ]);
  }
);

Then(
  "保存メッセージが1回だけ送られていて、内容は次のとおりである:",
  (world: QuickPickleWorldInterface, expected: DocString) => {
    expect(sentMessages(world, "save")).toEqual([{ type: "save", payload: expected.toString() }]);
  }
);

Then(
  "最後の保存メッセージの内容は次のとおりである:",
  (world: QuickPickleWorldInterface, expected: DocString) => {
    expect(sentMessages(world, "save").at(-1)?.payload).toBe(expected.toString());
  }
);

Then("更新メッセージは送られていない", (world: QuickPickleWorldInterface) => {
  expect(sentMessages(world, "update")).toEqual([]);
});

Then("保存メッセージは送られていない", (world: QuickPickleWorldInterface) => {
  expect(sentMessages(world, "save")).toEqual([]);
});

Then("送られたテキストにはCRが含まれない", (world: QuickPickleWorldInterface) => {
  const messages = [...sentMessages(world, "save"), ...sentMessages(world, "update")];
  expect(messages.length).toBeGreaterThan(0);
  for (const message of messages) {
    expect(message.payload).not.toContain("\r");
  }
});

Then(
  "エディタの出力は次のとおりである:",
  (world: QuickPickleWorldInterface, expected: DocString) => {
    expect(syncHook(world).result.current.markdown).toBe(expected.toString());
  }
);

Then("競合は通知されていない", (world: QuickPickleWorldInterface) => {
  expect(syncHook(world).result.current.hasMergeConflict).toBe(false);
});

Then("競合が通知されている", (world: QuickPickleWorldInterface) => {
  expect(syncHook(world).result.current.hasMergeConflict).toBe(true);
});
