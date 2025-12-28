/* =====================================================
   STATE GLOBAL — VEM COMIGO (V1)
   Responsável apenas por:
   - armazenar usuário logado
   - expor getters simples
   ===================================================== */

let currentUser = null;

/* ===== SET USER ===== */
export function setUser(user) {
  currentUser = user;
}

/* ===== CLEAR USER ===== */
export function clearUser() {
  currentUser = null;
}

/* ===== GET USER ===== */
export function getUser() {
  return currentUser;
}

/* ===== IS AUTHENTICATED ===== */
export function isAuthenticated() {
  return currentUser !== null;
}
