import type { Meta, StoryObj } from "@storybook/react-vite";
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

const itemsWithIcons: ContextMenuItem[] = [
  {
    label: "コピー",
    onClick: () => console.log("Copy clicked"),
    icon: "📋",
  },
  {
    label: "切り取り",
    onClick: () => console.log("Cut clicked"),
    icon: "✂️",
  },
  {
    label: "貼り付け",
    onClick: () => console.log("Paste clicked"),
    icon: "📄",
  },
];

const itemsWithDisabled: ContextMenuItem[] = [
  {
    label: "有効な項目",
    onClick: () => console.log("Enabled item clicked"),
  },
  {
    label: "無効な項目",
    onClick: () => console.log("This should not be called"),
    disabled: true,
  },
  {
    label: "別の有効な項目",
    onClick: () => console.log("Another enabled item clicked"),
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
    items: defaultItems,
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "#f0f0f0",
          border: "2px dashed #999",
          borderRadius: "8px",
          textAlign: "center",
          cursor: "context-menu",
        }}>
        右クリックでコンテキストメニューを表示
      </div>
    ),
  },
  name: "デフォルト",
};

export const WithIcons: Story = {
  args: {
    items: itemsWithIcons,
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "#e8f4fc",
          border: "2px dashed #4a90d9",
          borderRadius: "8px",
          textAlign: "center",
          cursor: "context-menu",
        }}>
        アイコン付きメニュー（右クリック）
      </div>
    ),
  },
  name: "アイコン付き",
};

export const WithDisabledItems: Story = {
  args: {
    items: itemsWithDisabled,
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "#fff3e0",
          border: "2px dashed #ff9800",
          borderRadius: "8px",
          textAlign: "center",
          cursor: "context-menu",
        }}>
        無効な項目を含むメニュー（右クリック）
      </div>
    ),
  },
  name: "無効な項目を含む",
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
        }}>
        多数の項目（右クリック）
      </div>
    ),
  },
  name: "多数の項目",
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
        }}>
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
        }}>
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
        }}>
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
        }}>
        <h3 style={{ margin: "0 0 10px 0" }}>ネストされたコンテンツ</h3>
        <p style={{ margin: "0 0 10px 0" }}>この領域のどこでも右クリックできます。</p>
        <button style={{ padding: "8px 16px", cursor: "pointer" }}>ボタンも含む</button>
      </div>
    ),
  },
  name: "ネストされたコンテンツ",
};
