# KuraliUpdates Bazaar — Complete Deployment Architecture & Configuration Guide

This document contains the complete configuration, environment variables, credentials reference, architecture topology, and verification links for the production deployment of **KuraliUpdates Bazaar**.

---

## 1. System Architecture Topology

```
+-----------------------------------------------------------------------------------+
|                                 USER BROWSER / IPAD                              |
|                            https://www.kuraliupdates.com                          |
+-----------------------------------------------------------------------------------+
                                         |
                                         | (DNS managed by GoDaddy)
                                         v
+-----------------------------------------------------------------------------------+
|                           FRONTEND UI (Vercel Global Edge)                       |
|  - Framework: Vite + React 18 + TypeScript + Tailwind CSS                        |
|  - Domain: https://www.kuraliupdates.com (and kuraliupdates.com)                 |
|  - Client API Endpoint: https://kuraliupdates-bazaar.onrender.com/api/v1         |
+-----------------------------------------------------------------------------------+
                                         |
                                         | HTTPS (REST API / JSON)
                                         v
+-----------------------------------------------------------------------------------+
|                        BACKEND MICROSERVICE (Render Web Service)                  |
|  - Runtime: Docker (Java 17 Eclipse Temurin + Spring Boot 3.3)                    |
|  - Service URL: https://kuraliupdates-bazaar.onrender.com/api/v1                  |
|  - Port: 10000 / 8080                                                             |
|  - Embedded Oracle Wallet: /app/wallet                                            |
+-----------------------------------------------------------------------------------+
                                         |
                                         | mTLS / TCPS Port 1522
                                         v
+-----------------------------------------------------------------------------------+
|                       DATABASE (Oracle Cloud Infrastructure - OCI)                |
|  - Engine: Oracle Autonomous Database (Serverless 23ai / 19c)                     |
|  - Region: AP-MUMBAI-1 (adb.ap-mumbai-1.oraclecloud.com)                          |
|  - Connection: TNS jkphg8mg7fvt8c2n_high via Decrypted Client Credentials         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Component Configurations

### A. Database — Oracle Cloud Infrastructure (OCI)
* **Service:** Oracle Autonomous Transaction Processing (ATP)
* **Instance TNS Identifier:** `jkphg8mg7fvt8c2n_high`
* **Host:** `adb.ap-mumbai-1.oraclecloud.com`
* **Port:** `1522` (mTLS encrypted)
* **Service Name:** `g3efe1bee8dcec6_jkphg8mg7fvt8c2n_high.adb.oraclecloud.com`
* **Database Username:** `ADMIN`
* **Wallet File:** `backend-java-spring/Wallet_JKPHG8MG7FVT8C2N.zip`
* **Wallet & Keystore Password:** Managed as a Render secret; never store the value in documentation or source control.
* **Security Dependencies:** `ojdbc11`, `oraclepki`, `osdt_cert`, `osdt_core`

---

### B. Backend Service — Render
* **Dashboard:** [https://dashboard.render.com](https://dashboard.render.com)
* **Service Name:** `kuraliupdates-bazaar`
* **Repository:** `imgupta/kuraliupdates-bazaar` (Branch: `main`)
* **Root Directory:** `backend-java-spring`
* **Runtime:** `Docker`
* **Context Path:** `/api/v1`
* **Environment Variables in Render:**
  | Variable | Value | Notes |
  | :--- | :--- | :--- |
  | `ORACLE_PASSWORD` | `<your-db-admin-password>` | Set in Render Environment tab |
  | `WALLET_PASSWORD` | `<secret>` | Decrypts JKS keystore & truststore; keep only in Render secrets |
  | `TNS_ADMIN` | `/app/wallet` | Pre-configured in Dockerfile |
  | `ORACLE_JDBC_URL` | `jdbc:oracle:thin:@jkphg8mg7fvt8c2n_high?TNS_ADMIN=/app/wallet` | Built-in default |
  | `OTP_EMAIL_FROM` | `noreply@kuraliupdates.com` | Verified Resend sender domain |
  | `RESEND_API_KEY` | `<secret>` | Resend API key; Render secret only |
  | `MSG91_AUTH_KEY` | `<secret>` | SMS OTP provider credential; Render secret only |
  | `MSG91_TEMPLATE_ID` | `<template-id>` | SMS OTP template configuration |

---

### B1. OTP Provider Configuration

Email OTP uses **Resend over HTTPS** through `OtpDeliveryService`. The backend sends email OTPs only after server-side validation and stores the hashed OTP after provider acceptance. SMS OTP remains isolated behind the same service and uses MSG91.

Resend domain requirement: verify `kuraliupdates.com` in Resend and configure `OTP_EMAIL_FROM` with an address on that verified domain. Do not use a personal Gmail sender in production.

---

### C. Frontend UI — Vercel
* **Dashboard:** [https://vercel.com](https://vercel.com)
* **Project Name:** `kuraliupdates-bazaar`
* **Repository:** `imgupta/kuraliupdates-bazaar`
* **Framework:** `Vite`
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* **Environment Variables in Vercel:**
  | Variable | Value | Purpose |
  | :--- | :--- | :--- |
  | `VITE_API_BASE_URL` | `https://kuraliupdates-bazaar.onrender.com/api/v1` | Connects frontend client to backend |

