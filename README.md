# IT PATH Builder

IT PATH Builder is a TanStack Start application for structured IT, cybersecurity, and automotive learning paths.

## Local development

1. Install [Bun](https://bun.sh/).
2. Copy `.env.example` to `.env` and fill in the browser and server values for your environment.
3. Install dependencies with `bun install --frozen-lockfile`.
4. Start the app with `bun run dev`.

The app uses Supabase for authentication and learner data. Apply the SQL migrations in `drizzle/migrations` to the target database before enabling account sync or community features. Keep the Supabase secret key and `GEMINI_API_KEY` server-side.

## Verification

- `bun run lint`
- `bun run test`
- `bun run build`
- `bun run gate`
- `bun run autonomy`
- `bun run lighthouse`

Pull requests run the content checks, full test suite, quality gate, autonomy proof, build, and Lighthouse CI. A change is ready only when the required checks pass.

## Paid features

Payments are switched off. Paid features stay locked; the owner email and the
`beta_access` list get full access.
