# Repository Guidelines

## Project Structure & Module Organization
PhonePulse is an Italian smartphone editorial site built with React 18, Vite, Tailwind CSS, and Supabase, deployed on Vercel.

- `src/pages/` contains public pages; `src/pages/admin/` contains authenticated editorial tools.
- `src/components/` contains shared UI, SEO, and authentication components. Routes live in `src/App.jsx`; the Supabase client lives in `src/lib/supabase.js`.
- `src/index.css` and `tailwind.config.js` define styling; `public/` holds static assets, robots directives, and the sitemap.
- `scripts/` contains Python news generation, publishing, cover repair, and database setup utilities. `.github/workflows/` schedules automation.
- `supabase/functions/post-to-social/index.ts` handles social publishing. `docs/superpowers/` holds design specifications and implementation plans.

## Build, Test, and Development Commands
- `npm ci`: install JavaScript dependencies from the lockfile.
- `npm run dev`: start the Vite development server.
- `npm run build`: generate the production bundle in `dist/`.
- `npm run preview`: serve the built bundle locally.
- `python3 -m pip install -r scripts/requirements.txt`: install automation dependencies; workflows use Python 3.11.

Automation scripts write to Supabase and may publish content or send notifications. Run them only against an intended environment with the required credentials.

## Coding Style & Naming Conventions
Follow nearby code: JavaScript/JSX uses two-space indentation, single quotes, and generally omits semicolons; Python uses four spaces and snake_case. Use PascalCase for React component filenames, such as `ArticleCard.jsx`, and camelCase for JavaScript functions and variables. Prefer functional components, existing shared components, and Tailwind theme tokens. No formatter or linter is configured.

## Testing Guidelines
No automated test framework, test directory, or coverage threshold is configured; `npm test` is unavailable. Run `npm run build` and manually verify affected routes, mobile layouts, and relevant admin flows. For automation changes, validate with controlled data before enabling scheduled runs. Document verification steps in the pull request.

## Commit & Pull Request Guidelines
Recent commits follow Conventional Commits: `feat(social): ...`, `fix(review): ...`, and `docs: ...`. Keep commits focused. Include a concise description, linked issue when applicable, verification results, and screenshots for visual changes. Explain configuration or database changes explicitly.

## Security & Configuration
Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the README's referenced example file is currently absent. Never expose service-role keys or social tokens through `VITE_*` variables. Keep server credentials in GitHub Actions or Supabase secrets, preserve authorization checks, and sanitize rendered article HTML.
