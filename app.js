const { app, dialog, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const puppeteer = require('puppeteer');
const {autoUpdater} = require("electron-updater");
const Datastore = require('nedb');
const { promisify } = require('util');
const { PythonShell } = require('python-shell');

/** 자동 업데이트 관련 */
autoUpdater.autoInstallOnAppQuit = false; // 프로그램 종료시 업데이트 여부
let win; // 메인 창
let chk; // 세션 체크리스트 창
let gpt; // GPT 연동메뉴 창

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

function writeMessageRunToWindow(text) { // 프로그램 로그를 화면으로 볼 수 있도록 html로 전달하는 함수
    win.webContents.send("message-run", text);
}

/** 자동화 세션 실행 */
const createChk = async () => { // 체크리스트 창 보이기

    chk = new BrowserWindow({
        parent: win,
        width: 640,
        height: 720,
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
    chk.webContents.send("message-chk1", data);
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
        await waitForTimeout(2000);

        const userAgent = await page.evaluate(() => {
            const result = navigator.userAgent;
            return result;
        });

        writeMessageChkChromeToWindow({ text: userAgent, result: true });
        
    } catch (error) {
        console.log(error);
        writeMessageChkChromeToWindow({ text: '크롬 브라우저가 설치되지 않았습니다.', result: false });

    } finally {
        await browser.close();
    }
});

function writeMessageChkAuctionToWindow(data) { // 프로그램 로그를 화면으로 볼 수 있도록 html로 전달하는 함수
    chk.webContents.send("message-chk2", data);
}

ipcMain.on('chk-auction', async (event) => { // chk -> chk-auction : 경매올리고 로그인 테스트
    try {
        const db = new Datastore({ 
            filename: '../database.db', 
            autoload: true,
        });
        const findOneAsync = promisify(db.findOne.bind(db));
        const result = await findOneAsync({ _id: 'userInfo' });
    
        if (!result) {
            await waitForTimeout(2000);
            writeMessageChkAuctionToWindow({ text: '경매올리고 계정을 등록해야 합니다.', result: false });
            return;
        }
    
        // 등록계정의 유효성 검사
        writeMessageChkAuctionToWindow({ text: '등록한 계정이 유효한지 확인중...', result: 33 });
        const browser = await puppeteer.launch({ 
            headless: 'new',
            executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        });
        let page = null;

        try {
            page = await browser.newPage();
            await page.setViewport({
                width: 1280,
                height: 720,
                deviceScaleFactor: 1,
            });
            await page.goto('https://www.auctionup.co.kr/member/member01.php', {waitUntil: 'domcontentloaded'});
            await new Promise((page) => setTimeout(page, 3000));

            await page.type('#id', result.id);
            await new Promise((page) => setTimeout(page, 1000));
            await page.type('#passwd', result.pw);
            await new Promise((page) => setTimeout(page, 1000));
            await page.evaluate(() => {
                document.querySelector('.sbtn01').click();
            });
            await new Promise((page) => setTimeout(page, 3000));

            await page.goto('https://www.auctionup.co.kr/member/member01.php', {waitUntil: 'domcontentloaded'});
            await new Promise((page) => setTimeout(page, 3000));

            // smi_num02
            const remain = await page.evaluate(() => {
                return document.querySelector('.smi_num02').innerText;
            });
            writeMessageChkAuctionToWindow({ text: `계정이 유효합니다. (잔여 ${remain}일)`, result: 55 });

        } catch (error) {
            console.log(error);
            writeMessageChkAuctionToWindow({ text: '유효성 검사중 오류, 계정 정보가 정확한지 확인하십시오.', result: 44 });

        } finally {
            await browser.close();
        }

    } catch (error) {
        console.log(error);
    }
});

ipcMain.on('set_auction', async (event, data) => { // chk -> set-auction : 경매올리고 계정 등록
    try {
        writeMessageChkAuctionToWindow({ text: '등록한 계정 검사중...', result: 11 });
        const browser = await puppeteer.launch({ 
            headless: 'new',
            executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        });
        let page = null;
        let isInsert = false;

        try {
            page = await browser.newPage();
            await page.setViewport({
                width: 1280,
                height: 720,
                deviceScaleFactor: 1,
            });
            await page.goto('https://www.auctionup.co.kr/member/member01.php', {waitUntil: 'domcontentloaded'});
            await new Promise((page) => setTimeout(page, 2000));

            await page.type('#id', data.id);
            await new Promise((page) => setTimeout(page, 1000));
            await page.type('#passwd', data.pw);
            await new Promise((page) => setTimeout(page, 1000));
            await page.evaluate(() => {
                document.querySelector('.sbtn01').click();
            });
            await new Promise((page) => setTimeout(page, 3000));

            await page.goto('https://www.auctionup.co.kr/member/member01.php', {waitUntil: 'domcontentloaded'});
            await new Promise((page) => setTimeout(page, 2000));

            // smi_num02
            const remain = await page.evaluate(() => {
                return document.querySelector('.smi_num02').innerText;
            });
            writeMessageChkAuctionToWindow({ text: `계정이 유효합니다. (잔여 ${remain}일)`, result: 55 });
            isInsert = true;

        } catch (error) {
            console.log(error);
            writeMessageChkAuctionToWindow({ text: '유효성 검사중 오류, 계정 정보가 정확한지 확인하십시오.', result: 44 });

        } finally {
            await browser.close();
        }

        if (isInsert) {
            const db = new Datastore({ 
                filename: '../database.db', 
                autoload: true,
            });
            const doc = { // 저장할 파일
                _id : 'userInfo',
                id : data.id,
                pw : data.pw,
            };
            db.insert(doc, async (err, newDoc) => {  // 데이터 저장
                if(err !== null){
                    console.log(err);
                    return;
                }
                console.log(newDoc);
            });
        }
        
    } catch (error) {
        console.log(error);
    }
});

function writeMessageChkPathToWindow(data) { // 프로그램 로그를 화면으로 볼 수 있도록 html로 전달하는 함수
    chk.webContents.send("message-chk3", data);
}

ipcMain.on('chk_path_start', async (event) => { // chk -> chk_path : 이미지 경로 설정 확인
    try {
        const db = new Datastore({ 
            filename: '../database.db', 
            autoload: true,
        });
        const findOneAsync = promisify(db.findOne.bind(db));
        const result = await findOneAsync({ _id: 'path_start' });

        if (!result) {
            writeMessageChkPathToWindow({ text: '이미지 폴더를 설정하지 않았습니다.', result: false });
            return;

        } else {
            writeMessageChkPathToWindow({ text: `폴더 위치: ${result.path}`, result: true });
        }
    
    } catch (error) {
        console.log(error);
    }
});

ipcMain.on('set_path_start', async (event) => { // chk -> set_path_start : 블로그 시작 이미지 경로 설정
    try {
        const db = new Datastore({ 
            filename: '../database.db', 
            autoload: true,
        });

        dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        }).then(async (result) => {
            console.log(result.filePaths); // 선택한 폴더의 경로 출력
            const query = { _id: 'path_start' };

            db.update(query, { $set: { path: result.filePaths[0] } }, { upsert : true }, (err, newDoc) => { // 문서 업데이트 시도, 없으면 새 레코드 추가
                if (err) {
                    console.error('업데이트 중 오류 발생:', err);
                    return;
                }
                console.log(`문서 업데이트 성공. 영향 받은 문서 수: ${newDoc}`);
            });

            const findOneAsync = promisify(db.findOne.bind(db));
            const findResult = await findOneAsync({ _id: 'path' });
            writeMessageChkPathToWindow({ text: `폴더 위치: ${findResult.path}`, result: true });

        }).catch(err => {
            console.log(err);
        });
    
    } catch (error) {
        console.log(error);
    }
});

