# language: ja
機能: フロントマターテーブルの表示
  Markdownのフロントマター（YAML）を、プレビューの先頭にキーと値の表として表示する。

  シナリオ: フラットなkey-valueがそのまま表の行として表示される
    前提 FrontmatterTableのストーリー"FlatDataLight"を描画する
    ならば 表の見出しとして"キー"と"値"が表示されている
    かつ 次の行が表示されている:
      | キー      | 値                   |
      | title     | サンプルドキュメント |
      | author    | 山田太郎             |
      | published | true                 |

  シナリオ: 配列はカンマ区切り、オブジェクトはJSONで表示される
    前提 FrontmatterTableのストーリー"NestedDataLight"を描画する
    ならば 次の行が表示されている:
      | キー | 値                                |
      | tags | markdown, editor, vscode          |
      | meta | {"draft":false,"reviewer":"佐藤"} |
