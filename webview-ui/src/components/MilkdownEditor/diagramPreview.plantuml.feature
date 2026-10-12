# language: ja
機能: エディタ内のPlantUMLプレビューの要求と応答待ち
  エディタ（Milkdown）内のPlantUMLコードブロックは、拡張機能に描画を要求し、応答のSVGをプレビューに表示する。
  拡張機能から応答が返らない場合でも、プレビューが「Loading...」のまま残り続けないようにする（応答待ちの上限は既定で60秒）。
  同じコードの要求が応答待ちの間に重なった場合は、拡張機能への要求を1回にまとめる。
  時間の経過はフェイクタイマーで進め、拡張機能へのメッセージ送信は差し替えて記録する。
  （stepのタイムアウトもタイマーで動くため、検証では応答待ちの上限を短くする）

  背景:
    前提 PlantUMLのプレビュー検証用にフェイクタイマーを使う
    かつ PlantUMLのプレビュー検証用に拡張機能へのメッセージを記録する
    かつ PlantUMLのプレビューの応答待ちの上限を1000ミリ秒とする

  シナリオ: 応答待ちの上限は既定で60秒である
    ならば PlantUMLのプレビューの応答待ちの上限の既定値は60000ミリ秒である

  シナリオ: PlantUMLのプレビューを要求すると、拡張機能に描画要求を送る
    もし PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    ならば 拡張機能にPlantUMLの描画要求がリクエストID"req-1"、コード"@startuml A -> B @enduml"で1回送られている

  シナリオ: 応答が返るとSVGがプレビューに表示される
    前提 PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    もし 拡張機能からリクエストID"req-1"のPlantUML描画結果としてSVG"<svg data-testid='plantuml-ok'></svg>"が返る
    ならば リクエストID"req-1"のPlantUMLプレビューにSVGが表示されている

  シナリオ: 応答がエラーなら、エラーがプレビューに表示される
    前提 PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    もし 拡張機能からリクエストID"req-1"のPlantUML描画結果としてエラー"PlantUMLのjarファイルが設定されていません"が返る
    ならば リクエストID"req-1"のPlantUMLプレビューに"PlantUMLのjarファイルが設定されていません"を含むエラーが表示されている

  シナリオ: 応答待ちの上限を過ぎるとタイムアウトのエラーが表示される
    前提 PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    もし PlantUMLの応答待ちの上限まで時間が経過する
    ならば リクエストID"req-1"のPlantUMLプレビューに"PlantUMLの描画がタイムアウトしました"を含むエラーが表示されている

  シナリオ: 上限の直前ではタイムアウトしない
    前提 PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    もし PlantUMLの応答待ちの上限の1ミリ秒前まで時間が経過する
    ならば リクエストID"req-1"のPlantUMLプレビューはまだ更新されていない

  シナリオ: タイムアウトしたあとに届いた応答は無視される
    前提 PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    かつ PlantUMLの応答待ちの上限まで時間が経過する
    もし 拡張機能からリクエストID"req-1"のPlantUML描画結果としてSVG"<svg data-testid='plantuml-ok'></svg>"が返る
    ならば リクエストID"req-1"のPlantUMLプレビューの更新は1回だけである

  シナリオ: 上限より前に応答が返れば、あとからタイムアウトのエラーは表示されない
    前提 PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    かつ 拡張機能からリクエストID"req-1"のPlantUML描画結果としてSVG"<svg data-testid='plantuml-ok'></svg>"が返る
    もし PlantUMLの応答待ちの上限まで時間が経過する
    ならば リクエストID"req-1"のPlantUMLプレビューの更新は1回だけである
    かつ リクエストID"req-1"のPlantUMLプレビューにSVGが表示されている

  シナリオ: 同じコードの要求が応答待ちの間に重なったら、拡張機能への要求は1回にまとめ、両方に結果を表示する
    前提 PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    かつ PlantUMLプレビューをリクエストID"req-2"、コード"@startuml A -> B @enduml"で要求する
    もし 拡張機能からリクエストID"req-1"のPlantUML描画結果としてSVG"<svg data-testid='plantuml-ok'></svg>"が返る
    ならば 拡張機能へのPlantUMLの描画要求は1回である
    かつ リクエストID"req-1"のPlantUMLプレビューにSVGが表示されている
    かつ リクエストID"req-2"のPlantUMLプレビューにSVGが表示されている

  シナリオ: 重なった要求がタイムアウトしたら、両方にタイムアウトのエラーを表示する
    前提 PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    かつ PlantUMLプレビューをリクエストID"req-2"、コード"@startuml A -> B @enduml"で要求する
    もし PlantUMLの応答待ちの上限まで時間が経過する
    ならば リクエストID"req-1"のPlantUMLプレビューに"PlantUMLの描画がタイムアウトしました"を含むエラーが表示されている
    かつ リクエストID"req-2"のPlantUMLプレビューに"PlantUMLの描画がタイムアウトしました"を含むエラーが表示されている

  シナリオ: 異なるコードの要求は、それぞれ拡張機能に送る
    もし PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    かつ PlantUMLプレビューをリクエストID"req-2"、コード"@startuml A -> C @enduml"で要求する
    ならば 拡張機能へのPlantUMLの描画要求は2回である

  シナリオ: 応答を受け取ったあとに同じコードを要求すると、改めて拡張機能に要求する
    前提 PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    かつ 拡張機能からリクエストID"req-1"のPlantUML描画結果としてSVG"<svg data-testid='plantuml-ok'></svg>"が返る
    もし PlantUMLプレビューをリクエストID"req-2"、コード"@startuml A -> B @enduml"で要求する
    ならば 拡張機能にPlantUMLの描画要求がリクエストID"req-2"、コード"@startuml A -> B @enduml"で1回送られている

  シナリオ: タイムアウトしたあとに同じコードを要求すると、改めて拡張機能に要求する
    前提 PlantUMLプレビューをリクエストID"req-1"、コード"@startuml A -> B @enduml"で要求する
    かつ PlantUMLの応答待ちの上限まで時間が経過する
    もし PlantUMLプレビューをリクエストID"req-2"、コード"@startuml A -> B @enduml"で要求する
    ならば 拡張機能にPlantUMLの描画要求がリクエストID"req-2"、コード"@startuml A -> B @enduml"で1回送られている
