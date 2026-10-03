# KuraliUpdates Bazaar - Enterprise Architecture Guide
## Angular 18/19 + Java Spring Boot 3 Microservices + Oracle Database

This guide explains how to run, build, and deploy the enterprise stack for **kuraliupdates.com** (Kurali City, Punjab).

---

## 🏛️ System Architecture

```
                    +--------------------------------------------+
                    |          Custom Domain & DNS               |
                    |           kuraliupdates.com                |
                    +---------------------+----------------------+
                                          |
                                          v
                    +--------------------------------------------+
                    |          Angular 18/19 Frontend            |
                    | (Standalone Components, Signals, RxJS)     |
                    | Port: 4200 / Production Static Web Hosting |
                    +---------------------+----------------------+
                                          | REST / HTTPS / WS
                                          v
                    +--------------------------------------------+
                    |      Java Spring Boot 3.3.x Microservices   |
                    |  - Seller Microservice (Approval & MRP)    |
                    |  - Buyer Microservice (Search & Compare)   |
                    |  - Delivery Microservice (Jobs & OTP)      |
                    |  - Admin Analytics (Demand Trends Radar)   |
                    | Port: 8080                                 |
                    +---------------------+----------------------+
                                          | JDBC (ojdbc11)
                                          v
                    +--------------------------------------------+
                    |           Oracle Database (19c/21c/23c)    |
                    |  - Tables: SELLERS, PRODUCTS, ORDERS, etc. |
                    |  - Connection Pool: HikariCP               |
                    +--------------------------------------------+
```

---

## 💾 1. Oracle Database Setup (Oracle 19c, 21c, or 23c)

### Step 1.1: Create Kurali Tablespace and User
Log in to your Oracle Database as `SYSDBA`:

```sql
-- Connect to Pluggable Database (e.g. XEPDB1 or ORCLPDB)
ALTER SESSION SET CONTAINER = XEPDB1;

-- Create Tablespace
CREATE TABLESPACE KURALI_TBS
DATAFILE 'kurali_data01.dbf' SIZE 500M AUTOEXTEND ON NEXT 100M MAXSIZE UNLIMITED;

-- Create Database User
CREATE USER kurali_admin IDENTIFIED BY kurali_secure_pwd
DEFAULT TABLESPACE KURALI_TBS
QUOTA UNLIMITED ON KURALI_TBS;

-- Grant Necessary Privileges
GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE SEQUENCE, CREATE TRIGGER TO kurali_admin;
```

### Step 1.2: Execute DDL & Seed Scripts
Connect as `kurali_admin`:

```bash
sqlplus kurali_admin/kurali_secure_pwd@localhost:1521/XEPDB1 @backend-java-spring/src/main/resources/schema-oracle.sql
sqlplus kurali_admin/kurali_secure_pwd@localhost:1521/XEPDB1 @backend-java-spring/src/main/resources/data-oracle.sql
```

The DDL creates:
- `SELLERS` (Stores in Kurali with PENDING/APPROVED/REJECTED status, free delivery thresholds)
- `PRODUCTS` (Inventory with MRP, Seller Price, Additional Discount %, generated `EFFECTIVE_PRICE`)
- `BILL_DISCOUNTS` (Tiered store discount milestones)
- `COUPONS` (Promo codes like `KURALI50`)
- `ORDERS` & `ORDER_ITEMS` (Orders with 4-digit OTP)
- `DELIVERY_AGENTS` (Riders fleet & earnings)
- `NEGOTIATION_CHATS` & `CHAT_MESSAGES` (Price bargaining threads)

---

## ☕ 2. Java Spring Boot Microservices (MS API)

### Step 2.1: Configure `application.yml`
Set your Oracle DB connection details in `backend-java-spring/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:oracle:thin:@localhost:1521/XEPDB1
    username: kurali_admin
    password: kurali_secure_pwd
```

### Step 2.2: Build and Run
From the `backend-java-spring` directory:

```bash
# Build the microservice package
mvn clean install

# Run the Spring Boot application
mvn spring-boot:run
```

- **API Base URL**: `http://localhost:8080/api/v1`
- **Swagger / OpenAPI Documentation**: `http://localhost:8080/api/v1/swagger-ui.html`

---

## 🅰️ 3. Angular 18/19 Frontend Application

### Step 3.1: Install Dependencies
From the `frontend-angular` directory:

```bash
npm install
```

### Step 3.2: Run Development Server
```bash
npm start
# App will launch on http://localhost:4200
```

### Step 3.3: Production Build
```bash
npm run build
# Compiled files will be generated in dist/kuraliupdates-bazaar
```

---

## 🌐 4. Custom Domain & Production Deployment (`kuraliupdates.com`)

1. **Deploy Frontend to CDN / Web Server**:
   - Host `dist/kuraliupdates-bazaar` on Vercel, Cloudflare Pages, NGINX, or AWS S3 + CloudFront.
   - Point DNS A-record to the hosting IP and CNAME to `www`.
2. **Deploy Java Spring Boot API**:
   - Package as Docker container or deploy to Oracle Cloud Infrastructure (OCI Compute / Kubernetes), AWS ECS, or Google Cloud Run.
   - Route `/api/v1/*` to your Spring Boot instance via Reverse Proxy (NGINX or Cloudflare).
3. **SSL (HTTPS)**:
   - Configured automatically via Let's Encrypt / Cloudflare for `kuraliupdates.com`.
