const {
  app, dialog, ipcMain
  , BrowserWindow
  , Tray, Menu
} = require('electron')

const path = require('path')
const { autoUpdater } = require("electron-updater");
const { execFile } = require('child_process');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

/** 변수 선언 및 기본 세팅 */
autoUpdater.autoInstallOnAppQuit = false; // 프로그램 종료시 업데이트 여부
let win; // 메인 창
let tray = null; // 트레이

function writeMessageToWindow(text) { // 현재 상태를 화면으로 볼 수 있도록 html로 전달하는 함수
  win.webContents.send("message", text);
}

function createWindow() {

  /** 기존 코드 */
  // const win = new BrowserWindow({
  //   width: 1080,
  //   height: 720,
  //   webPreferences: {
  //       /* ipcRenderer 를 직접 노출하는 경우, 비활성화 권장 */
  //       // nodeIntegration: true,
  //       // contextIsolation: false,
  //       preload: path.join(__dirname, 'preload.js'),
  //   }
  // });

  // win.loadFile('index.html')

  /** 자동 업데이트 적용 */
  win = new BrowserWindow({
    width: 640,
    height: 780,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // webviewTag:true,
    },
    icon: path.join(process.resourcesPath, 'icon.png')
  });

  win.setMenu(null);
  // win.webContents.openDevTools(); // 개발자 모드 활성화
  win.loadURL(`file://${__dirname}/index.html#v${app.getVersion()}`);

  setupDatabase();

  ipcMain.handle('get-settings', async () => {
    console.log('get-settings')
    return await getSettings();
  });

  return win;
}

async function setupDatabase() { // 데이터베이스 설정

  // SQLite3 데이터베이스 연결
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  console.log('Database connected.');

  try {
    // 데이터베이스에 쿼리 실행
    await db.exec(`CREATE TABLE IF NOT EXISTS t_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- 자동 증가하는 정수형 기본 키
        path_start TEXT,
        path_end TEXT,
        auction_id TEXT,
        auction_pw TEXT,
        naver_id TEXT,
        naver_pw TEXT,
        api_key TEXT,
        question1 TEXT,
        question1_plus TEXT,
        question2 TEXT,
        method TEXT
    )`);
    console.log('Table created or verified.');

    // 테이블에 데이터가 있는지 확인
    const rowCount = await db.get(`SELECT COUNT(*) as count FROM t_settings`);
    if (rowCount.count === 0) {
      // 데이터 삽입
      await db.run(`INSERT INTO t_settings (path_start, path_end, auction_id, auction_pw, naver_id, naver_pw, api_key, question1, question1_plus, question2, method) VALUES ('', '', '', '', '', '', '', '', '', '', 'post')`);
      console.log('Initial data inserted.');
    } else {
      console.log('Table already contains data. No insertion needed.');
    }

  } catch (err) {
    console.error(err.message);
  } finally {
    // 데이터베이스 연결 해제
    await db.close();
    console.log('Database closed.');
  }
}

async function getSettings() { // 설정값 불러오기
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    const settings = await db.get(`SELECT * FROM t_settings WHERE id = 1`);
    return settings;

  } catch (err) {
    console.error(err.message);

  } finally {
    await db.close();
  }
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
  let progressMsg = "Downloaded " + Math.round(progressObj.percent) + "%"
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

  dialog.showMessageBox(win, option).then(function (res) {
    writeMessageToWindow(res.response.toString());

    // 위에 option.buttons의 Index = res.response
    if (res.response == 0) {
      writeMessageToWindow('프로그램 종료 및 업데이트');
      autoUpdater.quitAndInstall();
    }
    else {
      writeMessageToWindow('프로그램 업데이트 안함');
    }
  });
});

app.on('ready', () => {
  createWindow();

  /** 트레이 관련 */
  tray = new Tray(path.join(process.resourcesPath, 'icon.png')); // 아이콘 경로 설정
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '열기', click: () => {
        win.show();
      }
    },
    {
      label: '종료', click: () => {
        app.quit();
      }
    }
  ]);
  tray.setToolTip('This is my application.');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    win.isVisible() ? win.hide() : win.show();
  });

  win.on('minimize', (event) => {
    event.preventDefault();
    win.hide();
  });

  autoUpdater.checkForUpdates(); // 자동 업데이트 체크
});

