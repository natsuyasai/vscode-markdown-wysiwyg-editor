export type MessageType =
  | "init"
  | "update"
  | "updateTheme"
  | "saveImageResult"
  | "documentInfo"
  | "plantUmlResult";

export type ThemeKind = "light" | "dark";

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
