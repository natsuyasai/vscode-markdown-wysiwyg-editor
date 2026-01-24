import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { MermaidRenderer } from "@/components/MermaidRenderer";

const meta = {
  title: "Components/MermaidRenderer",
  component: MermaidRenderer,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    theme: {
      control: "radio",
      options: ["light", "dark"],
    },
    onEdit: { action: "edit" },
  },
} satisfies Meta<typeof MermaidRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 基本的なフローチャートを表示
 */
export const FlowChart: Story = {
  args: {
    id: "flowchart-example",
    code: `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]`,
    theme: "light",
    onEdit: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // SVGがレンダリングされるまで待機
    const container = await canvas.findByRole("button", {}, { timeout: 5000 });
    await expect(container).toBeInTheDocument();

    // クリックでonEditが呼ばれることを確認
    await userEvent.click(container);
    await expect(args.onEdit).toHaveBeenCalled();
  },
};

/**
 * シーケンス図を表示
 */
export const SequenceDiagram: Story = {
  args: {
    id: "sequence-example",
    code: `sequenceDiagram
    Alice->>John: Hello John, how are you?
    John-->>Alice: Great!
    Alice->>John: See you later!`,
    theme: "light",
    onEdit: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // SVGがレンダリングされるまで待機
    const container = await canvas.findByRole("button", {}, { timeout: 5000 });
    await expect(container).toBeInTheDocument();
  },
};

/**
 * クラス図を表示
 */
export const ClassDiagram: Story = {
  args: {
    id: "class-example",
    code: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +bark()
    }
    Animal <|-- Dog`,
    theme: "light",
  },
};

/**
 * ダークテーマでの表示
 */
export const DarkTheme: Story = {
  args: {
    id: "dark-theme-example",
    code: `graph LR
    A[Square Rect] -- Link text --> B((Circle))
    A --> C(Round Rect)
    B --> D{Rhombus}
    C --> D`,
    theme: "dark",
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
};

/**
 * 無効なMermaidコードでエラー表示
 */
export const ErrorState: Story = {
  args: {
    id: "error-example",
    code: `invalid mermaid code that will cause an error
    this is not valid syntax`,
    theme: "light",
    onEdit: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // エラーメッセージが表示されるまで待機
    const errorMessage = await canvas.findByText(/Mermaid Error/i, {}, { timeout: 5000 });
    await expect(errorMessage).toBeInTheDocument();

    // エラー状態でもクリックでonEditが呼ばれることを確認
    const errorContainer = canvas.getByRole("button");
    await userEvent.click(errorContainer);
    await expect(args.onEdit).toHaveBeenCalled();
  },
};

/**
 * キーボード操作（Enter/Space）でのインタラクション
 */
export const KeyboardInteraction: Story = {
  args: {
    id: "keyboard-example",
    code: `graph TD
    A --> B`,
    theme: "light",
    onEdit: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // SVGがレンダリングされるまで待機
    const container = await canvas.findByRole("button", {}, { timeout: 5000 });

    // フォーカスしてEnterキー
    container.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onEdit).toHaveBeenCalledTimes(1);

    // Spaceキー
    await userEvent.keyboard(" ");
    await expect(args.onEdit).toHaveBeenCalledTimes(2);
  },
};

/**
 * 円グラフの表示
 */
export const PieChart: Story = {
  args: {
    id: "pie-example",
    code: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,
    theme: "light",
  },
};

/**
 * Gitグラフの表示
 */
export const GitGraph: Story = {
  args: {
    id: "git-example",
    code: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit`,
    theme: "light",
  },
};

/**
 * onEditが未設定の場合
 */
export const WithoutOnEdit: Story = {
  args: {
    id: "no-edit-example",
    code: `graph TD
    A --> B`,
    theme: "light",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // SVGがレンダリングされるまで待機
    const container = await canvas.findByRole("button", {}, { timeout: 5000 });

    // クリックしてもエラーが発生しないことを確認
    await userEvent.click(container);
  },
};
