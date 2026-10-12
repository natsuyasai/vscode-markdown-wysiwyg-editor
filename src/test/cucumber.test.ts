import * as assert from "assert";
import * as path from "path";
import { loadConfiguration, loadSources, runCucumber } from "@cucumber/cucumber/api";

/**
 * Gherkin（.feature）で記述した拡張機能の振る舞いを cucumber-js で実行する。
 *
 * vscode-test（mocha）から1テストとして起動するため、step定義から vscode API を利用できる。
 * - feature: tscはコピーしないため、ソース側の src/test/features/**\/*.feature を参照する
 * - step定義: コンパイル済みの <outDir>/test/features/steps/**\/*.js を読み込む
 */

// cucumberのglobはPOSIX区切りで指定する必要があるため、リポジトリルートからの相対パスに変換する
const rootDir = path.resolve(__dirname, "..", "..");
const toPosixRelative = (absolutePath: string): string =>
  path.relative(rootDir, absolutePath).split(path.sep).join("/");

suite("cucumber", () => {
  test("すべてのfeatureのシナリオが成功すること", async function () {
    this.timeout(60_000);

    const environment = { cwd: rootDir };
    const { runConfiguration } = await loadConfiguration(
      {
        // 設定ファイル（cucumber.js 等）は読まず、ここで完結させる
        file: false,
        provided: {
          paths: ["src/test/features/**/*.feature"],
          require: [`${toPosixRelative(path.join(__dirname, "features", "steps"))}/**/*.js`],
          // 未定義・保留中のstepを失敗として扱う
          strict: true,
          format: ["progress"],
        },
      },
      environment
    );

    // featureが1件も見つからない場合、runCucumberは成功扱いになるため事前に検知する
    const { plan } = await loadSources(runConfiguration.sources, environment);
    assert.ok(
      plan.length > 0,
      `実行対象のシナリオが0件です。featureファイルのパス指定（${runConfiguration.sources.paths.join(", ")}）を確認してください`
    );

    const result = await runCucumber(runConfiguration, environment);

    assert.ok(result.success, "cucumberのシナリオが失敗しました（詳細は上記の出力を参照）");
  });
});
