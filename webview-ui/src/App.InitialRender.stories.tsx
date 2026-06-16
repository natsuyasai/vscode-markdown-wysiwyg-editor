import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import App from "@/App";
import {
  getAppRootTheme,
  getModeToggleButton,
  getThemeSelect,
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
    // ツールバーのモード切替ボタンとテーマセレクトが表示されている
    await expect(getModeToggleButton(canvasElement)).toBeInTheDocument();
    await expect(getThemeSelect(canvasElement)).toBeInTheDocument();

    // 初期は編集モードのため MilkdownEditor が描画される
    await waitForEditorReady(canvasElement);

    // 初期テーマは light
    await expect(getAppRootTheme(canvasElement)).toBe("light");

    // 初期状態のモード切替ボタンは「編集モード」を示す
    await expect(getModeToggleButton(canvasElement)).toHaveTextContent("Edit");
  },
};
