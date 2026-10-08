# 📱 Gunny Bags Mobile App - Flutter Developer Integration Guide

This guide is specifically written for Flutter developers to integrate the **Gunny Bags Manager REST API** into the Flutter Android/iOS application.

---

## 1. Network Configuration & Environment Setup

### 1.1 Base URLs

Depending on your development environment:

| Environment | Base URL | Notes |
|---|---|---|
| **Android Emulator** | `http://10.0.2.2:5050/api/v1` | `10.0.2.2` maps to `localhost` of the host computer |
| **iOS Simulator** | `http://localhost:5050/api/v1` | Runs on native host network |
| **Physical Device (WiFi)** | `http://192.168.x.x:5050/api/v1` | Replace with your computer's local IP address |
| **Production Server** | `https://api.yourdomain.com/api/v1` | Production HTTPS URL |

> ⚠️ **Android HTTP (Cleartext) Permission**:  
> For local HTTP testing on Android, ensure `<application android:usesCleartextTraffic="true" ...>` is set in `android/app/src/main/AndroidManifest.xml`.

---

## 2. Recommended Flutter Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter

  # Networking & HTTP
  dio: ^5.4.3+1

  # Secure Local Storage (for JWT tokens)
  flutter_secure_storage: ^9.0.0

  # State Management (Riverpod, Provider, or Bloc)
  flutter_riverpod: ^2.5.1

  # Date & Currency formatting
  intl: ^0.19.0

  # UI & Toast notifications
  fluttertoast: ^8.2.4
```

---

## 3. Standard Response Format

All backend API responses follow this consistent JSON structure:

### Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Invalid OTP code",
  "error": {
    "code": "INVALID_OTP",
    "details": null
  }
}
```

---

## 4. Complete Dart Models

### 4.1 User Model (`user_model.dart`)
```dart
class UserModel {
  final String id;
  final String name;
  final String mobile;
  final String businessName;
  final String role; // 'OWNER' or 'MANAGER'

  UserModel({
    required this.id,
    required this.name,
    required this.mobile,
    required this.businessName,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      mobile: json['mobile'] ?? '',
      businessName: json['businessName'] ?? '',
      role: json['role'] ?? 'OWNER',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'mobile': mobile,
    'businessName': businessName,
    'role': role,
  };
}
```

### 4.2 Employee / Worker Model (`employee_model.dart`)
```dart
class EmployeeModel {
  final String id;
  final String name;
  final String mobile;
  final double ratePerBag;
  final bool isActive;
  final String address;
  final String notes;
  final int totalBags;
  final double totalEarned;
  final double totalPaid;
  final double pendingAmount;

  EmployeeModel({
    required this.id,
    required this.name,
    required this.mobile,
    required this.ratePerBag,
    required this.isActive,
    required this.address,
    required this.notes,
    required this.totalBags,
    required this.totalEarned,
    required this.totalPaid,
    required this.pendingAmount,
  });

  factory EmployeeModel.fromJson(Map<String, dynamic> json) {
    return EmployeeModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      mobile: json['mobile'] ?? '',
      ratePerBag: (json['ratePerBag'] as num?)?.toDouble() ?? 5.0,
      isActive: json['isActive'] ?? true,
      address: json['address'] ?? '',
      notes: json['notes'] ?? '',
      totalBags: (json['totalBags'] as num?)?.toInt() ?? 0,
      totalEarned: (json['totalEarned'] as num?)?.toDouble() ?? 0.0,
      totalPaid: (json['totalPaid'] as num?)?.toDouble() ?? 0.0,
      pendingAmount: (json['pendingAmount'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
```

### 4.3 Work Entry Model (`work_entry_model.dart`)
```dart
class WorkEntryModel {
  final String id;
  final String employeeId;
  final String employeeName;
  final String date;
  final int bagCount;
  final double ratePerBag;
  final double totalAmount;
  final String time;
  final String notes;

  WorkEntryModel({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    required this.date,
    required this.bagCount,
    required this.ratePerBag,
    required this.totalAmount,
    required this.time,
    required this.notes,
  });

  factory WorkEntryModel.fromJson(Map<String, dynamic> json) {
    return WorkEntryModel(
      id: json['id'] ?? '',
      employeeId: json['employeeId'] ?? '',
      employeeName: json['employeeName'] ?? '',
      date: json['date'] ?? '',
      bagCount: (json['bagCount'] as num?)?.toInt() ?? 0,
      ratePerBag: (json['ratePerBag'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      time: json['time'] ?? '',
      notes: json['notes'] ?? '',
    );
  }
}
```

