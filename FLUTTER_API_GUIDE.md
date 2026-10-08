# 📱 Gunny Bags Mobile App - REST API Specification

This document provides the complete backend REST API specification for mobile app developers.

---

## 1. Global API Configuration

### 1.1 Base URLs

| Environment | Base URL | Description |
|---|---|---|
| **Local (Android Emulator)** | `http://10.0.2.2:5050/api/v1` | Direct alias to host computer's localhost |
| **Local (iOS Simulator)** | `http://localhost:5050/api/v1` | Local loopback |
| **Local (Physical Device / Wi-Fi)** | `http://<SERVER_LAN_IP>:5050/api/v1` | Your workstation's Wi-Fi IP (e.g. `192.168.1.15:5050`) |
| **Production Server** | `https://api.yourdomain.com/api/v1` | Live production HTTPS domain |

---

### 1.2 Common HTTP Headers

| Header | Value | Required On | Description |
|---|---|---|---|
| `Content-Type` | `application/json` | POST, PUT, PATCH | Request body encoding |
| `Accept` | `application/json` | All Requests | Expected response format |
| `Authorization` | `Bearer <ACCESS_TOKEN>` | Protected Endpoints | JWT Bearer token obtained from `/auth/verify-otp` |

---

### 1.3 Standard Response Formats

#### ✅ Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

#### ❌ Error Response (`400`, `401`, `403`, `404`, `500`)
```json
{
  "success": false,
  "message": "Human readable error description",
  "error": {
    "code": "VALIDATION_ERROR | INVALID_OTP | EXPIRED_OTP | NOT_FOUND | UNAUTHORIZED | SERVER_ERROR",
    "details": null
  }
}
```

---

## 2. Authentication & Onboarding APIs (`/auth`)

### 2.1 Send Login OTP
Sends an OTP SMS to the user's mobile number.
* **Method:** `POST`
* **Endpoint:** `/auth/send-otp`
* **Auth Required:** `No`

#### Request Body:
```json
{
  "mobile": "9876543210",
  "countryCode": "+91"
}
```
| Field | Type | Required | Description |
|---|---|---|---|
| `mobile` | String | Yes | 10-digit mobile number |
| `countryCode` | String | No | Country dialing code (defaults to `+91`) |

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "OTP sent successfully to +91 9876543210",
  "data": {
    "sessionId": "sess_89f0a2c31e4",
    "expiresInSeconds": 300,
    "resendCooldownSeconds": 60,
    "isNewUser": false
  }
}
```

> 💡 **Development Note:** In local/development mode, use the Master OTP: `123456`.

---

### 2.2 Verify OTP & Log In
Validates the entered OTP code and returns the JWT access token and user profile.
* **Method:** `POST`
* **Endpoint:** `/auth/verify-otp`
* **Auth Required:** `No`

#### Request Body:
```json
{
  "mobile": "9876543210",
  "otp": "123456",
  "sessionId": "sess_89f0a2c31e4",
  "countryCode": "+91"
}
```
| Field | Type | Required | Description |
|---|---|---|---|
| `mobile` | String | Yes | 10-digit mobile number |
| `otp` | String | Yes | 6-digit numeric OTP code |
| `sessionId` | String | Yes | Session ID received from `/auth/send-otp` |
| `countryCode` | String | No | Country code (defaults to `+91`) |

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_94e2b01a",
      "name": "Om Patel",
      "mobile": "9876543210",
      "businessName": "Patel Gunny Bags Traders",
      "role": "OWNER",
      "isActive": true
    }
  }
}
```

---

### 2.3 Resend OTP
Resends an OTP if the previous one expired or was not received.
* **Method:** `POST`
* **Endpoint:** `/auth/resend-otp`
* **Auth Required:** `No`

#### Request Body:
```json
{
  "mobile": "9876543210",
  "sessionId": "sess_89f0a2c31e4"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "OTP resent successfully",
  "data": {
    "sessionId": "sess_89f0a2c31e4",
    "expiresInSeconds": 300,
    "resendCooldownSeconds": 60
  }
}
```

---

