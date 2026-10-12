/// <reference types="vitest" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

import viteConfig from "./vite.config";
import storybookTest from "@storybook/addon-vitest/vitest-plugin";
import { quickpickle } from "quickpickle";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
            globals: true,
            environment: "jsdom",
            setupFiles: "./vitest.setup.ts",
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, ".storybook"),
              storybookScript: "npm run storybook -- --ci",
            }),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [{ browser: "chromium" }],
            },
            setupFiles: ["./.storybook/vitest.setup.ts"],
          },
        },
        {
          // Gherkin（.feature）をjsdom環境で実行する。step定義は src/**/*.steps.ts
          extends: true,
          plugins: [quickpickle()],
          test: {
            name: "gherkin",
            include: ["src/**/*.feature"],
            exclude: ["src/**/*.browser.feature"],
            globals: true,
            environment: "jsdom",
            setupFiles: ["./vitest.setup.ts", "./src/test/gherkin/registerSteps.ts"],
            server: {
              deps: {
                // inline化しないとquickpickleが参照するpngjs/browserの解決に失敗する
                inline: ["quickpickle"],
              },
            },
          },
        },
        {
          // Gherkin（.browser.feature）を実ブラウザで実行する。step定義は src/**/*.browser.steps.ts
          extends: true,
          plugins: [quickpickle({ stepTimeout: 15_000 })],
          test: {
            name: "gherkin-browser",
            include: ["src/**/*.browser.feature"],
            // Mermaidの実描画は初回に時間がかかるため、step・シナリオの上限を既定より長くする
            testTimeout: 20_000,
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [{ browser: "chromium" }],
            },
            setupFiles: ["./src/test/gherkin/registerBrowserSteps.ts"],
          },
        },
      ],
    },
    define: {
      global: "window",
    },
  })
);
