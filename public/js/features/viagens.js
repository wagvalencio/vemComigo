/* =====================================================
   VIAGENS — VEM COMIGO (V1)
   Placeholder
   ===================================================== */

export function renderViagens() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <section class="page">
      <h1>Minhas viagens</h1>
      <p>Você ainda não possui viagens.</p>
    </section>
  `;
}