app.on('window-all-closed', () => {
  app.quit();
})


/** 설정값 관련 */
// 0. 발행/저장 여부 설정
ipcMain.on('method', async (event, method) => {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET method = ? WHERE id = 1`, method);
    console.log('Method updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
    // event.sender.send('method', method);
  }
});

// 1. 블로그 시작 폴더 설정
ipcMain.on('open-dialog-start', (event) => {
  dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled) {
      const selectedPath = result.filePaths[0];
      updateStartPath(selectedPath); // 데이터베이스에 선택한 디렉토리 경로 저장
      event.sender.send('start-directory', selectedPath);
    }
  }).catch(err => {
    console.error(err);
  });
});

async function updateStartPath(p) {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET path_start = ? WHERE id = 1`, p);
    console.log('Directory path updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
  }
}

// 2. 블로그 마무리 폴더 설정
ipcMain.on('open-dialog-end', (event) => {
  dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled) {
      const selectedPath = result.filePaths[0];
      updateEndPath(selectedPath); // 데이터베이스에 선택한 디렉토리 경로 저장
      event.sender.send('end-directory', selectedPath);
    }
  }).catch(err => {
    console.error(err);
  });
});

async function updateEndPath(p) {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET path_end = ? WHERE id = 1`, p);
    console.log('Directory path updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
  }
}

// 3. 옥션 아이디 설정
ipcMain.on('auction-id-update', async (event, auctionId) => {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET auction_id = ? WHERE id = 1`, auctionId);
    console.log('AuctionId updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
    event.sender.send('auction-id-data', auctionId);
  }
});

// 4. 옥션 비밀번호 설정
ipcMain.on('auction-pw-update', async (event, auctionPw) => {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET auction_pw = ? WHERE id = 1`, auctionPw);
    console.log('AuctionPw updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
    event.sender.send('auction-pw-data', auctionPw);
  }
});

// 5. 네이버 아이디 설정
ipcMain.on('naver-id-update', async (event, naverId) => {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET naver_id = ? WHERE id = 1`, naverId);
    console.log('NaverId updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
    event.sender.send('naver-id-data', naverId);
  }
});

// 6. 네이버 비밀번호 설정
ipcMain.on('naver-pw-update', async (event, naverPw) => {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET naver_pw = ? WHERE id = 1`, naverPw);
    console.log('NaverPw updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
    event.sender.send('naver-pw-data', naverPw);
  }
});

// 7. API 설정
ipcMain.on('api-key-update', async (event, apiKey) => {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET api_key = ? WHERE id = 1`, apiKey);
    console.log('API_KEY updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
    event.sender.send('api-key-data', apiKey);
  }
});

// 8. AI 질문1 설정
ipcMain.on('question1-update', async (event, question) => {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET question1 = ? WHERE id = 1`, question);
    console.log('Question1 updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
    event.sender.send('question1-data', question);
  }
});

// 9. AI 질문1-추가질문 설정
ipcMain.on('question1-plus-update', async (event, question) => {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET question1_plus = ? WHERE id = 1`, question);
    console.log('Question1 plus updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
    event.sender.send('question1-plus-data', question);
  }
});

// 10. AI 질문2 설정
ipcMain.on('question2-update', async (event, question) => {
  const db = await sqlite.open({
    filename: path.join(process.resourcesPath, 'exec_program', 'database.db'),
    driver: sqlite3.Database
  });

  try {
    await db.run(`UPDATE t_settings SET question2 = ? WHERE id = 1`, question);
    console.log('Question2 updated.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
    console.log('database closed.');
    event.sender.send('question2-data', question);
  }
});


/** 프로그램 실행 관련 */
ipcMain.on('run_session', async (event) => { // win -> run_session

  const programPath = path.join(process.resourcesPath, 'exec_program', 'gui.exe');
  const programDir = path.dirname(programPath);

  // execFile(path.join(__dirname, 'gui/gui.exe'), (error, stdout, stderr) => {
  execFile(programPath, { cwd: programDir }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing file: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  });
});

const waitForTimeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}
