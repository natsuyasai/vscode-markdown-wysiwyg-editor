import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePlantUmlBlocks } from "@/hooks/usePlantUmlBlocks";

describe("usePlantUmlBlocks", () => {
  it("空のMarkdownの場合は空の配列を返すこと", () => {
    const { result } = renderHook(() => usePlantUmlBlocks(""));

    expect(result.current).toEqual([]);
  });

  it("plantumlブロックが含まれていない場合は空の配列を返すこと", () => {
    const markdown = `# Title

Some text here.

\`\`\`javascript
const x = 1;
\`\`\`
`;
    const { result } = renderHook(() => usePlantUmlBlocks(markdown));

    expect(result.current).toEqual([]);
  });

  it("単一のplantumlブロックを検出すること", () => {
    const markdown = `# Diagram

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`
`;
    const { result } = renderHook(() => usePlantUmlBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      id: "plantuml-block-0",
      code: "@startuml\nAlice -> Bob: Hello\n@enduml",
    });
    expect(result.current[0].startIndex).toBeGreaterThanOrEqual(0);
    expect(result.current[0].endIndex).toBeGreaterThan(result.current[0].startIndex);
  });

  it("複数のplantumlブロックを検出すること", () => {
    const markdown = `# First Diagram

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`

# Second Diagram

\`\`\`plantuml
@startuml
class User {
  +name: string
}
@enduml
\`\`\`
`;
    const { result } = renderHook(() => usePlantUmlBlocks(markdown));

    expect(result.current).toHaveLength(2);
    expect(result.current[0].id).toBe("plantuml-block-0");
    expect(result.current[0].code).toBe("@startuml\nAlice -> Bob: Hello\n@enduml");
    expect(result.current[1].id).toBe("plantuml-block-1");
    expect(result.current[1].code).toContain("class User");
  });

  it("ブロック内の空白行を保持すること", () => {
    const markdown = `\`\`\`plantuml
@startuml
Alice -> Bob: Hello

Bob -> Alice: Hi
@enduml
\`\`\`
`;
    const { result } = renderHook(() => usePlantUmlBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].code).toBe("@startuml\nAlice -> Bob: Hello\n\nBob -> Alice: Hi\n@enduml");
  });

  it("コードの前後の空白をトリムすること", () => {
    const markdown = `\`\`\`plantuml

@startuml
Alice -> Bob: Hello
@enduml

\`\`\`
`;
    const { result } = renderHook(() => usePlantUmlBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].code).toBe("@startuml\nAlice -> Bob: Hello\n@enduml");
  });

  it("startIndexとendIndexが正しい位置を示すこと", () => {
    const prefix = "# Title\n\n";
    const plantumlBlock = `\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\``;
    const markdown = prefix + plantumlBlock;

    const { result } = renderHook(() => usePlantUmlBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].startIndex).toBe(prefix.length);
    expect(result.current[0].endIndex).toBe(prefix.length + plantumlBlock.length);
  });

  it("Markdownが変更されたときに結果が更新されること", () => {
    const { result, rerender } = renderHook(({ markdown }) => usePlantUmlBlocks(markdown), {
      initialProps: { markdown: "" },
    });

    expect(result.current).toEqual([]);

    rerender({
      markdown: `\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\``,
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].code).toContain("Alice -> Bob");
  });

  it("他のコードブロックと混在してもplantumlのみを検出すること", () => {
    const markdown = `\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\`

\`\`\`mermaid
graph TD
    A --> B
\`\`\`
`;
    const { result } = renderHook(() => usePlantUmlBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].code).toContain("Alice -> Bob");
  });

  it("plantumlの大文字小文字が完全一致のみ検出すること", () => {
    const markdown = `\`\`\`PlantUML
@startuml
A -> B
@enduml
\`\`\`

\`\`\`PLANTUML
@startuml
C -> D
@enduml
\`\`\`

\`\`\`plantuml
@startuml
E -> F
@enduml
\`\`\`
`;
    const { result } = renderHook(() => usePlantUmlBlocks(markdown));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].code).toContain("E -> F");
  });

  it("useMemoにより同じMarkdownでは結果が再利用されること", () => {
    const markdown = `\`\`\`plantuml
@startuml
Alice -> Bob: Hello
@enduml
\`\`\``;

    const { result, rerender } = renderHook(() => usePlantUmlBlocks(markdown));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });
});
