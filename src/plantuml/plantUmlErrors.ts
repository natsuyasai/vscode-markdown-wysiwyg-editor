/**
 * 利用者の設定で解決できるPlantUMLのエラー。
 * どの設定を見直せばよいかを settingKey で示す。
 */
export class PlantUmlConfigurationError extends Error {
  constructor(
    message: string,
    readonly settingKey: string
  ) {
    super(message);
    this.name = "PlantUmlConfigurationError";
  }
}
