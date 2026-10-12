import { randomInt } from "crypto";

const NONCE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const NONCE_LENGTH = 32;

/**
 * Content-Security-Policy 用の nonce を生成する。
 * 暗号論的に安全な乱数（crypto.randomInt）から英数字32文字を生成する。
 */
export function getNonce(): string {
  let text = "";
  for (let i = 0; i < NONCE_LENGTH; i++) {
    text += NONCE_CHARACTERS.charAt(randomInt(NONCE_CHARACTERS.length));
  }
  return text;
}
