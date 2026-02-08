import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within, waitFor } from "storybook/test";
import { EditorToolbar } from "@/components/EditorToolbar";

const meta: Meta<typeof EditorToolbar> = {
  title: "Components/EditorToolbar",
  component: EditorToolbar,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ padding: "20px", minWidth: "400px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EditorToolbar>;

export const EditMode: Story = {
  args: {
    readonly: false,
    onReadonlyChange: fn(),
    themeSetting: "auto",
    onThemeSettingChange: fn(),
  },
  name: "編集モード",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 編集モード時のアイコンとラベルの表示確認
    await waitFor(async () => {
      await expect(canvas.getByText("Edit")).toBeInTheDocument();
    });

    // 編集モードアイコンが表示されていること
    await expect(canvas.getByText("✏️")).toBeInTheDocument();

    // トグルボタンをクリック
    await userEvent.click(canvas.getByText("Edit"));

    // onReadonlyChangeが呼ばれたことを検証（readonly=falseの反転でtrueが渡される）
    await expect(args.onReadonlyChange).toHaveBeenCalledWith(true);
  },
};

export const ReadonlyMode: Story = {
  args: {
    readonly: true,
    onReadonlyChange: fn(),
    themeSetting: "auto",
    onThemeSettingChange: fn(),
  },
  name: "閲覧モード",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 閲覧モード時のアイコンとラベルの表示確認
    await waitFor(async () => {
      await expect(canvas.getByText("Readonly")).toBeInTheDocument();
    });

    // 閲覧モードアイコンが表示されていること
    await expect(canvas.getByText("🔒")).toBeInTheDocument();

    // トグルボタンをクリック
    await userEvent.click(canvas.getByText("Readonly"));

    // onReadonlyChangeが呼ばれたことを検証（readonly=trueの反転でfalseが渡される）
    await expect(args.onReadonlyChange).toHaveBeenCalledWith(false);
  },
};

export const ThemeSelector: Story = {
  args: {
    readonly: false,
    onReadonlyChange: fn(),
    themeSetting: "auto",
    onThemeSettingChange: fn(),
  },
  name: "テーマ選択",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // テーマラベルが表示されていること
    await waitFor(async () => {
      await expect(canvas.getByText("Theme:")).toBeInTheDocument();
    });

    // セレクトボックスが存在し、初期値がautoであること
    const select = canvas.getByRole("combobox");
    await expect(select).toHaveValue("auto");

    // テーマをlightに変更
    await userEvent.selectOptions(select, "light");
    await expect(args.onThemeSettingChange).toHaveBeenCalledWith("light");

    // テーマをdarkに変更
    await userEvent.selectOptions(select, "dark");
    await expect(args.onThemeSettingChange).toHaveBeenCalledWith("dark");
  },
};

export const LightTheme: Story = {
  args: {
    readonly: false,
    onReadonlyChange: fn(),
    themeSetting: "light",
    onThemeSettingChange: fn(),
  },
  name: "ライトテーマ設定",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // セレクトの値がlightであること
    await waitFor(async () => {
      const select = canvas.getByRole("combobox");
      await expect(select).toHaveValue("light");
    });
  },
};

export const DarkTheme: Story = {
  args: {
    readonly: false,
    onReadonlyChange: fn(),
    themeSetting: "dark",
    onThemeSettingChange: fn(),
  },
  name: "ダークテーマ設定",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // セレクトの値がdarkであること
    await waitFor(async () => {
      const select = canvas.getByRole("combobox");
      await expect(select).toHaveValue("dark");
    });
  },
};