function writeMessageChkPathToWindow2(data) { // 프로그램 로그를 화면으로 볼 수 있도록 html로 전달하는 함수
    chk.webContents.send("message-chk4", data);
}

ipcMain.on('chk_path_end', async (event) => { // chk -> chk_path : 이미지 경로 설정 확인
    try {
        const db = new Datastore({ 
            filename: '../database.db', 
            autoload: true,
        });
        const findOneAsync = promisify(db.findOne.bind(db));
        const result = await findOneAsync({ _id: 'path_end' });

        if (!result) {
            writeMessageChkPathToWindow2({ text: '이미지 폴더를 설정하지 않았습니다.', result: false });
            return;

        } else {
            writeMessageChkPathToWindow2({ text: `폴더 위치: ${result.path}`, result: true });
        }
    
    } catch (error) {
        console.log(error);
    }
});

ipcMain.on('set_path_end', async (event) => { // chk -> set_path_end : 블로그 시작 이미지 경로 설정
    try {
        const db = new Datastore({ 
            filename: '../database.db', 
            autoload: true,
        });

        dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        }).then(async (result) => {
            console.log(result.filePaths); // 선택한 폴더의 경로 출력
            const query = { _id: 'path_end' };

            db.update(query, { $set: { path: result.filePaths[0] } }, { upsert : true }, (err, newDoc) => { // 문서 업데이트 시도, 없으면 새 레코드 추가
                if (err) {
                    console.error('업데이트 중 오류 발생:', err);
                    return;
                }
                console.log(`문서 업데이트 성공. 영향 받은 문서 수: ${newDoc}`);
            });

            const findOneAsync = promisify(db.findOne.bind(db));
            const findResult = await findOneAsync({ _id: 'path' });
            writeMessageChkPathToWindow2({ text: `폴더 위치: ${findResult.path}`, result: true });

        }).catch(err => {
            console.log(err);
        });
    
    } catch (error) {
        console.log(error);
    }
});

