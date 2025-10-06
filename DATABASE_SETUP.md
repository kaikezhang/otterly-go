# Database Setup Guide

This guide walks you through setting up PostgreSQL for OtterlyGo (Milestone 1.2).

## Overview

OtterlyGo uses **PostgreSQL** with **Prisma ORM** for data persistence. The database stores:
- **Users**: Account information (email, password hash, subscription tier)
- **Trips**: Trip itineraries with full JSON data
- **Conversations**: Chat history associated with trips

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ (local or hosted)
- Completed Milestone 1.1 (backend API proxy)

## Setup Options

Choose one of the following database hosting options:

### Option 1: Local PostgreSQL (Development)

**Install PostgreSQL:**

```bash
# macOS (via Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt-get install postgresql-16
sudo systemctl start postgresql

# Windows
# Download installer from https://www.postgresql.org/download/windows/
```

**Create database:**

```bash
# Connect to PostgreSQL
psql postgres

# In psql shell:
CREATE DATABASE otterly_go;
CREATE USER otterly_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE otterly_go TO otterly_user;
\q
```

**Update `.env`:**

```bash
DATABASE_URL="postgresql://otterly_user:your_secure_password@localhost:5432/otterly_go"
```

### Option 2: Supabase (Free Tier Available)

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings** → **Database**
4. Copy the **Connection String** (URI format)
5. Update `.env`:

```bash
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Option 3: Railway (Free $5/month credit)

1. Sign up at [railway.app](https://railway.app)
2. Create a new project
3. Add **PostgreSQL** from the service catalog
4. Click on the PostgreSQL service → **Variables**
5. Copy the `DATABASE_URL` value
6. Update `.env`:

```bash
DATABASE_URL="postgresql://postgres:password@containers-us-west-xyz.railway.app:1234/railway"
```

### Option 4: Render (Free PostgreSQL)

1. Sign up at [render.com](https://render.com)
2. Create a **New PostgreSQL** instance
3. Copy the **Internal Database URL** from the instance page
4. Update `.env`:

```bash
DATABASE_URL="postgresql://user:password@dpg-xyz.render.com/database_name"
```

## Running Migrations

Once you have a database URL configured:

```bash
# Generate Prisma client (if not already done)
npx prisma generate

# Run migrations to create tables
npx prisma migrate deploy

# (Development only) Create migration with interactive prompts
npx prisma migrate dev
```

**Expected output:**

```
Applying migration `20251006_init`

The following migration(s) have been applied:

migrations/
  └─ 20251006_init/
    └─ migration.sql

✔ Generated Prisma Client
```

## Verify Database Connection

Test the database connection:

```bash
# Basic server health check
curl http://localhost:3001/health

# Database connection health check
curl http://localhost:3001/health/db
```

**Expected response:**

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-10-06T00:00:00.000Z"
}
```

If you get an error, check:
- Database server is running
- `DATABASE_URL` is correct in `.env`
- Firewall allows connections (for hosted databases)
- Migration has been applied

## Schema Overview

### Users Table

```sql
CREATE TABLE "users" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL
);
```

### Trips Table

```sql
CREATE TABLE "trips" (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  data_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL
);
```

### Conversations Table

```sql
CREATE TABLE "conversations" (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  messages_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL
);
```

## Connection Pooling

Prisma automatically manages connection pooling. For production, you can configure pooling via URL parameters:

```bash
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=10&pool_timeout=20"
```

For serverless environments (Vercel, Netlify Functions), consider using:
- **Prisma Data Proxy** (managed pooling)
- **PgBouncer** (external connection pooler)
- **Supabase Pooler** (built-in for Supabase projects)

## Troubleshooting

### Migration Fails

```bash
# Reset database (DANGER: deletes all data)
npx prisma migrate reset

# View pending migrations
npx prisma migrate status
```

### Connection Refused

- Check if PostgreSQL is running: `pg_isready`
- Verify port is accessible: `nc -zv localhost 5432`
- Check `.env` file exists and has `DATABASE_URL`

### SSL Required

Some hosted databases require SSL. Update your `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
```

## Next Steps

After database setup, proceed to:
- **Milestone 1.3**: Trip CRUD API (create, read, update, delete endpoints)
- Replace `localStorage` with database persistence
- Add user authentication (Milestone 2.1)

## Useful Commands

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Generate migration SQL without applying
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

## Security Best Practices

- ✅ Never commit `.env` to version control
- ✅ Use strong passwords for database users
- ✅ Enable SSL for production databases
- ✅ Restrict database access to application servers only
- ✅ Rotate database credentials regularly
- ✅ Use read replicas for analytics queries
- ✅ Set up automated backups (daily minimum)

## Cost Estimates

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| **Local** | Free | N/A |
| **Supabase** | 500MB free | $25/month (8GB) |
| **Railway** | $5 credit/month | Pay as you go |
| **Render** | 90 days free | $7/month (256MB) |
| **PlanetScale** | 5GB free | $29/month (10GB) |

---

**Milestone 1.2 Acceptance Criteria**: ✅ Database schema deployed and accessible from backend

For questions or issues, see [DEVELOPMENT.md](./DEVELOPMENT.md) roadmap.
