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
    const browser = await puppeteer.launch({ 
        // headless: 'new',
        // args: [
        //     '--no-sandbox',
        //     '--disable-setuid-sandbox',
        //     '--disable-web-security', // CORS 정책 우회
        //     '--disable-features=IsolateOrigins,site-per-process' // 일부 탐지 메커니즘 우회
        // ]
        headless: false, // headless: false 로 설정하여 GUI 모드에서 브라우저를 실행
    }); 
    let page = null;

    const id = 'yourNaverID';
    const pw = 'yourNaverPW';
    const idArr = [...id];
    const pwArr = [...pw];

    try {
        page = await browser.newPage();
        await page.setViewport({
            width: 1280,
            height: 720
        });
        await page.goto('https://nid.naver.com/nidlogin.login?/');
        // await page.waitForTimeout(3000);

        await new Promise((page) => setTimeout(page, 3000));

        await page.click('#id');
        await new Promise((page) => setTimeout(page, 1000));

        /** 1. type() 사용 */
        //await page.type('#id', 'xmfptm1592');

        /** 2. keyboard.type() 사용  */
        // await page.keyboard.type(id);

        /** 3. keyboard.down(), press() 사용 */
        for (let i of idArr) {
            const inputVal = keyboardList.filter(e => e.shift === i || e.key === i);
            if (inputVal.length > 0) {
                const code = inputVal[0].code;
                const shiftLeft = inputVal[0].shift === i ? 'ShiftLeft': '';
                if (shiftLeft) {
                    await page.keyboard.down(shiftLeft);
                    await new Promise((page) => setTimeout(page, 500));
                    await page.keyboard.press(code);
                    await new Promise((page) => setTimeout(page, 500));
                    await page.keyboard.up(shiftLeft);
                } else {
                    await page.keyboard.press(code);
                }
                await new Promise((page) => setTimeout(page, 500));
            }
        }
        await new Promise((page) => setTimeout(page, 1000));

        await page.click('#pw');
        await new Promise((page) => setTimeout(page, 1000));

        /** 3. keyboard.down(), press() 사용 */
        for (let p of pwArr) {
            const inputVal = keyboardList.filter(e => e.shift === p || e.key === p);
            if (inputVal.length > 0) {
                const code = inputVal[0].code;
                const shiftLeft = inputVal[0].shift === p ? 'ShiftLeft': '';
                if (shiftLeft) {
                    await page.keyboard.down(shiftLeft);
                    await new Promise((page) => setTimeout(page, 500));
                    await page.keyboard.press(code);
                    await new Promise((page) => setTimeout(page, 500));
                    await page.keyboard.up(shiftLeft);
                } else {
                    await page.keyboard.press(code);
                }
                await new Promise((page) => setTimeout(page, 500));
            }
        }
        await new Promise((page) => setTimeout(page, 1000));

        await page.click('.btn_login');
        await new Promise((page) => setTimeout(page, 10000));

    } catch (error) {
        console.log(error);

    } finally {
        if (page !== null) await page.close(); // finally 절에서 페이지를 닫음
        await browser.close();
    }
});

// const waitForTimeout = (ms) => {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

const keyboardList = [
    { keyCode: 48, code: 'Digit0', shift: ')', key: '0' },
    { keyCode: 49, code: 'Digit1', shift: '!', key: '1' },
    { keyCode: 50, code: 'Digit2', shift: '@', key: '2' },
    { keyCode: 51, code: 'Digit3', shift: '#', key: '3' },
    { keyCode: 52, code: 'Digit4', shift: '$', key: '4' },
    { keyCode: 53, code: 'Digit5', shift: '%', key: '5' },
    { keyCode: 54, code: 'Digit6', shift: '^', key: '6' },
    { keyCode: 55, code: 'Digit7', shift: '&', key: '7' },
    { keyCode: 56, code: 'Digit8', shift: '*', key: '8' },
    { keyCode: 57, code: 'Digit9', shift: '(', key: '9' },
    { keyCode: 65, code: 'KeyA', shift: 'A', key: 'a' },
    { keyCode: 66, code: 'KeyB', shift: 'B', key: 'b' },
    { keyCode: 67, code: 'KeyC', shift: 'C', key: 'c' },
    { keyCode: 68, code: 'KeyD', shift: 'D', key: 'd' },
    { keyCode: 69, code: 'KeyE', shift: 'E', key: 'e' },
    { keyCode: 70, code: 'KeyF', shift: 'F', key: 'f' },
    { keyCode: 71, code: 'KeyG', shift: 'G', key: 'g' },
    { keyCode: 72, code: 'KeyH', shift: 'H', key: 'h' },
    { keyCode: 73, code: 'KeyI', shift: 'I', key: 'i' },
    { keyCode: 74, code: 'KeyJ', shift: 'J', key: 'j' },
    { keyCode: 75, code: 'KeyK', shift: 'K', key: 'k' },
    { keyCode: 76, code: 'KeyL', shift: 'L', key: 'l' },
    { keyCode: 77, code: 'KeyM', shift: 'M', key: 'm' },
    { keyCode: 78, code: 'KeyN', shift: 'N', key: 'n' },
    { keyCode: 79, code: 'KeyO', shift: 'O', key: 'o' },
    { keyCode: 80, code: 'KeyP', shift: 'P', key: 'p' },
    { keyCode: 81, code: 'KeyQ', shift: 'Q', key: 'q' },
    { keyCode: 82, code: 'KeyR', shift: 'R', key: 'r' },
    { keyCode: 83, code: 'KeyS', shift: 'S', key: 's' },
    { keyCode: 84, code: 'KeyT', shift: 'T', key: 't' },
    { keyCode: 85, code: 'KeyU', shift: 'U', key: 'u' },
    { keyCode: 86, code: 'KeyV', shift: 'V', key: 'v' },
    { keyCode: 87, code: 'KeyW', shift: 'W', key: 'w' },
    { keyCode: 88, code: 'KeyX', shift: 'X', key: 'x' },
    { keyCode: 89, code: 'KeyY', shift: 'Y', key: 'y' },
    { keyCode: 90, code: 'KeyZ', shift: 'Z', key: 'z' },
    { keyCode: 190, code: 'Period', shift: '>', key: '.' },
    { keyCode: 192, code: 'Backquote', shift: '~', key: '`' },
];