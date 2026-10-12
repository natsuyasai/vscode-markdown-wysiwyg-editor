import { render } from "@testing-library/react";
import { After, Given, Then, When } from "quickpickle";
import type { DocString, QuickPickleWorldInterface } from "quickpickle";
import { createElement } from "react";
import { expect, vi } from "vitest";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { renderMermaidPreview } from "@/components/MilkdownEditor/diagramPreview";
import { findExecutableMarkup } from "@/test/gherkin/findExecutableMarkup";
import { renderMermaidToPng } from "@/utilities/mermaidToPng";

const ASSERTION_TIMEOUT_MS = 2_000;

type ProbeWindow = Window & {
  __mermaidExecuted?: boolean;
  [probe: string]: unknown;
};

interface MermaidSecurityData {
  mermaidDiagramRoot?: HTMLElement;
  mermaidProbeName?: string;
  mermaidProbe?: ReturnType<typeof vi.fn>;
  mermaidPng?: string | null;
}

let previewSeq = 0;

function data(world: QuickPickleWorldInterface): MermaidSecurityData {
  return world.data as MermaidSecurityData;
}

function diagramRoot(world: QuickPickleWorldInterface): HTMLElement {
  const root = data(world).mermaidDiagramRoot;
  if (!root) {
    throw new Error("先にMermaidの図を描画してください");
  }
  return root;
}

After((world: QuickPickleWorldInterface) => {
  const state = data(world);
  const probeWindow = window as unknown as ProbeWindow;
  if (state.mermaidProbeName) {
    delete probeWindow[state.mermaidProbeName];
  }
  delete probeWindow.__mermaidExecuted;
  document.body.querySelectorAll("[data-mermaid-preview]").forEach((element) => element.remove());
  return Promise.resolve();
});

Given(
  "次のMermaidの図をReadonly表示で描画する:",
  async (world: QuickPickleWorldInterface, code: DocString) => {
    const markdown = `\`\`\`mermaid\n${code.toString()}\n\`\`\``;
    const { container } = render(
      createElement(MarkdownViewer, { value: markdown, theme: "light" })
    );
    data(world).mermaidDiagramRoot = container;
    await expect
      .poll(() => container.querySelector(".markdown-viewer-diagram, .markdown-viewer-error"), {
        timeout: ASSERTION_TIMEOUT_MS * 5,
      })
      .not.toBeNull();
  }
);

Given(
  "Mermaidの図から呼び出される関数{string}を用意している",
  (world: QuickPickleWorldInterface, name: string) => {
    const probe = vi.fn();
    (window as unknown as ProbeWindow)[name] = probe;
    data(world).mermaidProbeName = name;
    data(world).mermaidProbe = probe;
  }
);

Given(
  "次のMermaidの図を編集画面のプレビューとして描画する:",
  async (world: QuickPickleWorldInterface, code: DocString) => {
    const host = document.createElement("div");
    host.dataset.mermaidPreview = "true";
    document.body.appendChild(host);
    data(world).mermaidDiagramRoot = host;
    renderMermaidPreview(code.toString(), `security-${previewSeq++}`, "light", (result) => {
      if (result) host.replaceChildren(result);
    });
    await expect
      .poll(() => host.querySelector("svg"), { timeout: ASSERTION_TIMEOUT_MS * 5 })
      .not.toBeNull();
  }
);

When(
  "Mermaidの図のノード{string}をクリックする",
  async (world: QuickPickleWorldInterface, label: string) => {
    const root = diagramRoot(world);
    const node = [...root.querySelectorAll<SVGElement>(".node, g.node")].find((element) =>
      element.textContent.includes(label)
    );
    expect(node, `ノード「${label}」`).toBeDefined();
    node?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    // クリックのコールバックが仮に非同期で呼ばれても検出できるよう、少し待つ
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
);

When(
  "次のMermaidの図を{word}テーマでPNG画像に変換する:",
  async (world: QuickPickleWorldInterface, theme: string, code: DocString) => {
    data(world).mermaidPng = await renderMermaidToPng(code.toString(), theme as "light" | "dark");
  }
);

Then("Mermaidの図のSVGが表示される", async (world: QuickPickleWorldInterface) => {
  const root = diagramRoot(world);
  await expect
    .poll(() => root.querySelector("svg"), { timeout: ASSERTION_TIMEOUT_MS })
    .not.toBeNull();
});

Then(
  "Mermaidの図に{string}が表示される",
  async (world: QuickPickleWorldInterface, text: string) => {
    const root = diagramRoot(world);
    await expect.poll(() => root.textContent, { timeout: ASSERTION_TIMEOUT_MS }).toContain(text);
  }
);

Then(
  "Mermaidの図にスクリプトとして実行される要素や属性が含まれない",
  (world: QuickPickleWorldInterface) => {
    expect(findExecutableMarkup(diagramRoot(world))).toEqual([]);
  }
);

Then("Mermaidの図の描画中にスクリプトが実行されていない", () => {
  expect((window as unknown as ProbeWindow).__mermaidExecuted).toBeUndefined();
});

Then(
  "Mermaidの図から関数{string}は呼び出されていない",
  (world: QuickPickleWorldInterface, name: string) => {
    expect(data(world).mermaidProbeName).toBe(name);
    expect(data(world).mermaidProbe).not.toHaveBeenCalled();
  }
);

Then("Mermaidの図のPNG画像のdata URIが得られる", (world: QuickPickleWorldInterface) => {
  expect(data(world).mermaidPng).toMatch(/^data:image\/png;base64,/);
});
