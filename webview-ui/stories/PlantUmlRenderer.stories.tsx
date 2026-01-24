import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PlantUmlRenderer } from "@/components/PlantUmlRenderer";

// サンプルSVG（シンプルなシーケンス図）
const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
  <rect x="10" y="10" width="80" height="30" fill="#E8E8E8" stroke="#181818"/>
  <text x="50" y="30" text-anchor="middle" font-size="14">Alice</text>
  <rect x="110" y="10" width="80" height="30" fill="#E8E8E8" stroke="#181818"/>
  <text x="150" y="30" text-anchor="middle" font-size="14">Bob</text>
  <line x1="50" y1="40" x2="50" y2="120" stroke="#181818"/>
  <line x1="150" y1="40" x2="150" y2="120" stroke="#181818"/>
  <line x1="50" y1="60" x2="150" y2="60" stroke="#181818" marker-end="url(#arrow)"/>
  <text x="100" y="55" text-anchor="middle" font-size="12">Hello</text>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#181818"/>
    </marker>
  </defs>
</svg>`;

// メッセージ送信用のラッパーコンポーネント
function MessageSender({
  children,
  id,
  svg,
  error,
  delay = 50,
}: {
  children: React.ReactNode;
  id: string;
  svg?: string;
  error?: string;
  delay?: number;
}) {
  useEffect(() => {
    if (!svg && !error) return;

    const timeout = setTimeout(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "plantUmlResult",
            payload: {
              requestId: `${id}-`,
              svg,
              error,
            },
          },
        })
      );
    }, delay);

    return () => clearTimeout(timeout);
  }, [id, svg, error, delay]);

  return <>{children}</>;
}

const meta = {
  title: "Components/PlantUmlRenderer",
  component: PlantUmlRenderer,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    onEdit: { action: "edit" },
  },
} satisfies Meta<typeof PlantUmlRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * ローディング状態（デフォルト）
 */
export const Loading: Story = {
  args: {
    id: "loading-example",
    code: `@startuml
Alice -> Bob: Hello
@enduml`,
    onEdit: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // ローディングメッセージが表示されることを確認
    await expect(canvas.getByText(/Loading PlantUML diagram/i)).toBeInTheDocument();
  },
};

/**
 * 成功状態（SVGが表示される）
 */
export const Success: Story = {
  args: {
    id: "success-example",
    code: `@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi!
@enduml`,
    onEdit: fn(),
  },
  decorators: [
    (Story, context) => (
      <MessageSender id={context.args.id} svg={sampleSvg}>
        <Story />
      </MessageSender>
    ),
  ],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // SVGがレンダリングされるまで待機（ローディングが消えること）
    await expect(canvas.queryByText(/Loading PlantUML diagram/i)).not.toBeInTheDocument();

    // コンテナが表示されていることを確認
    const container = canvas.getByRole("button");
    await expect(container).toBeInTheDocument();

    // クリックでonEditが呼ばれることを確認
    await userEvent.click(container);
    await expect(args.onEdit).toHaveBeenCalled();
  },
};

/**
 * エラー状態
 */
export const ErrorState: Story = {
  args: {
    id: "error-example",
    code: `@startuml
invalid syntax here
@enduml`,
    onEdit: fn(),
  },
  decorators: [
    (Story, context) => (
      <MessageSender
        id={context.args.id}
        error="Syntax Error at line 2: unexpected token 'invalid'"
      >
        <Story />
      </MessageSender>
    ),
  ],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // エラーメッセージが表示されるまで待機
    const errorLabel = await canvas.findByText(/PlantUML Error/i, {}, { timeout: 3000 });
    await expect(errorLabel).toBeInTheDocument();

    // エラーメッセージの内容を確認
    await expect(canvas.getByText(/Syntax Error/i)).toBeInTheDocument();

    // エラー状態でもクリックでonEditが呼ばれることを確認
    const container = canvas.getByRole("button");
    await userEvent.click(container);
    await expect(args.onEdit).toHaveBeenCalled();
  },
};

/**
 * キーボード操作（Enter/Space）でのインタラクション
 */
export const KeyboardInteraction: Story = {
  args: {
    id: "keyboard-example",
    code: `@startuml
A -> B
@enduml`,
    onEdit: fn(),
  },
  decorators: [
    (Story, context) => (
      <MessageSender id={context.args.id} svg={sampleSvg}>
        <Story />
      </MessageSender>
    ),
  ],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // SVGがレンダリングされるまで待機
    const container = await canvas.findByRole("button", {}, { timeout: 3000 });

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
 * onEditが未設定の場合
 */
export const WithoutOnEdit: Story = {
  args: {
    id: "no-edit-example",
    code: `@startuml
A -> B
@enduml`,
  },
  decorators: [
    (Story, context) => (
      <MessageSender id={context.args.id} svg={sampleSvg}>
        <Story />
      </MessageSender>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // SVGがレンダリングされるまで待機
    const container = await canvas.findByRole("button", {}, { timeout: 3000 });

    // クリックしてもエラーが発生しないことを確認
    await userEvent.click(container);
  },
};

/**
 * クラス図のサンプル
 */
export const ClassDiagram: Story = {
  args: {
    id: "class-diagram-example",
    code: `@startuml
class User {
  +name: String
  +email: String
  +login()
  +logout()
}

class Order {
  +id: Int
  +total: Float
  +place()
}

User "1" -- "*" Order
@enduml`,
    onEdit: fn(),
  },
  decorators: [
    (Story, context) => {
      const classDiagramSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
        <rect x="20" y="20" width="120" height="80" fill="#FEFECE" stroke="#A80036"/>
        <text x="80" y="45" text-anchor="middle" font-weight="bold" font-size="14">User</text>
        <line x1="20" y1="50" x2="140" y2="50" stroke="#A80036"/>
        <text x="30" y="70" font-size="12">+name: String</text>
        <text x="30" y="85" font-size="12">+email: String</text>
        <rect x="160" y="20" width="120" height="80" fill="#FEFECE" stroke="#A80036"/>
        <text x="220" y="45" text-anchor="middle" font-weight="bold" font-size="14">Order</text>
      </svg>`;

      return (
        <MessageSender id={context.args.id} svg={classDiagramSvg}>
          <Story />
        </MessageSender>
      );
    },
  ],
};
