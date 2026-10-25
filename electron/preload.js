'use strict';
const { contextBridge } = require('electron');

// Expose a read-only flag so the hosted web app can detect the Electron shell
// and adjust OAuth redirectTo to use the nomio:// deep-link protocol.
contextBridge.exposeInMainWorld('electron', { isElectron: true });
