-- Backfill the existing primary buyer address into the normalized address table.
-- This preserves addresses that were stored on USERS before USER_ADDRESSES was introduced.

INSERT INTO USER_ADDRESSES (
    ADDRESS_ID,
    USER_ID,
    LABEL,
    ADDRESS_LINE1,
    LANDMARK,
    FORMATTED_ADDRESS,
    PLACE_ID,
    LATITUDE,
    LONGITUDE,
    IS_DEFAULT,
    CREATED_AT,
    UPDATED_AT
)
SELECT
    'addr-legacy-' || SUBSTR(REPLACE(u.USER_ID, '-', ''), 1, 52),
    u.USER_ID,
    'Home',
    COALESCE(u.ADDRESS_LINE1, u.ADDRESS),
    u.LANDMARK,
    u.FORMATTED_ADDRESS,
    u.PLACE_ID,
    u.LATITUDE,
    u.LONGITUDE,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM USERS u
WHERE COALESCE(u.ADDRESS_LINE1, u.ADDRESS) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM USER_ADDRESSES a
      WHERE a.USER_ID = u.USER_ID
  );
