# 🎒 Gunny Bags Manager - REST API Documentation

**Version:** `1.0.0`  
**Protocol:** `HTTP / HTTPS`  
**Data Format:** `application/json`  
**Base URL (Local/Dev):** `http://localhost:5050/api/v1`  
**Base URL (Production):** `https://api.gunnybagsmanager.com/api/v1`  

---

## 1. Global Specifications & SaaS Architecture

### 1.0 Multi-Tenant SaaS Hierarchy
This backend operates as a **secure multi-tenant SaaS platform**:
```
┌────────────────────────────────────────────────────────────────┐
│               Gunny Bags SaaS Backend Platform                 │
└───────────────────────────────┬────────────────────────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
    ┌─────────────────────┐           ┌─────────────────────┐
    │ Tenant A (Business) │           │ Tenant B (Business) │
    │ Owner: Varun        │           │ Owner: Om Patel     │
    │ Business: Agravat   │           │ Business: Patel Co. │
    └──────────┬──────────┘           └──────────┬──────────┘
               │                                 │
        ┌──────┴──────┐                   ┌──────┴──────┐
        ▼             ▼                   ▼             ▼
   Worker 1       Worker 2           Worker A       Worker B
   (Ramesh)       (Suresh)           (Kailash)      (Mohan)
        │             │                   │             │
        ▼             ▼                   ▼             ▼
   Work & Payouts Work & Payouts     Work & Payouts Work & Payouts
   (Only Tenant A can view)          (Only Tenant B can view)
```
- **Tenants (`users`)**: Business owners register and manage their factory/business independently.
- **Workers (`employees`)**: Created by a business owner (`created_by = user.id`), strictly isolated to that tenant.
- **Work Entries & Payouts**: Stored with `created_by = user.id`, guaranteeing 100% data privacy between different businesses.

### 1.1 Common Request Headers
| Header | Value | Required On | Description |
|---|---|---|---|
| `Content-Type` | `application/json` | POST, PUT, PATCH | Request body format |
| `Accept` | `application/json` | All endpoints | Desired response format |
| `Authorization` | `Bearer <ACCESS_TOKEN>` | Protected endpoints | Standard JWT Bearer token |

### 1.2 Standard Response Envelopes

#### ✅ Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

#### ❌ Error Response (`400`, `401`, `403`, `404`, `409`, `429`, `500`)
```json
{
  "success": false,
  "message": "Human readable error description",
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHORIZED | ALREADY_EXISTS | SERVER_ERROR",
    "details": "Additional context or field specifics"
  }
}
```

---

## 2. Authentication & SaaS Onboarding API (`/auth`)

### 2.0 Register New Business / Tenant
Creates a new independent business tenant account and sends an initial verification OTP.
- **Endpoint:** `POST /auth/register`
- **Auth Required:** No

#### Request Body:
```json
{
  "name": "Om Patel",
  "mobile": "9988776655",
  "businessName": "Patel Gunny Bags Traders",
  "countryCode": "+91"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Account registered! OTP sent to +91 9988776655",
  "data": {
    "sessionId": "sess_98fb45e4473a",
    "expiresInSeconds": 300,
    "resendCooldownSeconds": 60,
    "isNewUser": true,
    "user": {
      "id": "usr_1791448819918",
      "name": "Om Patel",
      "businessName": "Patel Gunny Bags Traders",
      "mobile": "9988776655"
    }
  }
}
```

---

### 2.1 Send OTP
Sends an OTP to a business owner's mobile number. In development/testing, master OTP is `123456`.
- **Endpoint:** `POST /auth/send-otp`
- **Auth Required:** No

#### Request Body:
```json
{
  "mobile": "9876543210",
  "countryCode": "+91"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "OTP sent successfully to +91 9876543210",
  "data": {
    "sessionId": "sess_919b6adb464e",
    "expiresInSeconds": 300,
    "resendCooldownSeconds": 60,
    "isNewUser": false
  }
}
```

---

### 2.2 Verify OTP & Login
Validates the OTP and returns access & refresh JWT tokens.
- **Endpoint:** `POST /auth/verify-otp`
- **Auth Required:** No

#### Request Body:
```json
{
  "mobile": "9876543210",
  "countryCode": "+91",
  "otp": "123456",
  "sessionId": "sess_919b6adb464e"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "eyJhbGciOiJIUzI1Ni...",
      "tokenType": "Bearer",
      "expiresIn": 86400
    },
    "user": {
      "id": "usr_001",
      "mobile": "9876543210",
      "countryCode": "+91",
      "name": "Varun Agravat",
      "businessName": "Agravat Gunny Bags Trading Co.",
      "role": "OWNER",
      "isActive": true,
      "createdAt": "2026-10-06T04:47:14.000Z"
    }
  }
}
```

---

