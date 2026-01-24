import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useMermaidBlocks } from "@/hooks/useMermaidBlocks";

describe("useMermaidBlocks", () => {
  it("空のMarkdownの場合は空の配列を返すこと", () => {
    const { result } = renderHook(() => useMermaidBlocks(""));

    expect(result.current).toEqual([]);
  });

  it("mermaidブロックが含まれていない場合は空の配列を返すこと", () => {
    const markdown = `# Title

Some text here.

\`\`\`javascript
const x = 1;
\`\`\`
`;
    const { result } = renderHook(() => useMermaidBlocks(markdown));

    expect(result.current).toEqual([]);
  });

  it("単一のmermaidブロックを検出すること", () => {
    const markdown = `# Diagram

\`\`\`mermaid
graph TD
    A --> B
\`\`\`
`;
    const { result } = renderHook(() => useMermaidBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      id: "mermaid-block-0",
      code: "graph TD\n    A --> B",
    });
    expect(result.current[0].startIndex).toBeGreaterThanOrEqual(0);
    expect(result.current[0].endIndex).toBeGreaterThan(result.current[0].startIndex);
  });

  it("複数のmermaidブロックを検出すること", () => {
    const markdown = `# First Diagram

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

# Second Diagram

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello
\`\`\`
`;
    const { result } = renderHook(() => useMermaidBlocks(markdown));

    expect(result.current).toHaveLength(2);
    expect(result.current[0].id).toBe("mermaid-block-0");
    expect(result.current[0].code).toBe("graph TD\n    A --> B");
    expect(result.current[1].id).toBe("mermaid-block-1");
    expect(result.current[1].code).toBe("sequenceDiagram\n    Alice->>Bob: Hello");
  });

  it("ブロック内の空白行を保持すること", () => {
    const markdown = `\`\`\`mermaid
graph TD
    A --> B

    B --> C
\`\`\`
`;
    const { result } = renderHook(() => useMermaidBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].code).toBe("graph TD\n    A --> B\n\n    B --> C");
  });

  it("コードの前後の空白をトリムすること", () => {
    const markdown = `\`\`\`mermaid

graph TD
    A --> B

\`\`\`
`;
    const { result } = renderHook(() => useMermaidBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].code).toBe("graph TD\n    A --> B");
  });

  it("startIndexとendIndexが正しい位置を示すこと", () => {
    const prefix = "# Title\n\n";
    const mermaidBlock = `\`\`\`mermaid
graph TD
    A --> B
\`\`\``;
    const markdown = prefix + mermaidBlock;

    const { result } = renderHook(() => useMermaidBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].startIndex).toBe(prefix.length);
    expect(result.current[0].endIndex).toBe(prefix.length + mermaidBlock.length);
  });

  it("Markdownが変更されたときに結果が更新されること", () => {
    const { result, rerender } = renderHook(({ markdown }) => useMermaidBlocks(markdown), {
      initialProps: { markdown: "" },
    });

    expect(result.current).toEqual([]);

    rerender({
      markdown: `\`\`\`mermaid
graph TD
    A --> B
\`\`\``,
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].code).toBe("graph TD\n    A --> B");
  });

  it("他のコードブロックと混在してもmermaidのみを検出すること", () => {
    const markdown = `\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

\`\`\`python
print("hello")
\`\`\`
`;
    const { result } = renderHook(() => useMermaidBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].code).toBe("graph TD\n    A --> B");
  });

  it("mermaidの大文字小文字が完全一致のみ検出すること", () => {
    const markdown = `\`\`\`Mermaid
graph TD
    A --> B
\`\`\`

\`\`\`MERMAID
graph TD
    C --> D
\`\`\`

\`\`\`mermaid
graph TD
    E --> F
\`\`\`
`;
    const { result } = renderHook(() => useMermaidBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].code).toBe("graph TD\n    E --> F");
  });

  it("useMemoにより同じMarkdownでは結果が再利用されること", () => {
    const markdown = `\`\`\`mermaid
graph TD
    A --> B
\`\`\``;

    const { result, rerender } = renderHook(() => useMermaidBlocks(markdown));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });
});
