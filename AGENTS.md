# Repository Guidelines

## Project Structure & Module Organization

This Next.js App Router application serves NFC/QR rating pages, merchant dashboards, and administration tools using React and Supabase.

- `src/app/`: public rating flow at `r/[slug]`, route groups `(auth)`, `(dashboard)`, and `(admin)`, and API handlers under `api/`.
- `src/components/`: shared shell and UI components; route-specific components live beside their pages.
- `src/lib/`: validation, routing helpers, database access, authentication, and Supabase clients.
- `public/`: static assets; `src/app/globals.css`: global styles.
- `tests/unit/`, `tests/integration/`, and `tests/fixtures/`: tests and reusable data.
- `supabase/migrations/`: versioned SQL migrations; `schema.sql`: schema reference. Numbered root documents and `briefs/` describe requirements.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev`: start the local development server.
- `npm run build`: create a production build.
- `npm start`: serve the production build.
- `npm run lint`: run ESLint with Next.js Core Web Vitals rules.
- `npm test`: run the Vitest suite once.
- `npx vitest run tests/unit/validation.test.js`: run one test file.
- `npm run seed:admin`: provision an administrator using configuration from `.env`.

## Coding Style & Naming Conventions

Use JavaScript ES modules, two-space indentation, semicolons, and existing file-local quote conventions. Name React components in PascalCase and functions/variables in camelCase. Preserve Next.js filenames such as `page.js`, `layout.js`, and `route.js`. Use `@/` imports for `src/`. Follow existing Tailwind utility patterns. ESLint is configured; no dedicated formatter is configured.

## Testing Guidelines

Vitest runs in a Node environment. Name tests `*.test.js`, placing helper tests in `tests/unit/` and API/route behavior tests in `tests/integration/`. Reuse fixtures and reset mock database state between cases. Keep mock-backed tests independent of live Supabase credentials. Cover success, invalid input, and missing-record paths. No coverage threshold is configured. Run tests, lint, and a production build before requesting review.

## Commit & Pull Request Guidelines

History uses short, informal messages such as `adding dashboard page`; no enforced prefix convention is evident. Prefer concise, imperative summaries. PRs should explain the behavior change, link relevant issues or requirement documents, report validation results, and include screenshots for UI changes. Call out migrations and configuration changes.

## Security & Configuration

Keep `.env` files and credentials uncommitted. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side. Set explicit `ADMIN_EMAIL` and `ADMIN_PASSWORD` before seeding; do not rely on default credentials.
