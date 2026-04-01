# Tasky - Project Management App

## Project Overview
A Next.js 15 project management app built for BubbleExport.com, demonstrating a modern rebuild of a Bubble.io template.

## Tech Stack
- Next.js 15 (App Router)
- Supabase (Auth + PostgreSQL)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- @hello-pangea/dnd for drag-and-drop

## Development Commands
```bash
npm run dev     # Start development server
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Run ESLint
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Project Structure
- `/src/app/(auth)` - Authentication pages
- `/src/app/(dashboard)` - Protected dashboard pages
- `/src/components/ui` - shadcn/ui components
- `/src/lib/supabase` - Supabase client configuration
- `/supabase/schema.sql` - Database schema with RLS

## Key Features
1. Kanban board with drag-and-drop
2. Project and task management
3. Team collaboration
4. Dark/light theme support
5. Mobile-responsive sidebar

## Notes
- Install with `npm install --legacy-peer-deps`
- Run database schema in Supabase SQL Editor before first use
