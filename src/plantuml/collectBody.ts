import type { Readable } from "stream";

/**
 * ストリームから受け取ったチャンクを連結し、最後にまとめてUTF-8としてデコードする。
 *
 * チャンクごとに文字列へ変換すると、チャンクの境界で分割されたマルチバイト文字が
 * 文字化けするため、Bufferのまま連結してからデコードする。
 */
export function collectBody(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk);
    });
    stream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    stream.on("error", reject);
  });
}
