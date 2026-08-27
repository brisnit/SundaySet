-- Rename the one church-specific position to a generic one.
--
-- Data migration, not a schema change: an UPDATE, never a DROP. Assignments
-- reference positionId, so renaming breaks no relationship.
--
-- Guarded against the @@unique([churchId, name]) constraint: a workspace that
-- already has a "Leader" keeps both rows untouched rather than failing the
-- deploy. Re-running is a no-op.
UPDATE "Position" AS p
SET "name" = 'Leader'
WHERE p."name" = 'Worship Leader'
  AND NOT EXISTS (
    SELECT 1
    FROM "Position" AS existing
    WHERE existing."churchId" = p."churchId"
      AND existing."name" = 'Leader'
  );
