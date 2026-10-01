# IT PATH Builder

IT PATH Builder is a TanStack Start application for structured IT, cybersecurity, and automotive learning paths.

## Local development

1. Install [Bun](https://bun.sh/).
2. Copy `.env.example` to `.env` and fill in the browser and server values for your environment.
3. Install dependencies with `bun install --frozen-lockfile`.
4. Start the app with `bun run dev`.

The app uses Supabase for authentication and learner data. Apply the SQL migrations in `drizzle/migrations` to the target database before enabling account sync, community, or payments. Keep service-role keys and Paddle webhook secrets server-side.

## Verification

- `bun run lint`
- `bun run test`
- `bun run build`
- `bun run gate`
- `bun run autonomy`
- `bun run lighthouse`

Pull requests run the content checks, full test suite, quality gate, autonomy proof, build, and Lighthouse CI. A change is ready only when the required checks pass.

## Payment webhooks

Configure separate Paddle sandbox and live webhook endpoints. Pass `?env=sandbox` or `?env=live`; any other value is rejected. Webhook database failures return an error so Paddle can retry them.
