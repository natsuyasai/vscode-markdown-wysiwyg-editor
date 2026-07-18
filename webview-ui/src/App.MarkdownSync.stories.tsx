import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, spyOn, waitFor, within } from "storybook/test";
import App from "@/App";
import {
  SAMPLE_HEADING_TEXT,
  UPDATED_HEADING_TEXT,
  UPDATED_MARKDOWN,
  pressCtrlS,
  sendInit,
  sendUpdate,
  toggleMode,
  waitForEditorReady,
} from "@/App.testUtils";

/**
 * vscode.postMessage は acquireVsCodeApi が存在しない環境（Storybookのブラウザテスト含む）では
 * console.log にフォールバックする（`webview-ui/src/utilities/vscode.ts` 参照）。
 * これを利用し、console.log をスパイして save メッセージのpayloadを捕捉する。
 */
interface SaveMessage {
  type: "save";
  payload: string;
}

function isSaveMessage(value: unknown): value is SaveMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "save" &&
    typeof (value as { payload?: unknown }).payload === "string"
  );
}

/** console.log スパイの呼び出し引数から、最初に見つかった save メッセージを取得する */
function findSaveMessage(calls: unknown[][]): SaveMessage | undefined {
  return calls.map((call): unknown => call[0]).find(isSaveMessage);
}

/**
 * 拡張機能 → WebView の Markdown 同期に関する統合テスト。
 * init / update メッセージで内容が反映・更新されることを検証する。
 * 描画が決定的な読み取りモード(MarkdownViewer)で確認する。
 */
const meta: Meta<typeof App> = {
  title: "Integration/App/MarkdownSync",
  component: App,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", width: "100vw" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof App>;

export const InitAndUpdate: Story = {
  name: "init/updateメッセージによる内容反映",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 読み取りモードに切り替えて描画を決定的にする
    await waitForEditorReady(canvasElement);
    await toggleMode(canvasElement);

    // init メッセージで初期内容が反映される
    sendInit(`# ${SAMPLE_HEADING_TEXT}\n\n初期本文です。\n`);
    await waitFor(
      async () => {
        await expect(canvas.getAllByText(SAMPLE_HEADING_TEXT).length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // update メッセージで内容が差し替わる
    sendUpdate(UPDATED_MARKDOWN);
    await waitFor(
      async () => {
        await expect(canvas.getAllByText(UPDATED_HEADING_TEXT).length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // 旧内容は表示されていない
    await expect(canvas.queryByText(SAMPLE_HEADING_TEXT)).toBeNull();
  },
};

export const SaveWithoutEditKeepsOriginalUnchanged: Story = {
  name: "編集せずCtrl+S保存するとoriginalが完全不変で保存される",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const logSpy = spyOn(console, "log");

    try {
      // 編集モードのエディタが初期化されるのを待つ
      await waitForEditorReady(canvasElement);

      // 見出し階層・箇条書き(`*`)・番号付きリスト・テーブル・フェンス付きコードブロック・引用を
      // 含む複雑な文書をinitで送る。Milkdownはラウンドトリップ時に`*`を`-`へ正規化するなど
      // 各要素を整形しうるが、未編集(baseline===current)なら3-wayマージがoriginalを完全不変で返す。
      const original = [
        "# メインタイトル",
        "",
        "## 概要セクション",
        "",
        "これは3-wayマージ検証用の複雑な文書です。",
        "",
        "### 箇条書き",
        "",
        "* alpha",
        "* beta",
        "* gamma",
        "",
        "### 手順",
        "",
        "1. 手順一",
        "2. 手順二",
        "3. 手順三",
        "",
        "## データ表",
        "",
        "| 名前 | 役割 |",
        "| --- | --- |",
        "| foo | 管理者 |",
        "| bar | 利用者 |",
        "",
        "## コード例",
        "",
        "```ts",
        "export const answer = 42;",
        "```",
        "",
        "> これは補足のための引用文です。",
        "",
      ].join("\n");
      sendInit(original);

      // ラウンドトリップ後の内容がエディタに反映される（＝baselineが確定する）まで待つ
      await waitFor(
        async () => {
          await expect(canvas.getByText("alpha")).toBeInTheDocument();
          await expect(canvas.getByText("gamma")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
      // DOM反映後、Ctrl+Sハンドラの再購読（useEffect）が完了するのを待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 編集は一切行わずCtrl+S相当のショートカットを発火する
      pressCtrlS();

      // save メッセージ（console.logへフォールバック）のpayloadを捕捉する
      await waitFor(async () => {
        const saveMessage = findSaveMessage(logSpy.mock.calls);
        await expect(saveMessage).toBeDefined();
      });

      const saveMessage = findSaveMessage(logSpy.mock.calls);
      // 未編集（baseline===current）のため、originalがバイト単位で不変のまま保存される
      await expect(saveMessage?.payload).toBe(original);
    } finally {
      logSpy.mockRestore();
    }
  },
};
