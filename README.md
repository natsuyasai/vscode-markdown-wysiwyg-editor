# VSCode Markdown WYSIWYG Editor

Visual Studio Code用のMarkdown WYSIWYGエディタ拡張機能です。

## 概要

@wysimark/reactを使用したリッチなMarkdownエディタで、従来のテキストベースのMarkdown編集とは異なり、WYSIWYGスタイルでの直感的な編集が可能です。

## 主要機能

- **WYSIWYG編集**: @wysimark/reactを使用した直感的なMarkdown編集
- **キーボードショートカット**: 保存、Undo、Redoなどの基本操作をキーボードで実行
- **画像サポート**:
  - ドラッグ&ドロップまたはペーストで画像を挿入
  - 自動保存（Markdownファイルと同じディレクトリ、または不可能な場合はホームディレクトリ）
  - ローカル参照パスの自動生成
- **ダイアグラムサポート**:
  - Mermaidのプレビュー表示・編集
  - PlantUMLのプレビュー表示・編集（ローカルサーバーで動作）
- **テーマ対応**: VSCodeのテーマに自動追従（light/dark）

## インストール

### 開発環境のセットアップ

```bash
# すべての依存関係をインストール（ルート + webview-ui）
npm run install:all
```

### ビルド

```bash
# 開発ビルド
npm run compile

# 本番ビルド（VSIXパッケージ作成用）
npm run package
```

## 開発

### ウォッチモード

```bash
# 拡張機能とWebView UIの自動ビルド
npm run watch
```

### デバッグ

1. VSCodeで本プロジェクトを開く
2. F5キーを押してExtension Development Hostを起動
3. `.md`ファイルを開き、エディタタイトルのアイコンから「Open Markdown Editor」を選択

## コマンド一覧

### ルートディレクトリ（VSCode拡張機能）

```bash
npm run install:all      # ルートとwebview-uiの両方の依存関係をインストール
npm run compile          # 型チェック、lint、ビルドを実行
npm run watch            # 開発時のウォッチモード（esbuildとtsc）
npm run package          # 本番ビルド（webview-uiのビルドも含む）
npm run check-types      # TypeScriptの型チェック
npm run lint             # ESLintの実行
npm run test             # vscode-testでテスト実行
npm run format           # Prettierでフォーマット
```

### webview-ui ディレクトリ（React UI）

```bash
cd webview-ui

npm run start            # Vite開発サーバー起動
npm run build            # 本番ビルド
npm run test             # 全テスト実行（unit + storybook）
npm run test:unit        # ユニットテストのみ
npm run test:story       # Storybookテストのみ
npm run test:property    # プロパティベーステスト
npm run storybook        # Storybook開発サーバー（ポート6006）
npm run check-types      # TypeScriptの型チェック
npm run lint             # ESLint + Markuplintの実行
npm run format           # Prettierでフォーマット
```

## テスト

### 品質チェック（実装完了時に実行）

```bash
# ルートディレクトリ
npm run check-types && npm run lint && npm test

# webview-uiディレクトリ
cd webview-ui
npm run check-types && npm run lint && npm test
```

### テスト構成

webview-uiでは、Vitestで3つのテストプロジェクトを構成：
- `unit`: jsdom環境でのユニットテスト
- `storybook`: Playwrightを使用したStorybookコンポーネントテスト
- プロパティベーステスト: fast-checkを使用

## アーキテクチャ

### プロジェクト構造

本プロジェクトは2つの主要コンポーネントで構成されています：

1. **VSCode拡張機能**（`src/`）- esbuildでバンドル
2. **WebView UI**（`webview-ui/`）- ReactアプリケーションをViteでビルド

### 拡張機能とWebView間の通信

`postMessage` APIを使用した双方向メッセージング：

**Extension → WebView**（`src/message/messageTypeToWebview.ts`）
- `update`: Markdownテキストの更新
- `updateTheme`: テーマ（light/dark）の変更

**WebView → Extension**（`src/message/messageTypeToExtention.ts`）
- `init`: 初期化リクエスト
- `update`: Markdownの更新
- `save`: ファイル保存
- `reload`: 再読み込みリクエスト

### 主要コンポーネント

- **EditorProvider**（`src/editor/editorProvider.ts`）: CustomTextEditorProviderの実装。WebViewの生成とメッセージハンドリング
- **App**（`webview-ui/src/App.tsx`）: WYSIWYGエディタのReactコンポーネント。@wysimark/reactを使用

### パスエイリアス

- `@/`: `src/`（拡張機能）
- `@message/`: `src/message/`（webview-ui）

## 設定

### Java Path（PlantUML用）

PlantUMLを使用する場合、Javaのパスを設定できます：

```json
{
  "markdownWysiwygEditor.javaPath": "/path/to/java"
}
```

未設定の場合、`JAVA_HOME`または`PATH`から自動検出を試みます。

### PlantUMLサーバーポート

```json
{
  "markdownWysiwygEditor.plantumlServerPort": 8888
}
```

### テーマ

```json
{
  "markdownWysiwygEditor.theme": "auto" // "auto" | "light" | "dark"
}
```

## ライセンス

このプロジェクトのライセンス情報については、リポジトリを参照してください。

## リポジトリ

https://github.com/natsuyasai/vscode-markdown-wysiwyg-editor