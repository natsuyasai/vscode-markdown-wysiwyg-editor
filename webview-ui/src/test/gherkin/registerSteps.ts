/**
 * Gherkin（jsdom環境）のstep定義をまとめて登録する。
 *
 * vitestの `gherkin` プロジェクトの setupFiles から読み込まれる。
 * `src/**\/*.steps.ts` を一括でimportし、各ファイルのトップレベルで
 * 呼ばれる Given / When / Then によってstepを登録する。
 * ブラウザ用（*.browser.steps.ts）は対象外。
 */
import.meta.glob(["/src/**/*.steps.ts", "!/src/**/*.browser.steps.ts"], { eager: true });
