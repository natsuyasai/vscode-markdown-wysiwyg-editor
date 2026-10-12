# language: ja
機能: PlantUMLサーバーが使うJava実行ファイルの特定
  設定 markdownWysiwygEditor.javaPath、環境変数 JAVA_HOME、PATH（Windowsは where java、それ以外は which java）の順に
  Java実行ファイルを探す。PATHに複数のJavaがある場合、探索コマンドは1行に1つずつパスを出力する。
  探索コマンドの出力に含まれる改行コードは、[CR]（キャリッジリターン）と [LF]（ラインフィード）で表記する。

  背景:
    前提 PlantUMLサーバーのJava設定とJAVA_HOMEが未設定である

  シナリオ: Windowsで複数のJavaが見つかったとき、改行コードを含まない最初のパスを使う
    前提 PlantUMLサーバーのJava探索コマンドが"C:\Program Files\Java\jdk-21\bin\java.exe[CR][LF]C:\Program Files\Java\jdk-17\bin\java.exe[CR][LF]"を出力する
    もし PlantUMLサーバーが使うJava実行ファイルを求める
    ならば PlantUMLサーバーのJava実行ファイルは"C:\Program Files\Java\jdk-21\bin\java.exe"である

  シナリオアウトライン: 探索コマンドの出力から最初のパスだけを取り出す
    前提 PlantUMLサーバーのJava探索コマンドが"<出力>"を出力する
    もし PlantUMLサーバーが使うJava実行ファイルを求める
    ならば PlantUMLサーバーのJava実行ファイルは"<パス>"である

    例:
      | 出力                                     | パス          |
      | /usr/bin/java[LF]                        | /usr/bin/java |
      | /usr/bin/java[LF]/usr/local/bin/java[LF] | /usr/bin/java |
      | C:\jdk\java.exe[CR][LF]                  | C:\jdk\java.exe |
      | C:\jdk\java.exe[CR][LF]D:\jdk\java.exe[CR][LF] | C:\jdk\java.exe |
      | [CR][LF]  C:\jdk\java.exe  [CR][LF]      | C:\jdk\java.exe |

  シナリオ: 探索コマンドがJavaを見つけられなければ、Java実行ファイルは見つからない
    前提 PlantUMLサーバーのJava探索コマンドが終了コード1で何も出力しない
    もし PlantUMLサーバーが使うJava実行ファイルを求める
    ならば PlantUMLサーバーのJava実行ファイルは見つからない