### 2.4 Register New Business Tenant
Creates a new independent business tenant account on the platform.
* **Method:** `POST`
* **Endpoint:** `/auth/register`
* **Auth Required:** `No`

#### Request Body:
```json
{
  "name": "Om Patel",
  "mobile": "9988776655",
  "businessName": "Patel Gunny Bags",
  "countryCode": "+91"
}
```
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Owner / contact full name |
| `mobile` | String | Yes | 10-digit unique mobile number |
| `businessName` | String | Yes | Factory / trading business name |
| `countryCode` | String | No | Defaults to `+91` |

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Account registered! OTP sent to +91 9988776655",
  "data": {
    "sessionId": "sess_1a2b3c4d",
    "expiresInSeconds": 300,
    "resendCooldownSeconds": 60,
    "isNewUser": true
  }
}
```

---

### 2.5 Get Current Profile
* **Method:** `GET`
* **Endpoint:** `/auth/me`
* **Auth Required:** `Yes` (`Authorization: Bearer <token>`)

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "usr_94e2b01a",
    "name": "Om Patel",
    "mobile": "9876543210",
    "businessName": "Patel Gunny Bags Traders",
    "role": "OWNER",
    "isActive": true
  }
}
```

---

## 3. Dashboard APIs (`/dashboard`)

### 3.1 Get Dashboard Summary KPIs
Returns the top-level cards for the mobile dashboard.
* **Method:** `GET`
* **Endpoint:** `/dashboard/summary`
* **Auth Required:** `Yes`

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "totalWorkers": 18,
    "activeToday": 12,
    "totalBagsToday": 1850,
    "todayPayable": 9250.00,
    "pendingWages": 34800.00
  }
}
```
| Response Field | Type | Description |
|---|---|---|
| `totalWorkers` | Integer | Total registered active workers in this business |
| `activeToday` | Integer | Number of distinct workers who had bags logged today |
| `totalBagsToday` | Integer | Total bags stitched / handled across all workers today |
| `todayPayable` | Float (₹) | Total wages earned today (`totalBagsToday * rate`) |
| `pendingWages` | Float (₹) | Net unpaid pending balance owed across all workers |

---

### 3.2 Get Recent Activity
Returns the latest work entries and payouts feed.
* **Method:** `GET`
* **Endpoint:** `/dashboard/recent-activity`
* **Auth Required:** `Yes`

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "recentEntries": [
      {
        "id": "we_01",
        "employeeName": "Ramesh Kumar",
        "bagCount": 150,
        "totalAmount": 750.00,
        "date": "2026-10-08",
        "time": "14:30"
      }
    ],
    "recentPayouts": [
      {
        "id": "po_01",
        "employeeName": "Suresh Patel",
        "payoutAmount": 3000.00,
        "paymentMode": "CASH",
        "date": "2026-10-08"
      }
    ]
  }
}
```

---

## 4. Workers / Employees APIs (`/employees`)

### 4.1 List All Workers
* **Method:** `GET`
* **Endpoint:** `/employees`
* **Auth Required:** `Yes`

#### Query Parameters:
| Parameter | Type | Required | Description |
|---|---|---|---|
| `isActive` | Boolean | No | Filter by active status: `true` or `false` |
| `search` | String | No | Search query matching worker name or mobile |

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "emp_01",
      "name": "Ramesh Kumar",
      "mobile": "9876543210",
      "ratePerBag": 5.00,
      "isActive": true,
      "address": "Market Yard, Shop 4",
      "notes": "Night shift specialist",
      "totalBags": 1420,
      "totalEarned": 7100.00,
      "totalPaid": 5000.00,
      "pendingAmount": 2100.00,
      "createdAt": "2026-10-01T08:30:00.000Z"
    }
  ]
}
```

---

### 4.2 Add New Worker
* **Method:** `POST`
* **Endpoint:** `/employees`
* **Auth Required:** `Yes`

#### Request Body:
```json
{
  "name": "Ramesh Kumar",
  "mobile": "9876543210",
  "ratePerBag": 5.00,
  "isActive": true,
  "address": "Plot 12, GIDC Industrial Estate",
  "notes": "Machine operator"
}
```
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | **Yes** | Worker full name |
| `mobile` | String | No | 10-digit mobile number |
| `ratePerBag` | Float | No | Piece rate per bag in ₹ (defaults to `5.0`) |
| `isActive` | Boolean | No | Status flag (defaults to `true`) |
| `address` | String | No | Street address / village |
| `notes` | String | No | Remarks or role description |

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "id": "emp_01",
    "name": "Ramesh Kumar",
    "mobile": "9876543210",
    "ratePerBag": 5.00,
    "isActive": true,
    "address": "Plot 12, GIDC Industrial Estate",
    "notes": "Machine operator"
  }
}
```

