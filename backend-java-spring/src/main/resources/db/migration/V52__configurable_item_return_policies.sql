-- Return-policy configuration and durable delivery timestamp for item-level eligibility.
ALTER TABLE ORDERS ADD DELIVERED_AT TIMESTAMP;

-- Existing delivered records have no dedicated delivery timestamp. Preserve the
-- best available historical approximation and document this backfill explicitly.
UPDATE ORDERS
   SET DELIVERED_AT = UPDATED_AT
 WHERE UPPER(STATUS) IN ('DELIVERED','COMPLETED')
   AND DELIVERED_AT IS NULL;

CREATE TABLE KU_RETURN_POLICIES (
  CATEGORY VARCHAR2(100) PRIMARY KEY,
  IS_RETURNABLE NUMBER(1) DEFAULT 1 NOT NULL,
  RETURN_WINDOW_DAYS NUMBER(3) DEFAULT 7 NOT NULL,
  UPDATED_BY VARCHAR2(64),
  UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT CK_RETURN_POLICY_FLAG CHECK (IS_RETURNABLE IN (0,1)),
  CONSTRAINT CK_RETURN_POLICY_DAYS CHECK (RETURN_WINDOW_DAYS BETWEEN 0 AND 90)
);

-- Global default: seven calendar days from recorded delivery. Root admin can
-- override specific product categories or change the default.
INSERT INTO KU_RETURN_POLICIES (CATEGORY,IS_RETURNABLE,RETURN_WINDOW_DAYS,UPDATED_AT)
VALUES ('*',1,7,CURRENT_TIMESTAMP);
