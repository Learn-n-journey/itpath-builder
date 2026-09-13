# IT PATH desktop app

A thin desktop window around the IT PATH site configured by `ITPATH_URL`. The account, AI tutor, grading and payment features run on the server, so the desktop app needs an internet connection.

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

Zip the folder in `release/` and distribute it. Unsigned apps show a security warning on first launch; code signing certificates remove it.

Set `ITPATH_URL` to your own production deployment before packaging.
