/* ===================================================== AUTH — VEM COMIGO (V1) Responsável apenas por:

cadastro

login

logout NÃO renderiza telas NÃO controla navegação ===================================================== */


import { supabase } from '../config/supabase.js'; import { setUser, clearUser } from '../core/state.js';

/* ===== CADASTRO ===== */ export async function cadastrarUsuario({ nome, email, senha, data_nascimento, cpf }) { const { data, error } = await supabase.auth.signUp({ email, password: senha });

if (error) throw error;

const user = data.user;

const { error: insertError } = await supabase .from('users') .insert([ { id: user.id, nome, email, data_nascimento, cpf, tipo_usuario: 'passageiro' } ]);

if (insertError) throw insertError;

setUser(user); return user; }

/* ===== LOGIN ===== */ export async function loginUsuario(email, senha) { const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

if (error) throw error;

setUser(data.user); return data.user; }

/* ===== LOGOUT ===== */ export async function logoutUsuario() { const { error } = await supabase.auth.signOut(); if (error) throw error;

clearUser(); }
