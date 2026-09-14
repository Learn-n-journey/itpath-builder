# Account creation with a first name, and a personal dashboard greeting

## What you'll get

- A proper **Create account** screen: first name, email, password — instead of today's email/password-only form.
- The dashboard greets you by first name, changing with the time of day: "Good morning, David", "Good afternoon, David", "Good evening, David", plus a late-night variant.
- Wording varies between visits so it doesn't feel robotic, and it appears instantly with no AI cost or delay.
- Existing accounts aren't nagged: if no first name is set, the dashboard shows today's plain heading. You can add or change your first name in **Settings**.
- Signing in with Google picks up the first name from your Google profile automatically.

## How it works

### Name storage
- New `profiles` table in your account database: one row per user, holding `first_name`, linked to the account and removed with it.
- Access rules: you can read and change only your own row; nobody else can see it.
- A signup trigger creates the row automatically, using the first name typed at signup (or the given name from Google).

### Sign-up screen
- `src/routes/auth.tsx` gains a First name field shown only in "Create account" mode (required there, absent for sign-in), passed through as signup metadata.

### Greeting
- Small helper (e.g. `src/lib/greeting.ts`): picks a time bucket from the local clock (morning / afternoon / evening / late night) and selects one of several phrasings for that bucket, varied per day so it stays stable during a session.
- A `useProfile` hook reads the first name from the account (with the current session), cached via React Query.
- `src/routes/index.tsx` renders the greeting above the existing dashboard heading when a first name exists, and falls back to the current heading when it doesn't.

### Settings
- New "Your name" field in `src/routes/settings.tsx`, saving to the profile row; visible only when signed in.

## Notes
- The greeting is written text, not AI-generated, so there's no per-visit cost or loading spinner.
- Nothing about existing progress, sync, or paid features changes.
