import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarkdownViewer } from "@/components/MarkdownViewer";

const meta: Meta<typeof MarkdownViewer> = {
  title: "Components/MarkdownViewer",
  component: MarkdownViewer,
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
type Story = StoryObj<typeof MarkdownViewer>;

// HTMLタグを含むMarkdown
const htmlMarkdown = `# HTMLタグのテスト

## インラインHTML

これは<strong>太字</strong>のテキストです。

これは<em>イタリック</em>のテキストです。

これは<u>下線</u>のテキストです。

これは<s>取り消し線</s>のテキストです。

## ブロックHTML

<div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
これはdivブロックの中のテキストです。
</div>

<p style="text-align: center;">中央揃えの段落</p>

## 折りたたみ要素

<details>
<summary>クリックで展開</summary>
これは折りたたまれたコンテンツです。
</details>

## 水平線

<hr>

上と下のセクション

## コメント
<!-- これはコメントです -->
`;

// Mermaidコードブロックを含むMarkdown
const mermaidMarkdown = `# Mermaid Diagram Test

This is a test document with a Mermaid diagram.

\`\`\`mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
\`\`\`

## Another Section

Some text after the diagram.
`;

// PlantUMLコードブロックを含むMarkdown
const plantUmlMarkdown = `# PlantUML Diagram Test

This is a test document with a PlantUML diagram.

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi!
@enduml
\`\`\`

## Another Section

Some text after the diagram.
`;

// 総合的なMarkdownサンプル
const comprehensiveMarkdown = `# Markdown総合サンプル (閲覧モード)

このドキュメントはMarkdownの主要な機能を閲覧モードで表示しています。

## 見出しとテキスト

### サブセクション

通常の段落テキストです。**太字**、*イタリック*、~~取り消し線~~を含みます。

## リスト

- 項目1
- 項目2
  - ネストした項目
- 項目3

1. 番号付き項目1
2. 番号付き項目2

## コードと引用

インラインコード: \`const x = 42;\`

\`\`\`javascript
// コードブロック
function hello() {
  return "world";
}
\`\`\`

> 引用文はこのように表示されます。

## テーブル

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A | B | C |
| 1 | 2 | 3 |

## タスクリスト

- [x] 完了タスク
- [ ] 未完了タスク

---

*以上がMarkdownの主要機能です。*
`;

// MarkdownViewerラッパー
function MarkdownViewerWrapper({ value, theme }: { value: string; theme: "light" | "dark" }) {
  return (
    <div
      data-theme={theme}
      style={{ height: "100%", background: theme === "dark" ? "#1a1a1a" : "#ffffff" }}
    >
      <MarkdownViewer value={value} theme={theme} />
    </div>
  );
}

export const HtmlTagsLight: Story = {
  render: () => <MarkdownViewerWrapper value={htmlMarkdown} theme="light" />,
  name: "HTMLタグ描画 - Light",
};

export const HtmlTagsDark: Story = {
  render: () => <MarkdownViewerWrapper value={htmlMarkdown} theme="dark" />,
  name: "HTMLタグ描画 - Dark",
};

export const MermaidLight: Story = {
  render: () => <MarkdownViewerWrapper value={mermaidMarkdown} theme="light" />,
  name: "Mermaid - Light Theme",
};

export const MermaidDark: Story = {
  render: () => <MarkdownViewerWrapper value={mermaidMarkdown} theme="dark" />,
  name: "Mermaid - Dark Theme",
};

export const PlantUmlLight: Story = {
  render: () => <MarkdownViewerWrapper value={plantUmlMarkdown} theme="light" />,
  name: "PlantUML - Light Theme",
};

export const PlantUmlDark: Story = {
  render: () => <MarkdownViewerWrapper value={plantUmlMarkdown} theme="dark" />,
  name: "PlantUML - Dark Theme",
};

export const ComprehensiveLight: Story = {
  render: () => <MarkdownViewerWrapper value={comprehensiveMarkdown} theme="light" />,
  name: "総合サンプル - Light",
};

export const ComprehensiveDark: Story = {
  render: () => <MarkdownViewerWrapper value={comprehensiveMarkdown} theme="dark" />,
  name: "総合サンプル - Dark",
};
