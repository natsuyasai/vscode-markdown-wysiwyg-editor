import { After, Given, Then, When } from "quickpickle";
import type { DocString, QuickPickleWorldInterface } from "quickpickle";
import { expect, vi, type MockInstance } from "vitest";
import {
  handlePlantUmlResult,
  renderMermaidPreview,
  renderPlantUmlPreview,
} from "@/components/MilkdownEditor/diagramPreview";
import type { ThemeKind } from "@/constants/themeColors";
import { findExecutableMarkup } from "@/test/gherkin/findExecutableMarkup";
import { vscode } from "@/utilities/vscode";

interface DiagramPreviewSanitizeData {
  diagramPreviewPostMessage?: MockInstance<typeof vscode.postMessage>;
  diagramPreviewRequestId?: string;
  diagramPreviewResult?: HTMLElement | null;
}

let previewSeq = 0;

function data(world: QuickPickleWorldInterface): DiagramPreviewSanitizeData {
  return world.data as DiagramPreviewSanitizeData;
}

function previewResult(world: QuickPickleWorldInterface): HTMLElement {
  const result = data(world).diagramPreviewResult;
  if (!result) {
    throw new Error("図プレビューがまだ反映されていません");
  }
  return result;
}

After((world: QuickPickleWorldInterface) => {
  data(world).diagramPreviewPostMessage?.mockRestore();
  return Promise.resolve();
});

Given(
  "編集画面の図プレビューでPlantUMLの描画を要求している",
  (world: QuickPickleWorldInterface) => {
    const state = data(world);
    state.diagramPreviewPostMessage = vi.spyOn(vscode, "postMessage").mockImplementation(() => {});
    const requestId = `sanitize-plantuml-${previewSeq++}`;
    state.diagramPreviewRequestId = requestId;
    renderPlantUmlPreview(`@startuml\nA -> B: ${requestId}\n@enduml`, requestId, (result) => {
      state.diagramPreviewResult = result;
    });
  }
);

When(
  "拡張機能から編集画面の図プレビューに次のPlantUMLの描画結果が届く:",
  (world: QuickPickleWorldInterface, svg: DocString) => {
    handlePlantUmlResult(data(world).diagramPreviewRequestId ?? "", svg.toString());
  }
);

When(
  "拡張機能から編集画面の図プレビューにPlantUMLの描画エラー{string}が届く",
  (world: QuickPickleWorldInterface, error: string) => {
    handlePlantUmlResult(data(world).diagramPreviewRequestId ?? "", undefined, error);
  }
);

When(
  "編集画面で{word}テーマのMermaidの図のプレビューを描画する",
  async (world: QuickPickleWorldInterface, theme: string) => {
    await new Promise<void>((resolve) => {
      renderMermaidPreview(
        "graph TD\n  A[x]",
        `sanitize-${previewSeq++}`,
        theme as ThemeKind,
        (result) => {
          data(world).diagramPreviewResult = result;
          resolve();
        }
      );
    });
  }
);

Then(
  "編集画面の図プレビューにスクリプトとして実行される要素や属性が含まれない",
  (world: QuickPickleWorldInterface) => {
    expect(findExecutableMarkup(previewResult(world))).toEqual([]);
  }
);

Then(
  "編集画面の図プレビューに{string}が表示される",
  (world: QuickPickleWorldInterface, text: string) => {
    expect(previewResult(world).textContent).toContain(text);
  }
);

Then(
  "編集画面の図プレビューの矩形の塗りは{string}である",
  (world: QuickPickleWorldInterface, fill: string) => {
    expect(previewResult(world).querySelector("rect")?.getAttribute("fill")).toBe(fill);
  }
);
