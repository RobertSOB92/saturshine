<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SaturShine ITSM - Project Documentation for Agents

## Overview
This is a ticketing and facility management system (ITSM) built for "SaturShine". 
It has two main types of users:
- **`admin`**: Full access to manage users, clients (facilities), and view/resolve all tickets.
- **`client_rep`**: Facility managers who can create tickets (report issues) for the clients they are assigned to, and view only their own tickets.

## Tech Stack
- **Framework**: Next.js (App Router) using `standalone` output for simple VPS deployment.
- **Database & Auth**: Supabase (PostgreSQL, Row-Level Security, Auth, Storage).
- **Styling**: Tailwind CSS + Lucide React icons.

## Architecture & Conventions
1. **Authentication**: 
   - Uses Supabase Auth.
   - **Important**: SMTP is disabled/not configured due to VPS limits. All user invitations and password resets are handled manually by the admin via UI templates.
   - New users are created with a temporary password and their `profiles.requires_password_change` flag is set to `true`. They are forced to change their password via the `/change-password` route upon their first login.
2. **Database Schema**:
   - `public.profiles`: Extends `auth.users` with `full_name`, `role` (`admin` | `client_rep`), and `requires_password_change`.
   - `public.clients`: Represents buildings/facilities.
   - `public.profile_clients`: Many-to-many relationship linking `client_rep` profiles to the `clients` they manage.
   - `public.tickets`: The actual issues/tickets reported. Statuses: `pending`, `in_progress`, `resolved`.
   - **RLS**: Row-Level Security heavily relies on `public.get_user_role()` and checking assignments in `profile_clients`.
3. **Storage**: Images are uploaded to the Supabase `tickets` bucket. We use signed URLs for displaying them (`ticketService.getSignedUrl`).

## Deployment
The app is deployed to a Mikrus VPS (or similar) without Vercel.
- To build: `npm run build`
- Packaging: Run `mkdir -p ../gotowa-paczka-na-serwer && rsync -av --delete .next/ ../gotowa-paczka-na-serwer/.next/ && rsync -av --delete public/ ../gotowa-paczka-na-serwer/public/ && cp package.json package-lock.json next.config.ts ../gotowa-paczka-na-serwer/ && rsync -av --delete supabase/ ../gotowa-paczka-na-serwer/supabase/` to prepare the package folder.
- Server uses PM2 to run the `.next/standalone/server.js` file.

## AI Agent Guidelines
- Do not introduce external libraries unless absolutely necessary. Stick to Tailwind and Lucide for UI.
- Always check the latest Supabase schema in `supabase/migrations/000_schema.sql` before altering database schemas or RLS.
- When generating SQL migrations, make sure to grant necessary privileges and adjust RLS policies if creating new tables.
- Keep components modular. Services (like `ticketService`, `userService`) should handle API and Supabase logic, separating it from the UI layer.
