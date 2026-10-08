-- PostgreSQL 16+ design. Apply to a NEW database; this does not migrate live JSON files.
BEGIN;
CREATE SCHEMA snowlink;
REVOKE ALL ON SCHEMA snowlink FROM PUBLIC;
SET LOCAL search_path = snowlink, public;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'guest', 'demo')),
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE UNIQUE INDEX users_username_folded ON users (lower(username));
CREATE TABLE credentials (
  user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  password_record jsonb NOT NULL, -- existing versioned scrypt hash, per-user salt and cost; no plaintext
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, revoked_at timestamptz
);
CREATE INDEX auth_sessions_user ON auth_sessions(user_id);
CREATE TABLE creator_profiles (
  user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  handle text NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  display_name text NOT NULL, bio text NOT NULL DEFAULT '', tagline text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT false, is_demo boolean NOT NULL DEFAULT false
);
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users,
  name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id, owner_id)
);
CREATE INDEX workspaces_owner ON workspaces(owner_id);
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces,
  title text NOT NULL, format text NOT NULL CHECK (format IN ('novel', 'story', 'cards', 'youtube', 'other')),
  stage text NOT NULL DEFAULT 'idea' CHECK(stage IN ('idea', 'script', 'production', 'review', 'done')),
  notes text NOT NULL DEFAULT '', settings jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz, UNIQUE(id, workspace_id)
);
CREATE INDEX projects_workspace ON projects(workspace_id, updated_at DESC);
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces,
  storage_key text NOT NULL UNIQUE, mime_type text NOT NULL, bytes bigint CHECK(bytes >= 0),
  width integer CHECK(width > 0), height integer CHECK(height > 0), checksum text,
  source text NOT NULL CHECK(source IN ('upload', 'generated', 'demo')),
  provenance jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, workspace_id)
);
CREATE TABLE prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces,
  name text NOT NULL, kind text NOT NULL CHECK(kind IN ('character', 'video', 'story')),
  prompt text NOT NULL, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, workspace_id)
);
CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces,
  name text NOT NULL, description text NOT NULL DEFAULT '', attributes jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, workspace_id)
);
CREATE TABLE character_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces,
  character_id uuid NOT NULL, asset_id uuid NOT NULL, template_id uuid, prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(character_id, workspace_id) REFERENCES characters(id, workspace_id),
  FOREIGN KEY(asset_id, workspace_id) REFERENCES assets(id, workspace_id),
  FOREIGN KEY(template_id, workspace_id) REFERENCES prompt_templates(id, workspace_id)
);
CREATE TABLE project_characters (
  workspace_id uuid NOT NULL REFERENCES workspaces, project_id uuid NOT NULL, character_id uuid NOT NULL,
  PRIMARY KEY(project_id, character_id),
  FOREIGN KEY(project_id, workspace_id) REFERENCES projects(id, workspace_id),
  FOREIGN KEY(character_id, workspace_id) REFERENCES characters(id, workspace_id)
);
CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces,
  project_id uuid NOT NULL, premise text NOT NULL DEFAULT '', overall_plot text NOT NULL DEFAULT '',
  planned_episodes integer NOT NULL DEFAULT 1 CHECK(planned_episodes > 0),
  min_characters integer NOT NULL DEFAULT 0 CHECK(min_characters >= 0),
  max_characters integer CHECK(max_characters >= min_characters), include_spaces boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1, UNIQUE(id, workspace_id),
  FOREIGN KEY(project_id, workspace_id) REFERENCES projects(id, workspace_id)
);
CREATE TABLE episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces, story_id uuid NOT NULL,
  number integer NOT NULL CHECK(number > 0), title text NOT NULL, plot text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '', summary text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'generating', 'ready', 'needs_review')),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(story_id, number), UNIQUE(id, story_id, workspace_id),
  FOREIGN KEY(story_id, workspace_id) REFERENCES stories(id, workspace_id)
);
CREATE TABLE episode_revisions (
  episode_id uuid NOT NULL, story_id uuid NOT NULL, workspace_id uuid NOT NULL REFERENCES workspaces,
  version integer NOT NULL CHECK(version > 0), body text NOT NULL, plot text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(episode_id, version),
  FOREIGN KEY(episode_id, story_id, workspace_id) REFERENCES episodes(id, story_id, workspace_id)
);
CREATE TABLE story_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces, story_id uuid NOT NULL,
  kind text NOT NULL CHECK(kind IN ('character', 'place', 'event', 'object', 'rule')),
  name text NOT NULL, facts jsonb NOT NULL DEFAULT '{}', introduced_in integer NOT NULL CHECK(introduced_in >= 0),
  UNIQUE(id, story_id, workspace_id), FOREIGN KEY(story_id, workspace_id) REFERENCES stories(id, workspace_id)
);
CREATE TABLE story_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces, story_id uuid NOT NULL,
  episode_id uuid NOT NULL, source_version integer NOT NULL, text_content text NOT NULL,
  start_offset integer NOT NULL CHECK(start_offset >= 0), end_offset integer NOT NULL CHECK(end_offset > start_offset),
  embedding real[], embedding_model text, embedding_dimensions integer,
  CHECK ((embedding IS NULL AND embedding_model IS NULL AND embedding_dimensions IS NULL) OR
    (embedding IS NOT NULL AND embedding_model IS NOT NULL AND embedding_dimensions > 0 AND cardinality(embedding) = embedding_dimensions)),
  FOREIGN KEY(episode_id, story_id, workspace_id) REFERENCES episodes(id, story_id, workspace_id),
  FOREIGN KEY(episode_id, source_version) REFERENCES episode_revisions(episode_id, version),
  UNIQUE(id, story_id, workspace_id)
);
CREATE INDEX story_chunks_text ON story_chunks USING gin(to_tsvector('simple', text_content));
CREATE TABLE story_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces, story_id uuid NOT NULL,
  from_entity_id uuid NOT NULL, to_entity_id uuid NOT NULL, relation_type text NOT NULL, evidence_chunk_id uuid NOT NULL,
  valid_from_episode integer NOT NULL CHECK(valid_from_episode >= 0), valid_until_episode integer,
  CHECK(valid_until_episode IS NULL OR valid_until_episode >= valid_from_episode),
  FOREIGN KEY(from_entity_id, story_id, workspace_id) REFERENCES story_entities(id, story_id, workspace_id),
  FOREIGN KEY(to_entity_id, story_id, workspace_id) REFERENCES story_entities(id, story_id, workspace_id),
  FOREIGN KEY(evidence_chunk_id, story_id, workspace_id) REFERENCES story_chunks(id, story_id, workspace_id)
);
CREATE INDEX story_relations_from ON story_relations(story_id, from_entity_id, valid_from_episode);
CREATE TABLE foreshadowings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces, story_id uuid NOT NULL,
  description text NOT NULL, planted_episode_id uuid NOT NULL, payoff_episode_id uuid,
  state text NOT NULL DEFAULT 'planted' CHECK(state IN ('planned', 'planted', 'developing', 'resolved', 'abandoned')),
  FOREIGN KEY(planted_episode_id, story_id, workspace_id) REFERENCES episodes(id, story_id, workspace_id),
  FOREIGN KEY(payoff_episode_id, story_id, workspace_id) REFERENCES episodes(id, story_id, workspace_id),
  CHECK(state <> 'resolved' OR payoff_episode_id IS NOT NULL)
);
CREATE TABLE scene_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces, project_id uuid NOT NULL,
  kind text NOT NULL CHECK(kind IN ('text', 'image', 'video', 'reference')), prompt text NOT NULL DEFAULT '',
  position jsonb NOT NULL DEFAULT '{}', asset_id uuid,
  UNIQUE(id, project_id, workspace_id),
  FOREIGN KEY(project_id, workspace_id) REFERENCES projects(id, workspace_id),
  FOREIGN KEY(asset_id, workspace_id) REFERENCES assets(id, workspace_id)
);
CREATE TABLE scene_edges (
  workspace_id uuid NOT NULL REFERENCES workspaces, project_id uuid NOT NULL, source_id uuid NOT NULL, target_id uuid NOT NULL,
  PRIMARY KEY(source_id, target_id), CHECK(source_id <> target_id),
  FOREIGN KEY(source_id, project_id, workspace_id) REFERENCES scene_nodes(id, project_id, workspace_id),
  FOREIGN KEY(target_id, project_id, workspace_id) REFERENCES scene_nodes(id, project_id, workspace_id)
);
CREATE TABLE cuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces, project_id uuid NOT NULL,
  ordinal integer NOT NULL CHECK(ordinal >= 0), duration_ms integer NOT NULL CHECK(duration_ms > 0),
  dialogue text NOT NULL DEFAULT '', direction text NOT NULL DEFAULT '', asset_id uuid,
  UNIQUE(project_id, ordinal), FOREIGN KEY(project_id, workspace_id) REFERENCES projects(id, workspace_id),
  FOREIGN KEY(asset_id, workspace_id) REFERENCES assets(id, workspace_id)
);
CREATE TABLE generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces, project_id uuid,
  kind text NOT NULL, provider text NOT NULL, model text NOT NULL, input jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  idempotency_key text NOT NULL, result_asset_id uuid, error_code text,
  created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  UNIQUE(workspace_id, idempotency_key),
  FOREIGN KEY(project_id, workspace_id) REFERENCES projects(id, workspace_id),
  FOREIGN KEY(result_asset_id, workspace_id) REFERENCES assets(id, workspace_id)
);
CREATE INDEX generation_jobs_queue ON generation_jobs(status, created_at) WHERE status IN ('queued', 'running');

