import { type DataTable, type DocString, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect } from "vitest";
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

/** スクリプトとして実行される要素や属性（イベントハンドラ、javascriptスキーム等）を検出する */
export function findExecutableMarkup(root: Element): string[] {
  const found: string[] = [];
  const forbiddenTags = ["script", "iframe", "object", "embed", "animate", "set"];
  for (const element of root.querySelectorAll("*")) {
    if (forbiddenTags.includes(element.localName.toLowerCase())) {
      found.push(`<${element.localName}>`);
    }
    for (const attr of element.attributes) {
      if (/^on/i.test(attr.name)) {
        found.push(`${element.localName}[${attr.name}]`);
      }
      if (/^\s*javascript:/i.test(attr.value)) {
        found.push(`${element.localName}[${attr.name}=javascript:]`);
      }
    }
  }
  return found;
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
