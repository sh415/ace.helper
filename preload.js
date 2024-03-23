const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    }
  
    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type]);
    }
});

// contextBridge를 사용하여 렌더러 프로세스에서 사용할 수 있는 API를 정의합니다.
contextBridge.exposeInMainWorld(
  'electronAPI', { // 'electronAPI'는 렌더러 프로세스에서 접근할 객체 이름입니다.
    openGoogle: () => ipcRenderer.send('open-google') // 'openGoogle'은 메인 프로세스에 'open-google' 메시지를 전송하는 함수입니다.
  }
);