# 🎒 Gunny Bags Manager - REST API Documentation

**Version:** `1.0.0`  
**Protocol:** `HTTP / HTTPS`  
**Data Format:** `application/json`  
**Base URL (Local/Dev):** `http://localhost:5050/api/v1`  
**Base URL (Production):** `https://api.gunnybagsmanager.com/api/v1`  

---

## 1. Global Specifications

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

#### ❌ Error Response (`400`, `401`, `404`, `429`, `500`)
```json
{
  "success": false,
  "message": "Human readable error description",
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHORIZED | RATE_LIMIT_EXCEEDED | SERVER_ERROR",
    "details": "Additional context or field specifics"
  }
}
```

---

## 2. Authentication API (`/auth`)

### 2.1 Send OTP
Sends an OTP to the user's mobile number. In development mode, mock OTP is `123456`.
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

## 8. cURL Testing Guide for Developers

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
