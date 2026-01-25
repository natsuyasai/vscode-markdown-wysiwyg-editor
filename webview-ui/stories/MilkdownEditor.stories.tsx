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
    <div data-theme={theme} style={{ height: "100%", background: theme === "dark" ? "#1e1e1e" : "#ffffff" }}>
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