---

### 4.3 Update Worker
* **Method:** `PUT`
* **Endpoint:** `/employees/:id`
* **Auth Required:** `Yes`

#### Request Body:
```json
{
  "name": "Ramesh Kumar",
  "mobile": "9876543210",
  "ratePerBag": 5.50,
  "isActive": true,
  "address": "Plot 12, GIDC Industrial Estate",
  "notes": "Promoted to Senior Sticher"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "id": "emp_01",
    "name": "Ramesh Kumar",
    "mobile": "9876543210",
    "ratePerBag": 5.50,
    "isActive": true
  }
}
```

---

### 4.4 Deactivate / Delete Worker
Soft-deactivates the employee (`is_active = false`).
* **Method:** `DELETE`
* **Endpoint:** `/employees/:id`
* **Auth Required:** `Yes`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Employee deactivated successfully"
}
```

---

### 4.5 Get Worker Profile & Ledger Stats
* **Method:** `GET`
* **Endpoint:** `/employees/:id`
* **Auth Required:** `Yes`

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "emp_01",
    "name": "Ramesh Kumar",
    "mobile": "9876543210",
    "ratePerBag": 5.00,
    "isActive": true,
    "address": "Market Yard",
    "notes": "",
    "stats": {
      "totalBags": 1420,
      "totalEarned": 7100.00,
      "totalPaid": 5000.00,
      "pendingAmount": 2100.00
    }
  }
}
```

---

## 5. Daily Work Entries APIs (`/work-entries`)

Used to record how many bags each worker stitched or packed on a given day.

### 5.1 List Work Entries
* **Method:** `GET`
* **Endpoint:** `/work-entries`
* **Auth Required:** `Yes`

#### Query Parameters:
| Parameter | Type | Required | Description |
|---|---|---|---|
| `date` | String | No | Exact date in `YYYY-MM-DD` format |
| `employeeId` | String | No | Filter entries for a specific worker |
| `startDate` | String | No | Date range start `YYYY-MM-DD` |
| `endDate` | String | No | Date range end `YYYY-MM-DD` |
| `page` | Integer | No | Page number (defaults to `1`) |
| `limit` | Integer | No | Page limit (defaults to `20`) |

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "we_01",
      "employeeId": "emp_01",
      "employeeName": "Ramesh Kumar",
      "date": "2026-10-08",
      "bagCount": 150,
      "ratePerBag": 5.00,
      "totalAmount": 750.00,
      "time": "14:30",
      "notes": "Lot A batch"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 98
  }
}
```

---

### 5.2 Add Daily Work Entry (Log Bags)
* **Method:** `POST`
* **Endpoint:** `/work-entries`
* **Auth Required:** `Yes`

#### Request Body:
```json
{
  "employeeId": "emp_01",
  "date": "2026-10-08",
  "bagCount": 150,
  "ratePerBag": 5.00,
  "time": "14:30",
  "notes": "Standard 50kg gunny bags"
}
```
| Field | Type | Required | Description |
|---|---|---|---|
| `employeeId` | String | **Yes** | Target worker's ID |
| `date` | String | **Yes** | Work date in `YYYY-MM-DD` format |
| `bagCount` | Integer | **Yes** | Number of bags completed (must be > 0) |
| `ratePerBag` | Float | No | Custom rate for this entry (defaults to worker's base rate) |
| `time` | String | No | Time of logging (e.g. `14:30`) |
| `notes` | String | No | Batch number, lot, or comments |

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Work entry recorded successfully",
  "data": {
    "id": "we_01",
    "employeeId": "emp_01",
    "date": "2026-10-08",
    "bagCount": 150,
    "ratePerBag": 5.00,
    "totalAmount": 750.00,
    "notes": "Standard 50kg gunny bags"
  }
}
```

