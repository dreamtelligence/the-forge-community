-- CreateTable (guarded)
CREATE TABLE IF NOT EXISTS webhook_events (
    event_id TEXT PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT NOW()
);

-- No additional indexes needed (event_id primary key)
