-- ============================================================================
-- KuraliUpdates Bazaar - Hyperlocal Marketplace
-- Oracle Database 19c / 21c / 23c DDL Schema
-- Location: Kurali, Punjab (kuraliupdates.com)
-- ============================================================================

-- Drop tables if exists (clean setup)
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE USER_SESSIONS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE AUTH_OTPS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE USERS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE CHAT_MESSAGES CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE NEGOTIATION_CHATS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE ORDER_ITEMS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE ORDERS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE COUPONS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE BILL_DISCOUNTS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE PRODUCTS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE DELIVERY_AGENTS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE SELLERS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

-- ----------------------------------------------------------------------------
-- 1. Table: SELLERS (Stores & Shopkeepers in Kurali)
-- ----------------------------------------------------------------------------
CREATE TABLE SELLERS (
    SELLER_ID                  VARCHAR2(64) PRIMARY KEY,
    STORE_NAME                 VARCHAR2(255) NOT NULL,
    OWNER_NAME                 VARCHAR2(150) NOT NULL,
    EMAIL                      VARCHAR2(255) NOT NULL UNIQUE,
    PHONE                      VARCHAR2(30) NOT NULL,
    AVATAR_URL                 VARCHAR2(500),
    CATEGORY                   VARCHAR2(100) NOT NULL,
    ADDRESS                    VARCHAR2(500) NOT NULL,
    LOCALITY                   VARCHAR2(150) NOT NULL,
    DISTANCE_KM                NUMBER(5,2) DEFAULT 1.0,
    RATING                     NUMBER(3,2) DEFAULT 0.0,
    REVIEW_COUNT               NUMBER(10) DEFAULT 0,
    STATUS                     VARCHAR2(20) DEFAULT 'PENDING' CHECK (STATUS IN ('PENDING', 'APPROVED', 'REJECTED')),
    GST_NUMBER                 VARCHAR2(50),
    FSSAI_NUMBER               VARCHAR2(50),
    MIN_ORDER_FREE_DELIVERY    NUMBER(10,2) DEFAULT 499.00,
    BASE_DELIVERY_FEE          NUMBER(10,2) DEFAULT 35.00,
    DESCRIPTION                CLOB,
    REGISTERED_AT              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    APPROVED_AT                TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Table: PRODUCTS (Inventory with MRP, Seller Price, Additional Discount)
-- ----------------------------------------------------------------------------
CREATE TABLE PRODUCTS (
    PRODUCT_ID                 VARCHAR2(64) PRIMARY KEY,
    SELLER_ID                  VARCHAR2(64) NOT NULL REFERENCES SELLERS(SELLER_ID) ON DELETE CASCADE,
    TITLE                      VARCHAR2(255) NOT NULL,
    CATEGORY                   VARCHAR2(100) NOT NULL,
    DESCRIPTION                CLOB,
    IMAGE_URL                  VARCHAR2(500),
    MRP                        NUMBER(10,2) NOT NULL,
    SELLER_PRICE               NUMBER(10,2) NOT NULL,
    ADDITIONAL_DISCOUNT_PCT    NUMBER(5,2) DEFAULT 0.0,
    EFFECTIVE_PRICE            NUMBER(10,2) GENERATED ALWAYS AS (ROUND(SELLER_PRICE * (1 - (ADDITIONAL_DISCOUNT_PCT / 100)), 2)),
    STOCK                      NUMBER(10) DEFAULT 0,
    UNIT                       VARCHAR2(50) DEFAULT '1 Piece',
    TAGS                       VARCHAR2(500),
    IS_FEATURED                NUMBER(1) DEFAULT 0 CHECK (IS_FEATURED IN (0, 1)),
    CREATED_AT                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IDX_PROD_SELLER ON PRODUCTS(SELLER_ID);
CREATE INDEX IDX_PROD_CAT ON PRODUCTS(CATEGORY);

-- ----------------------------------------------------------------------------
-- 3. Table: BILL_DISCOUNTS (Tiered Store Discounts on Total Order Value)
-- ----------------------------------------------------------------------------
CREATE TABLE BILL_DISCOUNTS (
    RULE_ID                    VARCHAR2(64) PRIMARY KEY,
    SELLER_ID                  VARCHAR2(64) NOT NULL REFERENCES SELLERS(SELLER_ID) ON DELETE CASCADE,
    MIN_BILL_AMOUNT            NUMBER(10,2) NOT NULL,
    DISCOUNT_PCT               NUMBER(5,2),
    FLAT_DISCOUNT              NUMBER(10,2),
    DESCRIPTION                VARCHAR2(255) NOT NULL,
    CREATED_AT                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IDX_BILL_DISC_SELLER ON BILL_DISCOUNTS(SELLER_ID);

-- ----------------------------------------------------------------------------
-- 4. Table: COUPONS (Seller & Platform Promo Codes)
-- ----------------------------------------------------------------------------
CREATE TABLE COUPONS (
    COUPON_ID                  VARCHAR2(64) PRIMARY KEY,
    CODE                       VARCHAR2(50) NOT NULL UNIQUE,
    SELLER_ID                  VARCHAR2(64) DEFAULT 'ALL', -- 'ALL' for platform-wide or specific sellerId
    DISCOUNT_TYPE              VARCHAR2(20) NOT NULL CHECK (DISCOUNT_TYPE IN ('FLAT', 'PERCENTAGE')),
    DISCOUNT_VALUE             NUMBER(10,2) NOT NULL,
    MIN_ORDER_VALUE            NUMBER(10,2) DEFAULT 0.0,
    MAX_DISCOUNT               NUMBER(10,2),
    EXPIRY_DATE                DATE NOT NULL,
    DESCRIPTION                VARCHAR2(255),
    IS_ACTIVE                  NUMBER(1) DEFAULT 1 CHECK (IS_ACTIVE IN (0, 1)),
    CREATED_AT                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. Table: DELIVERY_AGENTS (Riders Fleet)
-- ----------------------------------------------------------------------------
CREATE TABLE DELIVERY_AGENTS (
    AGENT_ID                   VARCHAR2(64) PRIMARY KEY,
    FULL_NAME                  VARCHAR2(150) NOT NULL,
    PHONE                      VARCHAR2(30) NOT NULL UNIQUE,
    EMAIL                      VARCHAR2(255) NOT NULL UNIQUE,
    AVATAR_URL                 VARCHAR2(500),
    VEHICLE_TYPE               VARCHAR2(50) NOT NULL CHECK (VEHICLE_TYPE IN ('Bike', 'Scooter', 'Electric Bike', 'Auto / Van')),
    VEHICLE_NUMBER             VARCHAR2(50) NOT NULL,
    LICENSE_NUMBER             VARCHAR2(50) NOT NULL,
    STATUS                     VARCHAR2(20) DEFAULT 'ACTIVE' CHECK (STATUS IN ('ACTIVE', 'OFFLINE', 'SUSPENDED')),
    RATING                     NUMBER(3,2) DEFAULT 5.0,
    TOTAL_TRIPS                NUMBER(10) DEFAULT 0,
    TODAY_EARNINGS             NUMBER(10,2) DEFAULT 0.0,
    TOTAL_EARNINGS             NUMBER(12,2) DEFAULT 0.0,
    CURRENT_LOCALITY           VARCHAR2(150) NOT NULL,
    REGISTERED_AT              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. Table: ORDERS (Buyer Orders & Shipment Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE ORDERS (
    ORDER_ID                   VARCHAR2(64) PRIMARY KEY,
    BUYER_NAME                 VARCHAR2(150) NOT NULL,
    BUYER_PHONE                VARCHAR2(30) NOT NULL,
    BUYER_EMAIL                VARCHAR2(255),
    DELIVERY_ADDRESS           VARCHAR2(500) NOT NULL,
    DELIVERY_LOCALITY          VARCHAR2(150) NOT NULL,
    SELLER_ID                  VARCHAR2(64) NOT NULL REFERENCES SELLERS(SELLER_ID),
    SUBTOTAL                   NUMBER(10,2) NOT NULL,
    BILL_DISCOUNT_AMOUNT       NUMBER(10,2) DEFAULT 0.0,
    COUPON_DISCOUNT_AMOUNT     NUMBER(10,2) DEFAULT 0.0,
    COUPON_CODE                VARCHAR2(50),
    DELIVERY_FEE               NUMBER(10,2) DEFAULT 0.0,
    IS_FREE_DELIVERY           NUMBER(1) DEFAULT 0 CHECK (IS_FREE_DELIVERY IN (0, 1)),
    TOTAL_AMOUNT               NUMBER(10,2) NOT NULL,
    PAYMENT_METHOD             VARCHAR2(30) NOT NULL CHECK (PAYMENT_METHOD IN ('UPI', 'Card', 'COD', 'NetBanking')),
    PAYMENT_STATUS             VARCHAR2(30) DEFAULT 'PENDING' CHECK (PAYMENT_STATUS IN ('PAID', 'PENDING_COD', 'FAILED')),
    STATUS                     VARCHAR2(40) DEFAULT 'PLACED' CHECK (
        STATUS IN ('PLACED', 'ACCEPTED_BY_SELLER', 'READY_FOR_PICKUP', 'ASSIGNED_TO_DELIVERY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')
    ),
    DELIVERY_AGENT_ID          VARCHAR2(64) REFERENCES DELIVERY_AGENTS(AGENT_ID),
    DELIVERY_OTP               VARCHAR2(6) NOT NULL,
    DISTANCE_KM                NUMBER(5,2) DEFAULT 1.5,
    ESTIMATED_DELIVERY_MINS    NUMBER(5) DEFAULT 25,
    PLACED_AT                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IDX_ORDER_SELLER ON ORDERS(SELLER_ID);
CREATE INDEX IDX_ORDER_AGENT ON ORDERS(DELIVERY_AGENT_ID);
CREATE INDEX IDX_ORDER_STATUS ON ORDERS(STATUS);

-- ----------------------------------------------------------------------------
-- 7. Table: ORDER_ITEMS (Items in each order)
-- ----------------------------------------------------------------------------
CREATE TABLE ORDER_ITEMS (
    ITEM_ID                    VARCHAR2(64) PRIMARY KEY,
    ORDER_ID                   VARCHAR2(64) NOT NULL REFERENCES ORDERS(ORDER_ID) ON DELETE CASCADE,
    PRODUCT_ID                 VARCHAR2(64) NOT NULL REFERENCES PRODUCTS(PRODUCT_ID),
    QUANTITY                   NUMBER(5) NOT NULL,
    UNIT_PRICE                 NUMBER(10,2) NOT NULL,
    NEGOTIATED_PRICE           NUMBER(10,2),
    TOTAL_PRICE                NUMBER(10,2) NOT NULL
);

CREATE INDEX IDX_ITEM_ORDER ON ORDER_ITEMS(ORDER_ID);

-- ----------------------------------------------------------------------------
-- 8. Table: NEGOTIATION_CHATS (Buyer - Seller Live Bargaining)
-- ----------------------------------------------------------------------------
CREATE TABLE NEGOTIATION_CHATS (
    CHAT_ID                    VARCHAR2(64) PRIMARY KEY,
    PRODUCT_ID                 VARCHAR2(64) NOT NULL REFERENCES PRODUCTS(PRODUCT_ID),
    SELLER_ID                  VARCHAR2(64) NOT NULL REFERENCES SELLERS(SELLER_ID),
    BUYER_NAME                 VARCHAR2(150) NOT NULL,
    BUYER_EMAIL                VARCHAR2(255) NOT NULL,
    CURRENT_AGREED_PRICE       NUMBER(10,2),
    LAST_UPDATED               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IDX_CHAT_SELLER ON NEGOTIATION_CHATS(SELLER_ID);
CREATE INDEX IDX_CHAT_PROD ON NEGOTIATION_CHATS(PRODUCT_ID);

-- ----------------------------------------------------------------------------
-- 9. Table: CHAT_MESSAGES (Messages & Bargain Offers in thread)
-- ----------------------------------------------------------------------------
CREATE TABLE CHAT_MESSAGES (
    MESSAGE_ID                 VARCHAR2(64) PRIMARY KEY,
    CHAT_ID                    VARCHAR2(64) NOT NULL REFERENCES NEGOTIATION_CHATS(CHAT_ID) ON DELETE CASCADE,
    SENDER_ROLE                VARCHAR2(20) NOT NULL CHECK (SENDER_ROLE IN ('BUYER', 'SELLER')),
    SENDER_NAME                VARCHAR2(150) NOT NULL,
    MESSAGE_TEXT               CLOB NOT NULL,
    OFFER_PRICE                NUMBER(10,2),
    OFFER_STATUS               VARCHAR2(20) CHECK (OFFER_STATUS IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED')),
    CREATED_AT                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IDX_MSG_CHAT ON CHAT_MESSAGES(CHAT_ID);

-- ----------------------------------------------------------------------------
-- 10. Table: USERS (Live Registered Users - Buyers, Sellers, Riders, Admin)
-- ----------------------------------------------------------------------------
CREATE TABLE USERS (
    USER_ID                    VARCHAR2(64) PRIMARY KEY,
    EMAIL                      VARCHAR2(255) UNIQUE,
    PHONE                      VARCHAR2(30) UNIQUE,
    NAME                       VARCHAR2(150) NOT NULL,
    ROLE                       VARCHAR2(30) DEFAULT 'BUYER' CHECK (ROLE IN ('BUYER', 'SELLER', 'DELIVERY', 'ADMIN')),
    LOCALITY                   VARCHAR2(150),
    ADDRESS                    VARCHAR2(500),
    IS_VERIFIED                NUMBER(1) DEFAULT 1 CHECK (IS_VERIFIED IN (0, 1)),
    IS_ADMIN                   NUMBER(1) DEFAULT 0 CHECK (IS_ADMIN IN (0, 1)),
    AVATAR_URL                 VARCHAR2(500),
    CREATED_AT                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LAST_LOGIN                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CHK_USER_CONTACT CHECK (EMAIL IS NOT NULL OR PHONE IS NOT NULL)
);

CREATE INDEX IDX_USERS_EMAIL ON USERS(EMAIL);
CREATE INDEX IDX_USERS_PHONE ON USERS(PHONE);

-- ----------------------------------------------------------------------------
-- 11. Table: AUTH_OTPS (Live 6-Digit Email & Phone Verification Codes)
-- ----------------------------------------------------------------------------
CREATE TABLE AUTH_OTPS (
    OTP_ID                     VARCHAR2(64) PRIMARY KEY,
    IDENTIFIER                 VARCHAR2(255) NOT NULL,
    OTP_CODE                   VARCHAR2(10) NOT NULL,
    OTP_TYPE                   VARCHAR2(20) NOT NULL CHECK (OTP_TYPE IN ('EMAIL', 'PHONE')),
    IS_USED                    NUMBER(1) DEFAULT 0 CHECK (IS_USED IN (0, 1)),
    EXPIRES_AT                 TIMESTAMP NOT NULL,
    CREATED_AT                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IDX_AUTH_OTPS_ID ON AUTH_OTPS(IDENTIFIER, OTP_TYPE, IS_USED);

-- ----------------------------------------------------------------------------
-- 12. Table: USER_SESSIONS (Stateful Authentication & Logout Tokens)
-- ----------------------------------------------------------------------------
CREATE TABLE USER_SESSIONS (
    SESSION_TOKEN              VARCHAR2(128) PRIMARY KEY,
    USER_ID                    VARCHAR2(64) NOT NULL REFERENCES USERS(USER_ID) ON DELETE CASCADE,
    CREATED_AT                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    EXPIRES_AT                 TIMESTAMP NOT NULL
);

CREATE INDEX IDX_SESSIONS_USER ON USER_SESSIONS(USER_ID);

COMMIT;
