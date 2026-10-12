# language: ja
機能: PlantUMLサーバーの起動確認と再起動
  PlantUMLサーバーは、HTTPに応答できることを確認してから起動済みとみなす。
  起動に失敗した場合や、起動後にプロセスが終了した場合は、次の描画で起動し直す。
  CIにはJavaもjarもないため、プロセス・起動確認・HTTP通信は差し替えて検証する。

  背景:
    前提 PlantUMLサーバーのJava実行ファイルとして"/fake/java"が見つかる
    かつ PlantUMLサーバーの起動待ちの上限を200ミリ秒とする
    かつ PlantUMLのjarパス設定を"/opt/plantuml/plantuml.jar"にする
    かつ PlantUMLのjarファイル"/opt/plantuml/plantuml.jar"が存在する

  # ---- U-06: 起動完了の判定 ----

  シナリオ: 起動待ちの上限までに準備完了を確認できなければ、起動成功とみなさずエラーにする
    前提 PlantUMLサーバーのプロセスは起動するが準備完了にならない
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLの描画結果は"PlantUMLサーバーの起動を確認できませんでした"を含むエラーになる
    かつ 1回目に起動したPlantUMLサーバーのプロセスは停止されている

  シナリオ: 準備完了を確認できなかったあとの描画では、サーバーを起動し直す
    前提 PlantUMLサーバーのプロセスは起動するが準備完了にならない
    かつ PlantUMLのサンプル図を描画する
    もし PlantUMLサーバーが準備完了になり、SVG"<svg>ok</svg>"を返す
    かつ PlantUMLのサンプル図を描画する
    ならば PlantUMLサーバーのプロセスは2回起動されている
    かつ PlantUMLの描画結果はSVG"<svg>ok</svg>"になる

  シナリオ: 描画が同時に要求されても、サーバーのプロセスは1つだけ起動する
    前提 PlantUMLサーバーが準備完了になり、SVG"<svg>ok</svg>"を返す
    もし PlantUMLのサンプル図の描画を3件同時に要求する
    ならば PlantUMLサーバーのプロセスは1回起動されている
    かつ 同時に要求したPlantUMLの描画結果はすべてSVG"<svg>ok</svg>"になる

  # ---- U-02: プロセス終了後の再起動 ----

  シナリオ: 起動済みのサーバープロセスが終了したら、次の描画で再起動する
    前提 PlantUMLサーバーが準備完了になり、SVG"<svg>ok</svg>"を返す
    かつ PlantUMLのサンプル図を描画する
    もし PlantUMLサーバーのプロセスが終了コード1で終了する
    かつ PlantUMLのサンプル図を描画する
    ならば PlantUMLサーバーのプロセスは2回起動されている
    かつ PlantUMLの描画結果はSVG"<svg>ok</svg>"になる

  シナリオ: 起動直後にプロセスが異常終了したら、標準エラー出力を含むエラーになり、次の描画で再試行する
    前提 PlantUMLサーバーのプロセスが標準エラー出力"Error: Unable to access jarfile"を出して終了コード1で終了する
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLの描画結果は"Unable to access jarfile"を含むエラーになる
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLサーバーのプロセスは2回起動されている

  シナリオ: HTTPステータスが200以外ならエラーになる
    前提 PlantUMLサーバーが準備完了になり、ステータス500を返す
    もし PlantUMLのサンプル図を描画する
    ならば PlantUMLの描画結果は"500"を含むエラーになる
