(function () {
  const splash = document.getElementById('splash');
  if (!splash) return;

  const abertoComoApp =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if (!abertoComoApp) {
    splash.remove();
    return;
  }

  setTimeout(() => {
    splash.classList.add('escondendo');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  }, 900);
})();
