-- Replace the short legacy IDs created by V3 with stable user-based IDs.
-- V3 is already applied in production and must remain unchanged.
-- User IDs are UUIDs in the current schema, so the resulting IDs remain within
-- the ADDRESS_ID VARCHAR2(64) limit and are deterministic and unique.

UPDATE USER_ADDRESSES a
SET ADDRESS_ID = 'addr-legacy-' || REPLACE(a.USER_ID, '-', '')
WHERE a.ADDRESS_ID LIKE 'addr-%'
  AND a.ADDRESS_ID NOT LIKE 'addr-legacy-%'
  AND EXISTS (
      SELECT 1
      FROM USERS u
      WHERE u.USER_ID = a.USER_ID
  );
