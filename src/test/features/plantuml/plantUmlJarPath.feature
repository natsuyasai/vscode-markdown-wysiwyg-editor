# language: ja
機能: PlantUMLのjarファイルのパス設定
  PlantUMLのjarは拡張機能に同梱しない。利用者が設定 markdownWysiwygEditor.plantumlJarPath で指定する。
  パスは絶対パスか、先頭が「~」のパス（ホームディレクトリに展開する）で指定する。
  未設定や不正な値のときは、どの設定を見直せばよいかが分かるエラーをプレビューに表示する。
  CIにはJavaもjarもないため、プロセスの起動・ファイルの存在確認・起動完了の確認・HTTP通信は差し替えて検証する。

  背景:
    前提 PlantUMLサーバーのJava実行ファイルとして"/fake/java"が見つかる
    かつ PlantUMLサーバーの起動待ちの上限を200ミリ秒とする

  シナリオ: 拡張機能がPlantUMLのjarパス設定を提供している
    ならば PlantUML用の設定"markdownWysiwygEditor.plantumlJarPath"が文字列型・既定値""で宣言されている

  シナリオアウトライン: Javaとjarのパス設定は、ワークスペースの設定から変更できない
    ならば PlantUML用の設定"<設定>"はマシン単位の設定で、制限モードでは使われない

    例:
      | 設定                                 |
      | markdownWysiwygEditor.plantumlJarPath |
      | markdownWysiwygEditor.javaPath        |

  シナリオ: jarパスが未設定のときは設定を促すエラーになり、プロセスを起動しない
    前提 PlantUMLのjarパス設定が空である
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLの描画結果は"PlantUMLのjarファイルが設定されていません"を含むエラーになる
    かつ PlantUMLの描画結果は"markdownWysiwygEditor.plantumlJarPath"を含むエラーになる
    かつ PlantUMLサーバーのプロセスは起動されていない

  シナリオ: 設定したjarファイルが存在しないときはパス付きのエラーになる
    前提 PlantUMLのjarパス設定を"/not/exist/plantuml.jar"にする
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLの描画結果は"PlantUMLのjarファイルが見つかりません: /not/exist/plantuml.jar"を含むエラーになる
    かつ PlantUMLサーバーのプロセスは起動されていない

  シナリオアウトライン: 絶対パス以外の指定はエラーになる
    前提 PlantUMLのjarパス設定を"<設定値>"にする
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLの描画結果は"<エラー>"を含むエラーになる
    かつ PlantUMLサーバーのプロセスは起動されていない

    例:
      | 設定値                              | エラー               |
      | plantuml.jar                        | 絶対パスで指定してください |
      | ${workspaceFolder}/plantuml.jar     | 変数は使えません         |

  シナリオ: 設定したjarファイルを使ってサーバーを起動する
    前提 PlantUMLのjarパス設定を"/opt/plantuml/plantuml.jar"にする
    かつ PlantUMLのjarファイル"/opt/plantuml/plantuml.jar"が存在する
    かつ PlantUMLサーバーのポート設定を8888にする
    かつ PlantUMLサーバーが準備完了になり、SVG"<svg>ok</svg>"を返す
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLサーバーのプロセスが"/fake/java"で引数"-jar /opt/plantuml/plantuml.jar -picoweb:8888"を付けて起動される
    かつ PlantUMLの描画結果はSVG"<svg>ok</svg>"になる

  シナリオ: 先頭の「~」はホームディレクトリに展開する
    前提 PlantUMLのjarパス設定を"~/tools/plantuml.jar"にする
    かつ ホームディレクトリ配下のPlantUMLのjarファイル"tools/plantuml.jar"が存在する
    かつ PlantUMLサーバーが準備完了になり、SVG"<svg>ok</svg>"を返す
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLサーバーのプロセスはホームディレクトリ配下のjarファイル"tools/plantuml.jar"で起動される

  シナリオ: Javaが見つからないときは、Javaの設定を促すエラーになる
    前提 PlantUMLのjarパス設定を"/opt/plantuml/plantuml.jar"にする
    かつ PlantUMLのjarファイル"/opt/plantuml/plantuml.jar"が存在する
    かつ PlantUMLサーバーのJava実行ファイルが見つからない
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLの描画結果は"markdownWysiwygEditor.javaPath"を含むエラーになる
    かつ PlantUMLサーバーのプロセスは起動されていない

  シナリオ: 未設定で失敗したあとjarパスを設定すると、再読み込みなしで描画できる
    前提 PlantUMLのjarパス設定が空である
    かつ PlantUMLのサンプル図を描画する
    かつ PlantUMLの描画結果は"PlantUMLのjarファイルが設定されていません"を含むエラーになる
    もし PlantUMLのjarパス設定を"/opt/plantuml/plantuml.jar"にする
    かつ PlantUMLのjarファイル"/opt/plantuml/plantuml.jar"が存在する
    かつ PlantUMLサーバーが準備完了になり、SVG"<svg>ok</svg>"を返す
    かつ PlantUMLのサンプル図を描画する
    ならば PlantUMLの描画結果はSVG"<svg>ok</svg>"になる
