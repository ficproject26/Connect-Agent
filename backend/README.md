# Forge Connect — Backend

Node.js + Express + TypeScript backend for the Forge Connect platform.

## Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB (via Mongoose)
- **Auth:** JWT (jsonwebtoken) + bcryptjs

## Folder Structure

```
src/
├── server.ts          ← Entry point — connects MongoDB + starts Express server
├── app.ts             ← Express app setup (routes, middleware, CORS)
│
├── config/            ← DB connection, env loader
├── models/            ← Mongoose schemas (User, Order, Job, Wallet, etc.)
├── routes/            ← Express route files per domain
├── controllers/       ← Business logic handlers
├── middleware/        ← JWT auth guard, role guard, error handler
└── services/          ← OTP, JWT utils, wallet calculations
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Make sure MongoDB is running locally
mongod

# 4. Start dev server
npm run dev
# → API running at http://localhost:4000
```

## API Base URL
```
http://localhost:4000/api
```

## Key Endpoints (to be implemented)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Login → JWT token |
| POST | /auth/register | Partner/technician signup |
| GET | /auth/me | Get current user |
| GET | /orders | List available delivery orders |
| GET | /jobs | List technician jobs |
| GET | /wallet | Wallet balance + transactions |
| GET | /executive/verifications | Pending partner approvals |

## Frontend
The frontend lives in `../Connect Delivery app/` and runs on port `5173`.
