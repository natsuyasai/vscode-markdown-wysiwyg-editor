# language: ja
@B4
機能: WebViewに読み込むHTML
  WebViewのHTMLには、拡張機能に合ったタイトルと言語を設定する。
  スクリプトの実行はContent-Security-Policyのnonceで許可し、nonceは暗号論的に安全な乱数から毎回生成する。

  背景:
    前提 強化検証用の一時ディレクトリ内の"docs/doc.md"にMarkdown文書を保存してある

  @L-08
  シナリオ: WebViewのHTMLには拡張機能のタイトルとVS Codeの表示言語が設定される
    もし 文書"docs/doc.md"を強化検証用のWebViewパネルで開いている
    ならば WebViewのHTMLのタイトルは"Markdown Editor"である
    かつ WebViewのHTMLのlang属性はVS Codeの表示言語と一致する

  @L-07
  シナリオ: スクリプト要素のnonceがContent-Security-Policyで許可されている
    もし 文書"docs/doc.md"を強化検証用のWebViewパネルで開いている
    ならば WebViewのHTMLのscript要素のnonceは、Content-Security-Policyのscript-srcで許可されている

  @L-07
  シナリオ: nonceはパネルを開くたびに異なる値になる
    もし 文書"docs/doc.md"を強化検証用のWebViewパネルで2回開く
    ならば 2つのWebViewのHTMLのnonceは異なる

  @L-07
  シナリオ: nonceは英数字32文字である
    もし nonceを生成する
    ならば 生成されたnonceは英数字32文字である

  @L-07
  シナリオ: nonceの生成はMath.randomに依存しない
    前提 Math.randomが常に同じ値を返す
    もし nonceを100回生成する
    ならば 生成されたnonceはすべて異なる
