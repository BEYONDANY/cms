// AI-GEN-BEGIN
/** LEUC 12 套主题元数据（对齐 leuc-ui-theme skill） */
export type ThemeMeta = {
  id: string;
  name: string;
  desc: string;
};

export const UI_THEMES: ThemeMeta[] = [
  { id: "leuc", name: "LEUC 清新", desc: "默认薄荷绿" },
  { id: "github-light", name: "GitHub Light", desc: "Primer 浅色" },
  { id: "github-dark", name: "GitHub Dark", desc: "Primer 深色" },
  { id: "catppuccin", name: "Catppuccin", desc: "Mocha 马卡龙" },
  { id: "tokyo-night", name: "Tokyo Night", desc: "东京夜景" },
  { id: "nord", name: "Nord", desc: "极地蓝灰" },
  { id: "paper", name: "宣纸", desc: "暖色衬线大字" },
  { id: "neon", name: "霓虹", desc: "暗黑等宽闪动" },
  { id: "ocean", name: "深海", desc: "流动蓝绿圆角" },
  { id: "rose", name: "玫红", desc: "粉侧栏大圆角" },
  { id: "ink", name: "墨白", desc: "无圆角无动效" },
  { id: "antd", name: "Popular", desc: "流行" },
];

export const UI_THEME_IDS = new Set(UI_THEMES.map((t) => t.id));

export const WEATHER_OPTIONS = [
  { id: "none", name: "关闭" },
  { id: "snow", name: "下雪" },
  { id: "rain", name: "下雨" },
  { id: "overcast", name: "阴天" },
  { id: "fog", name: "雾" },
  { id: "wind", name: "刮风" },
] as const;

export const CURSOR_OPTIONS = [
  { id: "none", name: "关闭" },
  { id: "whirlwind", name: "小旋风" },
  { id: "animal", name: "动物滑动残影" },
] as const;

export function normalizeTheme(id: string | null | undefined): string {
  return id && UI_THEME_IDS.has(id) ? id : "leuc";
}
// AI-GEN-END
