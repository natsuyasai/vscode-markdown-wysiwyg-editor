import { Given } from "@cucumber/cucumber";
import {
  expandPlaceholders,
  fixtureRoot,
  type SaveWorld,
  writeFixtureDocument,
  writeFixtureFile,
} from "./saveFixture";

// 最小限のPNG（1x1）。内容は検証に使わない
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

Given(
  "保存検証用の一時ディレクトリに、次の内容の文書{string}がある:",
  function (this: SaveWorld, relativePath: string, content: string) {
    writeFixtureDocument(this, relativePath, expandPlaceholders(this, content));
  }
);

Given(
  "保存検証用の一時ディレクトリに、改行コードCRLFで次の内容の文書{string}がある:",
  function (this: SaveWorld, relativePath: string, content: string) {
    const crlf = expandPlaceholders(this, content).replace(/\r?\n/g, "\r\n");
    writeFixtureDocument(this, relativePath, crlf);
  }
);

Given(
  "保存検証用の一時ディレクトリに、画像ファイル{string}がある",
  function (this: SaveWorld, relativePath: string) {
    writeFixtureFile(this, relativePath, PNG_BYTES);
  }
);

Given(
  "保存検証用の一時ディレクトリに、ファイル{string}がある",
  function (this: SaveWorld, relativePath: string) {
    writeFixtureFile(this, relativePath, "# 検証用のファイル\n");
  }
);

Given(
  "保存検証用の一時ディレクトリ全体をワークスペースフォルダとして扱う",
  function (this: SaveWorld) {
    this.saveWorkspaceFolders = [fixtureRoot(this)];
  }
);
