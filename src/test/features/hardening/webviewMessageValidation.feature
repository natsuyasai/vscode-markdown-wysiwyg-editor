# language: ja
@B4 @L-03
機能: WebViewから受け取るメッセージの検証
  WebViewから受け取るメッセージは、処理する前に実行時に形式を検証する。
  メッセージの種類ごとに必須の項目とその型を確認し、形式が正しいものだけを処理する。
  不正な形式のメッセージは例外を発生させずに無視し、ファイル・設定・エディタ・WebViewへの副作用を起こさない。
  将来の拡張に備えて、定義されていない追加の項目は許容する。

  シナリオアウトライン: 正しい形式のメッセージは受け付けられる
    もし 次のWebViewメッセージの形式を検証する:
      """
      <メッセージ>
      """
    ならば WebViewメッセージは受け付けられる

    例:
      | メッセージ                                                                                                         |
      | {"type":"init"}                                                                                                    |
      | {"type":"update","payload":"# 見出し"}                                                                              |
      | {"type":"save","payload":"# 見出し"}                                                                                |
      | {"type":"save","payload":""}                                                                                       |
      | {"type":"reload"}                                                                                                  |
      | {"type":"saveImage","payload":{"requestId":"r1","imageData":"data:image/png;base64,AAAA","fileName":"a.png","mimeType":"image/png"}} |
      | {"type":"saveImage","payload":{"requestId":"r1","imageData":"AAAA","fileName":"","mimeType":"image/png"}}          |
      | {"type":"renderPlantUml","payload":{"code":"A -> B","requestId":"r2"}}                                             |
      | {"type":"saveSettings","payload":{"themeSetting":"auto"}}                                                          |
      | {"type":"saveSettings","payload":{"themeSetting":"light"}}                                                         |
      | {"type":"saveSettings","payload":{"themeSetting":"dark"}}                                                          |
      | {"type":"openFile","payload":{"filePath":"/tmp/a.md"}}                                                             |
      | {"type":"openFile","payload":{"filePath":"/tmp/a.md","anchor":"#section"}}                                         |
      | {"type":"exportHtml"}                                                                                              |
      | {"type":"exportHtml","payload":{"mermaidImages":[]}}                                                               |
      | {"type":"exportHtml","payload":{"mermaidImages":[{"code":"graph TD;","dataUri":"data:image/png;base64,AAAA"}]}}    |
      | {"type":"exportBlogHtml","payload":{"mermaidImages":[{"code":"graph TD;","dataUri":"data:image/png;base64,AAAA"}]}} |
      | {"type":"exportPdf"}                                                                                               |
      | {"type":"exportPdf","payload":{"mermaidImages":[]}}                                                                |
      | {"type":"exportPdf","payload":{"mermaidImages":[{"code":"graph TD;","dataUri":"data:image/png;base64,AAAA"}]}}    |
      | {"type":"exportHtml","payload":{"plantUmlImages":[{"code":"@startuml","dataUri":"data:image/png;base64,AAAA"}]}} |
      | {"type":"exportPdf","payload":{"mermaidImages":[],"plantUmlImages":[{"code":"@startuml","dataUri":"data:image/png;base64,AAAA"}]}} |
      | {"type":"save","payload":"# 見出し","extra":1}                                                                      |

  シナリオアウトライン: 不正な形式のメッセージは受け付けられない
    もし 次のWebViewメッセージの形式を検証する:
      """
      <メッセージ>
      """
    ならば WebViewメッセージは受け付けられない

    例:
      | メッセージ                                                                                          |
      | null                                                                                                |
      | "save"                                                                                              |
      | 42                                                                                                  |
      | []                                                                                                  |
      | {}                                                                                                  |
      | {"type":"unknown"}                                                                                  |
      | {"type":123}                                                                                        |
      | {"type":"update"}                                                                                   |
      | {"type":"save"}                                                                                     |
      | {"type":"save","payload":1}                                                                         |
      | {"type":"save","payload":{"text":"# 見出し"}}                                                        |
      | {"type":"saveImage"}                                                                                |
      | {"type":"saveImage","payload":{"imageData":"AAAA","fileName":"a.png","mimeType":"image/png"}}       |
      | {"type":"saveImage","payload":{"requestId":"r1","fileName":"a.png","mimeType":"image/png"}}         |
      | {"type":"saveImage","payload":{"requestId":"r1","imageData":"AAAA","fileName":1,"mimeType":"image/png"}} |
      | {"type":"saveImage","payload":{"requestId":"r1","imageData":"AAAA","fileName":"a.png"}}             |
      | {"type":"renderPlantUml","payload":{"requestId":"r2"}}                                              |
      | {"type":"renderPlantUml","payload":{"code":["A -> B"],"requestId":"r2"}}                            |
      | {"type":"saveSettings"}                                                                             |
      | {"type":"saveSettings","payload":{}}                                                                |
      | {"type":"saveSettings","payload":{"themeSetting":"purple"}}                                         |
      | {"type":"openFile"}                                                                                 |
      | {"type":"openFile","payload":{"filePath":1}}                                                        |
      | {"type":"openFile","payload":{"filePath":"/tmp/a.md","anchor":1}}                                   |
      | {"type":"exportHtml","payload":{"mermaidImages":"graph TD;"}}                                       |
      | {"type":"exportHtml","payload":{"mermaidImages":[{"code":"graph TD;"}]}}                            |
      | {"type":"exportBlogHtml","payload":{"mermaidImages":[{"code":1,"dataUri":"data:image/png;base64,AAAA"}]}} |
      | {"type":"exportPdf","payload":{"mermaidImages":"graph TD;"}}                                        |
      | {"type":"exportPdf","payload":{"mermaidImages":[{"code":"graph TD;"}]}}                             |
      | {"type":"exportHtml","payload":{"plantUmlImages":"@startuml"}} |
      | {"type":"exportBlogHtml","payload":{"plantUmlImages":[{"code":"@startuml"}]}} |

  シナリオ: 不正な形式のメッセージを受け取っても、例外にならず何も処理されない
    前提 強化検証用の一時ディレクトリ内の"docs/doc.md"にMarkdown文書を保存してある
    かつ 強化検証で文書"docs/doc.md"をメッセージ処理の対象にしている
    もし 強化検証で次のWebViewメッセージを受け取る:
      """
      {"type":"saveImage","payload":{"requestId":"r1","imageData":"AAAA","fileName":1,"mimeType":"image/png"}}
      """
    ならば WebViewメッセージの処理は例外なく完了する
    かつ 強化検証のWebViewにメッセージは送られない
    かつ 強化検証用の一時ディレクトリにファイルが追加されていない

  シナリオ: nullのメッセージを受け取っても、例外にならず何も処理されない
    前提 強化検証用の一時ディレクトリ内の"docs/doc.md"にMarkdown文書を保存してある
    かつ 強化検証で文書"docs/doc.md"をメッセージ処理の対象にしている
    もし 強化検証で次のWebViewメッセージを受け取る:
      """
      null
      """
    ならば WebViewメッセージの処理は例外なく完了する
    かつ 強化検証のWebViewにメッセージは送られない

  シナリオ: 不正なテーマ値の設定保存要求では、テーマ設定は変更されない
    前提 強化検証用の一時ディレクトリ内の"docs/doc.md"にMarkdown文書を保存してある
    かつ 強化検証で文書"docs/doc.md"をメッセージ処理の対象にしている
    かつ 強化検証でユーザー設定のエディタテーマが"dark"である
    もし 強化検証で次のWebViewメッセージを受け取る:
      """
      {"type":"saveSettings","payload":{"themeSetting":"purple"}}
      """
    ならば WebViewメッセージの処理は例外なく完了する
    かつ 強化検証でユーザー設定のエディタテーマは"dark"のままである
