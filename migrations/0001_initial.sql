PRAGMA foreign_keys = ON;
CREATE TABLE workspaces (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, offset_ms INTEGER NOT NULL DEFAULT 0);
CREATE TABLE enquiries (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 input TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New','Needs details','Ready for quote','Quote sent','Won','Closed')),
 sample INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 draft TEXT NOT NULL DEFAULT '', draft_edited INTEGER NOT NULL DEFAULT 0,
 analysis TEXT, analysis_status TEXT NOT NULL DEFAULT 'pending', analysis_error TEXT,
 analysis_token TEXT, analysis_started INTEGER, attempts INTEGER NOT NULL DEFAULT 0,
 submission_key TEXT NOT NULL, UNIQUE(workspace_id, submission_key)
);
CREATE INDEX enquiries_workspace ON enquiries(workspace_id, updated_at);
CREATE TABLE outbox (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 enquiry_id TEXT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
 action_key TEXT NOT NULL, body TEXT NOT NULL, channel TEXT NOT NULL, recipient TEXT NOT NULL,
 created_at TEXT NOT NULL, UNIQUE(workspace_id, action_key)
);
CREATE TABLE tasks (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 enquiry_id TEXT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
 due_at TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('open','completed','cancelled')), created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX one_open_followup ON tasks(enquiry_id) WHERE state='open';
CREATE INDEX tasks_workspace ON tasks(workspace_id);
CREATE TABLE events (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 enquiry_id TEXT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
 kind TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX events_enquiry ON events(workspace_id,enquiry_id);
CREATE TABLE usage (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TRIGGER enquiry_limit BEFORE INSERT ON enquiries WHEN (SELECT COUNT(*) FROM enquiries WHERE workspace_id=NEW.workspace_id)>=100
 BEGIN SELECT RAISE(ABORT, 'Workspace enquiry limit reached'); END;
CREATE TRIGGER outbox_limit BEFORE INSERT ON outbox WHEN (SELECT COUNT(*) FROM outbox WHERE workspace_id=NEW.workspace_id)>=300
 BEGIN SELECT RAISE(ABORT, 'Workspace outbox limit reached'); END;
CREATE TRIGGER event_limit BEFORE INSERT ON events WHEN (SELECT COUNT(*) FROM events WHERE workspace_id=NEW.workspace_id)>=2000
 BEGIN SELECT RAISE(ABORT, 'Workspace activity limit reached'); END;
