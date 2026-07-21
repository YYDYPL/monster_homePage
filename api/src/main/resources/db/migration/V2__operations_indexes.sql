CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created_at ON contact_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path_viewed_at ON page_views(path, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_viewed_at ON page_views(visitor_hash, viewed_at DESC);
