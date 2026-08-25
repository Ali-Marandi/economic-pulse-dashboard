const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("economicPulseDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
  getRuntimeInfo: () => ipcRenderer.invoke("economic-pulse:runtime-info"),
  saveTextFile: (payload) => ipcRenderer.invoke("economic-pulse:save-text-file", payload),
  exportPdf: (suggestedName) => ipcRenderer.invoke("economic-pulse:export-pdf", suggestedName),
});
