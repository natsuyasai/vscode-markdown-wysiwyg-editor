import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import App from "@/App";
import {
  SAMPLE_HEADING_TEXT,
  SAMPLE_MARKDOWN,
  getAppRootTheme,
  getModeToggleButton,
  getThemeSelect,
  sendInit,
  waitForEditorReady,
} from "@/App.testUtils";

/**
 * Appの初期レンダリングに関する統合テスト。
 * ツールバー・編集エディタ・初期テーマが正しく描画されることを検証する。
 */
const meta: Meta<typeof App> = {
  title: "Integration/App/InitialRender",
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

export const InitialRender: Story = {
  name: "初期表示（ツールバー・編集エディタ・テーマ）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // ツールバーのモード切替ボタンとテーマセレクトが表示されている
    await expect(getModeToggleButton(canvasElement)).toBeInTheDocument();
    await expect(getThemeSelect(canvasElement)).toBeInTheDocument();

    // 初期は編集モードのため MilkdownEditor が描画される
    await waitForEditorReady(canvasElement);

    // 見出し階層・リスト・テーブル・コードブロック・引用・リンク・画像を含む複雑な文書を
    // 読み込ませても、編集エディタが正常に初期化される（クラッシュしない）ことを確認する
    sendInit(SAMPLE_MARKDOWN);
    await waitFor(
      async () => {
        // 複雑な文書の見出しが編集エディタに反映される
        await expect(canvas.getAllByText(SAMPLE_HEADING_TEXT).length).toBeGreaterThan(0);
        // 編集エディタ(contenteditable)は引き続き存在する
        await expect(canvasElement.querySelector("[contenteditable]")).not.toBeNull();
      },
      { timeout: 5000 }
    );

    // 初期テーマは light
    await expect(getAppRootTheme(canvasElement)).toBe("light");

    // 初期状態のモード切替ボタンは「編集モード」を示す
    await expect(getModeToggleButton(canvasElement)).toHaveTextContent("Edit");
  },
};