---

### D. Domain & DNS — GoDaddy
* **Domain:** `kuraliupdates.com`
* **Nameservers:** `ns21.domaincontrol.com`, `ns22.domaincontrol.com`
* **DNS Records Table:**
  | Type | Name / Host | Target / Value | Purpose |
  | :--- | :--- | :--- | :--- |
  | **A** | `@` | `76.76.21.21` | Directs root `kuraliupdates.com` to Vercel |
  | **CNAME** | `www` | `cname.vercel-dns.com` | Directs `www.kuraliupdates.com` to Vercel |
  | **CNAME** *(Optional)* | `api` | `kuraliupdates-bazaar.onrender.com` | Custom domain for backend API |

*Note: Ensure any old A record pointing to GoDaddy parked IP (`160.153.0.160` or `216.198.79.1`) is deleted.*

---

## 3. Master Links Directory

| Service | Direct URL | Status |
| :--- | :--- | :--- |
| **Live Web App (Production)** | [https://www.kuraliupdates.com](https://www.kuraliupdates.com) | ✅ LIVE (Vercel) |
| **Root Web App** | [https://kuraliupdates.com](https://kuraliupdates.com) | ✅ LIVE (Vercel) |
| **Swagger UI Documentation** | [https://kuraliupdates-bazaar.onrender.com/api/v1/swagger-ui/index.html](https://kuraliupdates-bazaar.onrender.com/api/v1/swagger-ui/index.html) | ✅ LIVE (Render) |
| **Backend Health Probe** | [https://kuraliupdates-bazaar.onrender.com/api/v1/health](https://kuraliupdates-bazaar.onrender.com/api/v1/health) | ✅ LIVE (Render) |
| **Oracle Products API** | [https://kuraliupdates-bazaar.onrender.com/api/v1/buyers/products/search](https://kuraliupdates-bazaar.onrender.com/api/v1/buyers/products/search) | ✅ LIVE (Oracle DB) |
| **OpenAPI Specification** | [https://kuraliupdates-bazaar.onrender.com/api/v1/v3/api-docs](https://kuraliupdates-bazaar.onrender.com/api/v1/v3/api-docs) | ✅ LIVE (OpenAPI v3) |
| **GitHub Repository** | [https://github.com/imgupta/kuraliupdates-bazaar](https://github.com/imgupta/kuraliupdates-bazaar) | ✅ Synced |

---

## 4. Verification Checklist

1. [x] **Oracle Autonomous DB:** Wallet `Wallet_JKPHG8MG7FVT8C2N.zip` committed, decrypted with `Vasu@123!2026`.
2. [x] **Spring Boot Microservices:** Docker build packaged with `ojdbc11`, `oraclepki`, `osdt_cert`, `osdt_core`.
3. [x] **HikariCP Connection Pool:** Connected to `@jkphg8mg7fvt8c2n_high` on port 1522.
4. [x] **Render Web Service:** Live and responding with HTTP 200 on `/api/v1/health`.
5. [x] **Vercel Frontend:** Live and serving React SPA with HTTP 200.
6. [x] **GoDaddy DNS:** `www.kuraliupdates.com` CNAME active and SSL certified.


## Automatic Database Migrations

The Spring Boot backend uses Flyway for production schema management. Versioned migrations live under `backend-java-spring/src/main/resources/db/migration` and are executed automatically during application startup. Existing production schemas are baselined automatically; destructive Flyway clean operations are disabled and migration validation is enabled. Never modify an already-applied migration—add a new versioned migration instead.
