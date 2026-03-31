# BulkMap - Phase 1 MVP

BulkMap is a solver-first nutrition planning app for gym-goers who care about budget and nutrient coverage.
This Phase 1 build includes a premium landing page, onboarding flow UI, realistic demo results, and a basic user dashboard.

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui primitives

## Current Routes

- `/` - marketing landing page
- `/onboarding` - multi-step onboarding wizard (demo state)
- `/results` - realistic demo results dashboard
- `/dashboard` - saved plans and quick actions

## Project Structure

- `app` - route pages
- `components/marketing` - landing page sections
- `components/onboarding` - onboarding wizard UI
- `components/results` - result cards, bars, tables, substitutions
- `components/dashboard` - dashboard cards
- `lib/data` - seeded demo data
- `lib/types` - shared TypeScript domain types

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open:

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/onboarding](http://localhost:3000/onboarding)
- [http://localhost:3000/results](http://localhost:3000/results)
- [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Notes

- Data is mock/seeded for Phase 1 UI development.
- Optimization engine, persistence, auth, and Supabase integration are planned for Phase 2.
