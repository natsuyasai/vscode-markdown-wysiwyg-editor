import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { After, Given, Then, When, type IWorld } from "@cucumber/cucumber";
import { OPEN_SETTINGS_ACTION } from "../../../../plantuml/plantUmlServer";
import {
  FAKE_HOME_DIR,
  PlantUmlServerHarness,
  SAMPLE_PLANTUML_CODE,
} from "./plantUmlServerHarness";

const EXTENSION_ID = "natsuyasai.markdown-wysiwyg-editor";

interface PlantUmlServerWorld extends IWorld {
  plantUmlServer?: PlantUmlServerHarness;
}

function harness(world: PlantUmlServerWorld): PlantUmlServerHarness {
  world.plantUmlServer ??= new PlantUmlServerHarness();
  return world.plantUmlServer;
}

interface ConfigurationProperty {
  type?: string;
  default?: unknown;
  scope?: string;
}

interface ExtensionManifest {
  contributes: { configuration: { properties: Record<string, ConfigurationProperty | undefined> } };
  capabilities?: { untrustedWorkspaces?: { restrictedConfigurations?: string[] } };
}

function extensionManifest(): ExtensionManifest {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  if (!extension) {
    throw new Error(`拡張機能 ${EXTENSION_ID} が見つかりません`);
  }
  return extension.packageJSON as ExtensionManifest;
}

function configurationProperty(key: string): ConfigurationProperty {
  const property = extensionManifest().contributes.configuration.properties[key];
  if (!property) {
    throw new Error(`設定 ${key} が package.json で宣言されていません`);
  }
  return property;
}

After(function (this: PlantUmlServerWorld) {
  this.plantUmlServer?.dispose();
});

// ---- 前提 ----

Given(
  "PlantUMLサーバーのJava実行ファイルとして{string}が見つかる",
  function (this: PlantUmlServerWorld, javaPath: string) {
    harness(this).javaPath = javaPath;
  }
);

Given("PlantUMLサーバーのJava実行ファイルが見つからない", function (this: PlantUmlServerWorld) {
  harness(this).javaPath = null;
});

Given(
  "PlantUMLサーバーの起動待ちの上限を{int}ミリ秒とする",
  function (this: PlantUmlServerWorld, timeoutMs: number) {
    harness(this).startupTimeoutMs = timeoutMs;
  }
);

Given("PlantUMLのjarパス設定が空である", function (this: PlantUmlServerWorld) {
  harness(this).config.jarPath = "";
});

Given("PlantUMLのjarパス設定を{string}にする", function (this: PlantUmlServerWorld, value: string) {
  harness(this).config.jarPath = value;
});

Given(
  "PlantUMLのjarファイル{string}が存在する",
  function (this: PlantUmlServerWorld, filePath: string) {
    harness(this).existingFiles.add(filePath);
  }
);

Given(
  "ホームディレクトリ配下のPlantUMLのjarファイル{string}が存在する",
  function (this: PlantUmlServerWorld, relativePath: string) {
    harness(this).existingFiles.add(path.join(FAKE_HOME_DIR, relativePath));
  }
);

Given(
  "PlantUMLサーバーのポート設定を{int}にする",
  function (this: PlantUmlServerWorld, port: number) {
    harness(this).config.port = port;
  }
);

Given(
  "PlantUMLサーバーが準備完了になり、SVG{string}を返す",
  function (this: PlantUmlServerWorld, svg: string) {
    const state = harness(this);
    state.spawnBehavior = { kind: "normal" };
    state.ready = true;
    state.response = { statusCode: 200, body: svg };
  }
);

Given(
  "PlantUMLサーバーが準備完了になり、ステータス{int}を返す",
  function (this: PlantUmlServerWorld, statusCode: number) {
    const state = harness(this);
    state.ready = true;
    state.response = { statusCode, body: "" };
  }
);

Given(
  "PlantUMLサーバーのプロセスは起動するが準備完了にならない",
  function (this: PlantUmlServerWorld) {
    const state = harness(this);
    state.spawnBehavior = { kind: "normal" };
    state.ready = false;
  }
);

Given(
  "PlantUMLサーバーのプロセスが標準エラー出力{string}を出して終了コード{int}で終了する",
  function (this: PlantUmlServerWorld, stderr: string, code: number) {
    const state = harness(this);
    state.spawnBehavior = { kind: "exit", code, stderr };
    state.ready = false;
  }
);

// ---- 操作 ----

When("PlantUMLのサンプル図を描画する", async function (this: PlantUmlServerWorld) {
  await harness(this).render();
});

When("次のPlantUMLコードを描画する:", async function (this: PlantUmlServerWorld, code: string) {
  await harness(this).render(code);
});

