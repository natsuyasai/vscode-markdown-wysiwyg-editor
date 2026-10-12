import { After, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect, vi, type MockInstance } from "vitest";
import {
  handlePlantUmlResult,
  renderPlantUmlPreview,
} from "@/components/MilkdownEditor/diagramPreview";
import { PLANTUML_RESPONSE_TIMEOUT_MS } from "@/utilities/plantUmlCallbackManager";
import { vscode } from "@/utilities/vscode";

interface PlantUmlPreviewData {
  plantUmlPreviewFakeTimers?: boolean;
  plantUmlPreviewTimeoutMs?: number;
  plantUmlPostMessage?: MockInstance<typeof vscode.postMessage>;
  /** リクエストIDごとに、プレビューへ反映された要素 */
  plantUmlApplied?: Map<string, (HTMLElement | null)[]>;
}

function data(world: QuickPickleWorldInterface): PlantUmlPreviewData {
  return world.data as PlantUmlPreviewData;
}

function previewTimeoutMs(world: QuickPickleWorldInterface): number {
  const timeoutMs = data(world).plantUmlPreviewTimeoutMs;
  if (timeoutMs === undefined) {
    throw new Error("先にPlantUMLのプレビューの応答待ちの上限を指定してください");
  }
  return timeoutMs;
}

function applied(world: QuickPickleWorldInterface, requestId: string): (HTMLElement | null)[] {
  return data(world).plantUmlApplied?.get(requestId) ?? [];
}

function renderRequests(world: QuickPickleWorldInterface): unknown[] {
  const postMessage = data(world).plantUmlPostMessage;
  if (!postMessage) {
    throw new Error("先に拡張機能へのメッセージを記録してください");
  }
  return postMessage.mock.calls
    .map(([message]) => message)
    .filter((message) => message.type === "renderPlantUml");
}

After((world: QuickPickleWorldInterface) => {
  const state = data(world);
  if (state.plantUmlPreviewFakeTimers) {
    // 応答待ちの要求が次のシナリオに残らないよう、上限まで進めてから実時間に戻す
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  }
  state.plantUmlPostMessage?.mockRestore();
  return Promise.resolve();
});

Given("PlantUMLのプレビュー検証用にフェイクタイマーを使う", (world: QuickPickleWorldInterface) => {
  vi.useFakeTimers();
  data(world).plantUmlPreviewFakeTimers = true;
});

Given(
  "PlantUMLのプレビュー検証用に拡張機能へのメッセージを記録する",
  (world: QuickPickleWorldInterface) => {
    data(world).plantUmlPostMessage = vi
      .spyOn(vscode, "postMessage")
      .mockImplementation(() => undefined);
  }
);

Given(
  "PlantUMLのプレビューの応答待ちの上限を{int}ミリ秒とする",
  (world: QuickPickleWorldInterface, timeoutMs: number) => {
    data(world).plantUmlPreviewTimeoutMs = timeoutMs;
  }
);

Given(
  "PlantUMLプレビューをリクエストID{string}、コード{string}で要求する",
  (world: QuickPickleWorldInterface, requestId: string, code: string) => {
    const state = data(world);
    state.plantUmlApplied ??= new Map();
    const results: (HTMLElement | null)[] = [];
    state.plantUmlApplied.set(requestId, results);
    renderPlantUmlPreview(
      code,
      requestId,
      (result) => {
        results.push(result);
      },
      previewTimeoutMs(world)
    );
  }
);

When(
  "拡張機能からリクエストID{string}のPlantUML描画結果としてSVG{string}が返る",
  (_world: QuickPickleWorldInterface, requestId: string, svg: string) => {
    handlePlantUmlResult(requestId, svg);
  }
);

When(
  "拡張機能からリクエストID{string}のPlantUML描画結果としてエラー{string}が返る",
  (_world: QuickPickleWorldInterface, requestId: string, error: string) => {
    handlePlantUmlResult(requestId, undefined, error);
  }
);

When("PlantUMLの応答待ちの上限まで時間が経過する", (world: QuickPickleWorldInterface) => {
  vi.advanceTimersByTime(previewTimeoutMs(world));
});

When(
  "PlantUMLの応答待ちの上限の1ミリ秒前まで時間が経過する",
  (world: QuickPickleWorldInterface) => {
    vi.advanceTimersByTime(previewTimeoutMs(world) - 1);
  }
);

Then(
  "拡張機能にPlantUMLの描画要求がリクエストID{string}、コード{string}で{int}回送られている",
  (world: QuickPickleWorldInterface, requestId: string, code: string, count: number) => {
    const expected = { type: "renderPlantUml", payload: { code, requestId } };
    const matched = renderRequests(world).filter(
      (message) => JSON.stringify(message) === JSON.stringify(expected)
    );
    expect(matched).toHaveLength(count);
  }
);

Then(
  "拡張機能へのPlantUMLの描画要求は{int}回である",
  (world: QuickPickleWorldInterface, count: number) => {
    expect(renderRequests(world)).toHaveLength(count);
  }
);

Then(
  "リクエストID{string}のPlantUMLプレビューにSVGが表示されている",
  (world: QuickPickleWorldInterface, requestId: string) => {
    const last = applied(world, requestId).at(-1);
    expect(last?.querySelector("svg")).not.toBeNull();
  }
);

Then(
  "リクエストID{string}のPlantUMLプレビューに{string}を含むエラーが表示されている",
  (world: QuickPickleWorldInterface, requestId: string, message: string) => {
    const last = applied(world, requestId).at(-1);
    expect(last?.textContent).toContain(message);
    expect(last?.querySelector("svg")).toBeNull();
  }
);

Then(
  "リクエストID{string}のPlantUMLプレビューの更新は{int}回だけである",
  (world: QuickPickleWorldInterface, requestId: string, count: number) => {
    expect(applied(world, requestId)).toHaveLength(count);
  }
);

Then(
  "リクエストID{string}のPlantUMLプレビューはまだ更新されていない",
  (world: QuickPickleWorldInterface, requestId: string) => {
    expect(applied(world, requestId)).toHaveLength(0);
  }
);

Then(
  "PlantUMLのプレビューの応答待ちの上限の既定値は{int}ミリ秒である",
  (_world: QuickPickleWorldInterface, timeoutMs: number) => {
    expect(PLANTUML_RESPONSE_TIMEOUT_MS).toBe(timeoutMs);
  }
);
