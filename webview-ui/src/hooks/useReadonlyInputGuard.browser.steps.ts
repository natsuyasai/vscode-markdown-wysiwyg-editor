import { renderHook } from "@testing-library/react";
import { After, Given, Then, When } from "quickpickle";
import type { QuickPickleWorldInterface } from "quickpickle";
import { expect, vi } from "vitest";
import { useReadonlyInputGuard } from "@/hooks/useReadonlyInputGuard";
import { vscode } from "@/utilities/vscode";

interface ReadonlyGuardData {
  postMessage?: ReturnType<typeof vi.spyOn>;
  lastEvent?: Event;
  dropEffect?: string;
}

function data(world: QuickPickleWorldInterface): ReadonlyGuardData {
  return world.data as ReadonlyGuardData;
}

function imageTransfer(): DataTransfer {
  const transfer = new DataTransfer();
  transfer.items.add(new File(["fake-png-bytes"], "pasted.png", { type: "image/png" }));
  return transfer;
}

function dispatchWithTransfer(
  world: QuickPickleWorldInterface,
  type: string,
  transfer: DataTransfer
) {
  const event =
    type === "paste"
      ? new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true })
      : new DragEvent(type, { dataTransfer: transfer, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  data(world).lastEvent = event;
  if (event instanceof DragEvent) {
    data(world).dropEffect = event.dataTransfer?.dropEffect;
  }
}

After("@readonly-guard", () => {
  vi.restoreAllMocks();
  return Promise.resolve();
});

function start(world: QuickPickleWorldInterface, readonly: boolean) {
  data(world).postMessage = vi.spyOn(vscode, "postMessage").mockImplementation(() => undefined);
  renderHook(() => {
    useReadonlyInputGuard(readonly);
  });
}

Given(
  "読み取り専用で画像入力を制限するWebViewが起動している",
  (world: QuickPickleWorldInterface) => {
    start(world, true);
  }
);

Given("編集モードで画像入力を制限するWebViewが起動している", (world: QuickPickleWorldInterface) => {
  start(world, false);
});

When("画像ファイルを貼り付ける", (world: QuickPickleWorldInterface) => {
  dispatchWithTransfer(world, "paste", imageTransfer());
});

When("画像ファイルをドロップする", (world: QuickPickleWorldInterface) => {
  dispatchWithTransfer(world, "drop", imageTransfer());
});

When("画像ファイルをドラッグして重ねる", (world: QuickPickleWorldInterface) => {
  const transfer = imageTransfer();
  transfer.dropEffect = "copy";
  dispatchWithTransfer(world, "dragover", transfer);
});

When("文字列だけを貼り付ける", (world: QuickPickleWorldInterface) => {
  const transfer = new DataTransfer();
  transfer.setData("text/plain", "text");
  dispatchWithTransfer(world, "paste", transfer);
});

Then("その操作は既定の処理を取り消されている", (world: QuickPickleWorldInterface) => {
  expect(data(world).lastEvent?.defaultPrevented).toBe(true);
});

Then("その操作は既定の処理を取り消されていない", (world: QuickPickleWorldInterface) => {
  expect(data(world).lastEvent?.defaultPrevented).toBe(false);
});

Then("ドロップは受け付けない表示になる", (world: QuickPickleWorldInterface) => {
  expect(data(world).dropEffect).toBe("none");
});

Then("拡張機能へ画像の保存は要求されていない", (world: QuickPickleWorldInterface) => {
  expect(data(world).postMessage).not.toHaveBeenCalled();
});
