# IT PATH desktop app

A thin desktop window around the published IT PATH site
(https://itpath-builder.lovable.app). The account, AI tutor, grading and
payment features run on the server, so the desktop app needs an internet
connection.

## Build installers

From the project root:

```bash
cd electron
npm install --save-dev electron @electron/packager

# Windows
npx @electron/packager . "IT PATH" --platform=win32 --arch=x64 --out=release --overwrite --icon=icon.png
# macOS
npx @electron/packager . "IT PATH" --platform=darwin --arch=x64 --out=release --overwrite --icon=icon.png
# Linux
npx @electron/packager . "IT PATH" --platform=linux --arch=x64 --out=release --overwrite --icon=icon.png
```

Zip the folder in `release/` and distribute it. Unsigned apps show a
security warning on first launch; code signing certificates remove it
(Apple Developer Program for macOS, an OV/EV code signing cert for Windows).

Point the app at a different address with the `ITPATH_URL` environment
variable.
