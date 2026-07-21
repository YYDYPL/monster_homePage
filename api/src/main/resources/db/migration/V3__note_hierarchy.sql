ALTER TABLE notes
    ADD COLUMN parent_id UUID REFERENCES notes(id) ON DELETE SET NULL,
    ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY updated_at DESC, title ASC) - 1 AS position
    FROM notes
)
UPDATE notes
SET sort_order = ranked.position
FROM ranked
WHERE notes.id = ranked.id;

ALTER TABLE notes
    ADD CONSTRAINT chk_notes_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id);

CREATE INDEX idx_notes_parent_sort_order ON notes(parent_id, sort_order, title);
CREATE INDEX idx_notes_status_parent_sort_order ON notes(status, parent_id, sort_order, title);