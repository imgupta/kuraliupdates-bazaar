-- A single database mutex serializes run-scoped E2E cleanup transactions.
-- This prevents concurrent cleanup DML from deadlocking on Oracle index leaf blocks.
CREATE TABLE E2E_CLEANUP_MUTEX (
    LOCK_NAME VARCHAR2(30) NOT NULL,
    CONSTRAINT PK_E2E_CLEANUP_MUTEX PRIMARY KEY (LOCK_NAME)
);

INSERT INTO E2E_CLEANUP_MUTEX (LOCK_NAME) VALUES ('GLOBAL');
