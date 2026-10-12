import mermaid from "mermaid";
import { After, Given } from "quickpickle";
import type { DocString, QuickPickleWorldInterface } from "quickpickle";
import { vi, type MockInstance } from "vitest";

/**
 * jsdomではMermaidの実描画ができないため、`mermaid.render`が返すSVGを差し替える。
 * 編集画面とReadonly表示の両方のfeatureで共通に使う（vi.mockは使わず、After で復元する）。
 */
interface MermaidRenderStubData {
  mermaidRenderSpy?: MockInstance<typeof mermaid.render>;
}

function data(world: QuickPickleWorldInterface): MermaidRenderStubData {
  return world.data as MermaidRenderStubData;
}

After((world: QuickPickleWorldInterface) => {
  data(world).mermaidRenderSpy?.mockRestore();
  return Promise.resolve();
});

Given("Mermaidが次のSVGを出力する:", (world: QuickPickleWorldInterface, svg: DocString) => {
  data(world).mermaidRenderSpy = vi
    .spyOn(mermaid, "render")
    .mockResolvedValue({ svg: svg.toString(), diagramType: "flowchart" });
});
