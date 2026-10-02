const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

// IT PATH runs its accounts, AI tutor, grading and payments on the server,
// so the desktop app is a dedicated window onto the published site.
const APP_URL = process.env.ITPATH_URL || "https://www.it-path.net";
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
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(APP_URL);

  // Keep the app window on IT PATH; anything else opens in the real browser.
  const external = (url) => {
    try {
      return new URL(url).origin !== APP_ORIGIN;
    } catch {
      return true;
    }
  };

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (external(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (external(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
