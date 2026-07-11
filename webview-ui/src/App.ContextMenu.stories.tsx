import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test";
import App from "@/App";
import { openContextMenu, sendInit, toggleMode, waitForEditorReady } from "@/App.testUtils";

/**
 * vscode.postMessage は acquireVsCodeApi が存在しない環境（Storybookのブラウザテスト含む）では
 * console.log にフォールバックする（`webview-ui/src/utilities/vscode.ts` 参照）。
 * これを利用し、console.log をスパイして exportHtml メッセージのpayloadを捕捉する。
 */
interface MermaidImage {
  code: string;
  dataUri: string;
}

interface ExportHtmlMessage {
  type: "exportHtml";
  payload?: {
    mermaidImages: MermaidImage[];
  };
}

function isExportHtmlMessage(value: unknown): value is ExportHtmlMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "exportHtml"
  );
}

/** console.log スパイの呼び出し引数から、最初に見つかった exportHtml メッセージを取得する */
function findExportHtmlMessage(calls: unknown[][]): ExportHtmlMessage | undefined {
  return calls.map((call): unknown => call[0]).find(isExportHtmlMessage);
}

/**
 * コンテキストメニュー（エクスポート機能）に関する統合テスト。
 * コンテンツ領域の右クリックでエクスポートメニューが開閉することを検証する。
 */
const meta: Meta<typeof App> = {
  title: "Integration/App/ContextMenu",
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

export const ExportMenuOpenClose: Story = {
  name: "右クリックでエクスポートメニューを開閉",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForEditorReady(canvasElement);

    // コンテンツ領域で右クリックしてメニューを開く
    await openContextMenu(canvasElement);

    // useExport が提供するエクスポート項目が表示される
    await waitFor(async () => {
      await expect(canvas.getByText("HTMLとしてエクスポート")).toBeInTheDocument();
    });
    await expect(canvas.getByText("ブログ用HTMLとしてエクスポート")).toBeInTheDocument();
    await expect(canvas.getByText("PDFとしてエクスポート")).toBeInTheDocument();

    // 項目をクリックするとメニューが閉じる
    await userEvent.click(canvas.getByText("HTMLとしてエクスポート"));
    await waitFor(async () => {
      await expect(canvas.queryByText("HTMLとしてエクスポート")).toBeNull();
    });
  },
};

export const ExportHtmlWithMermaidRendersPngImage: Story = {
  name: "Mermaidブロックを含むHTMLエクスポートでPNG画像が生成される",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const logSpy = spyOn(console, "log");

    try {
      // 読み取りモードに切り替えて描画を決定的にする（App.MarkdownSync.stories.tsxと同様のパターン）
      await waitForEditorReady(canvasElement);
      await toggleMode(canvasElement);

      // シンプルなMermaidフローチャートを含むMarkdownを送信する
      const markdownWithMermaid = [
        "# Mermaid Export",
        "",
        "```mermaid",
        "graph TD;A-->B;",
        "```",
        "",
      ].join("\n");
      sendInit(markdownWithMermaid);

      // 反映（debounce）を待つ
      await waitFor(
        async () => {
          await expect(canvas.getAllByText("Mermaid Export").length).toBeGreaterThan(0);
        },
        { timeout: 5000 }
      );

      // 右クリックでエクスポートメニューを開き、「HTMLとしてエクスポート」をクリックする
      await openContextMenu(canvasElement);
      await waitFor(async () => {
        await expect(canvas.getByText("HTMLとしてエクスポート")).toBeInTheDocument();
      });
      await userEvent.click(canvas.getByText("HTMLとしてエクスポート"));

      // Mermaidブロックが実際にPNG化され、exportHtmlメッセージのpayloadに含まれることを検証する
      // （mermaid.render + canvasラスタライズは非同期のため十分な猶予を確保する）
      await waitFor(
        async () => {
          const exportHtmlMessage = findExportHtmlMessage(logSpy.mock.calls);
          await expect(exportHtmlMessage).toBeDefined();
          const mermaidImages = exportHtmlMessage?.payload?.mermaidImages;
          await expect(mermaidImages?.length).toBeGreaterThan(0);
          await expect(mermaidImages?.[0].dataUri.startsWith("data:image/png")).toBe(true);
        },
        { timeout: 10000 }
      );
    } finally {
      logSpy.mockRestore();
    }
  },
};
