# language: ja
@B2 @X-02
機能: 未保存の編集内容のエクスポート
  WebViewで編集して保存していない内容も、エクスポート結果に反映する。
  WebViewは、エクスポート要求を送る前に未反映の編集をTextDocumentへ反映する（B1の仕組み。webview-ui側は utilities/vscode.ts の単体テストで検証済み）。
  拡張機能はメッセージを受信順に処理するため、エクスポートは反映済みの document.getText() を使う。
  エクスポートしても、文書は保存しない（明示保存を維持）。
  ※ 保存ダイアログ（showSaveDialog）とブラウザ起動（openExternal）は、検証用の操作に差し替える。

  シナリオアウトライン: 未保存の編集内容がエクスポートに反映される
    前提 エクスポート検証用の一時ディレクトリに、次の内容の文書"unsaved-<種別>.md"がある:
      """
      # 保存済みの見出し
      """
    かつ エクスポートの保存先として、一時ディレクトリの"out/result.html"が選ばれる
    かつ WebView上で文書"unsaved-<種別>.md"を保存せずに次の内容へ編集した:
      """
      # 未保存の見出し
      """
    もし WebViewから<エクスポート方法>を実行する
    ならば HTMLに"<h1>未保存の見出し</h1>"が含まれる
    かつ HTMLに"保存済みの見出し"が含まれない

    例:
      | 種別   | エクスポート方法       |
      | html | HTMLエクスポート     |
      | blog | ブログ用HTMLエクスポート |
      | pdf  | PDFエクスポート      |

  シナリオ: 未保存の編集で変更したMermaid図が画像として埋め込まれる
    前提 エクスポート検証用の一時ディレクトリに、次の内容の文書"unsaved-mermaid.md"がある:
      """
      # 保存済みの見出し
      """
    かつ エクスポートの保存先として、一時ディレクトリの"out/result.html"が選ばれる
    かつ WebView上で文書"unsaved-mermaid.md"を保存せずに次の内容へ編集した:
      """
      ```mermaid
      graph LR;
      X-->Y;
      ```
      """
    かつ WebViewで描画した次のMermaidコードの画像は"data:image/png;base64,BBBB"である:
      """
      graph LR;
      X-->Y;
      """
    もし WebViewからHTMLエクスポートを実行する
    ならば HTMLに"<img src=\"data:image/png;base64,BBBB\""が含まれる
    かつ HTMLに"language-mermaid"が含まれない

  シナリオ: エクスポートしても文書は保存されない
    前提 エクスポート検証用の一時ディレクトリに、次の内容の文書"unsaved-nosave.md"がある:
      """
      # 保存済みの見出し
      """
    かつ エクスポートの保存先として、一時ディレクトリの"out/result.html"が選ばれる
    かつ WebView上で文書"unsaved-nosave.md"を保存せずに次の内容へ編集した:
      """
      # 未保存の見出し
      """
    もし WebViewからHTMLエクスポートを実行する
    ならば 文書"unsaved-nosave.md"のディスク上の内容はエクスポート前から変わっていない
    かつ 文書"unsaved-nosave.md"はエクスポート後も未保存の状態のままである
