# language: ja
機能: PlantUMLサーバーから受け取ったSVGの組み立て
  PlantUMLサーバーのHTTPレスポンスは、複数のチャンクに分かれて届く。
  日本語などのマルチバイト文字がチャンクの境界で分割されても、文字化けせずにSVGを組み立てる。

  シナリオ: マルチバイト文字が1バイトずつのチャンクに分割されても文字化けしない
    前提 PlantUMLサーバーのレスポンス本文"<svg><text>日本語のラベル</text></svg>"がUTF-8の1バイトずつのチャンクで届く
    もし PlantUMLサーバーのレスポンス本文を組み立てる
    ならば 組み立てたPlantUMLサーバーのレスポンス本文は"<svg><text>日本語のラベル</text></svg>"である

  シナリオ: 絵文字（4バイト）が2つのチャンクの境界で分割されても文字化けしない
    前提 PlantUMLサーバーのレスポンス本文"<svg>😀</svg>"がUTF-8の7バイト目で2つのチャンクに分かれて届く
    もし PlantUMLサーバーのレスポンス本文を組み立てる
    ならば 組み立てたPlantUMLサーバーのレスポンス本文は"<svg>😀</svg>"である

  シナリオ: ローカルのPlantUMLサーバーから分割して届いた日本語のSVGを文字化けせずに表示する
    前提 PlantUMLサーバーのJava実行ファイルとして"/fake/java"が見つかる
    かつ PlantUMLのjarパス設定を"/opt/plantuml/plantuml.jar"にする
    かつ PlantUMLのjarファイル"/opt/plantuml/plantuml.jar"が存在する
    かつ PlantUMLサーバーの応答として、SVG"<svg><text>日本語のラベル</text></svg>"をUTF-8の1バイトずつ分割して返すHTTPスタブを使う
    もし 次のPlantUMLコードを描画する:
      """
      @startuml
      Alice -> Bob : 日本語のラベル
      @enduml
      """
    ならば PlantUMLの描画結果はSVG"<svg><text>日本語のラベル</text></svg>"になる
