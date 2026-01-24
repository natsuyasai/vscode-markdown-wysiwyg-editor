import * as pako from "pako";

/**
 * PlantUML用のBase64エンコーディング（URL安全）
 */
const ENCODE_TABLE =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function encode6bit(value: number): string {
  if (value < 0 || value >= 64) {
    return "?";
  }
  return ENCODE_TABLE[value];
}

function encode3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
}

/**
 * PlantUMLテキストをURL用にエンコードする
 * @param text PlantUMLコード
 * @returns エンコードされた文字列
 */
export function encodePlantUml(text: string): string {
  // UTF-8にエンコード
  const data = new TextEncoder().encode(text);

  // Deflate圧縮
  const compressed = pako.deflate(data, { level: 9, raw: true });

  // Base64エンコード（PlantUML独自形式）
  let encoded = "";
  const len = compressed.length;

  for (let i = 0; i < len; i += 3) {
    const b1 = compressed[i];
    const b2 = i + 1 < len ? compressed[i + 1] : 0;
    const b3 = i + 2 < len ? compressed[i + 2] : 0;
    encoded += encode3bytes(b1, b2, b3);
  }

  return encoded;
}
