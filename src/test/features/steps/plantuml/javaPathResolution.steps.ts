import * as assert from "assert";
import { Given, Then, When, type IWorld } from "@cucumber/cucumber";
import { resolveJavaPath, type JavaLocatorDeps } from "../../../../plantuml/javaLocator";

interface JavaPathWorld extends IWorld {
  plantUmlJava?: {
    configuredPath: string;
    deps: JavaLocatorDeps;
    resolved?: string | null;
  };
}

/** featureでの改行コードの表記（[CR] / [LF]）を実際の文字に戻す */
function decodeLineBreaks(text: string): string {
  return text.replaceAll("[CR]", "\r").replaceAll("[LF]", "\n");
}

function javaState(world: JavaPathWorld): NonNullable<JavaPathWorld["plantUmlJava"]> {
  if (!world.plantUmlJava) {
    throw new Error(
      "先に「PlantUMLサーバーのJava設定とJAVA_HOMEが未設定である」を実行してください"
    );
  }
  return world.plantUmlJava;
}

Given("PlantUMLサーバーのJava設定とJAVA_HOMEが未設定である", function (this: JavaPathWorld) {
  this.plantUmlJava = {
    configuredPath: "",
    deps: {
      platform: process.platform,
      env: {},
      existsSync: () => false,
      runLocator: () => ({ status: 1, stdout: "" }),
    },
  };
});

Given(
  "PlantUMLサーバーのJava探索コマンドが{string}を出力する",
  function (this: JavaPathWorld, output: string) {
    javaState(this).deps.runLocator = () => ({ status: 0, stdout: decodeLineBreaks(output) });
  }
);

Given(
  "PlantUMLサーバーのJava探索コマンドが終了コード{int}で何も出力しない",
  function (this: JavaPathWorld, status: number) {
    javaState(this).deps.runLocator = () => ({ status, stdout: "" });
  }
);

When("PlantUMLサーバーが使うJava実行ファイルを求める", function (this: JavaPathWorld) {
  const state = javaState(this);
  state.resolved = resolveJavaPath(state.configuredPath, state.deps);
});

Then(
  "PlantUMLサーバーのJava実行ファイルは{string}である",
  function (this: JavaPathWorld, expected: string) {
    assert.strictEqual(javaState(this).resolved, expected);
  }
);

Then("PlantUMLサーバーのJava実行ファイルは見つからない", function (this: JavaPathWorld) {
  assert.strictEqual(javaState(this).resolved, null);
});
