# language: ja
機能: PlantUMLサーバーのポート設定
  PlantUMLサーバーは、設定 markdownWysiwygEditor.plantumlServerPort のポートで起動する。
  設定の変更は次の描画から反映する。他のプロセスが使っているポートでは起動せず、エラーにする（自動で別のポートに切り替えない）。

  背景:
    前提 PlantUMLサーバーのJava実行ファイルとして"/fake/java"が見つかる
    かつ PlantUMLサーバーの起動待ちの上限を200ミリ秒とする
    かつ PlantUMLのjarパス設定を"/opt/plantuml/plantuml.jar"にする
    かつ PlantUMLのjarファイル"/opt/plantuml/plantuml.jar"が存在する

  シナリオ: ポート設定を変更すると、次の描画では新しいポートでサーバーを起動し直す
    前提 PlantUMLサーバーのポート設定を8888にする
    かつ PlantUMLサーバーが準備完了になり、SVG"<svg>ok</svg>"を返す
    かつ PlantUMLのサンプル図を描画する
    もし PlantUMLサーバーのポート設定を9999に変更する
    かつ PlantUMLのサンプル図を描画する
    ならば 1回目に起動したPlantUMLサーバーのプロセスは停止されている
    かつ PlantUMLサーバーのプロセスが"/fake/java"で引数"-jar /opt/plantuml/plantuml.jar -picoweb:9999"を付けて起動される
    かつ PlantUMLの描画結果はSVG"<svg>ok</svg>"になる

  シナリオ: 設定が変わらなければ、起動済みのサーバーをそのまま使う
    前提 PlantUMLサーバーが準備完了になり、SVG"<svg>ok</svg>"を返す
    かつ PlantUMLのサンプル図を描画する
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLサーバーのプロセスは1回起動されている

  シナリオ: 設定したポートを他のプロセスが使用中なら、そのプロセスに接続せずエラーにする
    前提 PlantUMLサーバーのポート設定のポートを別のプロセスが使用している
    かつ PlantUMLサーバーが準備完了になり、SVG"<svg>ok</svg>"を返す
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLの描画結果は"は他のプロセスが使用しています"を含むエラーになる
    かつ PlantUMLの描画結果は"markdownWysiwygEditor.plantumlServerPort"を含むエラーになる
    かつ PlantUMLサーバーのプロセスは起動されていない
