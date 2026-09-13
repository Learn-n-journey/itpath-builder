const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

// The desktop app opens the IT PATH deployment configured by ITPATH_URL.
// Set ITPATH_URL to your own production URL when packaging the app.
const APP_URL = process.env.ITPATH_URL || "http://localhost:3000/itpath-builder/";
const APP_ORIGIN = new URL(APP_URL).origin;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: "#0f1720",
    title: "IT PATH",
    icon: path.join(__dirname, "icon.png"),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.loadURL(APP_URL);
  const external = (url) => { try { return new URL(url).origin !== APP_ORIGIN; } catch { return true; } };
  win.webContents.setWindowOpenHandler(({ url }) => { if (external(url)) { shell.openExternal(url); return { action: "deny" }; } return { action: "allow" }; });
  win.webContents.on("will-navigate", (event, url) => { if (external(url)) { event.preventDefault(); shell.openExternal(url); } });
}
app.whenReady().then(() => { createWindow(); app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
