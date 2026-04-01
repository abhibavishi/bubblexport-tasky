# Tasky - Project Management App

A modern, blazing-fast project management application rebuilt from the popular Bubble.io "Tasky - Project Management" template. This showcase demonstrates how a slow Bubble app can become a lightning-fast Next.js application.

**Part of the [BubbleExport.com](https://bubbleexport.com) collection** - showcasing Bubble.io templates rebuilt in modern code.

## Features

- **Authentication** - Email/password login, signup, and password reset with Supabase Auth
- **Dashboard** - Overview with project stats, recent activity, and KPI cards
- **Projects** - Create and manage projects with status badges, search, and filters
- **Kanban Board** - Drag-and-drop task management with Todo / In Progress / Done columns
- **Tasks** - Global task list with sorting, filtering by status, priority, and assignee
- **Team** - View team members and their contribution stats
- **Settings** - Profile editing and dark/light theme toggle
- **Responsive** - Mobile-friendly with collapsible sidebar and drawer navigation
- **Dark Mode** - System-aware theme with manual override

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Drag & Drop**: [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Fonts**: [Inter](https://rsms.me/inter/) via next/font

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/tasky.git
cd tasky
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 4. Configure environment variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Ftasky&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=Supabase%20credentials%20required&envLink=https%3A%2F%2Fsupabase.com%2Fdocs%2Fguides%2Fgetting-started)

Make sure to:
1. Set up your environment variables in Vercel
2. Run the database schema in Supabase before your first deployment

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Auth pages (login, signup, forgot-password)
│   ├── (dashboard)/         # Protected dashboard pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── projects/        # Projects list and detail
│   │   ├── tasks/           # Global tasks view
│   │   ├── team/            # Team members
│   │   └── settings/        # User settings
│   ├── auth/callback/       # Auth callback handler
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── kanban-board.tsx     # Drag-and-drop Kanban board
│   ├── sidebar.tsx          # Navigation sidebar
│   └── theme-provider.tsx   # Dark mode provider
├── hooks/
│   └── use-toast.ts         # Toast notifications
└── lib/
    ├── supabase/            # Supabase client and types
    └── utils.ts             # Utility functions
```

## Database Schema

The app uses the following tables:

- **profiles** - User profiles (synced with Supabase Auth)
- **projects** - Project information with status and color
- **tasks** - Tasks with status, priority, assignee, and due date
- **team_members** - Project team membership
- **activity_log** - Activity tracking for audit trail

All tables have Row Level Security (RLS) policies enabled. See `supabase/schema.sql` for the complete schema.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

---

Built with love by [BubbleExport.com](https://bubbleexport.com) - Converting Bubble.io templates to modern code.
