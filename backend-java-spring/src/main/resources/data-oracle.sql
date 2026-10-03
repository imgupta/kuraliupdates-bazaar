-- ============================================================================
-- KuraliUpdates Bazaar - Oracle Database Seed Data for Kurali City
-- ============================================================================

-- 1. Insert Sellers
INSERT INTO SELLERS (SELLER_ID, STORE_NAME, OWNER_NAME, EMAIL, PHONE, AVATAR_URL, CATEGORY, ADDRESS, LOCALITY, DISTANCE_KM, RATING, REVIEW_COUNT, STATUS, GST_NUMBER, MIN_ORDER_FREE_DELIVERY, BASE_DELIVERY_FEE, DESCRIPTION, APPROVED_AT)
VALUES ('seller-1', 'Aggarwal Super Kirana & Provision', 'Sunil Aggarwal', 'aggarwalkirana.kurali@gmail.com', '+91 98765 43210', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80', 'Groceries & Daily Essentials', 'Shop No. 14, Main Bazaar, Near Old Fountain Chowk', 'Main Bazaar, Kurali', 0.60, 4.80, 142, 'APPROVED', '03AAAAA1234A1Z5', 499.00, 30.00, 'Kurali trusted grocery store since 1994. Best wholesale rates for retail buyers.', CURRENT_TIMESTAMP);

INSERT INTO SELLERS (SELLER_ID, STORE_NAME, OWNER_NAME, EMAIL, PHONE, AVATAR_URL, CATEGORY, ADDRESS, LOCALITY, DISTANCE_KM, RATING, REVIEW_COUNT, STATUS, GST_NUMBER, MIN_ORDER_FREE_DELIVERY, BASE_DELIVERY_FEE, DESCRIPTION, APPROVED_AT)
VALUES ('seller-2', 'Singla Departmental Store', 'Ramesh Singla', 'singlastore.kurali@gmail.com', '+91 98140 11223', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', 'Groceries & FMCG', 'Opposite State Bank, Morinda Road', 'Morinda Road, Kurali', 1.80, 4.60, 98, 'APPROVED', '03BBBBB5678B1Z2', 399.00, 35.00, 'Discount destination on Morinda Road. Aggressive pricing and lowest rates on staples.', CURRENT_TIMESTAMP);

INSERT INTO SELLERS (SELLER_ID, STORE_NAME, OWNER_NAME, EMAIL, PHONE, AVATAR_URL, CATEGORY, ADDRESS, LOCALITY, DISTANCE_KM, RATING, REVIEW_COUNT, STATUS, GST_NUMBER, MIN_ORDER_FREE_DELIVERY, BASE_DELIVERY_FEE, DESCRIPTION, APPROVED_AT)
VALUES ('seller-3', 'Kurali Royal Sweets & Pure Dairy', 'Baldev Singh Sodhi', 'kuralisweets.dairy@gmail.com', '+91 94172 33445', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 'Dairy, Bakery & Sweets', 'Near Gurudwara Sahib, Railway Station Road', 'Railway Station Road, Kurali', 1.20, 4.90, 310, 'APPROVED', '03CCCCC1111C1Z3', 299.00, 25.00, 'Famous for 100% pure desi buffalo ghee, fresh malai paneer and pinni.', CURRENT_TIMESTAMP);

INSERT INTO SELLERS (SELLER_ID, STORE_NAME, OWNER_NAME, EMAIL, PHONE, AVATAR_URL, CATEGORY, ADDRESS, LOCALITY, DISTANCE_KM, RATING, REVIEW_COUNT, STATUS, GST_NUMBER, MIN_ORDER_FREE_DELIVERY, BASE_DELIVERY_FEE, DESCRIPTION)
VALUES ('seller-pending-1', 'Dhillon Organic Farm & Health Store', 'Manpreet Singh Dhillon', 'manpreet.dhillon.kurali@gmail.com', '+91 98721 54321', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', 'Organic & Farm Produce', 'Near Siswan River Bridge, Siswan Road', 'Siswan Road, Kurali', 3.20, 0.00, 0, 'PENDING', '03DDDDD3456D1Z1', 599.00, 35.00, 'Naturally grown pesticide-free pulses, jaggery (gur), and cold-pressed mustard oil.');

-- 2. Insert Products
INSERT INTO PRODUCTS (PRODUCT_ID, SELLER_ID, TITLE, CATEGORY, DESCRIPTION, IMAGE_URL, MRP, SELLER_PRICE, ADDITIONAL_DISCOUNT_PCT, STOCK, UNIT, TAGS, IS_FEATURED)
VALUES ('prod-1', 'seller-1', 'Fortune Royal Basmati Rice (5 kg)', 'Groceries & Daily Essentials', 'Long grain aromatic basmati rice aged for 2 years.', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', 520.00, 425.00, 5.00, 45, '5 kg Bag', 'rice,basmati,fortune', 1);

INSERT INTO PRODUCTS (PRODUCT_ID, SELLER_ID, TITLE, CATEGORY, DESCRIPTION, IMAGE_URL, MRP, SELLER_PRICE, ADDITIONAL_DISCOUNT_PCT, STOCK, UNIT, TAGS, IS_FEATURED)
VALUES ('prod-2', 'seller-2', 'Fortune Royal Basmati Rice (5 kg)', 'Groceries & Daily Essentials', 'Guaranteed lowest price in Kurali. Authentic sealed pack.', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', 520.00, 399.00, 3.00, 28, '5 kg Bag', 'rice,basmati,fortune', 1);

INSERT INTO PRODUCTS (PRODUCT_ID, SELLER_ID, TITLE, CATEGORY, DESCRIPTION, IMAGE_URL, MRP, SELLER_PRICE, ADDITIONAL_DISCOUNT_PCT, STOCK, UNIT, TAGS, IS_FEATURED)
VALUES ('prod-3', 'seller-3', 'Kurali Pure Desi Buffalo Ghee (1 Litre Jar)', 'Dairy, Bakery & Sweets', 'Traditional bilona churned granular golden desi ghee.', 'https://images.unsplash.com/photo-1631709497146-a239ef373cf1?auto=format&fit=crop&w=600&q=80', 750.00, 650.00, 4.00, 20, '1 Litre Glass Jar', 'ghee,desi ghee,pure', 1);

-- 3. Insert Bill Discounts
INSERT INTO BILL_DISCOUNTS (RULE_ID, SELLER_ID, MIN_BILL_AMOUNT, DISCOUNT_PCT, FLAT_DISCOUNT, DESCRIPTION)
VALUES ('bd-1', 'seller-1', 500.00, 5.00, NULL, '5% instant discount on orders above ₹500');

INSERT INTO BILL_DISCOUNTS (RULE_ID, SELLER_ID, MIN_BILL_AMOUNT, DISCOUNT_PCT, FLAT_DISCOUNT, DESCRIPTION)
VALUES ('bd-2', 'seller-1', 1200.00, NULL, 100.00, 'Flat ₹100 OFF on grocery orders above ₹1,200');

-- 4. Insert Coupons
INSERT INTO COUPONS (COUPON_ID, CODE, SELLER_ID, DISCOUNT_TYPE, DISCOUNT_VALUE, MIN_ORDER_VALUE, EXPIRY_DATE, DESCRIPTION)
VALUES ('c-1', 'KURALI50', 'ALL', 'FLAT', 50.00, 399.00, TO_DATE('2026-12-31', 'YYYY-MM-DD'), 'Flat ₹50 OFF on orders above ₹399 across any Kurali seller');

-- 5. Insert Delivery Agents
INSERT INTO DELIVERY_AGENTS (AGENT_ID, FULL_NAME, PHONE, EMAIL, AVATAR_URL, VEHICLE_TYPE, VEHICLE_NUMBER, LICENSE_NUMBER, STATUS, RATING, TOTAL_TRIPS, TODAY_EARNINGS, TOTAL_EARNINGS, CURRENT_LOCALITY)
VALUES ('agent-1', 'Gurpreet Singh', '+91 98765 88990', 'gurpreet.rider@kuraliupdates.com', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80', 'Bike', 'PB 65 AB 4589', 'PB-65-2022-00431', 'ACTIVE', 4.90, 342, 420.00, 28450.00, 'Main Bazaar / Fountain Chowk');

COMMIT;
