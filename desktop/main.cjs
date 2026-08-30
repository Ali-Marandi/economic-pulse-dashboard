const { app, BrowserWindow, dialog, ipcMain, session, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const APP_ID = "com.economicpulse.dashboard";
const isDev = !app.isPackaged;
const preferredPort = Number(process.env.ECONOMIC_PULSE_PORT || (isDev ? 3000 : 4317));
const maxExportBytes = 5 * 1024 * 1024;

let appOrigin = null;
let mainWindow;
let serverProcess;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function probeServer(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(Boolean(response.statusCode && response.statusCode < 500));
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(timeoutMs = 30000) {
  const started = Date.now();
  const ports = isDev ? [preferredPort] : Array.from({ length: 20 }, (_, index) => preferredPort + index);

  while (Date.now() - started < timeoutMs) {
    for (const port of ports) {
      const url = `http://127.0.0.1:${port}`;
      if (await probeServer(url)) return url;
    }
    await sleep(250);
  }

  throw new Error("Economic Pulse local service did not become available in time.");
}

function startEmbeddedServer() {
  const serverEntry = path.join(__dirname, "..", "dist", "index.js");
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production", PORT: String(preferredPort) },
    stdio: isDev ? "inherit" : "ignore",
    windowsHide: true,
  });
  serverProcess.on("error", (error) => console.error("Embedded server error", error));
}

function isTrustedExternalUrl(target) {
  try {
    const parsed = new URL(target);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function safeFileName(name, fallbackExtension) {
  const baseName = path.basename(String(name || "economic-pulse-export"));
  const normalized = baseName.replace(/[^a-zA-Z0-9._ -]/g, "-").replace(/\.+/g, ".");
  const withExtension = path.extname(normalized) ? normalized : `${normalized}${fallbackExtension}`;
  return withExtension.slice(0, 120) || `economic-pulse-export${fallbackExtension}`;
}

function isValidExportPayload(payload) {
  return payload && typeof payload === "object" && typeof payload.content === "string" && payload.content.length <= maxExportBytes;
}

function ensureMainWindowSender(event) {
  return Boolean(mainWindow && event.sender === mainWindow.webContents);
}

function registerIpcHandlers() {
  ipcMain.handle("economic-pulse:runtime-info", (event) => {
    if (!ensureMainWindowSender(event)) return null;
    return { appVersion: app.getVersion(), isPackaged, platform: process.platform };
  });

  ipcMain.handle("economic-pulse:save-text-file", async (event, payload) => {
    if (!ensureMainWindowSender(event) || !isValidExportPayload(payload)) {
      return { ok: false, reason: "The export request was rejected." };
    }

    const extension = typeof payload.extension === "string" && /^\.[a-z0-9]{1,8}$/i.test(payload.extension)
      ? payload.extension.toLowerCase()
      : ".txt";
    const fileName = safeFileName(payload.suggestedName, extension);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Save Economic Pulse export",
      defaultPath: path.join(app.getPath("documents"), fileName),
      filters: [{ name: "Export file", extensions: [extension.slice(1)] }],
    });

    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    await fs.writeFile(result.filePath, payload.content, "utf8");
    return { ok: true, filePath: result.filePath };
  });

  ipcMain.handle("economic-pulse:export-pdf", async (event, suggestedName) => {
    if (!ensureMainWindowSender(event)) return { ok: false, reason: "The PDF request was rejected." };

    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Save Economic Pulse PDF",
      defaultPath: path.join(app.getPath("documents"), safeFileName(suggestedName, ".pdf")),
      filters: [{ name: "PDF document", extensions: ["pdf"] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };

    const pdf = await event.sender.printToPDF({
      landscape: false,
      marginsType: 1,
      pageSize: "A4",
      printBackground: true,
    });
    await fs.writeFile(result.filePath, pdf);
    return { ok: true, filePath: result.filePath };
  });
}

function configureSecurity() {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (!details.url.startsWith("http://127.0.0.1:")) return callback({ responseHeaders: details.responseHeaders });
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
            "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
            "font-src 'self' data:; connect-src 'self' https:;",
          ],
        },
      });
    });
  }
}

async function createWindow() {
  if (!isDev) startEmbeddedServer();
  const localUrl = await waitForServer();
  appOrigin = new URL(localUrl).origin;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#07111f",
    show: false,
    autoHideMenuBar: true,
    title: "Economic Pulse",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.on("will-navigate", (event, target) => {
    try {
      if (new URL(target).origin !== appOrigin) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isTrustedExternalUrl(target)) void shell.openExternal(target);
    return { action: "deny" };
  });

  await mainWindow.loadURL(localUrl);
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", focusMainWindow);

  app.whenReady().then(async () => {
    app.setAppUserModelId(APP_ID);
    configureSecurity();
    registerIpcHandlers();

    try {
      await createWindow();
    } catch (error) {
      console.error(error);
      app.quit();
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });
}

function stopEmbeddedServer() {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
}

app.on("window-all-closed", () => {
  stopEmbeddedServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", stopEmbeddedServer);
