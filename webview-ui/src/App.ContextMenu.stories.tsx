import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import App from "@/App";
import { openContextMenu, waitForEditorReady } from "@/App.testUtils";

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
