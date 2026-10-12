import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, spyOn, waitFor, within } from "storybook/test";
import App from "@/App";
import {
  SAMPLE_HEADING_TEXT,
  SAMPLE_MARKDOWN,
  sendInit,
  toggleMode,
  waitForEditorReady,
} from "@/App.testUtils";

/**
 * 読み取りモード(プレビュー)での画像の貼り付け(P-07)に関する統合テスト。
 * 読み取りモードでは貼り付けを無効にする: 保存要求(saveImage)は送られず、文書にも追記されない。
 * 編集モードの画像の扱いは Crepe の ImageBlock が担当する。
 *
 * vscode.postMessage は acquireVsCodeApi が存在しない環境(Storybookのブラウザテスト含む)では
 * console.log にフォールバックする(`webview-ui/src/utilities/vscode.ts` 参照)。
 * これを利用し、console.log をスパイして saveImage メッセージが送られないことを確認する。
 */
function isSaveImageMessage(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "saveImage"
  );
}

const meta: Meta<typeof App> = {
  title: "Integration/App/ImageHandler",
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

export const PasteImageIsDisabledInReadonly: Story = {
  name: "読み取りモードで画像をペーストしても、保存要求は送られず文書にも追記されない",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const logSpy = spyOn(console, "log");

    try {
      // 編集モードの初期化を待ち、文書を読み込ませてから読み取りモードへ切り替える。
      await waitForEditorReady(canvasElement);
      sendInit(SAMPLE_MARKDOWN);
      await waitFor(
        async () => {
          await expect(canvas.getAllByText(SAMPLE_HEADING_TEXT).length).toBeGreaterThan(0);
        },
        { timeout: 5000 }
      );
      await toggleMode(canvasElement);
      await waitFor(
        async () => {
          await expect(
            canvas.getByRole("heading", { name: SAMPLE_HEADING_TEXT })
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // 実ブラウザの DataTransfer に image/png の File を積み、本物の ClipboardEvent / DragEvent を発火する。
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File(["fake-png-bytes"], "pasted.png", { type: "image/png" }));
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(pasteEvent);
      const dropEvent = new DragEvent("drop", {
        dataTransfer,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(dropEvent);

      // どちらも既定の処理を取り消されている
      await expect(pasteEvent.defaultPrevented).toBe(true);
      await expect(dropEvent.defaultPrevented).toBe(true);

      // FileReader による非同期処理が走るとしても完了する時間を置いてから、何も送られていないことを確認する
      await new Promise((resolve) => setTimeout(resolve, 300));
      await expect(logSpy.mock.calls.some((call) => isSaveImageMessage(call[0]))).toBe(false);

      // 貼り付けた画像は読み取りビューに追記されていない
      await expect(canvas.queryByRole("img", { name: "pasted" })).toBeNull();
      await expect(canvas.getByRole("heading", { name: SAMPLE_HEADING_TEXT })).toBeInTheDocument();
    } finally {
      logSpy.mockRestore();
    }
  },
};
