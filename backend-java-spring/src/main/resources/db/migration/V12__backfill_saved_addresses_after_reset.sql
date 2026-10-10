-- Recreate normalized saved-address rows from primary address fields where the
-- earlier reset migration left user profile rows but no USER_ADDRESSES rows.
-- Safe to rerun manually: users with any saved-address row are left unchanged.

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
    'addr-' || LOWER(RAWTOHEX(SYS_GUID())),
    u.USER_ID,
    'Home',
    SUBSTR(COALESCE(NULLIF(TRIM(u.ADDRESS_LINE1), ''), NULLIF(TRIM(u.ADDRESS), '')), 1, 300),
    u.LANDMARK,
    u.FORMATTED_ADDRESS,
    u.PLACE_ID,
    u.LATITUDE,
    u.LONGITUDE,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM USERS u
WHERE COALESCE(NULLIF(TRIM(u.ADDRESS_LINE1), ''), NULLIF(TRIM(u.ADDRESS), '')) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM USER_ADDRESSES a
      WHERE a.USER_ID = u.USER_ID
  );
