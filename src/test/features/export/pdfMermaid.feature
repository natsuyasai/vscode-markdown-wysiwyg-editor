# language: ja
@B2 @X-03
機能: PDFエクスポートでのMermaid図の画像化
  PDFエクスポートでも、HTMLエクスポートと同様に、WebViewで描画済みのMermaid図をコードブロックの代わりに画像として埋め込む。
  WebView側が exportPdf メッセージにMermaid画像を載せることは useExport.spec.ts、
  拡張機能側がその payload を受け付けることは webviewMessageValidation.feature で検証する。
  ※ ブラウザ起動（openExternal）は、検証用の操作に差し替える。

  シナリオ: 描画済みのMermaid図はPDF用のHTMLに画像として埋め込まれる
    前提 エクスポート検証用の一時ディレクトリに、次の内容の文書"pdf-mermaid.md"がある:
      """
      ```mermaid
      graph TD;
      A-->B;
      ```
      """
    かつ WebViewで描画した次のMermaidコードの画像は"data:image/png;base64,AAAA"である:
      """
      graph TD;
      A-->B;
      """
    もし WebViewからPDFエクスポートを実行する
    ならば HTMLに"<img src=\"data:image/png;base64,AAAA\" alt=\"mermaid diagram\""が含まれる
    かつ HTMLに"language-mermaid"が含まれない

  シナリオ: 画像が対応していないMermaid図はPDF用のHTMLでもコードブロックのまま出力される
    前提 エクスポート検証用の一時ディレクトリに、次の内容の文書"pdf-mermaid-miss.md"がある:
      """
      ```mermaid
      graph LR;
      X-->Y;
      ```
      """
    かつ WebViewで描画した次のMermaidコードの画像は"data:image/png;base64,AAAA"である:
      """
      graph TD;
      A-->B;
      """
    もし WebViewからPDFエクスポートを実行する
    ならば HTMLに"<code class=\"language-mermaid\">"が含まれる
    かつ HTMLに"<img"が含まれない

  シナリオ: Mermaidの画像がない場合、PDF用のHTMLはこれまでどおりコードブロックを出力する
    前提 エクスポート検証用の一時ディレクトリに、次の内容の文書"pdf-mermaid-none.md"がある:
      """
      ```mermaid
      graph TD;
      A-->B;
      ```
      """
    もし WebViewからPDFエクスポートを実行する
    ならば HTMLに"<code class=\"language-mermaid\">"が含まれる
