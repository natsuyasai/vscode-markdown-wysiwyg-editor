import type { OpenFileMessage } from "@message/messageTypeToExtention";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test";
import App from "@/App";
import { sendInit, toggleMode, waitForEditorReady } from "@/App.testUtils";

/**
 * プレビュー(読み取りモード)内のリンククリック処理(`useLinkHandler`)に関する統合テスト。
 * - アンカーリンク(`#見出し`)クリック時: 対象見出しへ scrollIntoView する(VSCode通信なし)。
 * - カスタムスキームリンク(`vscode-local-file:`)クリック時: openFile メッセージを送信する。
 *
 * vscode.postMessage は acquireVsCodeApi が存在しない環境(Storybookのブラウザテスト含む)では
 * console.log にフォールバックする(`webview-ui/src/utilities/vscode.ts` 参照)。
 * これを利用し、console.log をスパイして openFile メッセージのpayloadを捕捉する。
 */
function isOpenFileMessage(value: unknown): value is OpenFileMessage {
  return (
    typeof value === "object" && value !== null && (value as { type?: unknown }).type === "openFile"
  );
}

/** console.log スパイの呼び出し引数から、最初に見つかった openFile メッセージを取得する */
function findOpenFileMessage(calls: unknown[][]): OpenFileMessage | undefined {
  return calls.map((call): unknown => call[0]).find(isOpenFileMessage);
}

const meta: Meta<typeof App> = {
  title: "Integration/App/LinkHandler",
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

export const AnchorLinkScrollsToHeading: Story = {
  name: "アンカーリンククリックで対象見出しへスクロールする",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // scrollIntoView が呼ばれた要素のidを記録する(実ブラウザでのスクロール副作用を抑止する)。
    // Storybookのinstrumenterが getByRole の戻り値をProxyでラップしDOMノードの同一性比較が
    // 成立しないため、要素そのものではなくidで対象を検証する。
    const scrolledIds: string[] = [];
    const scrollSpy = spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (
      this: Element
    ) {
      scrolledIds.push((this as HTMLElement).id);
    });

    try {
      // 読み取りモードに切り替えて描画を決定的にする(App.MarkdownSync.stories.tsxと同様のパターン)
      await waitForEditorReady(canvasElement);
      await toggleMode(canvasElement);

      // 見出し `## Body Section`(generateHeadingId により id="body-section")と、それを指す
      // アンカーリンクを含む文書。useLinkHandler は targetId を小文字化+空白ハイフン化して正規化し、
      // id完全一致で見出しを探す。react-markdown はアンカーの href をパーセントエンコードするため、
      // 非ASCIIの見出しだと href(例: #%E6%9C%AC...)が正規化後のidと一致せずスクロールが働かない。
      // そのため、スクロール挙動はエンコードの影響を受けないASCIIの見出し/アンカーで検証する。
      const markdown = [
        "# LinkHandler結合テスト",
        "",
        "冒頭から本文へ移動できるようにしています。",
        "",
        "[Jump to body](#body-section)",
        "",
        "## Body Section",
        "",
        "これは本文セクションの内容です。",
        "",
      ].join("\n");
      sendInit(markdown);

      // 読み取りモードで見出し(id="body-section")とアンカーリンクが描画されるまで待つ
      await waitFor(
        async () => {
          await expect(canvas.getByRole("heading", { name: "Body Section" })).toBeInTheDocument();
          await expect(canvas.getByRole("link", { name: "Jump to body" })).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // アンカーリンクをクリックすると、VSCodeとの通信なしに対象見出し(id="body-section")へスクロールする
      await userEvent.click(canvas.getByRole("link", { name: "Jump to body" }));

      await waitFor(async () => {
        await expect(scrolledIds).toContain("body-section");
      });
    } finally {
      scrollSpy.mockRestore();
    }
  },
};

export const CustomSchemeLinkSendsOpenFileMessage: Story = {
  name: "カスタムスキームリンククリックでopenFileメッセージを送信する",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const logSpy = spyOn(console, "log");

    try {
      // 読み取りモードに切り替えて描画を決定的にする(App.MarkdownSync.stories.tsxと同様のパターン)
      await waitForEditorReady(canvasElement);
      await toggleMode(canvasElement);

      // vscode-local-file: スキームのリンクは MarkdownViewer の customUrlTransform により
      // サニタイズされずそのまま href として出力される。パスはURLエンコードされている。
      const markdown = [
        "# LinkHandler結合テスト",
        "",
        "別ファイルへのリンクを含みます。",
        "",
        "[別ファイルを開く](vscode-local-file:%2Fworkspace%2Fdocs%2Fother.md#section1)",
        "",
      ].join("\n");
      sendInit(markdown);

      await waitFor(
        async () => {
          await expect(canvas.getByRole("link", { name: "別ファイルを開く" })).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // カスタムスキームリンクをクリックすると openFile メッセージ(console.logへフォールバック)が送られる
      await userEvent.click(canvas.getByRole("link", { name: "別ファイルを開く" }));

      await waitFor(async () => {
        const message = findOpenFileMessage(logSpy.mock.calls);
        await expect(message).toBeDefined();
        // parseLocalFileUri により filePath はURLデコードされ、anchor は `#` 付きで抽出される
        await expect(message?.payload.filePath).toBe("/workspace/docs/other.md");
        await expect(message?.payload.anchor).toBe("#section1");
      });
    } finally {
      logSpy.mockRestore();
    }
  },
};
