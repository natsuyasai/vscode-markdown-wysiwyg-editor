import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import App from "@/App";
import {
  SAMPLE_MARKDOWN,
  getAppRootTheme,
  selectTheme,
  sendInit,
  sendUpdateTheme,
  waitForEditorReady,
} from "@/App.testUtils";

/**
 * テーマ切り替えに関する統合テスト。
 * ツールバーからの選択と、拡張機能からの updateTheme メッセージの双方を検証する。
 */
const meta: Meta<typeof App> = {
  title: "Integration/App/ThemeSwitch",
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

export const ViaToolbar: Story = {
  name: "ツールバーのセレクトでテーマ切替",
  play: async ({ canvasElement }) => {
    await waitForEditorReady(canvasElement);

    // 見出し階層・リスト・テーブル・コードブロック・引用・リンク・画像を含む複雑な文書を
    // 読み込ませた状態でも、ツールバーからのテーマ切替が成立することを確認する
    sendInit(SAMPLE_MARKDOWN);

    // 初期は light
    await expect(getAppRootTheme(canvasElement)).toBe("light");

    // dark を選択
    await selectTheme(canvasElement, "dark");
    await waitFor(async () => {
      await expect(getAppRootTheme(canvasElement)).toBe("dark");
    });

    // light に戻す
    await selectTheme(canvasElement, "light");
    await waitFor(async () => {
      await expect(getAppRootTheme(canvasElement)).toBe("light");
    });
  },
};

export const ViaExtensionMessage: Story = {
  name: "updateThemeメッセージにauto設定が追従",
  play: async ({ canvasElement }) => {
    await waitForEditorReady(canvasElement);

    // 見出し階層・リスト・テーブル・コードブロック・引用・リンク・画像を含む複雑な文書を
    // 読み込ませた状態でも、updateThemeメッセージへの追従が成立することを確認する
    sendInit(SAMPLE_MARKDOWN);

    // 初期のテーマ設定は auto のため VSCode テーマに追従する
    await expect(getAppRootTheme(canvasElement)).toBe("light");

    // 拡張機能から dark テーマ通知
    sendUpdateTheme("dark");
    await waitFor(async () => {
      await expect(getAppRootTheme(canvasElement)).toBe("dark");
    });

    // light テーマ通知で戻る
    sendUpdateTheme("light");
    await waitFor(async () => {
      await expect(getAppRootTheme(canvasElement)).toBe("light");
    });
  },
};
