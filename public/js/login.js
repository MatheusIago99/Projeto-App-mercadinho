(function () {
  'use strict';

  const form = document.getElementById('form-login');
  const erroEl = document.getElementById('login-erro');
  const btnEntrar = document.getElementById('btn-entrar');
  const btnMostrarSenha = document.getElementById('btn-mostrar-senha');
  const inputSenha = document.getElementById('senha');
  const iconeMostrar = btnMostrarSenha.querySelector('.icone-mostrar');
  const iconeOcultar = btnMostrarSenha.querySelector('.icone-ocultar');

  btnMostrarSenha.addEventListener('click', () => {
    const mostrando = inputSenha.type === 'text';
    inputSenha.type = mostrando ? 'password' : 'text';
    btnMostrarSenha.setAttribute('aria-pressed', String(!mostrando));
    btnMostrarSenha.setAttribute('aria-label', mostrando ? 'Mostrar senha' : 'Ocultar senha');
    iconeMostrar.hidden = !mostrando;
    iconeOcultar.hidden = mostrando;
  });

  function mostrarErro(texto) {
    erroEl.textContent = texto;
    erroEl.hidden = false;
  }

  function limparErro() {
    erroEl.hidden = true;
    erroEl.textContent = '';
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (btnEntrar.disabled) return;

    limparErro();
    const email = document.getElementById('email').value.trim();
    const senha = inputSenha.value;

    if (!email || !senha) {
      mostrarErro('Login ou senha inválidos.');
      return;
    }

    btnEntrar.disabled = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await res.json().catch(() => ({}));

      if (!res.ok) {
        mostrarErro(dados.erro || 'Login ou senha inválidos.');
        return;
      }

      window.location.href = '/index.html';
    } catch (err) {
      mostrarErro('Não foi possível conectar ao servidor.');
    } finally {
      btnEntrar.disabled = false;
    }
  });
})();