When(
  "PlantUMLのサンプル図の描画を{int}件同時に要求する",
  async function (this: PlantUmlServerWorld, count: number) {
    const state = harness(this);
    const server = state.getServer();
    state.concurrentResults = await Promise.all(
      Array.from({ length: count }, () => server.render(SAMPLE_PLANTUML_CODE))
    );
  }
);

When(
  "PlantUMLサーバーのプロセスが終了コード{int}で終了する",
  async function (this: PlantUmlServerWorld, code: number) {
    const fakeProcess = harness(this).lastProcess();
    fakeProcess.exit(code);
    await new Promise<void>((resolve) =>
      fakeProcess.once("close", () => {
        resolve();
      })
    );
  }
);

// ---- 結果 ----

Then(
  "PlantUML用の設定{string}が文字列型・既定値{string}で宣言されている",
  function (key: string, defaultValue: string) {
    const property = configurationProperty(key);
    assert.strictEqual(property.type, "string");
    assert.strictEqual(property.default, defaultValue);
  }
);

Then(
  "PlantUML用の設定{string}はマシン単位の設定で、制限モードでは使われない",
  function (key: string) {
    assert.strictEqual(configurationProperty(key).scope, "machine");
    const restricted =
      extensionManifest().capabilities?.untrustedWorkspaces?.restrictedConfigurations ?? [];
    assert.ok(restricted.includes(key), `restrictedConfigurations に ${key} がありません`);
  }
);

Then(
  "PlantUMLの描画結果は{string}を含むエラーになる",
  function (this: PlantUmlServerWorld, expected: string) {
    const result = harness(this).result;
    assert.strictEqual(result?.svg, undefined, "SVGではなくエラーになるはずです");
    assert.ok(
      result?.error?.includes(expected),
      `エラーに「${expected}」が含まれていません: ${String(result?.error)}`
    );
  }
);

Then("PlantUMLの描画結果はSVG{string}になる", function (this: PlantUmlServerWorld, svg: string) {
  assert.deepStrictEqual(harness(this).result, { svg });
});

Then(
  "同時に要求したPlantUMLの描画結果はすべてSVG{string}になる",
  function (this: PlantUmlServerWorld, svg: string) {
    for (const result of harness(this).concurrentResults) {
      assert.deepStrictEqual(result, { svg });
    }
  }
);

Then("PlantUMLサーバーのプロセスは起動されていない", function (this: PlantUmlServerWorld) {
  assert.strictEqual(harness(this).processes.length, 0);
});

Then(
  "PlantUMLサーバーのプロセスは{int}回起動されている",
  function (this: PlantUmlServerWorld, count: number) {
    assert.strictEqual(harness(this).processes.length, count);
  }
);

Then(
  "PlantUMLサーバーのプロセスが{string}で引数{string}を付けて起動される",
  function (this: PlantUmlServerWorld, command: string, args: string) {
    const last = harness(this).lastProcess();
    assert.strictEqual(last.command, command);
    assert.strictEqual(last.args.join(" "), args);
  }
);

Then(
  "PlantUMLサーバーのプロセスはホームディレクトリ配下のjarファイル{string}で起動される",
  function (this: PlantUmlServerWorld, relativePath: string) {
    const last = harness(this).lastProcess();
    assert.strictEqual(last.args[1], path.join(FAKE_HOME_DIR, relativePath));
  }
);

Then(
  "{int}回目に起動したPlantUMLサーバーのプロセスは停止されている",
  function (this: PlantUmlServerWorld, nth: number) {
    const target = harness(this).processes[nth - 1];
    assert.ok(target, `${String(nth)}回目に起動したプロセスがありません`);
    assert.ok(target.killed, `${String(nth)}回目に起動したプロセスが停止されていません`);
  }
);

Given("PlantUMLの設定エラーの通知では「設定を開く」を選ぶ", function (this: PlantUmlServerWorld) {
  harness(this).notificationChoice = OPEN_SETTINGS_ACTION;
});

Then(
  "PlantUMLの設定エラーの通知は1回だけ「設定を開く」ボタン付きで表示されている",
  function (this: PlantUmlServerWorld) {
    const { notifications } = harness(this);
    assert.strictEqual(notifications.length, 1);
    assert.deepStrictEqual(notifications[0]?.items, [OPEN_SETTINGS_ACTION]);
  }
);

Then(
  "設定画面でPlantUML用の設定{string}が開かれる",
  async function (this: PlantUmlServerWorld, settingKey: string) {
    // 通知のボタン選択は非同期に処理されるため、処理が終わるのを待つ
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(harness(this).openedSettings, [settingKey]);
  }
);
