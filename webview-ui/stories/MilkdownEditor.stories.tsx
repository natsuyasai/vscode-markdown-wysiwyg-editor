import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MilkdownEditor } from "@/components/MilkdownEditor";

const meta: Meta<typeof MilkdownEditor> = {
  title: "Components/MilkdownEditor",
  component: MilkdownEditor,
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
type Story = StoryObj<typeof MilkdownEditor>;

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

// 複数の図を含むMarkdown
const multipleDiagramsMarkdown = `# Multiple Diagrams Test

## Mermaid Flowchart

\`\`\`mermaid
graph LR;
    Start-->Process;
    Process-->End;
\`\`\`

## Mermaid Sequence

\`\`\`mermaid
sequenceDiagram
    participant A
    participant B
    A->>B: Hello
    B-->>A: Hi!
\`\`\`

## PlantUML

\`\`\`plantuml
@startuml
class User {
  +name: string
  +email: string
}
@enduml
\`\`\`
`;

// 見出しのMarkdown
const headingsMarkdown = `# 見出し1 (H1)

## 見出し2 (H2)

### 見出し3 (H3)

#### 見出し4 (H4)

##### 見出し5 (H5)

###### 見出し6 (H6)

通常のテキストです。見出しの下に表示されます。
`;

// テキスト強調のMarkdown
const textEmphasisMarkdown = `# テキスト強調

## 基本的な強調

これは **太字（ボールド）** のテキストです。

これは *イタリック（斜体）* のテキストです。

これは ***太字かつイタリック*** のテキストです。

これは ~~取り消し線~~ のテキストです。

## 組み合わせ

**太字の中に *イタリック* を含める**ことができます。

*イタリックの中に **太字** を含める*こともできます。
`;

// リストのMarkdown
const listsMarkdown = `# リスト

## 箇条書きリスト（Unordered List）

- りんご
- みかん
- ぶどう
  - 巨峰
  - マスカット
  - デラウェア
- バナナ

## 番号付きリスト（Ordered List）

1. 最初の項目
2. 2番目の項目
3. 3番目の項目
   1. サブ項目A
   2. サブ項目B
4. 4番目の項目

## タスクリスト（Checkbox）

- [x] 完了したタスク
- [x] これも完了
- [ ] 未完了のタスク
- [ ] これも未完了
`;

// リンクと画像のMarkdown
const linksAndImagesMarkdown = `# リンクと画像

## リンク

[GitHub](https://github.com) へのリンクです。

[タイトル付きリンク](https://github.com "GitHubへ移動") にカーソルを合わせるとタイトルが表示されます。

URLをそのまま書くこともできます: https://github.com

## 画像

![サンプル画像](https://via.placeholder.com/300x200 "プレースホルダー画像")

画像にリンクを設定することもできます:

[![クリック可能な画像](https://via.placeholder.com/150x100)](https://github.com)
`;

// コードのMarkdown
const codeMarkdown = `# コード

## インラインコード

文中に \`console.log("Hello")\` のようにコードを埋め込めます。

変数名 \`myVariable\` やコマンド \`npm install\` などに使います。

## コードブロック

### JavaScript

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return true;
}

greet("World");
\`\`\`

### TypeScript

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: "田中太郎",
  email: "tanaka@example.com"
};
\`\`\`

### Python

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # 120
\`\`\`

### シェルコマンド

\`\`\`bash
# パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
\`\`\`
`;

// 引用のMarkdown
const blockquotesMarkdown = `# 引用

## 基本的な引用

> これは引用文です。
> 複数行にわたって書くことができます。

## ネストした引用

> 外側の引用
>
> > 内側の引用
> >
> > > さらに深い引用
>
> 外側に戻る

## 引用内の書式

> **重要な引用**
>
> 引用内でも *強調* や \`コード\` を使えます。
>
> - リストも
> - 使えます
`;

// テーブルのMarkdown
const tablesMarkdown = `# テーブル

## 基本的なテーブル

| 名前 | 年齢 | 職業 |
|------|------|------|
| 田中 | 28 | エンジニア |
| 山田 | 35 | デザイナー |
| 佐藤 | 42 | マネージャー |

## 配置を指定したテーブル

| 左寄せ | 中央寄せ | 右寄せ |
|:-------|:--------:|-------:|
| Left | Center | Right |
| テキスト | テキスト | テキスト |
| 123 | 456 | 789 |

## 書式を含むテーブル

| 機能 | 説明 | ステータス |
|------|------|------------|
| **ログイン** | ユーザー認証 | ✅ 完了 |
| *検索* | 全文検索機能 | 🔄 進行中 |
| \`API\` | REST API | ⏳ 予定 |
`;

// 水平線のMarkdown
const horizontalRulesMarkdown = `# 水平線

セクション1のテキスト

---

セクション2のテキスト

***

セクション3のテキスト

___

セクション4のテキスト
`;

// 総合的なMarkdownサンプル
const comprehensiveMarkdown = `# Markdown総合サンプル

このドキュメントはMarkdownの主要な機能を網羅しています。

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

// インタラクティブなコンポーネントラッパー
function MilkdownEditorWrapper({
  initialValue,
  theme,
  readonly,
}: {
  initialValue: string;
  theme: "light" | "dark";
  readonly?: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div
      data-theme={theme}
      style={{ height: "100%", background: theme === "dark" ? "#1e1e1e" : "#ffffff" }}>
      <MilkdownEditor value={value} onChange={setValue} theme={theme} readonly={readonly} />
    </div>
  );
}

export const MermaidLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={mermaidMarkdown} theme="light" />,
  name: "Mermaid - Light Theme",
};

export const MermaidDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={mermaidMarkdown} theme="dark" />,
  name: "Mermaid - Dark Theme",
};

export const PlantUmlLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={plantUmlMarkdown} theme="light" />,
  name: "PlantUML - Light Theme",
};

export const PlantUmlDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={plantUmlMarkdown} theme="dark" />,
  name: "PlantUML - Dark Theme",
};

export const MultipleDiagramsLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={multipleDiagramsMarkdown} theme="light" />,
  name: "Multiple Diagrams - Light Theme",
};

export const MultipleDiagramsDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={multipleDiagramsMarkdown} theme="dark" />,
  name: "Multiple Diagrams - Dark Theme",
};

export const ReadonlyMode: Story = {
  render: () => <MilkdownEditorWrapper initialValue={mermaidMarkdown} theme="light" readonly />,
};

// ===== Markdown仕様に沿った各種表示のストーリー =====

export const HeadingsLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={headingsMarkdown} theme="light" />,
  name: "見出し (H1-H6) - Light",
};

export const HeadingsDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={headingsMarkdown} theme="dark" />,
  name: "見出し (H1-H6) - Dark",
};

export const TextEmphasisLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={textEmphasisMarkdown} theme="light" />,
  name: "テキスト強調 - Light",
};

export const TextEmphasisDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={textEmphasisMarkdown} theme="dark" />,
  name: "テキスト強調 - Dark",
};

export const ListsLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={listsMarkdown} theme="light" />,
  name: "リスト - Light",
};

export const ListsDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={listsMarkdown} theme="dark" />,
  name: "リスト - Dark",
};

export const LinksAndImagesLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={linksAndImagesMarkdown} theme="light" />,
  name: "リンクと画像 - Light",
};

export const LinksAndImagesDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={linksAndImagesMarkdown} theme="dark" />,
  name: "リンクと画像 - Dark",
};

export const CodeLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={codeMarkdown} theme="light" />,
  name: "コード - Light",
};

export const CodeDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={codeMarkdown} theme="dark" />,
  name: "コード - Dark",
};

export const BlockquotesLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={blockquotesMarkdown} theme="light" />,
  name: "引用 - Light",
};

export const BlockquotesDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={blockquotesMarkdown} theme="dark" />,
  name: "引用 - Dark",
};

export const TablesLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={tablesMarkdown} theme="light" />,
  name: "テーブル - Light",
};

export const TablesDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={tablesMarkdown} theme="dark" />,
  name: "テーブル - Dark",
};

export const HorizontalRulesLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={horizontalRulesMarkdown} theme="light" />,
  name: "水平線 - Light",
};

export const HorizontalRulesDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={horizontalRulesMarkdown} theme="dark" />,
  name: "水平線 - Dark",
};

export const ComprehensiveLight: Story = {
  render: () => <MilkdownEditorWrapper initialValue={comprehensiveMarkdown} theme="light" />,
  name: "総合サンプル - Light",
};

export const ComprehensiveDark: Story = {
  render: () => <MilkdownEditorWrapper initialValue={comprehensiveMarkdown} theme="dark" />,
  name: "総合サンプル - Dark",
};