### 4.4 Payout Model (`payout_model.dart`)
```dart
class PayoutModel {
  final String id;
  final String employeeId;
  final String employeeName;
  final String date;
  final double payoutAmount;
  final double pendingBeforePayout;
  final double remainingAmount;
  final String paymentMode; // 'CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'
  final String referenceNote;
  final String createdAt;

  PayoutModel({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    required this.date,
    required this.payoutAmount,
    required this.pendingBeforePayout,
    required this.remainingAmount,
    required this.paymentMode,
    required this.referenceNote,
    required this.createdAt,
  });

  factory PayoutModel.fromJson(Map<String, dynamic> json) {
    return PayoutModel(
      id: json['id'] ?? '',
      employeeId: json['employeeId'] ?? '',
      employeeName: json['employeeName'] ?? '',
      date: json['date'] ?? '',
      payoutAmount: (json['payoutAmount'] as num?)?.toDouble() ?? 0.0,
      pendingBeforePayout: (json['pendingBeforePayout'] as num?)?.toDouble() ?? 0.0,
      remainingAmount: (json['remainingAmount'] as num?)?.toDouble() ?? 0.0,
      paymentMode: json['paymentMode'] ?? 'CASH',
      referenceNote: json['referenceNote'] ?? '',
      createdAt: json['createdAt'] ?? '',
    );
  }
}
```

### 4.5 Dashboard Summary Model (`dashboard_summary_model.dart`)
```dart
class DashboardSummaryModel {
  final int totalWorkers;
  final int activeToday;
  final int totalBagsToday;
  final double todayPayable;
  final double totalPendingWages;

  DashboardSummaryModel({
    required this.totalWorkers,
    required this.activeToday,
    required this.totalBagsToday,
    required this.todayPayable,
    required this.totalPendingWages,
  });

  factory DashboardSummaryModel.fromJson(Map<String, dynamic> json) {
    return DashboardSummaryModel(
      totalWorkers: (json['totalWorkers'] as num?)?.toInt() ?? 0,
      activeToday: (json['activeToday'] as num?)?.toInt() ?? 0,
      totalBagsToday: (json['totalBagsToday'] as num?)?.toInt() ?? 0,
      todayPayable: (json['todayPayable'] as num?)?.toDouble() ?? 0.0,
      totalPendingWages: (json['pendingWages'] ?? json['totalPendingWages'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
```

---

## 5. Network Service (`api_client.dart`)

This singleton sets up `Dio` with automatic token attachment:

```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late Dio dio;
  final storage = const FlutterSecureStorage();

  // Change this depending on whether testing on Emulator or Device:
  static const String baseUrl = 'http://10.0.2.2:5050/api/v1';

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Auto-attach Bearer token interceptor
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storage.read(key: 'access_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            // Token expired or invalid: handle logout or refresh
            await storage.deleteAll();
          }
          return handler.next(error);
        },
      ),
    );
  }
}
```

---

## 6. Complete API Methods & Endpoints

### 6.1 Authentication

#### 1. Request OTP for Login
* **Method:** `POST /auth/send-otp`
* **Request:**
```dart
Future<Map<String, dynamic>> sendOtp(String mobile) async {
  final response = await ApiClient().dio.post('/auth/send-otp', data: {
    'mobile': mobile,
    'countryCode': '+91',
  });
  // Returns: { success: true, data: { sessionId: "sess_xxx", expiresInSeconds: 300 } }
  return response.data['data'];
}
```

#### 2. Verify OTP & Log In
* **Method:** `POST /auth/verify-otp`
* **Request:**
```dart
Future<UserModel> verifyOtp({
  required String mobile,
  required String otp,
  required String sessionId,
}) async {
  final response = await ApiClient().dio.post('/auth/verify-otp', data: {
    'mobile': mobile,
    'otp': otp,
    'sessionId': sessionId,
  });

  final data = response.data['data'];
  final token = data['token'];
  final refreshToken = data['refreshToken'];

  // Save tokens securely
  final storage = ApiClient().storage;
  await storage.write(key: 'access_token', value: token);
  await storage.write(key: 'refresh_token', value: refreshToken);

  return UserModel.fromJson(data['user']);
}
```

#### 3. Register New Business Tenant
* **Method:** `POST /auth/register`
* **Request Body:**
```json
{
  "name": "Om Patel",
  "mobile": "9988776655",
  "businessName": "Patel Bags",
  "countryCode": "+91"
}
```

#### 4. Get Current Profile
* **Method:** `GET /auth/me`

---

### 6.2 Workers / Employees API

#### 1. Get All Workers
* **Method:** `GET /employees`
* **Query Params (Optional):** `?isActive=true&search=Ramesh`
```dart
Future<List<EmployeeModel>> getEmployees({bool? isActive, String? search}) async {
  final response = await ApiClient().dio.get('/employees', queryParameters: {
    if (isActive != null) 'isActive': isActive,
    if (search != null && search.isNotEmpty) 'search': search,
  });

  final list = response.data['data'] as List;
  return list.map((e) => EmployeeModel.fromJson(e)).toList();
}
```

#### 2. Add New Worker
* **Method:** `POST /employees`
```dart
Future<EmployeeModel> addEmployee({
  required String name,
  required String mobile,
  required double ratePerBag,
  String address = '',
  String notes = '',
}) async {
  final response = await ApiClient().dio.post('/employees', data: {
    'name': name,
    'mobile': mobile,
    'ratePerBag': ratePerBag,
    'address': address,
    'notes': notes,
    'isActive': true,
  });

  return EmployeeModel.fromJson(response.data['data']);
}
```

