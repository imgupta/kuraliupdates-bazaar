-- Shared cross-instance cooldown for delivery OTP resend.
-- The key is a SHA-256 hash of either the order ID or combined checkout-group ID.
-- No phone, email, address, OTP or other customer data is stored in this table.
CREATE TABLE DELIVERY_OTP_RESEND_GUARD (
    RESEND_KEY VARCHAR2(64) NOT NULL,
    LAST_SENT_AT TIMESTAMP(6) NOT NULL,
    EXPIRES_AT TIMESTAMP(6) NOT NULL,
    CONSTRAINT PK_DELIVERY_OTP_RESEND_GUARD PRIMARY KEY (RESEND_KEY)
);

CREATE INDEX IDX_DELIVERY_OTP_RESEND_EXPIRES
    ON DELIVERY_OTP_RESEND_GUARD (EXPIRES_AT);
