import * as assert from "assert";
import { Readable } from "stream";
import { Given, Then, When, type IWorld } from "@cucumber/cucumber";
import { collectBody } from "../../../../plantuml/collectBody";

interface ResponseBodyWorld extends IWorld {
  plantUmlResponseBody?: {
    chunks: Buffer[];
    collected?: string;
  };
}

function bodyState(
  world: ResponseBodyWorld
): NonNullable<ResponseBodyWorld["plantUmlResponseBody"]> {
  if (!world.plantUmlResponseBody) {
    throw new Error("先にPlantUMLサーバーのレスポンス本文の届き方を指定してください");
  }
  return world.plantUmlResponseBody;
}

Given(
  "PlantUMLサーバーのレスポンス本文{string}がUTF-8の1バイトずつのチャンクで届く",
  function (this: ResponseBodyWorld, body: string) {
    const bytes = Buffer.from(body, "utf8");
    const chunks: Buffer[] = [];
    for (let i = 0; i < bytes.length; i++) {
      chunks.push(bytes.subarray(i, i + 1));
    }
    this.plantUmlResponseBody = { chunks };
  }
);

Given(
  "PlantUMLサーバーのレスポンス本文{string}がUTF-8の{int}バイト目で2つのチャンクに分かれて届く",
  function (this: ResponseBodyWorld, body: string, splitAt: number) {
    const bytes = Buffer.from(body, "utf8");
    this.plantUmlResponseBody = {
      chunks: [bytes.subarray(0, splitAt), bytes.subarray(splitAt)],
    };
  }
);

When("PlantUMLサーバーのレスポンス本文を組み立てる", async function (this: ResponseBodyWorld) {
  const state = bodyState(this);
  state.collected = await collectBody(Readable.from(state.chunks));
});

Then(
  "組み立てたPlantUMLサーバーのレスポンス本文は{string}である",
  function (this: ResponseBodyWorld, expected: string) {
    assert.strictEqual(bodyState(this).collected, expected);
  }
);
