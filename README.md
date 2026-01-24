# vscode-markdown-wysiwyg-editor

VSCode用のMarkdown用WYSIWYGエディタ  

## 詳細

@wysimark/reactを使用したMarkdownエディタ  
読み込んだMarkdownのテキストをwebview-ui側に渡し、webview-uiで編集  
保存操作を行ったら元ファイルに対して適用し、保存する  
基本的なキー操作（保存、undo、redoなど）はキーボードショートカットで行える  
画像の貼り付けやドロップ操作が行われた場合は、ローカルに保存し、その参照パスを記載する  
    保存先は編集元のMarkdownファイルと同一ディレクトリ
    同一ディレクトリが参照できなければホームディレクトリにmarkdownエディタ用のフォルダを生成し、そこに保存
    保存操作はwebview-uiでは行えないので、画像のデータとともに拡張機能側にメッセージを送信し、CustomTextEditorProvider側で行う
marmeidのプレビュー表示、編集も行えるようにする
PlantUMLのプレビュー表示、編集も行えるようにする
    PlantUMLのプレビューには外部サーバーは使用せず、ローカルで動作するように内部でPlantUML severを起動できるようにする