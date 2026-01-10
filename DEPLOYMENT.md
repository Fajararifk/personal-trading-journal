# Deployment Guide

## Prerequisites

1. GitHub account
2. Neon or Supabase account (free PostgreSQL)
3. Render account (free backend hosting)
4. Cloudflare account (free frontend hosting)

## Step 1: Create GitHub Repository

```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/personal-trading-journal-analytics.git
git push -u origin main
```

## Step 2: Setup Database (Neon - Free)

1. Go to https://neon.tech and create account
2. Create new project
3. Copy the connection string (looks like: `postgresql://user:pass@host/db?sslmode=require`)

## Step 3: Deploy Backend (Render - Free)

1. Go to https://render.com
2. Connect your GitHub account
3. Create new "Web Service"
4. Select the repository
5. Configure:
   - **Name**: trading-journal-api
   - **Root Directory**: backend
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `npm start`
   
6. Add Environment Variables:
   ```
   DATABASE_URL=your_neon_connection_string
   JWT_SECRET=your-super-secret-key-min-32-chars
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://your-frontend-url.pages.dev
   NODE_ENV=production
   ```

7. Deploy!

## Step 4: Deploy Frontend (Cloudflare Pages - Free)

1. Go to https://pages.cloudflare.com
2. Connect your GitHub account
3. Create new project from repository
4. Configure:
   - **Project name**: trading-journal
   - **Production branch**: main
   - **Root directory**: frontend
   - **Build command**: `npm install && npm run build`
   - **Build output directory**: dist
   
5. Add Environment Variable:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```

6. Deploy!

## Step 5: Update CORS

After frontend is deployed, update backend's `FRONTEND_URL` environment variable with the Cloudflare Pages URL.

## Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database URL
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env if needed
npm run dev
```

## Database Migrations

```bash
cd backend
npx prisma migrate dev --name your_migration_name
```

## Troubleshooting

### CORS Issues
Make sure `FRONTEND_URL` in backend matches your frontend URL exactly.

### Database Connection
Ensure `?sslmode=require` is in your DATABASE_URL for Neon/Supabase.

### Build Failures
Check that all dependencies are in `dependencies` (not `devDependencies`) for production.
