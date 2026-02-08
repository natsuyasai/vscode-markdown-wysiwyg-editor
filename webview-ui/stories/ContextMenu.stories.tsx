import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within, waitFor, fireEvent } from "storybook/test";
import { ContextMenu, ContextMenuItem } from "@/components/ContextMenu/ContextMenu";

const meta: Meta<typeof ContextMenu> = {
  title: "Components/ContextMenu",
  component: ContextMenu,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ padding: "100px", minHeight: "400px", minWidth: "400px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ContextMenu>;

const defaultItems: ContextMenuItem[] = [
  {
    label: "HTMLとしてエクスポート",
    onClick: () => console.log("Export as HTML clicked"),
  },
  {
    label: "PDFとしてエクスポート",
    onClick: () => console.log("Export as PDF clicked"),
  },
];

const manyItems: ContextMenuItem[] = [
  { label: "項目 1", onClick: () => console.log("Item 1") },
  { label: "項目 2", onClick: () => console.log("Item 2") },
  { label: "項目 3", onClick: () => console.log("Item 3") },
  { label: "項目 4", onClick: () => console.log("Item 4") },
  { label: "項目 5", onClick: () => console.log("Item 5") },
  { label: "項目 6", onClick: () => console.log("Item 6") },
];

export const Default: Story = {
  args: {
    items: [
      { label: "HTMLとしてエクスポート", onClick: fn() },
      { label: "PDFとしてエクスポート", onClick: fn() },
    ],
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "#f0f0f0",
          border: "2px dashed #999",
          borderRadius: "8px",
          textAlign: "center",
          cursor: "context-menu",
        }}
      >
        右クリックでコンテキストメニューを表示
      </div>
    ),
  },
  name: "デフォルト",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 右クリックでメニューを開く
    const trigger = canvas.getByText("右クリックでコンテキストメニューを表示");
    await fireEvent.contextMenu(trigger);

    // メニュー項目が表示されることを確認
    await waitFor(async () => {
      await expect(canvas.getByText("HTMLとしてエクスポート")).toBeInTheDocument();
      await expect(canvas.getByText("PDFとしてエクスポート")).toBeInTheDocument();
    });

    // 項目をクリック
    await userEvent.click(canvas.getByText("HTMLとしてエクスポート"));

    // onClickが呼ばれたことを検証
    await expect(args.items[0].onClick).toHaveBeenCalledTimes(1);

    // メニューが閉じたことを検証
    await waitFor(async () => {
      await expect(canvas.queryByText("PDFとしてエクスポート")).not.toBeInTheDocument();
    });
  },
};

export const WithIcons: Story = {
  args: {
    items: [
      { label: "コピー", onClick: fn(), icon: "📋" },
      { label: "切り取り", onClick: fn(), icon: "✂️" },
      { label: "貼り付け", onClick: fn(), icon: "📄" },
    ],
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "#e8f4fc",
          border: "2px dashed #4a90d9",
          borderRadius: "8px",
          textAlign: "center",
          cursor: "context-menu",
        }}
      >
        アイコン付きメニュー（右クリック）
      </div>
    ),
  },
  name: "アイコン付き",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 右クリックでメニューを開く
    const trigger = canvas.getByText("アイコン付きメニュー（右クリック）");
    await fireEvent.contextMenu(trigger);

    // アイコン付き項目が表示されることを確認
    await waitFor(async () => {
      await expect(canvas.getByText("コピー")).toBeInTheDocument();
      await expect(canvas.getByText("切り取り")).toBeInTheDocument();
      await expect(canvas.getByText("貼り付け")).toBeInTheDocument();
    });

    // アイコンが表示されていることを確認
    await expect(canvas.getByText("📋")).toBeInTheDocument();

    // 項目をクリックしてonClickが呼ばれることを検証
    await userEvent.click(canvas.getByText("貼り付け"));
    await expect(args.items[2].onClick).toHaveBeenCalledTimes(1);

    // メニューが閉じたことを検証
    await waitFor(async () => {
      await expect(canvas.queryByText("コピー")).not.toBeInTheDocument();
    });
  },
};

