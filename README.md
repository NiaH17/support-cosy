# Support Cosy

French-language support and install-registration app for the installers who work with Octopus Energy on Cosy heat pumps. It's a PWA (installable web app). Installers raise support requests, which are translated French to English for Octopus admins. Replies are translated back. Installers also register each install (serials, photos, signatures) for the manufacturer record.

A sister app, **Octo Assist** (English, separate repo `OctoAssist`), shares the same Supabase project. See "Access model" before touching logins.

## Stack

- React 18 + Vite + Tailwind, React Router, `vite-plugin-pwa`
- Supabase: Postgres, Auth, Storage and Realtime. No other backend.
- Vercel: hosts the front end and the serverless functions in `/api`
- DeepL (free tier): FR to EN and EN to FR translation

## Folder map

```
api/                     Vercel serverless functions (server-side, hold the secret keys)
  _auth.js               Verifies the caller's token + app access. Used by every endpoint.
  translate-support.js   New support request: translate, store
  translate-message.js   Reply in a request thread: translate, store, assign admin
  submit-installation.js Validate and store an install registration
  admin-users.js         Admin only: create / reset / remove Support Cosy users
src/
  App.jsx                Routes + access gate (signs out accounts without Support Cosy access)
  pages/                 One file per screen (French for installers, English for admin)
  components/            GlobalNotifier (unread banner), InstallDetail, PhotoField, SignaturePad
  components/admin/      Admin tabs: InstallationsTab, ReportingTab, UsersTab
  lib/installFields.js   The install form definition (checks, photos, labels in FR + EN)
supabase/migrations/     SQL, run by hand in the Supabase SQL editor (not auto-applied)
public/                  Icons and images
```

Language rule: everything installers see is **French**. Everything admins see is **English**.

## Running it locally

```bash
npm install
cp .env.example .env     # then fill in the values (ask Nia; never commit .env)
npm run dev
```

`npm run dev` runs the front end only. The `/api` functions only run on Vercel, so anything that submits a request, sends a reply, registers an install or manages users won't work locally unless you use the Vercel CLI (`npx vercel dev`, which needs access to the Vercel project). The usual way to test those is a preview deployment (below).

Environment variables (set in Vercel for deployed copies):

| Variable | Used by | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | front end + API | No |
| `VITE_SUPABASE_ANON_KEY` | front end | No (public by design) |
| `SUPABASE_SERVICE_ROLE_KEY` | API only | **Yes. Full database access. Never in git, chat or the front end.** |
| `DEEPL_API_KEY` | API only | **Yes** |

## Working on it (branches and releases)

1. Don't commit straight to `main`: Vercel deploys `main` to production, to real users.
2. Create a branch (`git checkout -b my-change`), commit, push and open a pull request on GitHub.
3. Vercel builds a preview link for each branch. Open it to check your change.
4. Nia reviews and merges, and the merge goes live.

Preview deployments use the **same live Supabase database**, so don't test anything destructive on them. Use test accounts.

After a deploy, installers' phones may keep the old version for a while (PWA caching). For testing: DevTools → Application → Service Workers → Unregister, then Clear site data. Installed apps need a full close and reopen.

## Database changes

Migrations in `supabase/migrations/` are applied **manually**: open the file, paste it into Supabase → SQL Editor, run. Order matters, and you must run the SQL **before** deploying code that depends on it.

Current order:

1. `20260915_fr_support_requests.sql`
2. `20261015_security_hardening.sql` (admin role from `app_metadata`, request policies)
3. `20261015b_notifications.sql` (per-user unread tracking)
4. `20261016_installations_and_assignment.sql` (installs table, private photo bucket, "which admin")
5. `20261016b_app_access.sql` (access split between the two apps)
6. `20261016c_user_delete_keeps_records.sql` (lets users be deleted)

Known gap: the live database also has tables and columns created earlier by hand that aren't in these files. These are `fr_support_messages`, the triage columns on `fr_support_requests`, `photo_urls`, `installation_company` and the `support-photos` bucket. Some of that SQL lives in the OctoAssist repo (`20260923_support_messages.sql`, `enable-realtime.sql`). Treat the live database as the source of truth, and add any new change as a new migration file.

## Access model (read this before touching logins)

Both apps use one Supabase user list. To keep them separate, each account has `app_metadata.apps`, for example `["support_cosy"]`, `["octo_assist"]` or both. Users cannot edit `app_metadata`.

- Support Cosy only lets in accounts whose `apps` includes `support_cosy`. This is enforced in `App.jsx`, in `api/_auth.js` and by Postgres policies (`public.has_app(...)`).
- **Admin** = `app_metadata.role = 'admin'` (plus Support Cosy access). Installers have no role.
- Create installer accounts from **Admin → Users** in the app. No email is sent, and the password is shown once to pass on. Supabase's built-in email only reaches Octopus team members, so invite and reset emails won't reach the French company.
- After changing anyone's `app_metadata`, they must log out and back in.
- **Never** read roles or access from `user_metadata`. Users can edit it. (Octo Assist still does this for its roles, which is a known weakness.)

## Content

The troubleshooting and info pages follow the installation manual **FRV1 (Sep 2026)**: `InfoPage.jsx` (specs, clearances, R290 safety, procedures) and `TroubleshootingPage.jsx`. The product is the **Cosy R290** (propane, flammable), so clearances and safety rules differ from older R-32 content. If the manual changes, update the pages and say which manual version you used.

## Open items

- Wipe test data before go-live (requests, messages, installs, storage files). Keep the user accounts.
- Update the procedures and troubleshooting pages from manual sections 9, 11 and 14, and wire the diagrams in `public/images/` into the steps that refer to them.
- Confirm with the manual's owner: max operating pressure (printed as "32 bar", probably 3.2) and minimum outdoor temperature.
- Decide whether to add French-specific regulatory content (the manual is a translation of the UK one and cites few French rules).
- Fix Octo Assist's roles, which still come from `user_metadata`.
