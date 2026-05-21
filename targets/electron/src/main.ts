import { app, BrowserWindow } from 'electron';

function parseAppUrl(argv: string[]): string {
  const arg = argv.find((value) => value.startsWith('--app-url='));
  if (!arg) {
    throw new Error('Missing --app-url argument');
  }
  return arg.slice('--app-url='.length);
}

async function createWindow(url: string): Promise<void> {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await window.loadURL(url);
}

app.whenReady().then(async () => {
  const appUrl = parseAppUrl(process.argv);
  await createWindow(appUrl);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const appUrl = parseAppUrl(process.argv);
    await createWindow(appUrl);
  }
});