### 2.3 Resend OTP
- **Endpoint:** `POST /auth/resend-otp`
- **Auth Required:** No
- **Request Body:**
```json
{
  "mobile": "9876543210",
  "countryCode": "+91",
  "sessionId": "sess_919b6adb464e"
}
```

---

### 2.4 Refresh Access Token
- **Endpoint:** `POST /auth/refresh-token`
- **Auth Required:** No
- **Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1Ni..."
}
```

---

### 2.5 Get Current Profile
- **Endpoint:** `GET /auth/me`
- **Auth Required:** Yes (`Bearer <token>`)

---

## 3. Dashboard & Analytics API

### 3.1 Get Dashboard Summary
Returns live KPI summary numbers for a selected date (or today).
- **Endpoint:** `GET /dashboard/summary`
- **Auth Required:** Yes
- **Query Parameters:**
  - `date` *(optional)*: `YYYY-MM-DD` (defaults to today's date)

#### Example Request:
```bash
curl -X GET "http://localhost:5050/api/v1/dashboard/summary?date=2026-10-06" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "date": "2026-10-06",
    "todaysBagsCompleted": 350,
    "todaysWorkAmount": 1750,
    "totalPendingPayout": 1250,
    "activeWorkersCount": 2,
    "todaysEntriesCount": 2
  }
}
```

---

### 3.2 Get Daily Production Report
Returns worker breakdown and detailed entries for a given date.
- **Endpoint:** `GET /reports/daily`
- **Auth Required:** Yes
- **Query Parameters:**
  - `date` *(optional)*: `YYYY-MM-DD` (e.g. `2026-10-06`)

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "date": "2026-10-06",
    "totalBags": 350,
    "totalAmount": 1750,
    "employeeSummary": [
      {
        "employeeId": "emp_2",
        "employeeName": "Suresh",
        "bags": 200,
        "amount": 1000
      },
      {
        "employeeId": "emp_1",
        "employeeName": "Ramesh",
        "bags": 150,
        "amount": 750
      }
    ],
    "entries": [
      {
        "id": "w_1791262503584",
        "employeeId": "emp_2",
        "employeeName": "Suresh",
        "bagCount": 200,
        "ratePerBag": 5,
        "totalAmount": 1000,
        "time": null,
        "notes": "Afternoon shift"
      }
    ]
  }
}
```

---

### 3.3 Get Individual Worker Ledger & Report
Returns full historical debit/credit ledger, total earned, total paid, and pending balance.
- **Endpoint:** `GET /reports/employee/:id`
- **Auth Required:** Yes
- **Path Parameter:**
  - `:id` — Worker ID (e.g. `emp_1`)
- **Query Parameters:**
  - `startDate` *(optional)*: `YYYY-MM-DD`
  - `endDate` *(optional)*: `YYYY-MM-DD`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "employee": {
      "id": "emp_1",
      "name": "Ramesh",
      "mobile": "9876543210",
      "ratePerBag": 5,
      "isActive": true
    },
    "totals": {
      "totalBags": 150,
      "totalEarned": 750,
      "totalPaid": 500,
      "currentPending": 250
    },
    "workHistory": [
      {
        "id": "w_1791262503534",
        "date": "2026-10-06",
        "bagCount": 150,
        "ratePerBag": 5,
        "totalAmount": 750,
        "notes": "Morning shift"
      }
    ],
    "payoutHistory": [
      {
        "id": "p_1791262510156",
        "date": "2026-10-06",
        "payoutAmount": 500,
        "paymentMode": "CASH",
        "referenceNote": "Weekly advance"
      }
    ]
  }
}
```

---

## 4. Workers / Employees API (`/employees`)

### 4.1 List All Employees
- **Endpoint:** `GET /employees`
- **Auth Required:** Yes
- **Query Parameters:**
  - `search` *(optional)*: Filter by name or mobile number
  - `isActive` *(optional)*: `true` or `false`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Operation successful",
  "data": [
    {
      "id": "emp_1",
      "name": "Ramesh",
      "mobile": "9876543210",
      "ratePerBag": 5.0,
      "isActive": true,
      "address": "Main Bazar, Market Yard",
      "notes": "Experienced worker",
      "totalBags": 150,
      "totalEarned": 750,
      "totalPaid": 500,
      "pendingAmount": 250,
      "createdAt": "2026-10-06T04:47:14.000Z"
    }
  ]
}
```

---

### 4.2 Add New Employee
- **Endpoint:** `POST /employees`
- **Auth Required:** Yes

#### Request Body:
```json
{
  "name": "Kailash",
  "mobile": "9876543215",
  "ratePerBag": 5.0,
  "address": "Near Railway Station",
  "notes": "Night shift worker"
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Employee added successfully",
  "data": {
    "id": "emp_1791264000000",
    "name": "Kailash",
    "mobile": "9876543215",
    "ratePerBag": 5,
    "isActive": true,
    "address": "Near Railway Station",
    "notes": "Night shift worker",
    "createdAt": "2026-10-06T05:00:00.000Z"
  }
}
```