export const WithDisabledItems: Story = {
  args: {
    items: [
      { label: "有効な項目", onClick: fn() },
      { label: "無効な項目", onClick: fn(), disabled: true },
      { label: "別の有効な項目", onClick: fn() },
    ],
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "#fff3e0",
          border: "2px dashed #ff9800",
          borderRadius: "8px",
          textAlign: "center",
          cursor: "context-menu",
        }}
      >
        無効な項目を含むメニュー（右クリック）
      </div>
    ),
  },
  name: "無効な項目を含む",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 右クリックでメニューを開く
    const trigger = canvas.getByText("無効な項目を含むメニュー（右クリック）");
    await fireEvent.contextMenu(trigger);

    // 全項目が表示されることを確認
    await waitFor(async () => {
      await expect(canvas.getByText("有効な項目")).toBeInTheDocument();
      await expect(canvas.getByText("無効な項目")).toBeInTheDocument();
      await expect(canvas.getByText("別の有効な項目")).toBeInTheDocument();
    });

    // 無効な項目のボタンがdisabled属性を持つことを確認
    const disabledButton = canvas.getByText("無効な項目").closest("button");
    await expect(disabledButton).toBeDisabled();

    // 無効な項目をクリックしてもonClickが呼ばれないことを検証
    await userEvent.click(canvas.getByText("無効な項目"));
    await expect(args.items[1].onClick).not.toHaveBeenCalled();

    // 有効な項目をクリック
    await userEvent.click(canvas.getByText("有効な項目"));
    await expect(args.items[0].onClick).toHaveBeenCalledTimes(1);

    // メニューが閉じたことを検証
    await waitFor(async () => {
      await expect(canvas.queryByText("無効な項目")).not.toBeInTheDocument();
    });
  },
};

export const ManyItems: Story = {
  args: {
    items: manyItems,
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "#e8f5e9",
          border: "2px dashed #4caf50",
          borderRadius: "8px",
          textAlign: "center",
          cursor: "context-menu",
        }}
      >
        多数の項目（右クリック）
      </div>
    ),
  },
  name: "多数の項目",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 右クリックでメニューを開く
    const trigger = canvas.getByText("多数の項目（右クリック）");
    await fireEvent.contextMenu(trigger);

    // 全6項目が表示されることを確認
    await waitFor(async () => {
      for (let i = 1; i <= 6; i++) {
        await expect(canvas.getByText(`項目 ${i}`)).toBeInTheDocument();
      }
    });

    // Escapeキーでメニューが閉じることを検証
    await userEvent.keyboard("{Escape}");

    await waitFor(async () => {
      await expect(canvas.queryByText("項目 1")).not.toBeInTheDocument();
    });
  },
};

export const LightTheme: Story = {
  args: {
    items: defaultItems,
    children: (
      <div
        data-theme="light"
        style={{
          padding: "40px",
          backgroundColor: "#ffffff",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          textAlign: "center",
          cursor: "context-menu",
        }}
      >
        ライトテーマ（右クリック）
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div data-theme="light" style={{ padding: "100px", minHeight: "400px", minWidth: "400px" }}>
        <Story />
      </div>
    ),
  ],
  name: "ライトテーマ",
};

export const DarkTheme: Story = {
  args: {
    items: defaultItems,
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "#2d2d2d",
          border: "1px solid #404040",
          borderRadius: "8px",
          textAlign: "center",
          cursor: "context-menu",
          color: "#ffffff",
        }}
      >
        ダークテーマ（右クリック）
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div
        data-theme="dark"
        style={{
          padding: "100px",
          minHeight: "400px",
          minWidth: "400px",
          backgroundColor: "#1e1e1e",
        }}
      >
        <Story />
      </div>
    ),
  ],
  name: "ダークテーマ",
};

export const WithNestedContent: Story = {
  args: {
    items: defaultItems,
    children: (
      <div
        style={{
          padding: "20px",
          backgroundColor: "#fce4ec",
          border: "2px dashed #e91e63",
          borderRadius: "8px",
          cursor: "context-menu",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0" }}>ネストされたコンテンツ</h3>
        <p style={{ margin: "0 0 10px 0" }}>この領域のどこでも右クリックできます。</p>
        <button style={{ padding: "8px 16px", cursor: "pointer" }}>ボタンも含む</button>
      </div>
    ),
  },
  name: "ネストされたコンテンツ",
};
