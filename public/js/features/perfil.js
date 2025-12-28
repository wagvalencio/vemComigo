/* =====================================================
   PERFIL — VEM COMIGO (V1)
   Login conectado ao Auth
   ===================================================== */

import { loginUsuario } from '../auth/auth.js';

export function renderPerfil() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <section class="page">
      <h1>Minha conta</h1>

      <div class="auth-box">
        <h2>Entrar</h2>

        <input id="login-email" type="email" placeholder="E-mail" />
        <input id="login-senha" type="password" placeholder="Senha" />

        <button id="btn-login">Entrar</button>
      </div>

      <hr />

      <div class="auth-box">
        <h2>Criar conta</h2>

        <input type="text" placeholder="Nome completo" />
        <input type="email" placeholder="E-mail" />
        <input type="date" />
        <input type="text" placeholder="CPF" />
        <input type="password" placeholder="Senha" />

        <button disabled>Cadastrar (em breve)</button>
      </div>
    </section>
  `;

  const btnLogin = document.getElementById('btn-login');
  btnLogin.addEventListener('click', handleLogin);
}

async function handleLogin() {
  const email = document.getElementById('login-email')?.value.trim();
  const senha = document.getElementById('login-senha')?.value.trim();

  if (!email || !senha) {
    alert('Preencha e-mail e senha');
    return;
  }

  try {
    await loginUsuario(email, senha);
    alert('Login realizado com sucesso');
  } catch (err) {
    alert(err.message || 'Erro ao fazer login');
  }
}