function writeMessageChkNaverWindow(data) { // 프로그램 로그를 화면으로 볼 수 있도록 html로 전달하는 함수
    chk.webContents.send("message-chk5", data);
}

ipcMain.on('chk_naver', async (event) => { // chk -> chk-naver : 네이버 계정 등록 확인
    try {
        const db = new Datastore({ 
            filename: '../database.db', 
            autoload: true,
        });
        const findOneAsync = promisify(db.findOne.bind(db));
        const result = await findOneAsync({ _id: 'naver' });
    
        if (!result) {
            writeMessageChkNaverWindow({ text: '네이버 계정을 등록해야 합니다.', result: false });

        } else {
            writeMessageChkNaverWindow({ text: '네이버 계정이 등록되었습니다.', result: true });
        }

    } catch (error) {
        console.log(error);
    }
});

ipcMain.on('set_naver', async (event, data) => { // chk -> set-naver : 네이버 계정 등록
    try {
        const db = new Datastore({ 
            filename: '../database.db', 
            autoload: true,
        });
       
        const doc = { // 저장할 파일
            _id : 'naver',
            id : data.id,
            pw : data.pw,
        };
        db.insert(doc, async (err, newDoc) => {  // 데이터 저장
            if(err !== null){
                console.log(err);
                return;
            }
            console.log(newDoc);
        });

        writeMessageChkNaverWindow({ text: '네이버 계정이 등록되었습니다.', result: true });
        
    } catch (error) {
        console.log(error);
    }
});

// ipcMain.on('chk_phone', async (event, data) => { // chk -> set_phone : 전화번호 등록
//     try {
//         const db = new Datastore({ 
//             filename: '../database.db', 
//             autoload: true,
//         });
//         const findOneAsync = promisify(db.findOne.bind(db));
//         const result = await findOneAsync({ _id: 'phone' });

//         if (!result) {
//             writeMessageChkPhoneWindow({ text: '전화번호를 등록하지 않았습니다.', result: false });
//             return;

//         } else {
//             writeMessageChkPhoneWindow({ text: `전화번호: ${result.phone}`, result: true });
//         }
    
//     } catch (error) {
//         console.log(error);
//     }
// });

