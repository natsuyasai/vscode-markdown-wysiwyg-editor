import { beforeAll } from "vitest";

// プレビューのアノテーション（preview.tsx）は Storybook 10.3 以降
// @storybook/addon-vitest が自動で適用するため、ここでは適用しない。
// （このファイル内に適用APIの関数名が文字列として含まれるだけで自動適用が無効になる点に注意）

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
