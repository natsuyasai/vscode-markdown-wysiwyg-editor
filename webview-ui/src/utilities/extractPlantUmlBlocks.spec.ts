import { describe, it, expect } from "vitest";
import { extractPlantUmlBlocks } from "@/utilities/extractPlantUmlBlocks";

describe("extractPlantUmlBlocks", () => {
  it("plantumlブロックの中身を出現順に返すこと", () => {
    const markdown = [
      "```plantuml",
      "@startuml",
      "A -> B",
      "@enduml",
      "```",
      "",
      "```plantuml",
      "@startuml",
      "C -> D",
      "@enduml",
      "```",
    ].join("\n");

    expect(extractPlantUmlBlocks(markdown)).toEqual([
      "@startuml\nA -> B\n@enduml",
      "@startuml\nC -> D\n@enduml",
    ]);
  });

  it("info stringの大文字小文字と前後の空白を無視すること", () => {
    expect(extractPlantUmlBlocks("```  PlantUML \n@startuml\n@enduml\n```")).toEqual([
      "@startuml\n@enduml",
    ]);
  });

  it("mermaidなど他の言語のブロックは対象にしないこと", () => {
    expect(extractPlantUmlBlocks("```mermaid\ngraph TD;A-->B;\n```")).toEqual([]);
  });

  it("plantumlを含まないMarkdownでは空配列を返すこと", () => {
    expect(extractPlantUmlBlocks("# title\n\ntext")).toEqual([]);
  });
});