// ipcMain.on('set_phone', async (event, data) => { // chk -> set_phone : 전화번호 등록
//     try {
//         const db = new Datastore({ 
//             filename: '../database.db', 
//             autoload: true,
//         });

//         const query = { _id: 'phone' };
//         db.update(query, { $set: { phone: data.phone } }, { upsert : true }, (err, newDoc) => { // 문서 업데이트 시도, 없으면 새 레코드 추가
//             if (err) {
//                 console.error('업데이트 중 오류 발생:', err);
//                 return;
//             }
//             console.log(`문서 업데이트 성공. 영향 받은 문서 수: ${newDoc}`);
//         });

//         const findOneAsync = promisify(db.findOne.bind(db));
//         const findResult = await findOneAsync({ _id: 'phone' });
//         writeMessageChkPhoneWindow({ text: `전화번호: ${findResult.phone}`, result: true });
    
//     } catch (error) {
//         console.log(error);
//     }
// });

/** 자동화 프로세스 */
ipcMain.on('run_session', async (event) => { // chk -> run_session
    try {
        writeMessageRunToWindow('세션 실행중...');

        const count = 0;
        while (true) {
            if (count >= 30) {
                break;
            }

            // 경매올리고에서 관심물건이 없으면 종료
            const list = await checkAuction();
            if (list === 0) {
                break;
            }

            const processRun = await scrapAndPost();
            if (!processRun) {
                return;
            }
            await waitForTimeout(6*60*1000); // 프로세스 실행 시간

            let awaitTime = 6*60;
            for (let i = 0; i < awaitTime; i++) {
                writeMessageRunToWindow('글쓰기 작업중 입니다. ' + (awaitTime - i) + '초 후에 정상 종료됩니다.');
                await waitForTimeout(1000); // 프로세스 실행 시간
            }

            // 세션 종료 메세지
            writeMessageRunToWindow('글쓰기 작업이 정상 종료되었습니다.');
            await waitForTimeout(1000);

            // 경매올리고에서 관심물건 해지
            await deleteAuction()
            count ++;
        }
        writeMessageRunToWindow('세션이 정상 종료되었습니다.');

    } catch (error) {
        console.log(error);
        writeMessageRunToWindow('세션이 실행중 오류');

    } finally {
        writeMessageRunToWindow('세션이 정상 종료되었습니다.');
    }
});

const checkAuction = async() => { // 경매올리고 관심물건 개수 체크
    writeMessageRunToWindow('경매올리고 관심물건 확인중...');

    const db = new Datastore({ 
        filename: '../database.db', 
        autoload: true,
    });
    const findOneAsync = promisify(db.findOne.bind(db));
    const result = await findOneAsync({ _id: 'userInfo' });

    let count = 0;

    const browser = await puppeteer.launch({ 
        headless: false,
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    });
    let page = null;

    try {
        page = await browser.newPage();
        await page.setViewport({
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
        });
        await page.goto('https://www.auctionup.co.kr/member/member01.php', {waitUntil: 'domcontentloaded'});
        await new Promise((page) => setTimeout(page, 3000));

        await page.type('#id', result.id);
        await new Promise((page) => setTimeout(page, 1000));
        await page.type('#passwd', result.pw);
        await new Promise((page) => setTimeout(page, 1000));
        await page.evaluate(() => {
            document.querySelector('.sbtn01').click();
        });
        await new Promise((page) => setTimeout(page, 3000));

        await page.goto('https://www.auctionup.co.kr/mypage/mypage07.php', {waitUntil: 'domcontentloaded'}); //  관심물건 페이지로 이동
        await new Promise((page) => setTimeout(page, 3000));

        count = await page.evaluate(() => {
            return document.querySelectorAll('.list_one').length;
        });

    } catch (error) {
        console.log(error);
        writeMessageRunToWindow('경매올리고 관심물건 개수 확인중 오류');

    } finally {
        await browser.close();
        return count;
    }
}

