/* =====================================================
   OFERECER — VEM COMIGO (V1)
   Placeholder
   ===================================================== */

export function renderOferecer() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <section class="page">
      <h1>Oferecer carona</h1>
      <p>Disponível após aprovação como motorista.</p>
    </section>
  `;
}
