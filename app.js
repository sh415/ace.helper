const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const puppeteer = require('puppeteer');

function createWindow () {
    const win = new BrowserWindow({
        width: 1080,
        height: 720,
        webPreferences: {
            /* ipcRenderer 를 직접 노출하는 경우, 비활성화 권장 */
            // nodeIntegration: true,
            // contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })
  
    win.loadFile('index.html')
  }

app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', () => {
    app.quit();
})

ipcMain.on('open-google', async (event) => {
    const browser = await puppeteer.launch({ headless: false }); // headless: false 로 설정하여 GUI 모드에서 브라우저를 실행
    const page = await browser.newPage();
    await page.goto('https://google.com');
});