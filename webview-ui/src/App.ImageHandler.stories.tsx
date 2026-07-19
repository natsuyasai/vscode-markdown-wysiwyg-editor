import type { SaveImageMessage } from "@message/messageTypeToExtention";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, spyOn, waitFor, within } from "storybook/test";
import App from "@/App";
import {
  SAMPLE_HEADING_TEXT,
  SAMPLE_MARKDOWN,
  sendInit,
  sendSaveImageResult,
  toggleMode,
  waitForEditorReady,
} from "@/App.testUtils";

/**
 * 画像ペースト処理(`useImageHandler`)に関する統合テスト。
 * useImageHandler は読み取りモード(`enabled: readonly`、App.tsx参照)でのみ有効で、
 * ペーストされた画像を FileReader で Base64 化し saveImage メッセージを拡張機能へ送る。
 * 拡張機能から saveImageResult(success: true)が返ると、markdownImage が現在の文書末尾に
 * 追記され(useMarkdownSync の handleImageInserted)、読み取りビューに画像が表示される。
 *
 * vscode.postMessage は acquireVsCodeApi が存在しない環境(Storybookのブラウザテスト含む)では
 * console.log にフォールバックする(`webview-ui/src/utilities/vscode.ts` 参照)。
 * これを利用し、console.log をスパイして saveImage メッセージのpayloadを捕捉する。
 */
function isSaveImageMessage(value: unknown): value is SaveImageMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "saveImage"
  );
}

/** console.log スパイの呼び出し引数から、最初に見つかった saveImage メッセージを取得する */
function findSaveImageMessage(calls: unknown[][]): SaveImageMessage | undefined {
  return calls.map((call): unknown => call[0]).find(isSaveImageMessage);
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

export const PasteImageSavesAndInsertsIntoMarkdown: Story = {
  name: "読み取りモードで画像をペーストすると保存要求が送られ応答を受けてMarkdownに画像が挿入される",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const logSpy = spyOn(console, "log");

    try {
      // 編集モードの初期化を待ち、複雑な文書を読み込ませてから読み取りモードへ切り替える。
      await waitForEditorReady(canvasElement);
      sendInit(SAMPLE_MARKDOWN);

      // 既存文書が編集ビューへ反映されたことを確認してから読み取りモードに切り替える。
      await waitFor(
        async () => {
          await expect(canvas.getAllByText(SAMPLE_HEADING_TEXT).length).toBeGreaterThan(0);
        },
        { timeout: 5000 }
      );
      await toggleMode(canvasElement);

      // 読み取りビューに既存文書が描画されるまで待つ。
      await waitFor(
        async () => {
          await expect(
            canvas.getByRole("heading", { name: SAMPLE_HEADING_TEXT })
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // 実ブラウザの DataTransfer に image/png の File を積み、本物の ClipboardEvent を発火する。
      // useImageHandler は document へ capture でリスナを張っているため document へ dispatch する。
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File(["fake-png-bytes"], "pasted.png", { type: "image/png" }));
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(pasteEvent);

      // FileReader によるBase64化は非同期のため、saveImage メッセージが送られるまで待つ。
      await waitFor(
        async () => {
          const message = findSaveImageMessage(logSpy.mock.calls);
          await expect(message).toBeDefined();
        },
        { timeout: 5000 }
      );

      const saveImageMessage = findSaveImageMessage(logSpy.mock.calls);
      await expect(saveImageMessage).toBeDefined();
      const requestId = saveImageMessage?.payload.requestId ?? "";
      await expect(requestId.length).toBeGreaterThan(0);
      await expect(saveImageMessage?.payload.fileName).toBe("pasted.png");
      await expect(saveImageMessage?.payload.mimeType).toBe("image/png");

      // 拡張機能側での保存完了を模擬する。requestId が一致し success の場合に画像が追記される。
      sendSaveImageResult({
        requestId,
        success: true,
        markdownImage: "![pasted](pasted-image.png)",
      });

      // 追記された画像が読み取りビューに表示され、既存文書が消えていないことを確認する。
      await waitFor(
        async () => {
          const insertedImage = canvas.getByRole<HTMLImageElement>("img", { name: "pasted" });
          await expect(insertedImage).toBeInTheDocument();
          await expect(insertedImage.getAttribute("src")).toMatch(/pasted-image\.png$/);
        },
        { timeout: 5000 }
      );
      await expect(canvas.getByRole("heading", { name: SAMPLE_HEADING_TEXT })).toBeInTheDocument();
    } finally {
      logSpy.mockRestore();
    }
  },
};