const deleteAuction = async() => { // 경매올리고 관심물건 해지
    writeMessageRunToWindow('경매올리고 관심물건 해지중...');

    const db = new Datastore({ 
        filename: '../database.db', 
        autoload: true,
    });
    const findOneAsync = promisify(db.findOne.bind(db));
    const result = await findOneAsync({ _id: 'userInfo' });

    const browser = await puppeteer.launch({ 
        headless: false,
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    });
    let page = null;

    try {
        page = await browser.newPage();
        await page.setViewport({
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
        });
        await page.goto('https://www.auctionup.co.kr/member/member01.php', {waitUntil: 'domcontentloaded'});
        await new Promise((page) => setTimeout(page, 3000));

        await page.type('#id', result.id);
        await new Promise((page) => setTimeout(page, 1000));
        await page.type('#passwd', result.pw);
        await new Promise((page) => setTimeout(page, 1000));
        await page.evaluate(() => {
            document.querySelector('.sbtn01').click();
        });
        await new Promise((page) => setTimeout(page, 3000));

        await page.goto('https://www.auctionup.co.kr/mypage/mypage07.php', {waitUntil: 'domcontentloaded'}); //  관심물건 페이지로 이동
        await new Promise((page) => setTimeout(page, 3000));

        await page.evaluate(() => { // 상단의 관심물건 체크 후 해지
            document.querySelector('#aChk').click();
        });
        await new Promise((page) => setTimeout(page, 3000));

        await page.evaluate(() => {

            page.on('dialog', async dialog => {
                console.log(dialog.message()); // Dialog의 메시지를 로그로 출력합니다.
                await dialog.accept(); // '확인' 버튼을 클릭합니다.
              });

            document.querySelector('#sort').querySelector('a').click()
        });
        await new Promise((page) => setTimeout(page, 3000));

    } catch (error) {
        console.log(error);
        writeMessageRunToWindow('경매올리고 관심물건 해지중 오류');

    } finally {
        await browser.close();
    }
}

const scrapAndPost = async (page) => {
    try {
        writeMessageRunToWindow('Step1. 경매올리고 로그인 및 데이터 스크래핑 중...');

        const db = new Datastore({
            filename: '../database.db', 
            autoload: true,
        });
        const findOneAsync = promisify(db.findOne.bind(db));
        const result = await findOneAsync({ _id: 'userInfo' });
        const resultNaver = await findOneAsync({ _id: 'naver' });
        const resultPathStart = await findOneAsync({ _id: 'path_start' });
        const resultPathEnd = await findOneAsync({ _id: 'path_end' });

        let options = {
            mode: 'text',  // 텍스트 기반 통신 (대안으로 'json', 'binary' 등이 있음)
            // pythonPath: '../venv/Scripts/python', // 테스트: Python 인터프리터의 경로 (예: 가상환경)
            pythonPath: 'resources/venv/Scripts/python',  // 배포: Python 인터프리터의 경로 (예: 가상환경)
            pythonOptions: ['-u'],  // Python 인터프리터 옵션
            // scriptPath: '../venv',  // 테스트: Python 스크립트가 있는 디렉토리
            scriptPath: 'resources/venv',  // 배포: Python 스크립트가 있는 디렉토리
            args: [JSON.stringify({ 
                id: result.id,
                pw: result.pw,
                naverId: resultNaver.id,
                naverPw: resultNaver.pw,
                pathStart: resultPathStart.path,
                pathEnd: resultPathEnd.path
            })]
            // args: ['value1', 'value2', 'value3']  // Python 스크립트로 전달할 인자
        };

        PythonShell.run('script.py', options, function (err, results) {
            if (err) throw err;
            console.log('results', results); // 'results'는 Python 스크립트의 출력을 담은 배열입니다
        });

        return true;

    } catch (error) {
        console.log('awaitNaverLogin() -> error', error);
        writeMessageRunToWindow('Step1. 세션이 비정상적으로 종료되었습니다. 세션을 다시 실행해주세요. (사유: 경매올리고 로그인 및 데이터 스크래핑 오류)');
        return false;
    }
}

const waitForTimeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}