---

### 4.3 Update Employee
- **Endpoint:** `PUT /employees/:id`
- **Auth Required:** Yes

#### Request Body:
```json
{
  "name": "Kailash Kumar",
  "mobile": "9876543215",
  "ratePerBag": 5.5,
  "isActive": true,
  "address": "Updated Address",
  "notes": "Special rate applied"
}
```

---

### 4.4 Delete Employee
- **Endpoint:** `DELETE /employees/:id`
- **Auth Required:** Yes

---

## 5. Daily Work Entries API (`/work-entries`)

### 5.1 List Work Entries
- **Endpoint:** `GET /work-entries`
- **Auth Required:** Yes
- **Query Parameters:**
  - `date` *(optional)*: `YYYY-MM-DD`
  - `employeeId` *(optional)*: Filter by worker ID
  - `startDate` *(optional)*: Range start `YYYY-MM-DD`
  - `endDate` *(optional)*: Range end `YYYY-MM-DD`
  - `page` *(optional, default: 1)*: Page number
  - `limit` *(optional, default: 20)*: Page limit

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "w_1791262503534",
      "employeeId": "emp_1",
      "employeeName": "Ramesh",
      "date": "2026-10-06",
      "bagCount": 150,
      "ratePerBag": 5,
      "totalAmount": 750,
      "time": null,
      "notes": "Morning shift"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 1
  }
}
```

---

### 5.2 Add Work Entry
Records the number of gunny bags produced by a worker.
- **Endpoint:** `POST /work-entries`
- **Auth Required:** Yes

#### Request Body:
*(Accepts either `bagCount`, `bagsCompleted`, or `bagsCount` for maximum client compatibility)*
```json
{
  "employeeId": "emp_1",
  "date": "2026-10-06",
  "bagCount": 150,
  "ratePerBag": 5.0,
  "time": "10:30 AM",
  "notes": "Morning shift"
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Work entry added successfully",
  "data": {
    "id": "w_1791262503534",
    "employeeId": "emp_1",
    "employeeName": "Ramesh",
    "date": "2026-10-06",
    "bagCount": 150,
    "ratePerBag": 5,
    "totalAmount": 750,
    "time": "10:30 AM",
    "notes": "Morning shift",
    "createdAt": "2026-10-06T04:55:03.551Z"
  }
}
```

---

### 5.3 Update Work Entry
- **Endpoint:** `PUT /work-entries/:id`
- **Auth Required:** Yes

#### Request Body:
```json
{
  "bagCount": 160,
  "ratePerBag": 5.0,
  "date": "2026-10-06",
  "time": "10:45 AM",
  "notes": "Updated recount"
}
```

---

### 5.4 Delete Work Entry
- **Endpoint:** `DELETE /work-entries/:id`
- **Auth Required:** Yes

---

## 6. Payouts & Advances API (`/payouts`)

### 6.1 List Payouts
- **Endpoint:** `GET /payouts`
- **Auth Required:** Yes
- **Query Parameters:**
  - `employeeId` *(optional)*: Filter by worker ID
  - `startDate` *(optional)*: `YYYY-MM-DD`
  - `endDate` *(optional)*: `YYYY-MM-DD`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Operation successful",
  "data": [
    {
      "id": "p_1791262510156",
      "employeeId": "emp_1",
      "employeeName": "Ramesh",
      "date": "2026-10-06",
      "payoutAmount": 500,
      "pendingBeforePayout": 750,
      "remainingAmount": 250,
      "paymentMode": "CASH",
      "referenceNote": "Weekly advance",
      "createdAt": "2026-10-06T04:55:10.000Z"
    }
  ]
}
```

---

### 6.2 Record a Payout / Advance
Records money paid to a worker and automatically calculates previous and remaining balances.
- **Endpoint:** `POST /payouts`
- **Auth Required:** Yes

#### Request Body:
*(Accepts either `payoutAmount` or `amount`)*
```json
{
  "employeeId": "emp_1",
  "date": "2026-10-06",
  "payoutAmount": 500,
  "paymentMode": "CASH",
  "referenceNote": "Weekly advance payment"
}
```
*Allowed `paymentMode` values: `CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`*

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Payout recorded successfully",
  "data": {
    "id": "p_1791262510156",
    "employeeId": "emp_1",
    "employeeName": "Ramesh",
    "date": "2026-10-06",
    "payoutAmount": 500,
    "remainingAmount": 250,
    "paymentMode": "CASH",
    "referenceNote": "Weekly advance payment",
    "createdAt": "2026-10-06T04:55:10.170Z"
  }
}
```

---

### 6.3 Delete / Revert Payout
- **Endpoint:** `DELETE /payouts/:id`
- **Auth Required:** Yes

---

## 7. System Health Endpoint

### 7.1 Server Health Check
- **Endpoint:** `GET /health`
- **Auth Required:** No

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Gunny Bags Manager API is running",
  "version": "1.0.0",
  "timestamp": "2026-10-06T04:53:25.541Z"
}
```

