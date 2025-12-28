/*alert('AUTH.JS CARREGOU'); */

/* =====================================================
   SUPABASE — CONFIGURAÇÃO GLOBAL
   ===================================================== */
const SUPABASE_URL = 'https://qssdlpxcdbeoonungbhf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzc2RscHhjZGJlb29udW5nYmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MTU1NDcsImV4cCI6MjA4MTI5MTU0N30.wGuN53SNkGKURzbYXGpSXVJv2gQb4HTCNXqiEltc_6s';

window.supabase = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* =====================================================
   AUTH — LOGIN
   ===================================================== */
async function login(email, senha) {
  const { data, error } = await window.supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    alert(error.message);
    return;
  }

  window.usuarioLogado = data.user;
  alert('LOGIN OK: ' + data.user.email);

  location.hash = 'buscar';
}

/* =====================================================
   AUTH — CADASTRO
   ===================================================== */
async function handleCadastro() {
  const email = document.getElementById('cad-email')?.value.trim();
  const password = document.getElementById('cad-password')?.value.trim();

  if (!email || !password) {
    alert('Preencha todos os campos');
    return;
  }

  const { error } = await window.supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert('Conta criada! Agora faça login.');
  location.hash = 'login';
}