#### 3. Update Worker
* **Method:** `PUT /employees/:id`
```dart
Future<void> updateEmployee(String id, Map<String, dynamic> data) async {
  await ApiClient().dio.put('/employees/$id', data: data);
}
```

---

### 6.3 Daily Bag Work Entries API

#### 1. Get Daily Work Entries
* **Method:** `GET /work-entries`
* **Query Params:** `?date=2026-10-08` or `?employeeId=xxx&page=1&limit=50`
```dart
Future<List<WorkEntryModel>> getWorkEntries({String? date, String? employeeId}) async {
  final response = await ApiClient().dio.get('/work-entries', queryParameters: {
    if (date != null) 'date': date,
    if (employeeId != null) 'employeeId': employeeId,
  });

  final list = response.data['data'] as List;
  return list.map((e) => WorkEntryModel.fromJson(e)).toList();
}
```

#### 2. Add Work Entry (Log daily bags produced)
* **Method:** `POST /work-entries`
```dart
Future<WorkEntryModel> addWorkEntry({
  required String employeeId,
  required String date,       // e.g. "2026-10-08"
  required int bagCount,      // e.g. 150
  double? ratePerBag,         // optional, defaults to worker's set rate
  String? time,               // optional, e.g. "14:30"
  String notes = '',
}) async {
  final response = await ApiClient().dio.post('/work-entries', data: {
    'employeeId': employeeId,
    'date': date,
    'bagCount': bagCount,
    if (ratePerBag != null) 'ratePerBag': ratePerBag,
    if (time != null) 'time': time,
    'notes': notes,
  });

  return WorkEntryModel.fromJson(response.data['data']);
}
```

#### 3. Delete Work Entry
* **Method:** `DELETE /work-entries/:id`

---

### 6.4 Wage Payouts API

#### 1. Record Worker Payout
* **Method:** `POST /payouts`
```dart
Future<PayoutModel> recordPayout({
  required String employeeId,
  required String date,           // "2026-10-08"
  required double payoutAmount,   // 3000.00
  String paymentMode = 'CASH',   // 'CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'
  String referenceNote = '',      // e.g. "Weekly payment"
}) async {
  final response = await ApiClient().dio.post('/payouts', data: {
    'employeeId': employeeId,
    'date': date,
    'payoutAmount': payoutAmount,
    'paymentMode': paymentMode,
    'referenceNote': referenceNote,
  });

  return PayoutModel.fromJson(response.data['data']);
}
```

#### 2. Get Payout History
* **Method:** `GET /payouts`
* **Query Params:** `?employeeId=xxx&startDate=2026-10-01&endDate=2026-10-31`
```dart
Future<List<PayoutModel>> getPayouts({String? employeeId}) async {
  final response = await ApiClient().dio.get('/payouts', queryParameters: {
    if (employeeId != null) 'employeeId': employeeId,
  });

  final list = response.data['data'] as List;
  return list.map((e) => PayoutModel.fromJson(e)).toList();
}
```

---

### 6.5 Dashboard Summary API

* **Method:** `GET /dashboard/summary`
```dart
Future<DashboardSummaryModel> getDashboardSummary() async {
  final response = await ApiClient().dio.get('/dashboard/summary');
  return DashboardSummaryModel.fromJson(response.data['data']);
}
```

---

## 7. Recommended Mobile App Architecture

```
lib/
├── core/
│   ├── api/
│   │   ├── api_client.dart          // Dio instance & token interceptor
│   │   └── api_constants.dart       // Base URLs & endpoints
│   ├── theme/
│   │   └── app_colors.dart          // App palette
│   └── utils/
│       └── formatters.dart          // Currency & Date helpers (₹)
├── data/
│   ├── models/
│   │   ├── user_model.dart
│   │   ├── employee_model.dart
│   │   ├── work_entry_model.dart
│   │   └── payout_model.dart
│   └── repositories/
│       ├── auth_repository.dart
│       ├── employee_repository.dart
│       └── work_entry_repository.dart
└── presentation/
    ├── auth/
    │   ├── login_screen.dart        // Mobile input
    │   └── otp_screen.dart          // 6-digit OTP verification
    ├── dashboard/
    │   └── dashboard_screen.dart    // Top stats (Active today, bags, pending ₹)
    ├── employees/
    │   ├── employee_list_screen.dart
    │   └── add_employee_modal.dart
    ├── work_entries/
    │   ├── work_entries_screen.dart
    │   └── add_entry_bottom_sheet.dart
    └── payouts/
        └── record_payout_dialog.dart
```

---

## 8. Development Test Credentials

* **Dev Master OTP**: For any mobile number in development, use OTP: `123456`
* **Sample Test Worker**:
  * Name: `Ramesh Kumar`
  * Rate/Bag: `₹5.00`
