ALTER TABLE page_views
    ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(128),
    ADD COLUMN IF NOT EXISTS browser VARCHAR(80),
    ADD COLUMN IF NOT EXISTS device VARCHAR(80),
    ADD COLUMN IF NOT EXISTS network VARCHAR(40),
    ADD COLUMN IF NOT EXISTS region VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at_visitor_hash
    ON page_views(viewed_at DESC, visitor_hash);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at_ip_hash
    ON page_views(viewed_at DESC, ip_hash);
