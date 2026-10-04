-- Replace the short legacy IDs created by V3 with stable user-based IDs.
-- V3 is already applied in production and must remain unchanged.

UPDATE USER_ADDRESSES a
SET ADDRESS_ID = 'addr-legacy-' || SUBSTR(REPLACE(a.USER_ID, '-', ''), 1, 52)
WHERE a.ADDRESS_ID LIKE 'addr-%'
  AND a.ADDRESS_ID NOT LIKE 'addr-legacy-%'
  AND EXISTS (
      SELECT 1
      FROM USERS u
      WHERE u.USER_ID = a.USER_ID
  );
