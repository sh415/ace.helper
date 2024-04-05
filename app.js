const { app, dialog, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const puppeteer = require('puppeteer');
const {autoUpdater} = require("electron-updater");

/** 자동 업데이트 관련 */
autoUpdater.autoInstallOnAppQuit = false; // 프로그램 종료시 업데이트 여부
let win;
let chk; // 세션 체크리스트
let gpt; // GPT 연동메뉴

function writeMessageToWindow(text) { // 현재 상태를 화면으로 볼 수 있도록 html로 전달하는 함수
    win.webContents.send("message", text);
}

function createWindow () {

    /** 기존 코드 */
    // const win = new BrowserWindow({
    //     width: 1080,
    //     height: 720,
    //     webPreferences: {
    //         /* ipcRenderer 를 직접 노출하는 경우, 비활성화 권장 */
    //         // nodeIntegration: true,
    //         // contextIsolation: false,
    //         preload: path.join(__dirname, 'preload.js'),
    //     }
    // });

    // win.loadFile('index.html')

    /** 자동 업데이트 적용 */
    win = new BrowserWindow({
        width: 960,
        height: 720,
        webPreferences: { 
          nodeIntegration: true,
          contextIsolation: false,
          // webviewTag:true,
        },
    });

    // win.webContents.openDevTools(); // 개발자 모드 활성화

    win.loadURL(`file://${__dirname}/index.html#v${app.getVersion()}`);
    return win;
}

/** 자동 업데이트 관련 */
autoUpdater.on("checking-for-update", () => { // 신규 버전 릴리즈 확인 시 호출 됨
    writeMessageToWindow("업데이트 확인 중...");
});
  
autoUpdater.on("update-available", () => {  // 업데이트 할 신규 버전이 있을 시 호출 됨
    writeMessageToWindow("신규 버전 확인 및 업데이트 가능.");
});
  
autoUpdater.on("update-not-available", () => { // 업데이트 할 신규 버전이 없을 시 호출 됨
    writeMessageToWindow("신규 버전 없음.");
});
  
autoUpdater.on("error", (err) => { // 업데이트 확인 중 에러 발생 시 호출 됨
    writeMessageToWindow("에러 발생 : " + err);
});
  

autoUpdater.on("download-progress", (progressObj) => { // 업데이트 설치 파일 다운로드 상태 수신,  해당 단계까지 자동으로 진행 됨
    let progressMsg = "Downloaded " + progressObj.percent + "%"
    writeMessageToWindow(progressMsg);
});
  
autoUpdater.on("update-downloaded", (info) => { // 업데이트 설치 파일 다운로드 완료 시 업데이트 진행 여부 선택
    writeMessageToWindow("신규 버전 설치 파일 다운로드 완료.");
  
    const option = {
      type: "question",
      buttons: ["Yes", "No"],
      defaultId: 0,
      title: "UPDATER",
      message: "프로그램 업데이트를 진행하시겠습니까?",
    };
    
    dialog.showMessageBox(win, option).then(function(res){
      writeMessageToWindow(res.response.toString());
      
      // 위에 option.buttons의 Index = res.response
      if(res.response == 0){
        writeMessageToWindow('프로그램 종료 및 업데이트');
        autoUpdater.quitAndInstall();
      }
      else{
        writeMessageToWindow('프로그램 업데이트 안함');
      }
    });
});

app.on('ready', () => {
    createWindow();

    autoUpdater.checkForUpdates(); // 자동 업데이트 체크
});

app.on('window-all-closed', () => {
    app.quit();
})

/** 네이버 로그인 테스트 */
// ipcMain.on('run_program', async (event) => {
//     writeMessageToWindow('ipcMain!');
//     const min = 100;
//     const max = 500;
//     let wait = 0;

//     const browser = await puppeteer.launch({ 
//         // headless: 'new',
//         headless: false, // headless: false 로 설정하여 GUI 모드에서 브라우저를 실행
//         executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
//         // args: [
//         //     '--no-sandbox',
//         //     '--disable-setuid-sandbox',
//         //     '--disable-web-security', // CORS 정책 우회
//         //     '--disable-features=IsolateOrigins,site-per-process' // 일부 탐지 메커니즘 우회
//         // ]
//     }); 
//     let page = null;

//     const id = 'apxkf1070';
//     const pw = 'af75951535%';
//     const idArr = [...id];
//     const pwArr = [...pw];

//     try {
//         page = await browser.newPage();
//         await page.setViewport({
//             width: 1280,
//             height: 720
//         });
//         // // userAgent 설정
//         // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.86 Safari/537.36');
//         // await page.setExtraHTTPHeaders({
//         //     'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
//         // });

//         await page.goto('https://nid.naver.com/nidlogin.login?mode=form&url=https://www.naver.com/');
//         // await page.waitForTimeout(3000);

//         wait = waitForSafety(3000, 5000);
//         await new Promise((page) => setTimeout(page, wait));

//         await page.click('#id');
//         wait = waitForSafety(1000, 3000);
//         await new Promise((page) => setTimeout(page, wait));

//         /** 1. type() 사용 */
//         //await page.type('#id', 'userId');

//         /** 2. keyboard.type() 사용  */
//         // await page.keyboard.type(id);

//         /** 3. keyboard.down(), press() 사용 */
//         for (let i of idArr) {
//             const inputVal = keyboardList.filter(e => e.shift === i || e.key === i);
//             if (inputVal.length > 0) {
//                 const code = inputVal[0].code;
//                 const shiftLeft = inputVal[0].shift === i ? 'ShiftLeft': '';
//                 if (shiftLeft) {
//                     await page.keyboard.down(shiftLeft);
//                     wait = waitForSafety(min, max);
//                     await new Promise((page) => setTimeout(page, wait));
//                     await page.keyboard.press(code);
//                     wait = waitForSafety(min, max);
//                     await new Promise((page) => setTimeout(page, wait));
//                     await page.keyboard.up(shiftLeft);
//                 } else {
//                     await page.keyboard.press(code);
//                 }
//                 wait = waitForSafety(min, max);
//                 await new Promise((page) => setTimeout(page, wait));
//             }
//         }
//         wait = waitForSafety(1000, 3000);
//         await new Promise((page) => setTimeout(page, wait));

//         await page.click('#pw');
//         wait = waitForSafety(1000, 3000);
//         await new Promise((page) => setTimeout(page, wait));

//         /** 3. keyboard.down(), press() 사용 */
//         for (let p of pwArr) {
//             const inputVal = keyboardList.filter(e => e.shift === p || e.key === p);
//             if (inputVal.length > 0) {
//                 const code = inputVal[0].code;
//                 const shiftLeft = inputVal[0].shift === p ? 'ShiftLeft': '';
//                 if (shiftLeft) {
//                     await page.keyboard.down(shiftLeft);
//                     wait = waitForSafety(min, max);
//                     await new Promise((page) => setTimeout(page, wait));
//                     await page.keyboard.press(code);
//                     wait = waitForSafety(min, max);
//                     await new Promise((page) => setTimeout(page, wait));
//                     await page.keyboard.up(shiftLeft);
//                 } else {
//                     await page.keyboard.press(code);
//                 }
//                 wait = waitForSafety(min, max);
//                 await new Promise((page) => setTimeout(page, wait));
//             }
//         }
//         wait = waitForSafety(1000, 3000);
//         await new Promise((page) => setTimeout(page, wait));

//         await page.click('.btn_login');
//         await new Promise((page) => setTimeout(page, 20000));

//     } catch (error) {
//         console.log(error);

//     } finally {
//         if (page !== null) await page.close(); // finally 절에서 페이지를 닫음
//         await browser.close();
//     }
// });

function writeMessageRunToWindow(text) { // 프로그램 로그를 화면으로 볼 수 있도록 html로 전달하는 함수
    win.webContents.send("message-run", text);
}

/** 자동화 세션 실행 */
const createChk = async () => { // 체크리스트 창 보이기

    chk = new BrowserWindow({
        parent: win,
        width: 640,
        height: 480,
        webPreferences: { 
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false,
        modal: true,
    });
    
    chk.setMenu(null);
    chk.loadURL(`file://${__dirname}/chk.html#v${app.getVersion()}`);
    chk.show();
}

ipcMain.on('chk_session', async (event) => { // win -> chk_session
    await createChk();
});

function writeMessageChkChromeToWindow(data) { // 프로그램 로그를 화면으로 볼 수 있도록 html로 전달하는 함수
    chk.webContents.send("message-chrome", data);
}

ipcMain.on('chk-chrome', async (event) => { // chk -> chk-chrome : 크롬 브라우저 설치 확인
    const browser = await puppeteer.launch({ 
        headless: 'new',
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    });
    let page = null;

    try {
        writeMessageChkChromeToWindow({ text: '크롬 브라우저 설치 확인중...', result: false });
        page = await browser.newPage();
        await waitForTimeout(3000);
        writeMessageChkChromeToWindow({ text: '크롬 브라우저 설치 확인', result: true });
        
    } catch (error) {
        console.log(error);
        writeMessageChkChromeToWindow({ text: '크롬 브라우저가 설치되지 않았습니다.', result: false });

    } finally {
        await browser.close();
    }
});

ipcMain.on('run_session', async (event) => { // chk -> run_session

    const browser = await puppeteer.launch({ 
        headless: false,
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    }); 
    let page1 = null;
    let page2 = null;

    try {
        writeMessageRunToWindow('세션 실행중...');
        page1 = await browser.newPage();

        // 1. 네이버 로그인 대기
        const naverLogin = await awaitNaverLogin(page1);

        if (!naverLogin) {
            return;
        }
        await waitForTimeout(3000);

        // 2. 경매올리고 로그인
        page2 = await browser.newPage();
        const auctionLogin = await acutionLogin(page2);

        // 세션 종료 메세지
        writeMessageRunToWindow('세션이 정상 종료되었습니다.');

    } catch (error) {
        console.log(error);

    } finally {
        await browser.close();
    }
});

/** 네이버 로그인 대기 */
const awaitNaverLogin = async (page) => {
    try {
        await page.goto('https://nid.naver.com/nidlogin.login?mode=form&url=https://www.naver.com/');
        // await new Promise((page) => setTimeout(page, 3000));

        await page.setViewport({
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
        });

        while (true) {
            await new Promise((page) => setTimeout(page, 1000));
            const e = await page.evaluate(() => {
                const elem = document.querySelector('.switch_btn'); // 로그인 화면의 스위치 객체 존재여부를 파악하여 로그인 여부 판별
                return elem;
            });
            if (e) {
                writeMessageRunToWindow('Step1. 네이버 로그인을 진행해주세요.');
            } else {
                break;
            }
        }
        return true;

    } catch (error) {
        console.log('awaitNaverLogin() -> error', error);
        writeMessageRunToWindow('Step1. 세션이 비정상적으로 종료되었습니다. 세션을 다시 실행해주세요. (사유: 네이버 로그인중 오류발생)');
        return false;
    }
}

/** 경매올리고 로그인 */
const acutionLogin = async (page) => {
    try {
        await page.goto('https://www.auctionup.co.kr/member/member01.php');
        await new Promise((page) => setTimeout(page, 3000));

        await page.setViewport({
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
        });

        // while (true) {
        //     await new Promise((page) => setTimeout(page, 1000));
        //     const e = await page.evaluate(() => {
        //         const elem = document.querySelector('.switch_btn'); // 로그인 화면의 스위치 객체 존재여부를 파악하여 로그인 여부 판별
        //         return elem;
        //     });
        //     if (e) {
        //         writeMessageRunToWindow('Step1. 네이버 로그인을 진행해주세요.');
        //     } else {
        //         break;
        //     }
        // }
        return true;

    } catch (error) {
        console.log('awaitNaverLogin() -> error', error);
        writeMessageRunToWindow('Step2. 세션이 비정상적으로 종료되었습니다. 세션을 다시 실행해주세요. (사유: 경매올리고 로그인중 오류발생)');
        return false;
    }
}

const waitForTimeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const waitForSafety = (min, max) => { // 대기시간 랜덤설정
    const wait = Math.floor(Math.random() * (max - min + 1) + min);
    console.log('waitForSafety() -> wait', wait);
    return wait;
} 

/** keyCode 리스트, 없을 경우 패턴 추가 */
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