import { type DataTable, type DocString, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect } from "vitest";
import { findExecutableMarkup } from "@/test/gherkin/findExecutableMarkup";
import { sanitizeDiagramSvg } from "@/utilities/sanitizeDiagramSvg";

interface SanitizeDiagramSvgData {
  diagramSvg?: string;
  sanitizedDiagramSvg?: string;
}

function data(world: QuickPickleWorldInterface): SanitizeDiagramSvgData {
  return world.data as SanitizeDiagramSvgData;
}

function sanitizedContainer(world: QuickPickleWorldInterface): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = data(world).sanitizedDiagramSvg ?? "";
  return container;
}

Given("次の図のSVG:", (world: QuickPickleWorldInterface, svg: DocString) => {
  data(world).diagramSvg = svg.toString();
});

When("図のSVGを無害化する", (world: QuickPickleWorldInterface) => {
  data(world).sanitizedDiagramSvg = sanitizeDiagramSvg(data(world).diagramSvg ?? "");
});

Then(
  "無害化した図のSVGに次の要素が残っている:",
  (world: QuickPickleWorldInterface, table: DataTable) => {
    const container = sanitizedContainer(world);
    for (const row of table.hashes()) {
      expect(container.querySelector(row["セレクタ"]), row["セレクタ"]).not.toBeNull();
    }
  }
);

Then(
  "無害化した図のSVGのテキストに{string}が含まれる",
  (world: QuickPickleWorldInterface, text: string) => {
    expect(sanitizedContainer(world).textContent).toContain(text);
  }
);

Then(
  "無害化した図のSVGのスタイルに{string}が含まれる",
  (world: QuickPickleWorldInterface, text: string) => {
    expect(sanitizedContainer(world).querySelector("style")?.textContent).toContain(text);
  }
);

Then(
  "無害化した図のSVGにスクリプトとして実行される要素や属性が含まれない",
  (world: QuickPickleWorldInterface) => {
    expect(findExecutableMarkup(sanitizedContainer(world))).toEqual([]);
  }
);

Then(
  "無害化した図のSVGのuse要素の参照先はすべて{string}で始まる",
  (world: QuickPickleWorldInterface, prefix: string) => {
    const uses = sanitizedContainer(world).querySelectorAll("use");
    expect(uses.length).toBeGreaterThan(0);
    for (const use of uses) {
      const href = use.getAttribute("href") ?? use.getAttribute("xlink:href");
      if (href !== null) {
        expect(href.startsWith(prefix)).toBe(true);
      }
    }
  }
);