---

## 8. Super Admin Platform APIs (Multi-Tenant Control)

> **Authorization:** All admin endpoints require Bearer JWT where the authenticated user has `role = 'SUPER_ADMIN'` or a mobile number defined in `SUPER_ADMIN_MOBILES` (e.g. `9876543210`). Regular tenants receive `403 Forbidden`.

### 8.1 Platform-Wide KPIs
- **Endpoint:** `GET /api/v1/admin/stats`
- **Description:** Returns real-time aggregate statistics across all registered businesses, total workers, total bags manufactured, total wages earned, payouts made, and total pending payouts.

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "totalTenants": 1,
    "activeTenants": 1,
    "newTenantsToday": 1,
    "totalWorkers": 4,
    "activeWorkers": 3,
    "totalBagsCompleted": 350,
    "totalWorkAmount": 1750,
    "totalPayouts": 500,
    "totalPendingPayout": 1250,
    "totalEntries": 2
  }
}
```

---

### 8.2 List All Registered Businesses / Tenants
- **Endpoint:** `GET /api/v1/admin/users`
- **Query Parameters:**
  - `search` (optional): Filter by tenant name, business name, or mobile.
  - `status` (optional): `active` | `inactive`.
  - `page` (optional, default `1`).
  - `limit` (optional, default `20`).

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "usr_1791448819918",
      "name": "Om Patel",
      "businessName": "Patel Gunny Traders",
      "mobile": "9988776655",
      "countryCode": "+91",
      "role": "OWNER",
      "isActive": true,
      "workerCount": 1,
      "totalBags": 0,
      "totalAmount": 0,
      "totalPaid": 0,
      "pendingAmount": 0,
      "createdAt": "2026-10-08T08:40:19.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 1
  }
}
```

---

### 8.3 Tenant Drill-Down & Audit
- **Endpoint:** `GET /api/v1/admin/users/:userId`
- **Description:** Returns complete factory details for a specific tenant: their profile, summary totals, their workers list with bags made and earnings, recent 10 work entries, and recent 10 payouts.

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "tenant": {
      "id": "usr_1791448819918",
      "name": "Om Patel",
      "businessName": "Patel Gunny Traders",
      "mobile": "9988776655",
      "countryCode": "+91",
      "role": "OWNER",
      "isActive": true,
      "createdAt": "2026-10-08T08:40:19.000Z"
    },
    "stats": {
      "workerCount": 1,
      "totalBags": 0,
      "totalEarned": 0,
      "totalPaid": 0,
      "pendingAmount": 0
    },
    "workers": [
      {
        "id": "emp_1791448851410",
        "name": "Kailash Worker",
        "mobile": "9123456789",
        "ratePerBag": 6,
        "isActive": true,
        "address": "Factory Room 3",
        "totalBags": 0,
        "totalEarned": 0,
        "createdAt": "2026-10-08T08:40:51.000Z"
      }
    ],
    "recentWork": [],
    "recentPayouts": []
  }
}
```

---

### 8.4 Suspend / Reactivate Tenant Account
- **Endpoint:** `PATCH /api/v1/admin/users/:userId/status`
- **Body:**
```json
{
  "isActive": false
}
```
- **Description:** Toggles active/suspended state. If suspended (`isActive: false`), all active JWT refresh tokens and login sessions for this tenant are immediately revoked, blocking access.

---

## 9. cURL Testing Guide for Developers

### Step 1: Send OTP
```bash
curl -X POST http://localhost:5050/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","countryCode":"+91"}'
```

### Step 2: Verify OTP and Copy Token
```bash
curl -X POST http://localhost:5050/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","countryCode":"+91","otp":"123456","sessionId":"<SESSION_ID_FROM_STEP_1>"}'
```

### Step 3: Fetch Dashboard Summary
```bash
curl -X GET "http://localhost:5050/api/v1/dashboard/summary?date=2026-10-06" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Step 4: Add Work Entry
```bash
curl -X POST http://localhost:5050/api/v1/work-entries \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"emp_1","date":"2026-10-06","bagCount":150,"ratePerBag":5.0,"notes":"Morning shift"}'
```

### Step 5: Record Payout
```bash
curl -X POST http://localhost:5050/api/v1/payouts \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"emp_1","date":"2026-10-06","payoutAmount":500,"paymentMode":"CASH","referenceNote":"Cash advance"}'
```
