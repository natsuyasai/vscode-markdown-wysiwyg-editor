import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import App from "@/App";
import {
  SAMPLE_HEADING_TEXT,
  SAMPLE_MARKDOWN,
  sendUpdate,
  toggleMode,
  waitForEditorReady,
} from "@/App.testUtils";

/**
 * 編集モード(MilkdownEditor)と読み取りモード(MarkdownViewer)の
 * 切り替えに関する統合テスト。
 */
const meta: Meta<typeof App> = {
  title: "Integration/App/ModeToggle",
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

export const ToggleEditAndReadonly: Story = {
  name: "編集 ⇄ 読み取りモードの切替",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 編集モードのエディタが初期化されるのを待つ
    await waitForEditorReady(canvasElement);

    // 拡張機能からMarkdownを受信（debounceされるため後続のwaitForで反映を待つ）
    sendUpdate(SAMPLE_MARKDOWN);

    // 読み取りモードへ切替
    await toggleMode(canvasElement);

    // MarkdownViewer に見出しが描画される（本文中とアウトラインの両方に出現しうる）
    await waitFor(
      async () => {
        await expect(canvas.getAllByText(SAMPLE_HEADING_TEXT).length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // 編集用エディタ(contenteditable)は存在しない
    await expect(canvasElement.querySelector("[contenteditable]")).toBeNull();

    // 編集モードへ戻すとエディタが再表示される
    await toggleMode(canvasElement);
    await waitForEditorReady(canvasElement);
  },
};
