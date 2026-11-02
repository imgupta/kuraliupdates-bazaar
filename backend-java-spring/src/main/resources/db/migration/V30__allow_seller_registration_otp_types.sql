-- Seller registration uses isolated OTP types so its verification records
-- cannot collide with normal sign-in OTPs. The original AUTH_OTPS check
-- allowed only EMAIL and PHONE, causing SELLER_EMAIL / SELLER_PHONE inserts
-- to fail with ORA-02290 after the provider had already accepted delivery.
DECLARE
    v_constraint_name VARCHAR2(128);
BEGIN
    FOR c IN (
        SELECT constraint_name
          FROM user_constraints
         WHERE table_name = 'AUTH_OTPS'
           AND constraint_type = 'C'
           AND UPPER(search_condition_vc) LIKE '%OTP_TYPE%'
    ) LOOP
        v_constraint_name := DBMS_ASSERT.SIMPLE_SQL_NAME(c.constraint_name);
        EXECUTE IMMEDIATE 'ALTER TABLE AUTH_OTPS DROP CONSTRAINT ' || v_constraint_name;
    END LOOP;
END;

ALTER TABLE AUTH_OTPS
    ADD CONSTRAINT CK_AUTH_OTPS_TYPE
    CHECK (OTP_TYPE IN ('EMAIL', 'PHONE', 'SELLER_EMAIL', 'SELLER_PHONE'));
