# 🎒 Gunny Bags Manager

Full-stack application to manage daily gunny bag production workers, track work entries, and process payouts.

## Project Structure

```
guni_bags/
├── backend/          # Node.js + Express REST API
│   ├── src/
│   │   ├── config/   # DB config & SQL schema
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   └── .env
│
├── dashboard/        # Next.js Web Dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── lib/      # API client (axios)
│   │   └── pages/
│   └── .env.local
│
└── setup-db.sh       # One-click database setup
```

## Quick Start

### 1. Start MySQL
```bash
sudo systemctl start mysql
```

### 2. Setup Database
```bash
bash setup-db.sh
# OR manually:
mysql -u root < backend/src/config/schema.sql
```

### 3. Configure Backend
Edit `backend/.env`:
```env
DB_USER=root
DB_PASSWORD=your_mysql_password   # change this
DB_NAME=guni_bags_db
JWT_SECRET=your_secret_key
```

### 4. Start Backend API
```bash
cd backend
npm start
# API runs at: http://localhost:5050/api/v1
```

### 5. Start Dashboard
```bash
cd dashboard
npm run dev
# Dashboard at: http://localhost:3000
```

## Login (Dev Mode)

- **Mobile:** `9876543210`
- **OTP:** `123456` (fixed in dev mode — check backend console)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/send-otp` | Send OTP to mobile |
| POST | `/auth/verify-otp` | Verify OTP & get tokens |
| POST | `/auth/resend-otp` | Resend OTP |
| POST | `/auth/refresh-token` | Refresh access token |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Logout |
| GET | `/employees` | List all employees |
| POST | `/employees` | Add employee |
| GET | `/employees/:id` | Get employee details |
| PUT | `/employees/:id` | Update employee |
| DELETE | `/employees/:id` | Deactivate employee |
| GET | `/work-entries` | List work entries (with filters) |
| POST | `/work-entries` | Add work entry |
| PUT | `/work-entries/:id` | Update work entry |
| DELETE | `/work-entries/:id` | Delete work entry |
| GET | `/payouts` | List payouts |
| POST | `/payouts` | Record payout |
| DELETE | `/payouts/:id` | Revert payout |
| GET | `/dashboard/summary` | Dashboard metrics |
| GET | `/reports/daily` | Daily work report |
| GET | `/reports/employee/:id` | Employee ledger |

## Dashboard Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Live stats, charts, today's entries |
| Employees | `/employees` | CRUD for workers |
| Work Entries | `/work-entries` | Daily bag entry management |
| Payouts | `/payouts` | Payment recording |
| Reports | `/reports` | Daily & employee-wise reports |

## Tech Stack

- **Backend:** Node.js, Express.js, MySQL2, JWT, bcryptjs
- **Frontend:** Next.js, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Database:** MySQL 8.0
