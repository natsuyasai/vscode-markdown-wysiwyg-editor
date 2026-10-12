import { After, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect, vi } from "vitest";
import { PlantUmlCallbackManager } from "@/utilities/plantUmlCallbackManager";

type Callback = () => void;

interface CallbackManagerData {
  plantUmlFakeTimers?: boolean;
  plantUmlManager?: PlantUmlCallbackManager<Callback>;
  plantUmlTimeoutMs?: number;
  plantUmlTimeouts?: string[];
  plantUmlResolved?: Callback;
}

function data(world: QuickPickleWorldInterface): CallbackManagerData {
  return world.data as CallbackManagerData;
}

function manager(world: QuickPickleWorldInterface): PlantUmlCallbackManager<Callback> {
  const { plantUmlManager } = data(world);
  if (!plantUmlManager) {
    throw new Error("先にPlantUMLのコールバック管理を用意してください");
  }
  return plantUmlManager;
}

function registerCallback(world: QuickPickleWorldInterface, requestId: string): void {
  const state = data(world);
  manager(world).register(requestId, () => undefined, {
    timeoutMs: state.plantUmlTimeoutMs ?? 0,
    onTimeout: () => {
      state.plantUmlTimeouts?.push(requestId);
    },
  });
}

After((world: QuickPickleWorldInterface) => {
  if (data(world).plantUmlFakeTimers) {
    vi.useRealTimers();
  }
  return Promise.resolve();
});

Given(
  "PlantUMLのコールバック管理の検証用にフェイクタイマーを使う",
  (world: QuickPickleWorldInterface) => {
    vi.useFakeTimers();
    data(world).plantUmlFakeTimers = true;
  }
);

Given(
  "PlantUMLの応答待ちの上限を{int}ミリ秒としたコールバック管理がある",
  (world: QuickPickleWorldInterface, timeoutMs: number) => {
    const state = data(world);
    state.plantUmlManager = new PlantUmlCallbackManager<Callback>();
    state.plantUmlTimeoutMs = timeoutMs;
    state.plantUmlTimeouts = [];
  }
);

Given(
  "PlantUMLのコールバックをリクエストID{string}で登録する",
  (world: QuickPickleWorldInterface, requestId: string) => {
    registerCallback(world, requestId);
  }
);

Given(
  "{int}ミリ秒経過してからPlantUMLのコールバックをリクエストID{string}で登録する",
  (world: QuickPickleWorldInterface, elapsedMs: number, requestId: string) => {
    vi.advanceTimersByTime(elapsedMs);
    registerCallback(world, requestId);
  }
);

When(
  "リクエストID{string}のPlantUMLのコールバック登録を解除する",
  (world: QuickPickleWorldInterface, requestId: string) => {
    manager(world).unregister(requestId);
  }
);

When(
  "{int}ミリ秒経過してからリクエストID{string}のPlantUMLのコールバックを取り出す",
  (world: QuickPickleWorldInterface, elapsedMs: number, requestId: string) => {
    vi.advanceTimersByTime(elapsedMs);
    data(world).plantUmlResolved = manager(world).resolve(requestId);
  }
);

Then("PlantUMLのコールバックが取り出せる", (world: QuickPickleWorldInterface) => {
  expect(data(world).plantUmlResolved).toBeTypeOf("function");
});

Then("PlantUMLのコールバックは取り出せない", (world: QuickPickleWorldInterface) => {
  expect(data(world).plantUmlResolved).toBeUndefined();
});

Then(
  "PlantUMLのタイムアウト通知は{int}回である",
  (world: QuickPickleWorldInterface, count: number) => {
    expect(data(world).plantUmlTimeouts).toHaveLength(count);
  }
);

Then(
  "リクエストID{string}のPlantUMLのタイムアウト通知が{int}回届いている",
  (world: QuickPickleWorldInterface, requestId: string, count: number) => {
    expect(data(world).plantUmlTimeouts?.filter((id) => id === requestId)).toHaveLength(count);
  }
);
