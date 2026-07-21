CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    summary VARCHAR(500),
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    cover_image_url VARCHAR(500),
    tags_csv VARCHAR(1000),
    series VARCHAR(120),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_posts_status_published_at ON posts(status, published_at DESC);

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    summary VARCHAR(500),
    content TEXT NOT NULL,
    category VARCHAR(80),
    tags_csv VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notes_status_updated_at ON notes(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    summary VARCHAR(500),
    description TEXT,
    tech_stack_csv VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'EXPERIMENTAL',
    repo_url VARCHAR(500),
    demo_url VARCHAR(500),
    image_url VARCHAR(500),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_featured_created_at ON projects(featured DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL,
    subject VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    content_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    url VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(120) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS page_views (
    id BIGSERIAL PRIMARY KEY,
    path VARCHAR(500) NOT NULL,
    visitor_hash VARCHAR(128),
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views(viewed_at DESC);
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    username VARCHAR(80),
    action VARCHAR(120) NOT NULL,
    resource_type VARCHAR(80),
    resource_id VARCHAR(80),
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
