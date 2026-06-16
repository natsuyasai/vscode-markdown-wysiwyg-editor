import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import App from "@/App";
import { getAppRootTheme, sendUpdateSettings, waitForEditorReady } from "@/App.testUtils";

/**
 * 設定更新メッセージ(updateSettings)に関する統合テスト。
 * カスタムCSSの適用と、テーマ設定の反映を検証する。
 */
const meta: Meta<typeof App> = {
  title: "Integration/App/CustomCss",
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

const CUSTOM_CSS = ".integration-custom-css-marker { color: rgb(1, 2, 3); }";

export const ApplyCustomCss: Story = {
  name: "updateSettingsでカスタムCSSとテーマを反映",
  play: async ({ canvasElement }) => {
    await waitForEditorReady(canvasElement);

    // 設定更新メッセージ（テーマ=dark, カスタムCSSあり）を受信
    sendUpdateSettings("dark", CUSTOM_CSS);

    // カスタムCSSが style 要素として head に注入される
    await waitFor(async () => {
      const styleElement = document.getElementById("custom-css-style");
      await expect(styleElement?.textContent).toContain("integration-custom-css-marker");
    });

    // テーマ設定(dark)も反映される
    await waitFor(async () => {
      await expect(getAppRootTheme(canvasElement)).toBe("dark");
    });
  },
};
