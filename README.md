# QA Pulse

**BE/FE Lifecycle Tracking Tool**

A lightweight QA lifecycle tracker that separates phase-level visibility from detailed execution status across BE and FE testing.

## Features

- Project-scoped module tracking with BE/FE lifecycle phases
- Auto-derived phases from detailed status
- Dashboard with release readiness, charts, and metrics
- Global audit log for all actions
- Project management with member-based access control
- User management with bulk add and project assignment
- Email notifications (welcome email + password reset)
- Forced password reset on first login
- Role-based access (Admin / Member)

## Tech Stack

- **Frontend:** React + Vite + TypeScript + TailwindCSS + Recharts
- **Backend:** Node.js + Express + TypeScript + Prisma ORM
- **Database:** PostgreSQL

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- PostgreSQL running locally

### 1. Set up the database

```bash
createdb qa_pulse
```

### 2. Start the backend

```bash
cd backend
cp .env.example .env   # Edit with your values
npm install
npx prisma db push
npm run db:seed         # Creates admin user + demo project
npm run dev             # Starts on http://localhost:3001
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev             # Starts on http://localhost:5173
```

### 4. Login

Open http://localhost:5173 and login with:
- **Email:** admin@qapulse.com
- **Password:** admin123

## Production Deployment

The app is designed to run as a single service (backend serves frontend static files).

### Build

```bash
cd backend
npm install
npx prisma generate
npm run build:backend
cd ../frontend
npm install
npm run build
```

### Start

```bash
cd backend
NODE_ENV=production node dist/server.js
```

### Environment Variables

See `backend/.env.example` for all required variables.
