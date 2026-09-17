if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

let promptInstalacao = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  promptInstalacao = event;
  const botao = document.getElementById('btn-instalar');
  if (botao) botao.hidden = false;
});

window.addEventListener('appinstalled', () => {
  promptInstalacao = null;
  const botao = document.getElementById('btn-instalar');
  if (botao) botao.hidden = true;
});

document.addEventListener('DOMContentLoaded', () => {
  const botao = document.getElementById('btn-instalar');
  if (!botao) return;

  botao.addEventListener('click', async () => {
    if (!promptInstalacao) return;
    promptInstalacao.prompt();
    await promptInstalacao.userChoice;
    promptInstalacao = null;
    botao.hidden = true;
  });
});
