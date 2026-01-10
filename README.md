# Personal Trading Journal & Analytics

A comprehensive trading journal application for tracking stock and crypto trades with advanced analytics.

## Features

- 📊 **Trade Tracking** - Log all your trades with detailed information
- 💰 **PnL Calculation** - Automatic profit/loss calculation (daily, weekly, monthly, yearly)
- 📈 **Performance Analytics** - Win rate, profit factor, max drawdown, equity curve
- 🧠 **Behavioral Analytics** - Detect overtrading, revenge trading, risk violations
- 🌙 **Dark Mode** - Modern dark theme by default

## Tech Stack

### Frontend
- React + Vite + TypeScript
- TailwindCSS + Shadcn/UI
- Recharts for data visualization

### Backend
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL (Neon)
- JWT Authentication

## Project Structure

```
├── frontend/          # React frontend application
├── backend/           # Express backend API
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon free tier)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Update DATABASE_URL in .env
npx prisma migrate dev
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Update VITE_API_URL in .env
npm run dev
```

## Deployment

- **Backend**: Render (free tier)
- **Frontend**: Cloudflare Pages (free tier)

## License

MIT

---

⚠️ **Disclaimer**: This app is for personal tracking only. It does NOT provide trading advice.
