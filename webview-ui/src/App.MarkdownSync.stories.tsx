import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import App from "@/App";
import {
  SAMPLE_HEADING_TEXT,
  UPDATED_HEADING_TEXT,
  UPDATED_MARKDOWN,
  sendInit,
  sendUpdate,
  toggleMode,
  waitForEditorReady,
} from "@/App.testUtils";

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
