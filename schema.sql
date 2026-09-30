-- AI-GEN-BEGIN
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_status_published
  ON posts (status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_category
  ON posts (category_id);

CREATE INDEX IF NOT EXISTS idx_posts_sort_order
  ON posts (sort_order ASC, id ASC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 默认管理员：admin / admin123（首次登录后请立刻修改）
INSERT OR IGNORE INTO settings (key, value) VALUES ('bootstrapped', '0');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ui_theme', 'leuc');
INSERT OR IGNORE INTO settings (key, value) VALUES ('weather_effect', 'overcast');
INSERT OR IGNORE INTO settings (key, value) VALUES ('cursor_effect', 'whirlwind');
-- AI-GEN-END
