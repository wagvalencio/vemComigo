/* =====================================================
   BUSCAR — VEM COMIGO (V1)
   Tela pública
   ===================================================== */

export function renderBuscar() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <section class="page">
      <h1>Buscar carona</h1>

      <form id="buscar-form">
        <input type="text" placeholder="Origem" />
        <input type="text" placeholder="Destino" />
        <input type="date" />

        <button type="submit">Buscar</button>
      </form>

      <div class="buscar-info">
        <p>Faça login para oferecer ou reservar uma carona.</p>
      </div>
    </section>
  `;
}