-- Public presentation is an explicit snapshot, separate from all working drafts.
CREATE TABLE publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, creator_id uuid NOT NULL REFERENCES creator_profiles(user_id),
  slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9][a-z0-9-]{1,119}$'),
  kind text NOT NULL CHECK(kind IN ('novel', 'character', 'content')),
  title text NOT NULL, summary text NOT NULL DEFAULT '', tags text[] NOT NULL DEFAULT '{}',
  cover_public_path text, cover_alt text NOT NULL DEFAULT '', public_body text NOT NULL DEFAULT '',
  public_character_details jsonb NOT NULL DEFAULT '[]',
  visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'unlisted', 'public')),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'withdrawn')),
  source_project_id uuid, source_character_id uuid, is_demo boolean NOT NULL DEFAULT false,
  published_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, workspace_id),
  FOREIGN KEY(workspace_id, creator_id) REFERENCES workspaces(id, owner_id),
  FOREIGN KEY(source_project_id, workspace_id) REFERENCES projects(id, workspace_id),
  FOREIGN KEY(source_character_id, workspace_id) REFERENCES characters(id, workspace_id),
  CHECK(status <> 'published' OR published_at IS NOT NULL),
  CHECK(cover_public_path IS NULL OR cover_public_path ~ '^/(showcase|published)/[A-Za-z0-9/_.-]+$'),
  CHECK(cover_public_path IS NULL OR position('..' in cover_public_path) = 0)
);
CREATE INDEX publications_feed ON publications(published_at DESC, id) WHERE visibility = 'public' AND status = 'published';
CREATE INDEX publications_kind ON publications(kind, published_at DESC) WHERE visibility = 'public' AND status = 'published';
CREATE INDEX publications_creator ON publications(creator_id, published_at DESC);
CREATE TABLE publication_chapters (
  publication_id uuid NOT NULL, workspace_id uuid NOT NULL REFERENCES workspaces,
  number integer NOT NULL CHECK(number > 0), title text NOT NULL, body text NOT NULL,
  PRIMARY KEY(publication_id, number),
  FOREIGN KEY(publication_id, workspace_id) REFERENCES publications(id, workspace_id)
);
CREATE TABLE publication_links (
  publication_id uuid NOT NULL, related_id uuid NOT NULL, workspace_id uuid NOT NULL REFERENCES workspaces,
  PRIMARY KEY(publication_id, related_id), CHECK(publication_id <> related_id),
  FOREIGN KEY(publication_id, workspace_id) REFERENCES publications(id, workspace_id),
  FOREIGN KEY(related_id, workspace_id) REFERENCES publications(id, workspace_id)
);

