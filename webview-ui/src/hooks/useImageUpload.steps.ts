import { renderHook } from "@testing-library/react";
import { After, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect, vi } from "vitest";
import { useImageUpload } from "@/hooks/useImageUpload";
import { vscode } from "@/utilities/vscode";

interface ImageUploadData {
  hook?: ReturnType<typeof renderHook<ReturnType<typeof useImageUpload>, unknown>>;
  sent?: { type: string; payload?: { requestId: string } }[];
  displayUri?: string;
}

function data(world: QuickPickleWorldInterface): ImageUploadData {
  return world.data as ImageUploadData;
}

After("@image-upload", () => {
  vi.restoreAllMocks();
  return Promise.resolve();
});

Given(
  "ベースURIが{string}の画像アップロードを使うWebViewが起動している",
  (world: QuickPickleWorldInterface, baseUri: string) => {
    const sent: NonNullable<ImageUploadData["sent"]> = [];
    vi.spyOn(vscode, "postMessage").mockImplementation((message) => {
      sent.push(message as unknown as (typeof sent)[number]);
    });
    data(world).sent = sent;
    data(world).hook = renderHook(() => useImageUpload(baseUri));
  }
);

When(
  "画像をアップロードし、拡張機能が相対パス{string}で保存したと応答する",
  async (world: QuickPickleWorldInterface, localPath: string) => {
    const { hook, sent } = data(world);
    if (!hook || !sent) {
      throw new Error("画像アップロードを使うWebViewが起動していません");
    }
    const upload = hook.result.current.createUploadImage();
    const uploading = upload(new File(["png"], "photo.png", { type: "image/png" }));

    await vi.waitFor(() => {
      expect(sent.some((message) => message.type === "saveImage")).toBe(true);
    });
    const requestId = sent.find((message) => message.type === "saveImage")?.payload?.requestId;
    if (!requestId) {
      throw new Error("saveImage メッセージにリクエストIDがありません");
    }
    hook.result.current.handleImageUploadResult({
      type: "saveImageResult",
      payload: { requestId, success: true, localPath },
    });
    data(world).displayUri = await uploading;
  }
);

Then("表示用URIは{string}になる", (world: QuickPickleWorldInterface, expected: string) => {
  expect(data(world).displayUri).toBe(expected);
});
