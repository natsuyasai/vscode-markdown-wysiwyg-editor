export type MessageType =
  | "init"
  | "update"
  | "reload"
  | "save"
  | "saveImage"
  | "renderPlantUml"
  | "saveSettings"
  | "openFile"
  | "exportHtml"
  | "exportPdf";

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface UpdateMessage extends Message {
  type: "update";
  payload: string;
}

export interface ReloadMessage extends Message {
  type: "reload";
  payload: string;
}

export interface SaveMessage extends Message {
  type: "save";
  payload: string;
}

export interface InitMessage extends Message {
  type: "init";
}

export interface SaveImageMessage extends Message {
  type: "saveImage";
  payload: {
    requestId: string; // リクエスト識別子（結果のマッチングに使用）
    imageData: string; // Base64エンコードされた画像データ
    fileName: string; // ファイル名
    mimeType: string; // image/png, image/jpeg等
  };
}

export interface RenderPlantUmlMessage extends Message {
  type: "renderPlantUml";
  payload: {
    code: string;
    requestId: string;
  };
}

export type ThemeSetting = "auto" | "light" | "dark";

export interface SaveSettingsMessage extends Message {
  type: "saveSettings";
  payload: {
    themeSetting: ThemeSetting;
  };
}

export interface OpenFileMessage extends Message {
  type: "openFile";
  payload: {
    filePath: string; // 開くファイルの絶対パス
    anchor?: string; // アンカー（#section等）
  };
}

export interface ExportHtmlMessage extends Message {
  type: "exportHtml";
}

export interface ExportPdfMessage extends Message {
  type: "exportPdf";
}
