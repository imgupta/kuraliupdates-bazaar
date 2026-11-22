-- Extend the legacy order-level payment summary to support seller-direct UPI.
-- Existing installations may have an Oracle-generated constraint name (for example SYS_C...),
-- so locate the check constraint by its constrained column instead of assuming its name.
DECLARE
  v_constraint_name USER_CONSTRAINTS.CONSTRAINT_NAME%TYPE;
BEGIN
  FOR c IN (
    SELECT DISTINCT uc.CONSTRAINT_NAME
      FROM USER_CONSTRAINTS uc
      JOIN USER_CONS_COLUMNS ucc
        ON ucc.CONSTRAINT_NAME = uc.CONSTRAINT_NAME
       AND ucc.TABLE_NAME = uc.TABLE_NAME
     WHERE uc.TABLE_NAME = 'ORDERS'
       AND uc.CONSTRAINT_TYPE = 'C'
       AND ucc.COLUMN_NAME = 'PAYMENT_STATUS'
  ) LOOP
    EXECUTE IMMEDIATE 'ALTER TABLE ORDERS DROP CONSTRAINT ' || DBMS_ASSERT.SIMPLE_SQL_NAME(c.CONSTRAINT_NAME);
  END LOOP;
END;
/

ALTER TABLE ORDERS ADD CONSTRAINT CK_ORDERS_PAYMENT_STATUS
  CHECK (PAYMENT_STATUS IN (
    'PENDING',
    'PAID',
    'PENDING_COD',
    'FAILED',
    'PENDING_UPI',
    'PAYMENT_EXPIRED',
    'CANCELLED'
  ));
