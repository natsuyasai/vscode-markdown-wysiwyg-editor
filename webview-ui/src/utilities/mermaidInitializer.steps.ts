import mermaid, { type MermaidConfig } from "mermaid";
import { After, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect, vi, type MockInstance } from "vitest";
import type { ThemeKind } from "@/constants/themeColors";
import { initializeMermaid } from "@/utilities/mermaidInitializer";

interface MermaidInitializerData {
  mermaidInitializeSpy?: MockInstance<typeof mermaid.initialize>;
}

function data(world: QuickPickleWorldInterface): MermaidInitializerData {
  return world.data as MermaidInitializerData;
}

function initializedConfig(world: QuickPickleWorldInterface): MermaidConfig {
  const spy = data(world).mermaidInitializeSpy;
  const config = spy?.mock.calls.at(-1)?.[0];
  if (!config) {
    throw new Error("先にMermaidを初期化してください");
  }
  return config;
}

After((world: QuickPickleWorldInterface) => {
  data(world).mermaidInitializeSpy?.mockRestore();
  return Promise.resolve();
});

When("{word}テーマでMermaidを初期化する", (world: QuickPickleWorldInterface, theme: string) => {
  data(world).mermaidInitializeSpy = vi.spyOn(mermaid, "initialize").mockImplementation(() => {});
  initializeMermaid(theme as ThemeKind);
});

Then(
  "Mermaidの初期化設定のセキュリティレベルは{string}である",
  (world: QuickPickleWorldInterface, level: string) => {
    expect(initializedConfig(world).securityLevel).toBe(level);
  }
);

Then("Mermaidの初期化設定でHTMLラベルは無効である", (world: QuickPickleWorldInterface) => {
  const config = initializedConfig(world);
  expect(config.htmlLabels).toBe(false);
  expect(config.flowchart?.htmlLabels).toBe(false);
});
