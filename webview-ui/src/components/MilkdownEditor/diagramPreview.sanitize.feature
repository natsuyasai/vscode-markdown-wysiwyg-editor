# language: ja
機能: 編集画面の図プレビューの無害化
  編集モードのコードブロックプレビューでは、MermaidとPlantUMLの描画結果を無害化してから挿入する。
  図の内容（テキストや配色）は無害化の前後で変わらない。

  シナリオ: PlantUMLの描画結果は無害化してからプレビューに挿入される
    前提 編集画面の図プレビューでPlantUMLの描画を要求している
    もし 拡張機能から編集画面の図プレビューに次のPlantUMLの描画結果が届く:
      """
      <svg xmlns="http://www.w3.org/2000/svg"><text>シーケンス図</text><script>window.__diagramSvgExecuted = true</script><rect width="10" height="10" onload="window.__diagramSvgExecuted = true"></rect></svg>
      """
    ならば 編集画面の図プレビューにスクリプトとして実行される要素や属性が含まれない
    かつ 編集画面の図プレビューに"シーケンス図"が表示される

  シナリオ: PlantUMLの描画に失敗した場合はエラー内容が文字列として表示される
    前提 編集画面の図プレビューでPlantUMLの描画を要求している
    もし 拡張機能から編集画面の図プレビューにPlantUMLの描画エラー"<img src=x onerror=alert(1)>"が届く
    ならば 編集画面の図プレビューにスクリプトとして実行される要素や属性が含まれない
    かつ 編集画面の図プレビューに"PlantUML Error: <img src=x onerror=alert(1)>"が表示される

  シナリオアウトライン: Mermaidの描画結果は<テーマ>テーマでも無害化してからプレビューに挿入される
    前提 Mermaidが次のSVGを出力する:
      """
      <svg xmlns="http://www.w3.org/2000/svg"><rect width="40" height="20" fill="#eaeaea"></rect><text>フローチャート</text><script>window.__diagramSvgExecuted = true</script></svg>
      """
    もし 編集画面で<テーマ>テーマのMermaidの図のプレビューを描画する
    ならば 編集画面の図プレビューにスクリプトとして実行される要素や属性が含まれない
    かつ 編集画面の図プレビューに"フローチャート"が表示される
    かつ 編集画面の図プレビューの矩形の塗りは"<塗り>"である

    例:
      | テーマ | 塗り    |
      | light  | #eaeaea |
      | dark   | #3d3d3d |
