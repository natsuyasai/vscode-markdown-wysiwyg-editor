# language: ja
@B1 @image-upload
機能: 画像アップロード後の表示用URI
  エディタで画像をアップロードすると、拡張機能が保存した相対パスが表示用URIとしてエディタに返る。
  相対パスの各区間はパーセントエンコードし、空白や日本語、括弧を含む名前でも有効なURIにする。
  保存時には、拡張機能が元の相対パス（空白や括弧を含む場合は <...> で囲んだ表記）に戻す。

  @P-06
  シナリオアウトライン: 保存された相対パスは、区間ごとにエンコードして表示用URIになる
    前提 ベースURIが"https://file.example/docs"の画像アップロードを使うWebViewが起動している
    もし 画像をアップロードし、拡張機能が相対パス"<相対パス>"で保存したと応答する
    ならば 表示用URIは"<表示用URI>"になる

    例:
      | 相対パス             | 表示用URI                                            |
      | images/photo.png     | https://file.example/docs/images/photo.png           |
      | images/my photo.png  | https://file.example/docs/images/my%20photo.png      |
      | images/図 1.png      | https://file.example/docs/images/%E5%9B%B3%201.png   |
      | images/shot (1).png  | https://file.example/docs/images/shot%20(1).png      |
      | images/a#b.png       | https://file.example/docs/images/a%23b.png           |
