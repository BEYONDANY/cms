-- AI-GEN-BEGIN
-- 已有库升级：分类 + 主题/特效默认值
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- SQLite：重复执行会因列已存在失败，请仅对未升级库跑一次
ALTER TABLE posts ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_category ON posts (category_id);

INSERT OR IGNORE INTO settings (key, value) VALUES ('ui_theme', 'leuc');
INSERT OR IGNORE INTO settings (key, value) VALUES ('weather_effect', 'overcast');
INSERT OR IGNORE INTO settings (key, value) VALUES ('cursor_effect', 'whirlwind');
-- AI-GEN-END
