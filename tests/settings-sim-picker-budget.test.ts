import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("设置页多 SIM 选择预算", () => {
  const page = fs.readFileSync("app/me/settings/page.tsx", "utf8");
  const picker = fs.readFileSync(
    "app/me/settings/sim-settings-picker.tsx",
    "utf8"
  );

  it("不再为每张 SIM 渲染路由链接", () => {
    expect(page).toContain("<SimSettingsPicker");
    expect(page).not.toContain('href={`/me/settings?simId=${s.id}`}');
    expect(picker).toContain("<select");
  });
});
