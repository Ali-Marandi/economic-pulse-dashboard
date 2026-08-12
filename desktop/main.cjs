const { app, BrowserWindow, shell, session } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");

const isDev = !app.isPackaged;
const port = Number(process.env.ECONOMIC_PULSE_PORT || 4317);
let serverProcess;
let mainWindow;

function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) return resolve();
        retry();
      });
      request.on("error", retry);
      request.setTimeout(1000, () => request.destroy());
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error(`Server did not start at ${url}`));
      setTimeout(probe, 250);
    };
    probe();
  });
}

function startEmbeddedServer() {
  const serverEntry = path.join(__dirname, "..", "dist", "index.js");
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, NODE_ENV: "production", PORT: String(port) },
    stdio: isDev ? "inherit" : "ignore",
    windowsHide: true,
  });
  serverProcess.on("error", (error) => console.error("Embedded server error", error));
}

async function createWindow() {
  if (!isDev) startEmbeddedServer();
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);

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
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//i.test(target)) shell.openExternal(target);
    return { action: "deny" };
  });
  await mainWindow.loadURL(url);
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  try {
    await createWindow();
  } catch (error) {
    console.error(error);
    app.quit();
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});
