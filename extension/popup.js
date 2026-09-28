const HOST_NAME = 'com.smartpdvpro.launcher';
const SERVER_URL = 'http://localhost:8080';
const DASHBOARD_URL = 'http://localhost:8080/dashboard';

const openSystemButton = document.getElementById('open-system');
const sellButton = document.getElementById('sell');
const projectFolderButton = document.getElementById('project-folder');
const status = document.getElementById('status');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.dataset.state = isError ? 'error' : 'normal';
}

function showHostError() {
  setStatus('Host não instalado. Execute instalar-extensao.bat na pasta da extensão.', true);
}

openSystemButton.addEventListener('click', () => {
  chrome.tabs.create({ url: SERVER_URL });
  setStatus('Sistema aberto em uma nova aba.');
});

sellButton.addEventListener('click', () => {
  // Abre direto o dashboard. Sem login, o sistema redireciona para a tela de login.
  chrome.tabs.create({ url: DASHBOARD_URL });
  setStatus('Abrindo o dashboard de vendas...');
});

projectFolderButton.addEventListener('click', () => {
  projectFolderButton.disabled = true;
  setStatus('Abrindo a pasta da extensão...');

  let port;
  try {
    port = chrome.runtime.connectNative(HOST_NAME);
  } catch {
    showHostError();
    projectFolderButton.disabled = false;
    return;
  }

  let settled = false;
  const finish = (message, isError = false) => {
    if (settled) return;
    settled = true;
    setStatus(message, isError);
    projectFolderButton.disabled = false;
    port.disconnect();
  };

  port.onMessage.addListener((message) => {
    if (message?.ok) finish('Pasta aberta: ' + (message.folder || 'pasta da extensão'));
    else finish(message?.error || 'Não foi possível abrir a pasta.', true);
  });
  port.onDisconnect.addListener(() => {
    if (!settled) {
      showHostError();
      projectFolderButton.disabled = false;
    }
  });
  port.postMessage({ action: 'open-extension-folder' });
});