---

### 5.3 Update Work Entry
* **Method:** `PUT`
* **Endpoint:** `/work-entries/:id`
* **Auth Required:** `Yes`

#### Request Body:
```json
{
  "bagCount": 160,
  "ratePerBag": 5.00,
  "date": "2026-10-08",
  "notes": "Corrected bag count"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Work entry updated successfully"
}
```

---

### 5.4 Delete Work Entry
* **Method:** `DELETE`
* **Endpoint:** `/work-entries/:id`
* **Auth Required:** `Yes`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Work entry deleted successfully"
}
```

---

## 6. Wage Payouts APIs (`/payouts`)

Used to record cash, UPI, or bank wage settlements to workers.

### 6.1 List Payout History
* **Method:** `GET`
* **Endpoint:** `/payouts`
* **Auth Required:** `Yes`

#### Query Parameters:
| Parameter | Type | Required | Description |
|---|---|---|---|
| `employeeId` | String | No | Filter by specific worker |
| `startDate` | String | No | `YYYY-MM-DD` |
| `endDate` | String | No | `YYYY-MM-DD` |

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "po_01",
      "employeeId": "emp_01",
      "employeeName": "Ramesh Kumar",
      "date": "2026-10-08",
      "payoutAmount": 3000.00,
      "pendingBeforePayout": 5100.00,
      "remainingAmount": 2100.00,
      "paymentMode": "CASH",
      "referenceNote": "Weekly advance payment",
      "createdAt": "2026-10-08T10:15:00.000Z"
    }
  ]
}
```

---

### 6.2 Record Worker Payout
* **Method:** `POST`
* **Endpoint:** `/payouts`
* **Auth Required:** `Yes`

#### Request Body:
```json
{
  "employeeId": "emp_01",
  "date": "2026-10-08",
  "payoutAmount": 3000.00,
  "paymentMode": "CASH",
  "referenceNote": "Weekly advance"
}
```
| Field | Type | Required | Allowed Values / Description |
|---|---|---|---|
| `employeeId` | String | **Yes** | Worker ID |
| `date` | String | **Yes** | Payment date `YYYY-MM-DD` |
| `payoutAmount` | Float | **Yes** | Amount paid in ₹ (must be > 0) |
| `paymentMode` | String | No | `CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE` (default: `CASH`) |
| `referenceNote` | String | No | Note or transaction UTR reference |

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Payout recorded successfully",
  "data": {
    "id": "po_01",
    "employeeId": "emp_01",
    "payoutAmount": 3000.00,
    "pendingBeforePayout": 5100.00,
    "remainingAmount": 2100.00,
    "paymentMode": "CASH",
    "date": "2026-10-08"
  }
}
```

---

### 6.3 Revert / Delete Payout
Reverts the recorded payout and automatically restores the pending wage balance.
* **Method:** `DELETE`
* **Endpoint:** `/payouts/:id`
* **Auth Required:** `Yes`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Payout deleted and pending balance restored"
}
```

---

## 7. Error Codes Reference

| HTTP Status | Error Code | Description | Recommended App Action |
|---|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing or invalid required fields | Display validation message under input |
| `401` | `UNAUTHORIZED` | Missing or expired JWT token | Clear saved token and route to Mobile Login Screen |
| `401` | `INVALID_OTP` | Incorrect 6-digit OTP code entered | Prompt user to re-enter OTP |
| `401` | `EXPIRED_OTP` | OTP session expired (> 5 mins) | Prompt user to click "Resend OTP" |
| `403` | `ACCOUNT_INACTIVE` | Account suspended or worker inactive | Display contact admin notice |
| `404` | `NOT_FOUND` | Worker, work entry, or payout ID not found | Refresh the list view |
| `429` | `TOO_MANY_REQUESTS` | Rate limited (e.g. resend OTP cooldown) | Display countdown timer |
| `500` | `SERVER_ERROR` | Internal server exception | Show generic "Please try again later" toast |
