import { setProjectAnnotations } from "@storybook/react-vite";
import { beforeAll } from "vitest";
import * as projectAnnotations from "./preview";

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
const project = setProjectAnnotations([projectAnnotations]);

beforeAll(() => {
  // Milkdownエディタのストーリー切替時に内部ランナーが
  // 既に破棄されたコンテキストへアクセスするエラーを抑制
  window.addEventListener(
    "error",
    (event) => {
      const error: unknown = event.error;
      if (
        error instanceof Error &&
        error.name === "MilkdownError" &&
        error.message.includes("not found")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
});

beforeAll(project.beforeAll);
