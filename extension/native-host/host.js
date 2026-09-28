const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function readMessage() {
  const header = Buffer.alloc(4);
  if (fs.readSync(0, header, 0, 4, null) !== 4) return null;
  const size = header.readUInt32LE(0);
  if (size > 1024 * 1024) throw new Error('Mensagem inválida');
  const body = Buffer.alloc(size);
  fs.readSync(0, body, 0, size, null);
  return JSON.parse(body.toString('utf8'));
}

function sendMessage(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  fs.writeSync(1, Buffer.concat([header, body]));
}

function getExtensionFolder() {
  const extensionFolder = path.resolve(__dirname, '..');
  if (!fs.existsSync(extensionFolder)) throw new Error('Pasta da extensão não encontrada.');
  return extensionFolder;
}

function getProjectFolder() {
  const projectFolder = path.resolve(getExtensionFolder(), '..');
  if (!fs.existsSync(path.join(projectFolder, 'package.json'))) {
    throw new Error('Pasta raiz do projeto não encontrada.');
  }
  return projectFolder;
}

function openFolder(folder) {
  const explorer = spawn('explorer.exe', [folder], {
    cwd: folder,
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
  });
  explorer.unref();
}

try {
  const message = readMessage();

  if (message?.action === 'open-extension-folder') {
    const folder = getExtensionFolder();
    openFolder(folder);
    sendMessage({ ok: true, folder });
  } else if (message?.action === 'open-project-folder') {
    const folder = getProjectFolder();
    openFolder(folder);
    sendMessage({ ok: true, folder });
  } else if (message?.action === 'start') {
    const projectFolder = getProjectFolder();
    const batchFile = path.join(projectFolder, 'iniciar.bat');
    if (!fs.existsSync(batchFile)) throw new Error('iniciar.bat não encontrado na raiz do projeto.');

    const child = spawn('cmd.exe', ['/d', '/c', 'call', batchFile], {
      cwd: projectFolder,
      detached: true,
      windowsHide: false,
      stdio: 'ignore',
    });
    child.unref();
    sendMessage({ ok: true, message: 'Inicialização enviada ao CMD.' });
  } else {
    throw new Error('Ação não reconhecida.');
  }
} catch (error) {
  sendMessage({ ok: false, error: error instanceof Error ? error.message : 'Falha ao executar a ação.' });
}
