-- Preserve the most recently updated default address when historical data contains duplicates.
UPDATE USER_ADDRESSES a
SET IS_DEFAULT = 0
WHERE a.IS_DEFAULT = 1
  AND a.ROWID NOT IN (
      SELECT keep_rowid
      FROM (
          SELECT ROWID AS keep_rowid,
                 ROW_NUMBER() OVER (
                     PARTITION BY USER_ID
                     ORDER BY UPDATED_AT DESC NULLS LAST, CREATED_AT DESC NULLS LAST, ADDRESS_ID DESC
                 ) AS row_num
          FROM USER_ADDRESSES
          WHERE IS_DEFAULT = 1
      )
      WHERE row_num = 1
  );

-- Oracle permits multiple NULL keys, so non-default rows do not collide.
CREATE UNIQUE INDEX UX_USER_ADDRESS_ONE_DEFAULT
    ON USER_ADDRESSES (CASE WHEN IS_DEFAULT = 1 THEN USER_ID END);
