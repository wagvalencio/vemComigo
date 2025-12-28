/* =====================================================
   ROUTER — VEM COMIGO (V1)
   Responsável apenas por:
   - decidir qual tela renderizar
   - proteger rotas privadas
   ===================================================== */

import { isAuthenticated } from './state.js';
import { renderBuscar } from '../features/buscar.js';
import { renderOferecer } from '../features/oferecer.js';
import { renderViagens } from '../features/viagens.js';
import { renderPerfil } from '../features/perfil.js';
import { renderMensagens } from '../features/mensagens.js';

/* ===== ROTAS PÚBLICAS ===== */
const publicRoutes = ['buscar'];

/* ===== ROUTER ===== */
export function navigate(route) {
  if (!route) route = 'buscar';

  if (!publicRoutes.includes(route) && !isAuthenticated()) {
    route = 'buscar';
  }

  switch (route) {
    case 'buscar':
      renderBuscar();
      break;

    case 'oferecer':
      renderOferecer();
      break;

    case 'viagens':
      renderViagens();
      break;

    case 'perfil':
      renderPerfil();
      break;

    case 'mensagens':
      renderMensagens();
      break;

    default:
      renderBuscar();
  }
}
