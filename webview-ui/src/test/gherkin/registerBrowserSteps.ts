/**
 * Gherkin（ブラウザ環境）のstep定義をまとめて登録する。
 *
 * vitestの `gherkin-browser` プロジェクトの setupFiles から読み込まれる。
 * `src/**\/*.browser.steps.ts` を一括でimportし、各ファイルのトップレベルで
 * 呼ばれる Given / When / Then によってstepを登録する。
 */
import { cleanup } from "@testing-library/react";
import { After } from "quickpickle";

import.meta.glob("/src/**/*.browser.steps.ts", { eager: true });

// シナリオ間で描画結果が残らないようにする
After(() => {
  cleanup();
  return Promise.resolve();
});
