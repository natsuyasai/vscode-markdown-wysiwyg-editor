import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Given, Then, When } from "@cucumber/cucumber";
import type { ImageSaveResult } from "../../../../editor/imageStorage";
import {
  FakeWebviewPanel,
  addedFiles,
  getState,
  listFiles,
  takeSnapshotOnce,
  type HardeningState,
  type HardeningWorld,
} from "./hardeningSupport";
import { receiveMessage, setMessageTarget } from "./messageValidation.steps";

/** 1x1 の PNG 画像 */
const PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const HOME_IMAGE_DIR = path.join(os.homedir(), "markdown-wysiwyg-images");

interface SaveImageResultMessage {
  type: "saveImageResult";
  payload: ImageSaveResult & { requestId: string };
}

function lastSaveResults(state: HardeningState): SaveImageResultMessage[] {
  return state.values.saveResults as SaveImageResultMessage[];
}

function lastSaveResult(state: HardeningState): SaveImageResultMessage["payload"] {
  const results = lastSaveResults(state);
  const result = results[results.length - 1];
  assert.ok(result, "画像の保存結果がWebViewに送られていません");
  return result.payload;
}

/** 文書のディレクトリ（一時ディレクトリからの相対パス） */
function documentDir(state: HardeningState): string {
  return path.posix.dirname(state.values.imageDocumentPath as string);
}

/** 文書のディレクトリに追加された画像ファイル名 */
function addedImagesInDocumentDir(state: HardeningState): string[] {
  const dir = documentDir(state);
  return addedFiles(state)
    .filter((file) => path.posix.dirname(file) === dir)
    .map((file) => path.posix.basename(file));
}

async function saveImage(
  state: HardeningState,
  panel: FakeWebviewPanel,
  fileName: string,
  mimeType: string,
  requestId = "req-hardening"
): Promise<void> {
  await receiveMessage(state, {
    type: "saveImage",
    payload: { requestId, imageData: PNG_DATA_URI, fileName, mimeType },
  });
  state.values.saveResults = panel.postedOfType("saveImageResult");
}

async function saveImageToDocument(
  state: HardeningState,
  relativePath: string,
  fileName: string,
  mimeType: string,
  times: number,
  requestId?: string
): Promise<void> {
  takeSnapshotOnce(state);
  state.values.imageDocumentPath = relativePath;
  const { panel } = await setMessageTarget(state, relativePath);
  for (let i = 0; i < times; i++) {
    await saveImage(state, panel, fileName, mimeType, requestId);
  }
}

When(
  "文書{string}に、ファイル名{string}・MIMEタイプ{string}の画像を保存する",
  async function (this: HardeningWorld, relativePath: string, fileName: string, mimeType: string) {
    await saveImageToDocument(getState(this), relativePath, fileName, mimeType, 1);
  }
);

When(
  "文書{string}に、ファイル名{string}・MIMEタイプ{string}の画像を2回保存する",
  async function (this: HardeningWorld, relativePath: string, fileName: string, mimeType: string) {
    await saveImageToDocument(getState(this), relativePath, fileName, mimeType, 2);
  }
);

When(
  "WebViewからリクエストID{string}で、文書{string}への画像{string}の保存要求を受け取る",
  async function (this: HardeningWorld, requestId: string, relativePath: string, fileName: string) {
    await saveImageToDocument(getState(this), relativePath, fileName, "image/png", 1, requestId);
  }
);

Given("強化検証用に未保存の新規Markdown文書を開いている", async function (this: HardeningWorld) {
  const state = getState(this);
  state.values.untitledDocument = await vscode.workspace.openTextDocument({
    language: "markdown",
    content: "# 未保存の文書\n",
  });
  state.values.homeImagesBefore = listFiles(HOME_IMAGE_DIR);
});

When(
  "未保存の新規文書に、ファイル名{string}・MIMEタイプ{string}の画像を保存する",
  async function (this: HardeningWorld, fileName: string, mimeType: string) {
    const state = getState(this);
    const document = state.values.untitledDocument as vscode.TextDocument;
    assert.strictEqual(document.uri.scheme, "untitled");
    const panel = new FakeWebviewPanel();
    state.values.messageTarget = { document, panel };
    await saveImage(state, panel, fileName, mimeType);
  }
);

Then(
  "WebViewにリクエストID{string}の画像保存結果が送られる",
  function (this: HardeningWorld, requestId: string) {
    assert.strictEqual(lastSaveResult(getState(this)).requestId, requestId);
  }
);

Then("画像の保存結果は成功である", function (this: HardeningWorld) {
  const result = lastSaveResult(getState(this));
  assert.strictEqual(result.success, true, `保存に失敗しました: ${result.error ?? ""}`);
});

Then("画像の保存結果は失敗である", function (this: HardeningWorld) {
  assert.strictEqual(lastSaveResult(getState(this)).success, false);
});

Then("画像の保存結果のエラーに{string}が含まれる", function (this: HardeningWorld, text: string) {
  const error = lastSaveResult(getState(this)).error ?? "";
  assert.ok(error.includes(text), `エラーに ${text} が含まれていません: ${error}`);
});

Then("画像の保存結果の相対パスはディレクトリを含まない", function (this: HardeningWorld) {
  const localPath = lastSaveResult(getState(this)).localPath ?? "";
  assert.ok(localPath !== "" && !/[\\/]/.test(localPath), `相対パス: ${localPath}`);
});

Then(
  "文書と同じディレクトリに画像ファイルが1件だけ作成されている",
  function (this: HardeningWorld) {
    assert.strictEqual(addedImagesInDocumentDir(getState(this)).length, 1);
  }
);

Then("文書と同じディレクトリに画像ファイルが2件作成されている", function (this: HardeningWorld) {
  assert.strictEqual(addedImagesInDocumentDir(getState(this)).length, 2);
});

Then(
  "作成された画像ファイルの名前は{string}で始まり{string}で終わる",
  function (this: HardeningWorld, prefix: string, suffix: string) {
    const images = addedImagesInDocumentDir(getState(this));
    assert.ok(images.length > 0, "画像ファイルが作成されていません");
    for (const image of images) {
      assert.ok(
        image.startsWith(prefix) && image.endsWith(suffix),
        `ファイル名 ${image} が ${prefix}…${suffix} の形式ではありません`
      );
    }
  }
);

Then("文書のディレクトリの外には画像ファイルが作成されていない", function (this: HardeningWorld) {
  const state = getState(this);
  const dir = documentDir(state);
  const outside = addedFiles(state).filter((file) => path.posix.dirname(file) !== dir);
  assert.deepStrictEqual(outside, []);
});

Then("強化検証用の一時ディレクトリにファイルが追加されていない", function (this: HardeningWorld) {
  assert.deepStrictEqual(addedFiles(getState(this)), []);
});

Then(
  "ホームディレクトリの画像保存用フォルダにファイルが追加されていない",
  function (this: HardeningWorld) {
    const before = new Set(getState(this).values.homeImagesBefore as string[]);
    const added = listFiles(HOME_IMAGE_DIR).filter((file) => !before.has(file));
    assert.deepStrictEqual(added, []);
    assert.ok(fs.existsSync(HOME_IMAGE_DIR) || before.size === 0);
  }
);
