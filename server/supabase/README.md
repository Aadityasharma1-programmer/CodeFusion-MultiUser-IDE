# Codefusion – Supabase Setup

## How to apply the schema

1. Go to your [Supabase project](https://supabase.com/dashboard).
2. Open **SQL Editor** → **New query**.
3. Paste the entire contents of `migrations/001_initial_schema.sql`.
4. Click **Run**.

That's it. All tables, indexes, RLS policies, and Realtime subscriptions
will be created in one shot.

## What gets created

| Table | Purpose |
|---|---|
| `profiles` | App-level user data (mirrors `auth.users`) |
| `projects` | Workspace / project records |
| `project_members` | Collaborators + roles (viewer / editor / admin) |
| `files` | File tree (folder hierarchy via path strings) |
| `file_versions` | Snapshot history for each file |
| `chat_messages` | Per-project team chat with threading |
| `ai_requests` | AI request audit log + rate-limit source |
| `execution_logs` | Code sandbox stdout / stderr output |

## Realtime tables

`files`, `chat_messages`, and `project_members` are added to the
`supabase_realtime` publication so your frontend can subscribe to
live changes out of the box.

## Environment variables to add to `.env`

```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-side only, never expose to client
```
