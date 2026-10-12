import { act, cleanup, render, waitFor } from "@testing-library/react";
import { After, Given, Then, When } from "quickpickle";
import type { DocString, QuickPickleWorldInterface } from "quickpickle";
import { createElement } from "react";
import { expect, vi, type MockInstance } from "vitest";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import type { ThemeKind } from "@/constants/themeColors";
import { findExecutableMarkup } from "@/test/gherkin/findExecutableMarkup";
import { vscode } from "@/utilities/vscode";

interface ViewerSanitizeData {
  viewerPostMessage?: MockInstance<typeof vscode.postMessage>;
  viewerContainer?: HTMLElement;
}

function data(world: QuickPickleWorldInterface): ViewerSanitizeData {
  return world.data as ViewerSanitizeData;
}

function container(world: QuickPickleWorldInterface): HTMLElement {
  const root = data(world).viewerContainer;
  if (!root) {
    throw new Error("先にReadonly表示してください");
  }
  return root;
}

function diagram(world: QuickPickleWorldInterface): HTMLElement {
  const element = container(world).querySelector<HTMLElement>(".markdown-viewer-diagram");
  if (!element) {
    throw new Error("図がまだ表示されていません");
  }
  return element;
}

function requestedPlantUmlId(world: QuickPickleWorldInterface): string {
  const call = data(world)
    .viewerPostMessage?.mock.calls.map(([message]) => message)
    .find((message) => message.type === "renderPlantUml");
  const payload =
    call?.type === "renderPlantUml" ? (call.payload as { requestId: string }) : undefined;
  if (!payload) {
    throw new Error("PlantUMLの描画要求が送られていません");
  }
  return payload.requestId;
}

After((world: QuickPickleWorldInterface) => {
  cleanup();
  data(world).viewerPostMessage?.mockRestore();
  return Promise.resolve();
});

Given(
  "次のPlantUMLの図を含む文書をReadonly表示している:",
  (world: QuickPickleWorldInterface, markdown: DocString) => {
    const state = data(world);
    state.viewerPostMessage = vi.spyOn(vscode, "postMessage").mockImplementation(() => {});
    state.viewerContainer = render(
      createElement(MarkdownViewer, { value: markdown.toString(), theme: "light" })
    ).container;
  }
);

When(
  "拡張機能からReadonly表示の図に次のPlantUMLの描画結果が届く:",
  async (world: QuickPickleWorldInterface, svg: DocString) => {
    const requestId = requestedPlantUmlId(world);
    await act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "plantUmlResult", payload: { requestId, svg: svg.toString() } },
        })
      );
      return Promise.resolve();
    });
  }
);

When(
  "次のMermaidの図を含む文書を{word}テーマでReadonly表示する:",
  async (world: QuickPickleWorldInterface, theme: string, markdown: DocString) => {
    const state = data(world);
    state.viewerContainer = render(
      createElement(MarkdownViewer, { value: markdown.toString(), theme: theme as ThemeKind })
    ).container;
    await waitFor(() => {
      expect(diagram(world)).toBeDefined();
    });
  }
);

Then(
  "Readonly表示の図にスクリプトとして実行される要素や属性が含まれない",
  (world: QuickPickleWorldInterface) => {
    expect(findExecutableMarkup(diagram(world))).toEqual([]);
  }
);

Then("Readonly表示の図に{string}が表示される", (world: QuickPickleWorldInterface, text: string) => {
  expect(diagram(world).textContent).toContain(text);
});

Then(
  "Readonly表示の図の矩形の塗りは{string}である",
  (world: QuickPickleWorldInterface, fill: string) => {
    expect(diagram(world).querySelector("rect")?.getAttribute("fill")).toBe(fill);
  }
);
