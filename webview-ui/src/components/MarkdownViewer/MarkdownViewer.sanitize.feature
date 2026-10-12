# language: ja
機能: Readonly表示の図の無害化
  Readonly（プレビュー）表示では、MermaidとPlantUMLの描画結果を無害化してから表示する。
  図の内容（テキストや配色）は無害化の前後で変わらない。

  シナリオ: PlantUMLの描画結果は無害化してから表示される
    前提 次のPlantUMLの図を含む文書をReadonly表示している:
      """
      ```plantuml
      @startuml
      Alice -> Bob: Hello
      @enduml
      ```
      """
    もし 拡張機能からReadonly表示の図に次のPlantUMLの描画結果が届く:
      """
      <svg xmlns="http://www.w3.org/2000/svg"><text>Alice</text><script>window.__diagramSvgExecuted = true</script><a href="javascript:window.__diagramSvgExecuted = true"><text>Bob</text></a></svg>
      """
    ならば Readonly表示の図にスクリプトとして実行される要素や属性が含まれない
    かつ Readonly表示の図に"Alice"が表示される
    かつ Readonly表示の図に"Bob"が表示される

  シナリオアウトライン: Mermaidの描画結果は<テーマ>テーマでも無害化してから表示される
    前提 Mermaidが次のSVGを出力する:
      """
      <svg xmlns="http://www.w3.org/2000/svg"><rect width="40" height="20" fill="#eaeaea"></rect><text>フローチャート</text><rect width="1" height="1" onload="window.__diagramSvgExecuted = true"></rect></svg>
      """
    もし 次のMermaidの図を含む文書を<テーマ>テーマでReadonly表示する:
      """
      ```mermaid
      graph TD
        A[フローチャート]
      ```
      """
    ならば Readonly表示の図にスクリプトとして実行される要素や属性が含まれない
    かつ Readonly表示の図に"フローチャート"が表示される
    かつ Readonly表示の図の矩形の塗りは"<塗り>"である

    例:
      | テーマ | 塗り    |
      | light  | #eaeaea |
      | dark   | #3d3d3d |
