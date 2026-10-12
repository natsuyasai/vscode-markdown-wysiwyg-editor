# language: ja
機能: Mermaidの図の安全な描画（実ブラウザ）
  実際のMermaidで図を描画し、図の定義にどのような記述があっても
  描画結果にスクリプトとして実行される要素や属性が含まれないことを確認する。
  あわせて、通常の図の描画とエクスポート用の画像変換が従来どおり動くことを確認する。

  シナリオ: 通常のフローチャートは従来どおり描画される
    前提 次のMermaidの図をReadonly表示で描画する:
      """
      graph TD
        A[開始] --> B{条件}
        B -->|はい| C[処理1]
        B -->|いいえ| D[処理2]
      """
    ならば Mermaidの図のSVGが表示される
    かつ Mermaidの図に"開始"が表示される
    かつ Mermaidの図に"処理1"が表示される
    かつ Mermaidの図に"処理2"が表示される

  シナリオ: シーケンス図の改行タグを含むメッセージは従来どおり描画される
    前提 次のMermaidの図をReadonly表示で描画する:
      """
      sequenceDiagram
        Alice->>Bob: 1行目<br/>2行目
      """
    ならば Mermaidの図のSVGが表示される
    かつ Mermaidの図に"1行目"が表示される
    かつ Mermaidの図に"2行目"が表示される

  シナリオ: ラベルにHTMLタグを含む図でも描画結果にスクリプトとして実行される要素や属性が含まれない
    前提 次のMermaidの図をReadonly表示で描画する:
      """
      graph TD
        A["<img src=x onerror=window.__mermaidExecuted=true>ラベル"] --> B["<script>window.__mermaidExecuted=true</script>次"]
      """
    ならば Mermaidの図のSVGが表示される
    かつ Mermaidの図にスクリプトとして実行される要素や属性が含まれない
    かつ Mermaidの図の描画中にスクリプトが実行されていない

  シナリオ: 編集画面のプレビューでclickディレクティブに関数を指定しても、ノードのクリックで関数は呼び出されない
    前提 Mermaidの図から呼び出される関数"mermaidClickProbe"を用意している
    かつ 次のMermaidの図を編集画面のプレビューとして描画する:
      """
      graph TD
        A[クリック対象] --> B[次]
        click A mermaidClickProbe "tooltip"
      """
    もし Mermaidの図のノード"クリック対象"をクリックする
    ならば Mermaidの図から関数"mermaidClickProbe"は呼び出されていない

  シナリオ: clickディレクティブのjavascriptスキームのリンクは無効化される
    前提 次のMermaidの図をReadonly表示で描画する:
      """
      graph TD
        A[リンク] --> B[次]
        click A href "javascript:window.__mermaidExecuted=true"
      """
    ならば Mermaidの図のSVGが表示される
    かつ Mermaidの図にスクリプトとして実行される要素や属性が含まれない

  シナリオ: 図の定義に含まれる初期化ディレクティブではセキュリティレベルを緩められない
    前提 次のMermaidの図をReadonly表示で描画する:
      """
      %%{init: {"securityLevel": "loose"}}%%
      graph TD
        A[リンク] --> B[次]
        click A href "javascript:window.__mermaidExecuted=true"
      """
    ならば Mermaidの図のSVGが表示される
    かつ Mermaidの図にスクリプトとして実行される要素や属性が含まれない

  シナリオアウトライン: エクスポート用にMermaidの図を<テーマ>テーマのPNG画像へ変換できる
    もし 次のMermaidの図を<テーマ>テーマでPNG画像に変換する:
      """
      graph TD
        A[開始] --> B[終了]
      """
    ならば Mermaidの図のPNG画像のdata URIが得られる

    例:
      | テーマ |
      | light  |
      | dark   |
