'use strict';

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const PROD_URL =
  process.env.ELECTRON_SERVER_URL || 'http://localhost:3000';

// Stripe checkout/portal open in system browser.
// Google and Microsoft OAuth must flow INSIDE the BrowserWindow so that
// Supabase can complete the PKCE exchange via our nomio:// deep link.
// The login page sets redirectTo:'nomio://auth/callback' when it detects
// window.electron.isElectron = true (exposed by preload.js).
const EXTERNAL_HOSTS = ['checkout.stripe.com', 'billing.stripe.com'];

// Register nomio:// as default protocol handler for OAuth deep links.
// Must be set before app.whenReady().
app.setAsDefaultProtocolClient('nomio');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let pendingDeepLink = null;

function resolveDeepLink(url) {
  if (!url || !url.startsWith('nomio://')) return null;
  // nomio://auth/callback?code=... -> PROD_URL/auth/callback?code=...
  return PROD_URL + '/' + url.slice('nomio://'.length);
}

// Windows/Linux cold start: deep link URL is a command-line argument.
const coldStartLink = process.argv.find((a) => a.startsWith('nomio://'));
if (coldStartLink) pendingDeepLink = resolveDeepLink(coldStartLink);

function isExternal(urlString) {
  try {
    const { hostname } = new URL(urlString);
    return EXTERNAL_HOSTS.some(
      (h) => hostname === h || hostname.endsWith('.' + h)
    );
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Nomio',
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon-512.png'),
    backgroundColor: '#0F3E6B',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isExternal(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`Load failed [${errorCode}]: ${errorDescription}`);
    mainWindow.loadURL(
      'data:text/html,' +
        encodeURIComponent(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sin conexion</title>' +
            '<style>body{margin:0;background:#0F3E6B;color:#fff;font-family:sans-serif;' +
            'display:flex;align-items:center;justify-content:center;height:100vh}' +
            '.box{text-align:center;padding:2rem}h2{margin:0 0 .5rem}' +
            'p{opacity:.8;margin:0 0 1.5rem}' +
            'button{padding:.5rem 1.5rem;background:#fff;color:#0F3E6B;' +
            'border:none;border-radius:6px;font-size:1rem;cursor:pointer}' +
            '</style></head><body><div class="box"><h2>Sin conexion</h2>' +
            '<p>Nomio requiere internet. Verifica tu red e intenta de nuevo.</p>' +
            "<button onclick=\"location.href='" +
            PROD_URL +
            "'\">Reintentar</button></div></body></html>"
        )
    );
  });

  mainWindow.loadURL(PROD_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (pendingDeepLink) {
      mainWindow.loadURL(pendingDeepLink);
      pendingDeepLink = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

// macOS: OS delivers deep links to the running instance via open-url.
app.on('open-url', (event, url) => {
  event.preventDefault();
  const target = resolveDeepLink(url);
  if (!target) return;
  if (mainWindow) {
    mainWindow.loadURL(target);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingDeepLink = target;
  }
});

// Windows/Linux: deep link triggers a second instance; argv carries the URL.
app.on('second-instance', (_event, argv) => {
  const deepLink = argv.find((a) => a.startsWith('nomio://'));
  if (deepLink) {
    const target = resolveDeepLink(deepLink);
    if (target && mainWindow) mainWindow.loadURL(target);
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
