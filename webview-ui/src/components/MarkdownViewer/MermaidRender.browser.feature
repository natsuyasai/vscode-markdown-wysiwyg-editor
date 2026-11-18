# language: ja
機能: Mermaidの各種図の描画（実ブラウザ）
  実際のMermaidで代表的な種類の図を描画し、SVGとノードのテキストが出力されることを確認する。
  依存ライブラリ（mermaid）の更新で描画できなくなる図の種類がないことを検出するための特性テスト。

  シナリオアウトライン: <種類>がReadonly表示で描画される
    前提 次のMermaidの図をReadonly表示で描画する:
      """
      <定義>
      """
    ならば Mermaidの図のSVGが表示される
    かつ Mermaidの図に"<テキスト1>"が表示される
    かつ Mermaidの図に"<テキスト2>"が表示される
    かつ Mermaidの図にスクリプトとして実行される要素や属性が含まれない
    かつ Mermaidの図は従来のclassicの見た目で描画される

    例:
      | 種類         | 定義                                                         | テキスト1 | テキスト2 |
      | フローチャート | flowchart LR\n  A[入力] --> B[出力]                          | 入力      | 出力      |
      | シーケンス図   | sequenceDiagram\n  Alice->>Bob: 挨拶\n  Bob-->>Alice: 返事 | 挨拶      | 返事      |
      | クラス図       | classDiagram\n  Animal <\|-- Dog\n  Animal : +name          | Animal    | Dog       |
      | 状態遷移図     | stateDiagram-v2\n  [*] --> 待機\n  待機 --> 実行            | 待機      | 実行      |
      | ER図           | erDiagram\n  CUSTOMER \|\|--o{ ORDER : places               | CUSTOMER  | ORDER     |
      | 円グラフ       | pie title 内訳\n  "りんご" : 60\n  "みかん" : 40            | りんご    | みかん    |
      | ガントチャート | gantt\n  dateFormat YYYY-MM-DD\n  section 工程\n  設計 :a1, 2024-01-01, 3d | 工程 | 設計 |

  シナリオ: 編集画面のプレビューでもフローチャートが描画される
    前提 次のMermaidの図を編集画面のプレビューとして描画する:
      """
      graph TD
        A[プレビュー開始] --> B[プレビュー終了]
      """
    ならば Mermaidの図のSVGが表示される
    かつ Mermaidの図に"プレビュー開始"が表示される
    かつ Mermaidの図に"プレビュー終了"が表示される
    かつ Mermaidの図は従来のclassicの見た目で描画される
