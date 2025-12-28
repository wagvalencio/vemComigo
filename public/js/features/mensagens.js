/* =====================================================
   MENSAGENS — VEM COMIGO (V1)
   Placeholder
   ===================================================== */

export function renderMensagens() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <section class="page">
      <h1>Mensagens</h1>
      <p>Nenhuma conversa iniciada.</p>
    </section>
  `;
}
