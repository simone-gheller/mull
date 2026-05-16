-- Config realtime infrastructure
-- config_environment_versions: atomic version counter per (app, env)
-- Incremented via ON CONFLICT DO UPDATE to safely handle concurrent PATCHes.
-- Acts as the canonical source of latestVersion for SSE connected/heartbeat events.
CREATE TABLE config_environment_versions (
  app_id         UUID         NOT NULL,
  environment_id UUID         NOT NULL,
  org_id         UUID         NOT NULL,
  version        BIGINT       NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, environment_id)
);

-- config_events: immutable changelog — one row per PATCH, picked up by Supabase Realtime
CREATE TABLE config_events (
  id             UUID         PRIMARY KEY,
  org_id         UUID         NOT NULL,
  app_id         UUID         NOT NULL,
  environment_id UUID         NOT NULL,
  version        BIGINT       NOT NULL,
  changed_keys   JSONB        NOT NULL DEFAULT '[]',
  type           VARCHAR(50)  NOT NULL DEFAULT 'config.updated',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_config_events_lookup ON config_events (app_id, environment_id, version);
CREATE INDEX idx_config_events_ts     ON config_events (created_at);

-- Supabase Realtime: enable for config_events only (not the version counter)
ALTER TABLE config_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE config_events;