CREATE TABLE membership_plans (
  code text PRIMARY KEY, name text NOT NULL,
  state text NOT NULL DEFAULT 'coming_soon' CHECK(state IN ('free', 'coming_soon', 'active', 'retired')),
  monthly_price_krw integer CHECK(monthly_price_krw >= 0), yearly_price_krw integer CHECK(yearly_price_krw >= 0),
  proposed_features jsonb NOT NULL DEFAULT '[]',
  CHECK(state <> 'coming_soon' OR (monthly_price_krw IS NULL AND yearly_price_krw IS NULL))
);
-- Reserved for future verified billing; current preview never writes here.
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users, plan_code text NOT NULL REFERENCES membership_plans,
  provider_subscription_id text UNIQUE NOT NULL, state text NOT NULL CHECK(state IN ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  period_start timestamptz, period_end timestamptz,
  CHECK(period_end IS NULL OR period_end > period_start)
);
CREATE UNIQUE INDEX subscriptions_active_user ON subscriptions(user_id) WHERE state IN ('active', 'past_due');
CREATE TABLE billing_events (
  provider_event_id text PRIMARY KEY, subscription_id uuid REFERENCES subscriptions,
  event_type text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
CREATE TABLE oauth_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users,
  provider text NOT NULL, provider_subject text NOT NULL, encrypted_secret bytea, key_version text,
  scopes text[] NOT NULL DEFAULT '{}', expires_at timestamptz, UNIQUE(user_id, provider, provider_subject)
);
CREATE TABLE mcp_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users,
  client_id text NOT NULL, scopes text[] NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE TABLE mcp_tokens (
  token_hash text PRIMARY KEY, grant_id uuid NOT NULL REFERENCES mcp_grants ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('access', 'refresh')), expires_at timestamptz NOT NULL,
  consumed_at timestamptz, revoked_at timestamptz
);

