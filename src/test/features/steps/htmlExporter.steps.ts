import * as assert from "assert";
import { Given, Then, When, type IWorld } from "@cucumber/cucumber";
import { renderMarkdownToHtml } from "../../../export/htmlExporter";

interface HtmlExporterWorld extends IWorld {
  markdown?: string;
  mermaidImages?: Map<string, string>;
  html?: string;
}

Given("次のMarkdown:", function (this: HtmlExporterWorld, markdown: string) {
  this.markdown = markdown;
});

Given(
  "次のMermaidコードには画像{string}が対応している:",
  function (this: HtmlExporterWorld, dataUri: string, code: string) {
    this.mermaidImages ??= new Map<string, string>();
    this.mermaidImages.set(code.trim(), dataUri);
  }
);

When("HTMLに変換する", function (this: HtmlExporterWorld) {
  this.html = renderMarkdownToHtml(this.markdown ?? "", this.mermaidImages);
});

Then("HTMLに{string}が含まれる", function (this: HtmlExporterWorld, expected: string) {
  assert.ok(
    this.html?.includes(expected),
    `HTMLに ${expected} が含まれていません:\n${this.html ?? ""}`
  );
});

Then("HTMLに{string}が含まれない", function (this: HtmlExporterWorld, unexpected: string) {
  assert.ok(
    !this.html?.includes(unexpected),
    `HTMLに ${unexpected} が含まれています:\n${this.html ?? ""}`
  );
});
