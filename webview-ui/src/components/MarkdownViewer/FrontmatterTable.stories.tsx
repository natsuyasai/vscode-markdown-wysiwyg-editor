import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { FrontmatterTable } from "./FrontmatterTable";
import "./MarkdownViewer.css";

const meta: Meta<typeof FrontmatterTable> = {
  title: "Components/MarkdownViewer/FrontmatterTable",
  component: FrontmatterTable,
  decorators: [
    (Story) => (
      <div className="markdown-viewer" data-theme="light">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FrontmatterTable>;

// フラットなkey-valueのフロントマター
const flatData = {
  title: "サンプルドキュメント",
  author: "山田太郎",
  published: true,
};

// 配列やネストしたオブジェクトを含むフロントマター
const nestedData = {
  title: "サンプルドキュメント",
  tags: ["markdown", "editor", "vscode"],
  meta: { draft: false, reviewer: "佐藤" },
};

export const FlatDataLight: Story = {
  render: () => <FrontmatterTable data={flatData} />,
  name: "フラットなkey-value - Light",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("table")).toBeInTheDocument();
    await expect(canvas.getByText("キー")).toBeInTheDocument();
    await expect(canvas.getByText("値")).toBeInTheDocument();
    await expect(canvas.getByText("title")).toBeInTheDocument();
    await expect(canvas.getByText("サンプルドキュメント")).toBeInTheDocument();
    await expect(canvas.getByText("author")).toBeInTheDocument();
    await expect(canvas.getByText("山田太郎")).toBeInTheDocument();
    await expect(canvas.getByText("published")).toBeInTheDocument();
    await expect(canvas.getByText("true")).toBeInTheDocument();
  },
};

export const FlatDataDark: Story = {
  render: () => <FrontmatterTable data={flatData} />,
  name: "フラットなkey-value - Dark",
  decorators: [
    (Story) => (
      <div className="markdown-viewer" data-theme="dark" style={{ padding: "16px" }}>
        <Story />
      </div>
    ),
  ],
};

export const NestedDataLight: Story = {
  render: () => <FrontmatterTable data={nestedData} />,
  name: "配列・ネストを含むデータ - Light",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("tags")).toBeInTheDocument();
    await expect(canvas.getByText("markdown, editor, vscode")).toBeInTheDocument();
    await expect(canvas.getByText("meta")).toBeInTheDocument();
    await expect(canvas.getByText('{"draft":false,"reviewer":"佐藤"}')).toBeInTheDocument();
  },
};

export const NestedDataDark: Story = {
  render: () => <FrontmatterTable data={nestedData} />,
  name: "配列・ネストを含むデータ - Dark",
  decorators: [
    (Story) => (
      <div className="markdown-viewer" data-theme="dark" style={{ padding: "16px" }}>
        <Story />
      </div>
    ),
  ],
};