-- Runtime SQL is backend-only. Set this from the verified session, NEVER request input.
-- Table owner/migration role bypasses RLS; runtime must be a different, non-BYPASSRLS role.
CREATE FUNCTION current_workspace() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('snowlink.workspace_id', true), '')::uuid
$$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['projects','assets','prompt_templates','characters','character_sheets',
    'project_characters','stories','episodes','episode_revisions','story_entities','story_chunks',
    'story_relations','foreshadowings','scene_nodes','scene_edges','cuts','generation_jobs',
    'publications','publication_chapters','publication_links'] LOOP
    EXECUTE format('ALTER TABLE snowlink.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY workspace_isolation ON snowlink.%I USING (workspace_id = snowlink.current_workspace()) WITH CHECK (workspace_id = snowlink.current_workspace())', t);
  END LOOP;
END $$;

-- Deliberately owner-executed views expose ONLY allowlisted public snapshot columns.
-- Grant public reader role SELECT on these views, never on base tables or secrets.
CREATE VIEW public_showcase WITH (security_barrier = true) AS
SELECT p.id, p.slug, p.kind, p.title, p.summary, p.tags, p.cover_public_path, p.cover_alt,
  p.public_body, p.public_character_details, p.published_at, p.is_demo,
  c.handle AS creator_handle, c.display_name AS creator_name, c.tagline AS creator_tagline, c.bio AS creator_bio
FROM publications p JOIN creator_profiles c ON c.user_id = p.creator_id JOIN users u ON u.id = c.user_id
WHERE p.visibility = 'public' AND p.status = 'published' AND c.is_public AND u.deleted_at IS NULL;
CREATE VIEW public_chapters WITH (security_barrier = true) AS
SELECT p.slug, c.number, c.title, c.body FROM publication_chapters c JOIN public_showcase p ON p.id = c.publication_id;
CREATE VIEW public_related_works WITH (security_barrier = true) AS
SELECT a.slug, b.slug AS related_slug FROM publication_links l
JOIN public_showcase a ON a.id = l.publication_id JOIN public_showcase b ON b.id = l.related_id;

COMMIT;
