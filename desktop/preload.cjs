const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("economicPulseDesktop", {
  platform: process.platform,
  version: process.versions.electron,
  isDesktop: true,
});
