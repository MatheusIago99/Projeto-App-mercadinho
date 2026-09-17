(function () {
  const splash = document.getElementById('splash');
  if (!splash) return;

  const abertoComoApp =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  let jaMostrouNestaSessao = false;
  try {
    jaMostrouNestaSessao = sessionStorage.getItem('smartestoque-splash-mostrada') === '1';
  } catch (e) {
    // sessionStorage indisponível (ex: navegação privada): trata como se ainda não tivesse mostrado.
  }

  if (!abertoComoApp || jaMostrouNestaSessao) {
    splash.remove();
    return;
  }

  try {
    sessionStorage.setItem('smartestoque-splash-mostrada', '1');
  } catch (e) {
    // sem sessionStorage, a splash pode repetir entre navegações; sem problema.
  }

  setTimeout(() => {
    splash.classList.add('escondendo');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  }, 900);
})();
