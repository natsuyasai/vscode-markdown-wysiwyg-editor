# language: ja
機能: Readonly表示での画像パスの扱い
  Readonly表示でも、編集モードと同じ画像が表示されるようにする（H-05）。
  文書ディレクトリの外や絶対パスの画像は、拡張機能が表示用のURIへ変換してから送る
  （B1の決定: 読み込みを許可するのはワークスペースフォルダと文書ディレクトリ）。
  変換済みのMarkdownは編集モードと共通なので、Readonly表示は変換済みのURIをそのまま使い、
  絶対パスに文書ディレクトリのURIを誤って前置きしない。
  文書ディレクトリのURIで解決するのは、拡張機能が変換しないHTMLの<img>などの相対パスだけである。

  背景:
    前提 文書のディレクトリが"https://file.example/docs/"である

  シナリオ: 相対パスの画像は、文書のディレクトリを基準に解決される
    もし Readonly表示で画像"images/a.png"を描画する
    ならば 画像の参照先は"https://file.example/docs/images/a.png"になる

  シナリオ: HTMLで書いた画像の相対パスも、文書のディレクトリを基準に解決される
    もし Readonly表示でHTMLの画像"images/a.png"を描画する
    ならば 画像の参照先は"https://file.example/docs/images/a.png"になる

  シナリオ: 拡張機能が表示用URIに変換した絶対パスの画像は、そのまま使われる
    もし Readonly表示で画像"https://file.example/shared/pictures/a.png"を描画する
    ならば 画像の参照先は"https://file.example/shared/pictures/a.png"になる

  シナリオ: スラッシュで始まる絶対パスの画像に、文書ディレクトリは前置きされない
    もし Readonly表示で画像"/home/user/pictures/a.png"を描画する
    ならば 画像の参照先は"/home/user/pictures/a.png"になる

  シナリオ: ドライブ付きの絶対パスの画像に、文書ディレクトリは前置きされない
    # 変換されなかった（許可範囲の外、または存在しない）パスは、編集モードと同じく表示されない。
    もし Readonly表示で画像"C:/Users/user/a.png"を描画する
    ならば 画像の参照先に文書のディレクトリは含まれない

  シナリオ: バックスラッシュで始まる絶対パス(UNC)の画像に、文書ディレクトリは前置きされない
    # このシナリオは修正前は失敗する(前置きされていた)。
    もし Readonly表示で画像"\\server\share\a.png"を描画する
    ならば 画像の参照先に文書のディレクトリは含まれない

  シナリオ: 外部URLの画像はそのまま使われる
    もし Readonly表示で画像"https://example.com/a.png"を描画する
    ならば 画像の参照先は"https://example.com/a.png"になる
