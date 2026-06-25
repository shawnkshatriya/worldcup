-- Migration 018: add missing DELETE policy on ko_bracket_picks.
-- Without this, RLS silently blocks all deletes, so de-selecting a bracket pick
-- (and cascade-clearing downstream picks) never persisted - the pick reappeared on refresh.
DROP POLICY IF EXISTS "delete bracket picks" ON ko_bracket_picks;
CREATE POLICY "delete bracket picks" ON ko_bracket_picks FOR DELETE USING (true);
