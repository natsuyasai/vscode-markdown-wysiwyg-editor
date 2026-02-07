export type MessageType =
  | "init"
  | "update"
  | "updateTheme"
  | "updateSettings"
  | "saveImageResult"
  | "documentInfo"
  | "plantUmlResult"
  | "exportResult";

export type ThemeKind = "light" | "dark";
export type ThemeSetting = "auto" | "light" | "dark";

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface InitMessage extends Message {
  type: "init";
}

export interface UpdateMessage extends Message {
  type: "update";
  payload: string;
}

export interface UpdateTheameMessage extends Message {
  type: "updateTheme";
  payload: ThemeKind;
}

export interface SaveImageResultMessage extends Message {
  type: "saveImageResult";
  payload: {
    requestId: string; // リクエスト識別子（リクエストとのマッチングに使用）
    success: boolean;
    localPath?: string; // 相対パス
    markdownImage?: string; // ![alt](path)形式
    error?: string;
  };
}

export interface DocumentInfoMessage extends Message {
  type: "documentInfo";
  payload: {
    dirPath: string; // ドキュメントのディレクトリパス
    baseUri: string; // WebView URI形式のベースURI（画像パスの逆変換に使用）
  };
}

export interface PlantUmlResultMessage extends Message {
  type: "plantUmlResult";
  payload: {
    requestId: string;
    svg?: string;
    error?: string;
  };
}

export interface UpdateSettingsMessage extends Message {
  type: "updateSettings";
  payload: {
    themeSetting: ThemeSetting;
  };
}

export interface ExportResultMessage extends Message {
  type: "exportResult";
  payload: {
    success: boolean;
    message: string;
    filePath?: string;
  };
}
