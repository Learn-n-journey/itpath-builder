# Publishing IT PATH to the App Store and Google Play

The project is already prepared. Everything below happens on your own computer,
because Apple and Google only accept builds made with their native toolchains.

## What is already done

- Capacitor is installed and configured (`capacitor.config.ts`).
- App ID: `net.itpath.app`, app name: `IT PATH`.
- The native shell loads the live site at `https://www.it-path.net`, so accounts,
  payments, cloud sync and the AI tutor keep working exactly as they do now.
- An offline fallback screen ships inside the app (`mobile/www/index.html`).
- App icons and splash sources live in `resources/`.
- Helper scripts are in `package.json` (`cap:sync`, `cap:ios`, `cap:android`).

## Before you start

- The site must be published and live at `https://www.it-path.net`.
- Android: Android Studio (Windows, Mac or Linux).
- iOS: a Mac with Xcode. There is no way around this.
- An Apple Developer account ($99/year) and a Google Play developer account ($25 once).

## Steps

1. Push this project to GitHub and clone it onto your machine.
2. Install packages: `npm install`
3. Add the platforms (once):
   ```
   npx cap add android
   npx cap add ios
   ```
4. Generate icons and splash screens from `resources/`:
   ```
   npx @capacitor/assets generate
   ```
5. Sync the config into the native projects (after any config change):
   ```
   npx cap sync
   ```
6. Open and build:
   ```
   npx cap open android
   npx cap open ios
   ```
   From Android Studio, build a signed App Bundle (.aab) for Play.
   From Xcode, archive and upload to App Store Connect.

## Store review notes

- Apple rejects apps that are only a wrapped website. IT PATH is fine here
  because it is an interactive learning tool with progress tracking, quizzes,
  labs and simulators, but the listing should describe it that way.
- Subscriptions: if the app lets people buy inside the app, Apple and Google
  take 15 to 30 percent and require their own in-app purchase system. The usual
  route is to keep purchasing on the website only and not link to it from inside
  the app on iOS.
- You need a privacy policy URL (the site already has one) and an account
  deletion route, which Apple requires for any app with sign-in.

## Updating the app

Because the shell loads the live site, most updates reach users the moment you
publish. You only need a new store build when the native config, icons,
permissions or plugins change.
