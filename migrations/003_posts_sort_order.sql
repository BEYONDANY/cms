-- AI-GEN-BEGIN
-- 文章拖拽排序：sort_order 越小越靠前（前台天梯与后台列表一致）
ALTER TABLE posts ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE posts SET sort_order = id;

CREATE INDEX IF NOT EXISTS idx_posts_sort_order ON posts (sort_order ASC, id ASC);
-- AI-GEN-END
