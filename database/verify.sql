-- Run after schema + demo seed in a disposable development database.
BEGIN;
SET LOCAL search_path = snowlink, public;
DO $$ BEGIN
  IF (SELECT count(*) FROM public_showcase) <> 9 THEN RAISE EXCEPTION 'Expected nine public demo works'; END IF;
  IF (SELECT count(*) FROM public_chapters) <> 6 THEN RAISE EXCEPTION 'Expected six public chapters'; END IF;
  IF (SELECT count(*) FROM credentials) <> 0 THEN RAISE EXCEPTION 'Demo accounts must not have passwords'; END IF;
  IF (SELECT count(*) FROM subscriptions) <> 0 THEN RAISE EXCEPTION 'Preview must not create subscriptions'; END IF;
  IF EXISTS(SELECT 1 FROM membership_plans WHERE code <> 'free' AND (monthly_price_krw IS NOT NULL OR yearly_price_krw IS NOT NULL)) THEN RAISE EXCEPTION 'Paid preview price must remain undecided'; END IF;
END $$;
UPDATE publications SET visibility = 'private' WHERE slug = 'moon-post-office';
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public_showcase WHERE slug = 'moon-post-office') THEN RAISE EXCEPTION 'Private work leaked'; END IF;
  IF EXISTS(SELECT 1 FROM public_chapters WHERE slug = 'moon-post-office') THEN RAISE EXCEPTION 'Private chapters leaked'; END IF;
  IF EXISTS(SELECT 1 FROM public_related_works WHERE slug = 'moon-post-office' OR related_slug = 'moon-post-office') THEN RAISE EXCEPTION 'Private relation leaked'; END IF;
END $$;
UPDATE publications SET visibility = 'public' WHERE slug = 'moon-post-office';
UPDATE creator_profiles SET is_public = false WHERE handle = 'glass-garden';
DO $$ BEGIN
  IF (SELECT count(*) FROM public_showcase) <> 6 THEN RAISE EXCEPTION 'Private creator leaked'; END IF;
  BEGIN
    INSERT INTO project_characters(workspace_id, project_id, character_id)
    SELECT p.workspace_id, p.id, c.id FROM projects p JOIN workspaces w ON w.id = p.workspace_id
    JOIN users u ON u.id = w.owner_id CROSS JOIN characters c
    WHERE u.username = 'demo.moon-writer' AND c.workspace_id <> p.workspace_id LIMIT 1;
    RAISE EXCEPTION 'Cross-workspace reference unexpectedly allowed';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;
-- A normal runtime role must see no private workspace unless context is set.
CREATE ROLE snowlink_design_check NOLOGIN;
GRANT USAGE ON SCHEMA snowlink TO snowlink_design_check;
GRANT SELECT ON projects, public_showcase, public_chapters, public_related_works TO snowlink_design_check;
SELECT set_config('snowlink.test_workspace', (SELECT id::text FROM workspaces LIMIT 1), true);
SET LOCAL ROLE snowlink_design_check;
DO $$ BEGIN
  IF (SELECT count(*) FROM snowlink.projects) <> 0 THEN RAISE EXCEPTION 'Missing workspace context leaked projects'; END IF;
  IF (SELECT count(*) FROM snowlink.public_showcase) <> 6 THEN RAISE EXCEPTION 'Public reader view failed'; END IF;
END $$;
SELECT set_config('snowlink.workspace_id', current_setting('snowlink.test_workspace'), true);
DO $$ BEGIN
  IF (SELECT count(*) FROM snowlink.projects) <> 1 THEN RAISE EXCEPTION 'RLS did not isolate one workspace'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
