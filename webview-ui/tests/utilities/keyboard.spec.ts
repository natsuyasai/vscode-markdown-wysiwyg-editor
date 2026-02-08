import { describe, it, expect } from "vitest";
import { canEdit } from "../../src/utilities/keyboard";

function createKeyboardEvent(overrides: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    key: overrides.key,
    code: overrides.code ?? "",
    shiftKey: overrides.shiftKey ?? false,
    ctrlKey: overrides.ctrlKey ?? false,
    altKey: overrides.altKey ?? false,
    metaKey: overrides.metaKey ?? false,
    repeat: overrides.repeat ?? false,
  } as KeyboardEvent;
}

describe("canEdit", () => {
  describe("編集可能な通常文字キー", () => {
    it("通常の文字キー（a）はtrueを返す", () => {
      const event = createKeyboardEvent({ key: "a" });
      expect(canEdit(event)).toBe(true);
    });

    it("数字キー（1）はtrueを返す", () => {
      const event = createKeyboardEvent({ key: "1" });
      expect(canEdit(event)).toBe(true);
    });

    it("記号キー（@）はtrueを返す", () => {
      const event = createKeyboardEvent({ key: "@" });
      expect(canEdit(event)).toBe(true);
    });

    it("スペースキーはtrueを返す", () => {
      const event = createKeyboardEvent({ key: " " });
      expect(canEdit(event)).toBe(true);
    });
  });

  describe("編集可能な特殊キー", () => {
    it("BackspaceキーはEditableなのでtrueを返す", () => {
      const event = createKeyboardEvent({ key: "Backspace" });
      expect(canEdit(event)).toBe(true);
    });

    it("DeleteキーはEditableなのでtrueを返す", () => {
      const event = createKeyboardEvent({ key: "Delete" });
      expect(canEdit(event)).toBe(true);
    });

    it("F2キーはEditableなのでtrueを返す", () => {
      const event = createKeyboardEvent({ key: "F2" });
      expect(canEdit(event)).toBe(true);
    });
  });

  describe("修飾キーによるfalse判定", () => {
    it("Ctrlキーが押されている場合はfalseを返す", () => {
      const event = createKeyboardEvent({ key: "a", ctrlKey: true });
      expect(canEdit(event)).toBe(false);
    });

    it("Altキーが押されている場合はfalseを返す", () => {
      const event = createKeyboardEvent({ key: "a", altKey: true });
      expect(canEdit(event)).toBe(false);
    });

    it("Metaキーが押されている場合はfalseを返す", () => {
      const event = createKeyboardEvent({ key: "a", metaKey: true });
      expect(canEdit(event)).toBe(false);
    });

    it("リピート入力の場合はfalseを返す", () => {
      const event = createKeyboardEvent({ key: "a", repeat: true });
      expect(canEdit(event)).toBe(false);
    });
  });

  describe("Shiftキーの判定", () => {
    it("Shiftキー単体の押下はfalseを返す", () => {
      const event = createKeyboardEvent({ key: "Shift", shiftKey: true });
      expect(canEdit(event)).toBe(false);
    });

    it("Shift+スペース（code=Space）はfalseを返す", () => {
      const event = createKeyboardEvent({
        key: " ",
        code: "Space",
        shiftKey: true,
      });
      expect(canEdit(event)).toBe(false);
    });

    it("Shift+編集不可キー（Escape）はfalseを返す", () => {
      const event = createKeyboardEvent({ key: "Escape", shiftKey: true });
      expect(canEdit(event)).toBe(false);
    });
  });

  describe("非入力キー", () => {
    it("Escapeキーはfalseを返す", () => {
      const event = createKeyboardEvent({ key: "Escape" });
      expect(canEdit(event)).toBe(false);
    });

    it("Enterキーはfalseを返す", () => {
      const event = createKeyboardEvent({ key: "Enter" });
      expect(canEdit(event)).toBe(false);
    });

    it("Tabキーはfalseを返す", () => {
      const event = createKeyboardEvent({ key: "Tab" });
      expect(canEdit(event)).toBe(false);
    });

    it("矢印キー（ArrowUp）はfalseを返す", () => {
      const event = createKeyboardEvent({ key: "ArrowUp" });
      expect(canEdit(event)).toBe(false);
    });

    it("矢印キー（ArrowDown）はfalseを返す", () => {
      const event = createKeyboardEvent({ key: "ArrowDown" });
      expect(canEdit(event)).toBe(false);
    });

    it("F1キーはfalseを返す", () => {
      const event = createKeyboardEvent({ key: "F1" });
      expect(canEdit(event)).toBe(false);
    });

    it("Insertキーはfalseを返す", () => {
      const event = createKeyboardEvent({ key: "Insert" });
      expect(canEdit(event)).toBe(false);
    });

    it("Controlキーはfalseを返す", () => {
      const event = createKeyboardEvent({ key: "Control" });
      expect(canEdit(event)).toBe(false);
    });

    it("Altキーはfalseを返す", () => {
      const event = createKeyboardEvent({ key: "Alt" });
      expect(canEdit(event)).toBe(false);
    });

    it("Metaキーはfalseを返す", () => {
      const event = createKeyboardEvent({ key: "Meta" });
      expect(canEdit(event)).toBe(false);
    });

    it("PrintScreenキーはfalseを返す", () => {
      const event = createKeyboardEvent({ key: "PrintScreen" });
      expect(canEdit(event)).toBe(false);
    });
  });
});
