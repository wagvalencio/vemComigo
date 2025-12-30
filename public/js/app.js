/*alert('app.js carregou');*/

window.usuarioLogado = null;
/* =====================================================
   RESTAURAR SESSÃO
===================================================== */
async function restaurarSessao() {
  const { data } = await supabase.auth.getUser();
  window.usuarioLogado = data?.user ?? null;
}

if (!document.getElementById('app')) {
  alert('DIV #app NÃO EXISTE');
}

window.addEventListener('load', async () => {
  await restaurarSessao();
  router();
});

const app = document.getElementById('app');

/* =====================================================
   TELA: BUSCAR
===================================================== */
async function renderBuscar() {
  app.innerHTML = `
    <div class="page">
      <h1>Buscar carona</h1>

      <div class="card info-card">
        <p>
          💡 Escolha a <strong>data</strong> ou use os campos de origem e destino
          para encontrar caronas disponíveis.
        </p>
      </div>

      <div class="card">
        <input type="text" id="buscar-origem" placeholder="Origem" />
        <input type="text" id="buscar-destino" placeholder="Destino" />

        <label class="form-label">Data da viagem</label>
        <input type="date" id="buscar-data" />

        <button id="btn-buscar" class="btn-primary">Buscar</button>
      </div>

      <h2 class="section-title">Viagens disponíveis</h2>
      <div id="resultado-busca">
        <p style="text-align:center; color:#6b7280;">
          Carregando viagens...
        </p>
      </div>
    </div>
  `;

  const btnBuscar = document.getElementById("btn-buscar");
  const resultado = document.getElementById("resultado-busca");

  await carregarViagensDisponiveis(resultado);

  btnBuscar.onclick = async () => {
    resultado.innerHTML = `<p style="text-align:center;">Buscando...</p>`;

    const origem = document.getElementById("buscar-origem").value.trim();
    const destino = document.getElementById("buscar-destino").value.trim();
    const data = document.getElementById("buscar-data").value;

    const hoje = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("viagens")
      .select("*")
      .gt("vagas", 0)
      .gte("data", hoje)
      .order("is_destaque", { ascending: false })
      .order("data", { ascending: true });

    if (origem) query = query.ilike("origem", `%${origem}%`);
    if (destino) query = query.ilike("destino", `%${destino}%`);
    if (data) query = query.eq("data", data);

    const { data: viagens, error } = await query;

    if (error) {
      resultado.innerHTML = `<p style="text-align:center;">Erro ao buscar viagens.</p>`;
      return;
    }

    renderResultadoBusca(viagens, resultado);
  };
}

/* =====================================================
   CARREGAR VIAGENS DISPONIVEIS
===================================================== */
async function carregarViagensDisponiveis(container) {
  const hoje = new Date().toISOString().split("T")[0];

  const { data: viagens, error } = await supabase
    .from("viagens")
    .select("*")
    .gt("vagas", 0)
    .gte("data", hoje)
    .order("is_destaque", { ascending: false })
    .order("data", { ascending: true });

  if (error || !viagens || viagens.length === 0) {
    container.innerHTML = `
      <p style="text-align:center; color:#6b7280;">
        Nenhuma viagem disponível.
      </p>
    `;
    return;
  }

  renderResultadoBusca(viagens, container);
}

function renderResultadoBusca(viagens, container) {
  if (!viagens || viagens.length === 0) {
    container.innerHTML = `
      <p style="text-align:center; color:#6b7280;">
        Nenhuma viagem encontrada.
      </p>
    `;
    return;
  }

  container.innerHTML = viagens.map(v => `
    <div class="card viagem-card">
      ${v.is_destaque ? `<div class="badge-destaque">⭐ Destaque</div>` : ""}
      <strong>${v.origem} → ${v.destino}</strong>
      <p>
        ${v.data ? `📅 ${v.data}` : ""}
        ${v.hora ? ` • ⏰ ${v.hora}` : ""}
      </p>
      <p>
        👥 ${v.vagas} vagas
        ${v.valor ? ` • 💰 R$ ${v.valor}` : ""}
      </p>
      <button class="btn-link" onclick="renderDetalheViagem('${v.id}')">Ver mais</button>
    </div>
  `).join("");
}

/* =====================================================
   TELA: OFERECER
===================================================== */
async function renderOferecer() {
  if (!(await exigirLogin())) return;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    alert("Usuário não autenticado");
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_motorista")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    alert("Erro ao carregar perfil do usuário");
    return;
  }

  if (!profile.is_motorista) {
    app.innerHTML = `
      <div class="page">
        <h1>Oferecer carona</h1>
        <div class="card warning-card">
          <p><strong>🔒 Acesso restrito</strong></p>
          <p>Esta área é acessível apenas para motoristas.</p>
          <button class="btn-primary" onclick="renderQueroSerMotorista()">Quero ser motorista</button>
        </div>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="page">
      <h1>Oferecer carona</h1>
      <div class="card">
        <input type="text" id="origem" placeholder="Origem" />
        <input type="text" id="destino" placeholder="Destino" />
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data</label>
            <input type="date" id="data" />
          </div>
          <div class="form-group">
            <label class="form-label">Hora</label>
            <input type="time" id="hora" />
          </div>
        </div>
        <input type="number" id="vagas" placeholder="Vagas disponíveis" />
        <input type="number" id="valor" placeholder="Valor do auxílio (R$)" />
        <textarea id="observacoes" placeholder="Observações" rows="3"></textarea>
        <button class="btn-primary" id="btnPublicar">Publicar carona</button>
      </div>
    </div>
  `;

  document.getElementById("btnPublicar").onclick = async () => {
    try {
      const origem = document.getElementById("origem").value.trim();
      const destino = document.getElementById("destino").value.trim();
      const data = document.getElementById("data").value;
      const hora = document.getElementById("hora").value;
      const vagas = Number(document.getElementById("vagas").value);
      const valor = Number(document.getElementById("valor").value);
      const observacoes = document.getElementById("observacoes").value;

      if (!origem || !destino || !data || !hora) {
        alert("Preencha todos os campos obrigatórios");
        return;
      }

      if (!vagas || vagas < 1) {
        alert("Informe ao menos 1 vaga");
        return;
      }

      const { error: insertError } = await supabase
        .from("viagens")
        .insert([{
          user_id: user.id,
          origem,
          destino,
          data,
          hora,
          vagas,
          valor,
          observacoes,
          status: "ativa"
        }]);

      if (insertError) {
        alert("Erro Supabase: " + insertError.message);
      } else {
        alert("Carona publicada com sucesso!");
        renderViagens();
      }
    } catch (e) {
      alert("Erro JS: " + e.message);
    }
  };
}

/* =====================================================
   TELA: VIAGENS - COM SEPARAÇÃO DE HISTÓRICO
===================================================== */
async function renderViagens() {
  if (!(await exigirLogin())) return;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    alert("Usuário não autenticado");
    return;
  }

  app.innerHTML = `
    <div class="page">
      <h1>Minhas viagens</h1>
      <p>Carregando...</p>
    </div>
  `;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_motorista")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    alert("Erro ao carregar perfil");
    return;
  }

  if (profile.is_motorista) {
    const { data: viagens, error } = await supabase
      .from("viagens")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !viagens || viagens.length === 0) {
      app.innerHTML = `
        <div class="page">
          <h1>Minhas viagens (motorista)</h1>
          <div class="card">
            <p style="text-align:center;">🚗 Você ainda não publicou nenhuma viagem.</p>
          </div>
        </div>
      `;
      return;
    }

    // SEPARAÇÃO: ATIVAS vs HISTÓRICO
    const viagensAtivas = viagens.filter(v => 
      v.status === 'ativa' || v.status === 'em_andamento'
    );
    const viagensConcluidas = viagens.filter(v => 
      v.status === 'concluida' || v.status === 'cancelada'
    );

    app.innerHTML = `
      <div class="page">
        <h1>Minhas viagens (motorista)</h1>
        
        ${viagensAtivas.length > 0 ? `
          <h2 class="section-title">Viagens em andamento</h2>
          ${viagensAtivas.map(v => `
            <div class="card viagem-card" onclick="renderDetalheViagem('${v.id}')">
              <strong>🚗 ${v.origem} → ${v.destino}</strong>
              <p>📅 ${v.data} • ⏰ ${v.hora}</p>
              <p>🪑 ${v.vagas} vagas • 💰 R$ ${v.valor}</p>
              <span class="badge status-${v.status}">${v.status}</span>
            </div>
          `).join("")}
        ` : ''}
        
        ${viagensConcluidas.length > 0 ? `
          <h2 class="section-title">Histórico</h2>
          ${viagensConcluidas.map(v => `
            <div class="card viagem-card historico" onclick="renderDetalheViagem('${v.id}')">
              <strong>🚗 ${v.origem} → ${v.destino}</strong>
              <p>📅 ${v.data} • ⏰ ${v.hora}</p>
              <p>🪑 ${v.vagas} vagas • 💰 R$ ${v.valor}</p>
              <span class="badge status-${v.status}">${v.status}</span>
            </div>
          `).join("")}
        ` : ''}
      </div>
    `;
    return;
  }

  const { data: solicitacoes, error } = await supabase
    .from("solicitacoes")
    .select(`
      id,
      status,
      viagens (
        id,
        origem,
        destino,
        data,
        hora,
        valor
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !solicitacoes || solicitacoes.length === 0) {
    app.innerHTML = `
      <div class="page">
        <h1>Minhas viagens (passageiro)</h1>
        <div class="card">
          <p style="text-align:center;">🪑 Você ainda não solicitou nenhuma carona.</p>
        </div>
      </div>
    `;
    return;
  }

  // SEPARAÇÃO PARA PASSAGEIRO
  const solicitacoesAtivas = solicitacoes.filter(s => 
    s.status === 'pendente' || s.status === 'aprovada'
  );
  const solicitacoesConcluidas = solicitacoes.filter(s => 
    s.status === 'concluida' || s.status === 'cancelada' || s.status === 'recusada'
  );

  app.innerHTML = `
    <div class="page">
      <h1>Minhas viagens (passageiro)</h1>
      
      ${solicitacoesAtivas.length > 0 ? `
        <h2 class="section-title">Viagens ativas</h2>
        ${solicitacoesAtivas.map(s => `
          <div class="card viagem-card" onclick="renderDetalheViagem('${s.viagens.id}')">
            <strong>🚗 ${s.viagens.origem} → ${s.viagens.destino}</strong>
            <p>📅 ${s.viagens.data} • ⏰ ${s.viagens.hora}</p>
            <p>💰 R$ ${s.viagens.valor}</p>
            <span class="badge status-${s.status}">
              ${s.status === 'pendente' ? '🟡 Aguardando' :
                s.status === 'aprovada' ? '✅ Confirmada' : s.status}
            </span>
          </div>
        `).join("")}
      ` : ''}
      
      ${solicitacoesConcluidas.length > 0 ? `
        <h2 class="section-title">Histórico</h2>
        ${solicitacoesConcluidas.map(s => `
          <div class="card viagem-card historico" onclick="renderDetalheViagem('${s.viagens.id}')">
            <strong>🚗 ${s.viagens.origem} → ${s.viagens.destino}</strong>
            <p>📅 ${s.viagens.data} • ⏰ ${s.viagens.hora}</p>
            <p>💰 R$ ${s.viagens.valor}</p>
            <span class="badge status-${s.status}">
              ${s.status === 'recusada' ? '❌ Recusada' :
                s.status === 'cancelada' ? '❌ Cancelada' : '✅ Concluída'}
            </span>
          </div>
        `).join("")}
      ` : ''}
    </div>
  `;
}

/* =====================================================
   TELA: MENSAGENS (CHAT GLOBAL)
===================================================== */
async function renderMensagens() {
  if (!(await exigirLogin())) return;

  app.innerHTML = `
    <div class="page">
      <h1>Mensagens</h1>
      
      <div class="card">
        <h3>💬 Chat Global</h3>
        <p>Converse com todos os usuários do Vem Comigo</p>
        <button class="btn-primary" onclick="renderChatGlobal()">
          Entrar no Chat Global
        </button>
      </div>
      
      <div class="card">
        <h3>📨 Conversas de Viagem</h3>
        <p>Chats privados com motoristas/passageiros</p>
        <button class="btn-secondary" onclick="renderViagens()">
          Ver minhas viagens para acessar chats
        </button>
      </div>
    </div>
  `;
}









/* =====================================================
   CHAT GLOBAL - VERSÃO SIMPLES E FUNCIONAL
===================================================== */
async function renderChatGlobal() {
  if (!(await exigirLogin())) return;

  app.innerHTML = `
    <div class="page">
      <h1>💬 Chat Global</h1>
      
      <div id="chat-global-container">
        <div id="chat-global-mensagens" style="height:60vh; overflow-y:auto; padding:15px; background:#f8f9fa; border-radius:10px; margin-bottom:15px;">
          <p style="text-align:center; padding:20px;">Carregando mensagens...</p>
        </div>
        
        <div style="display:flex; gap:10px;">
          <input 
            id="chat-global-input" 
            type="text"
            placeholder="Digite sua mensagem..." 
            style="flex:1; padding:12px; border:1px solid #ddd; border-radius:8px;"
            onkeypress="if(event.key === 'Enter') enviarMensagemGlobal();"
          />
          <button onclick="enviarMensagemGlobal()" style="padding:12px 20px; background:#007bff; color:white; border:none; border-radius:8px;">
            Enviar
          </button>
        </div>
      </div>
      
      <div style="text-align:center; margin-top:15px;">
        <button onclick="location.hash='mensagens'" style="padding:10px 20px; background:#6c757d; color:white; border:none; border-radius:5px;">
          ⬅ Voltar
        </button>
      </div>
    </div>
  `;

  // Carrega mensagens existentes
  await carregarMensagensGlobal();
  
  // Inicia realtime para mensagens de outras pessoas
  iniciarRealtimeChatGlobal();
}

/* =====================================================
   CARREGAR MENSAGENS EXISTENTES
===================================================== */
async function carregarMensagensGlobal() {
  try {
    const container = document.getElementById('chat-global-mensagens');
    if (!container) return;

    // Busca mensagens globais
    const { data: mensagens, error } = await supabase
      .from('mensagens')
      .select('id, sender_id, mensagem, created_at')
      .is('solicitacao_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      container.innerHTML = `<p style="color:red; text-align:center;">Erro: ${error.message}</p>`;
      return;
    }

    if (!mensagens || mensagens.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:30px; color:#666;">💬 Nenhuma mensagem ainda</p>';
      return;
    }

    // Renderiza todas
    container.innerHTML = '';
    
    mensagens.forEach(msg => {
      const isMinha = msg.sender_id === window.usuarioLogado?.id;
      
      const hora = new Date(msg.created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const msgDiv = document.createElement('div');
      msgDiv.style.marginBottom = '10px';
      msgDiv.style.display = 'flex';
      msgDiv.style.justifyContent = isMinha ? 'flex-end' : 'flex-start';
      
      const balao = document.createElement('div');
      balao.style.padding = '10px 15px';
      balao.style.borderRadius = '15px';
      balao.style.maxWidth = '80%';
      balao.style.wordBreak = 'break-word';
      
      if (isMinha) {
        // MINHA mensagem (DIREITA)
        balao.style.background = '#007bff';
        balao.style.color = 'white';
        balao.style.borderBottomRightRadius = '5px';
        balao.innerHTML = `
          <div>${msg.mensagem}</div>
          <div style="font-size:11px; text-align:right; margin-top:3px; opacity:0.8;">${hora}</div>
        `;
      } else {
        // Mensagem de OUTRA pessoa (ESQUERDA)
        balao.style.background = 'white';
        balao.style.border = '1px solid #ddd';
        balao.style.borderBottomLeftRadius = '5px';
        balao.innerHTML = `
          <div>${msg.mensagem}</div>
          <div style="font-size:11px; text-align:right; margin-top:3px; color:#666;">${hora}</div>
        `;
      }
      
      msgDiv.appendChild(balao);
      container.appendChild(msgDiv);
    });
    
    // Scroll para última mensagem
    container.scrollTop = container.scrollHeight;

  } catch (err) {
    const container = document.getElementById('chat-global-mensagens');
    if (container) {
      container.innerHTML = `<p style="color:red; text-align:center;">Erro: ${err.message}</p>`;
    }
  }
}

/* =====================================================
   ENVIAR MENSAGEM - MOSTRA LOCALMENTE + ENVIA SERVIDOR
===================================================== */
async function enviarMensagemGlobal() {
  const input = document.getElementById('chat-global-input');
  if (!input) return;

  const texto = input.value.trim();
  if (!texto) {
    alert('Digite uma mensagem');
    return;
  }

  if (!window.usuarioLogado) {
    alert('Faça login para enviar mensagens');
    return;
  }

  // 1. MOSTRA LOCALMENTE primeiro
  mostrarMinhaMensagem(texto);

  // 2. Limpa input
  input.value = '';
  input.focus();

  // 3. Envia para servidor - GARANTINDO solicitacao_id=null
  try {
    const { error } = await supabase
      .from('mensagens')
      .insert({
        sender_id: window.usuarioLogado.id,
        mensagem: texto,
        solicitacao_id: null  // ISSO É CRÍTICO para ser mensagem global
      });

    if (error) {
      alert('Erro ao enviar: ' + error.message);
      return;
    }

  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

/* =====================================================
   MOSTRAR MINHA MENSAGEM LOCALMENTE
===================================================== */
function mostrarMinhaMensagem(texto) {
  const container = document.getElementById('chat-global-mensagens');
  if (!container) return;
  
  const hora = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Cria elemento
  const msgDiv = document.createElement('div');
  msgDiv.style.marginBottom = '10px';
  msgDiv.style.display = 'flex';
  msgDiv.style.justifyContent = 'flex-end';
  
  const balao = document.createElement('div');
  balao.style.padding = '10px 15px';
  balao.style.borderRadius = '15px';
  balao.style.maxWidth = '80%';
  balao.style.wordBreak = 'break-word';
  balao.style.background = '#007bff';
  balao.style.color = 'white';
  balao.style.borderBottomRightRadius = '5px';
  
  balao.innerHTML = `
    <div>${texto}</div>
    <div style="font-size:11px; text-align:right; margin-top:3px; opacity:0.8;">${hora}</div>
  `;
  
  msgDiv.appendChild(balao);
  container.appendChild(msgDiv);
  
  // Scroll para baixo
  container.scrollTop = container.scrollHeight;
}

/* =====================================================
   REALTIME PARA MENSAGENS DE OUTRAS PESSOAS
===================================================== */

function iniciarRealtimeChatGlobal() {
  console.log('🔄 Iniciando realtime chat global...');
  
  // 1. SE JÁ EXISTIR E ESTIVER CONECTADO, NÃO FAZ NADA
  if (window.chatGlobalSubscription) {
    console.log('✅ Realtime global já está ativo, reutilizando...');
    return; // NÃO remove, NÃO recria - apenas usa o existente
  }
  
  // 2. SE NÃO EXISTIR, CRIA NOVA
  console.log('🆕 Criando nova subscription para chat global...');
  
  window.chatGlobalSubscription = supabase
    .channel('chat-global-' + Date.now())  // Nome ÚNICO
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: 'solicitacao_id=is.null'
      },
      (payload) => {
        console.log('📨 Nova mensagem global recebida:', payload.new);
        
        // Ignora minhas próprias mensagens
        if (payload.new.sender_id !== window.usuarioLogado?.id) {
          setTimeout(() => {
            mostrarMensagemOutraPessoa(payload.new);
          }, 100);
        }
      }
    )
    .subscribe((status) => {
      console.log('🔔 Status subscription global:', status);
    });
}

function adicionarMensagemGlobal(msg) {
  const container = document.getElementById('chat-global-mensagens');
  if (!container) return;

  const isMinha = msg.sender_id === window.usuarioLogado?.id;

  const div = document.createElement('div');
  div.style.marginBottom = '10px';
  div.style.display = 'flex';
  div.style.justifyContent = isMinha ? 'flex-end' : 'flex-start';

  const hora = new Date(msg.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const balao = document.createElement('div');
  balao.style.padding = '10px 15px';
  balao.style.borderRadius = '15px';
  balao.style.maxWidth = '80%';
  balao.style.wordBreak = 'break-word';
  
  if (isMinha) {
    balao.style.background = '#007bff';
    balao.style.color = 'white';
    balao.style.borderBottomRightRadius = '5px';
  } else {
    balao.style.background = 'white';
    balao.style.border = '1px solid #ddd';
    balao.style.borderBottomLeftRadius = '5px';
  }

  balao.innerHTML = `
    <div>${msg.mensagem}</div>
    <div style="font-size:11px; text-align:right; margin-top:3px; ${isMinha ? 'opacity:0.8;' : 'color:#666;'}">${hora}</div>
  `;

  div.appendChild(balao);
  container.appendChild(div);
}

function scrollChatFinalGlobal() {
  const container = document.getElementById('chat-global-mensagens');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}


/* =====================================================
   MOSTRAR MENSAGEM DE OUTRA PESSOA
===================================================== */
function mostrarMensagemOutraPessoa(mensagemData) {
  const container = document.getElementById('chat-global-mensagens');
  if (!container) {
    console.error('❌ Container não encontrado');
    return;
  }
  
  // Verifica se a mensagem já existe (pelo ID ou conteúdo)
  const mensagensExistentes = container.querySelectorAll('div');
  for (const msg of mensagensExistentes) {
    if (msg.textContent.includes(mensagemData.mensagem)) {
      console.log('⚠️ Mensagem já existe, ignorando');
      return;
    }
  }
  
  const hora = new Date(mensagemData.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Cria elemento
  const msgDiv = document.createElement('div');
  msgDiv.style.marginBottom = '10px';
  msgDiv.style.display = 'flex';
  msgDiv.style.justifyContent = 'flex-start';

  const balao = document.createElement('div');
  balao.style.padding = '10px 15px';
  balao.style.borderRadius = '15px';
  balao.style.maxWidth = '80%';
  balao.style.wordBreak = 'break-word';
  balao.style.background = 'white';
  balao.style.border = '1px solid #ddd';
  balao.style.borderBottomLeftRadius = '5px';

  balao.innerHTML = `
    <div>${mensagemData.mensagem}</div>
    <div style="font-size:11px; text-align:right; margin-top:3px; color:#666;">${hora}</div>
  `;

  msgDiv.appendChild(balao);
  container.appendChild(msgDiv);

  // Scroll para baixo
  container.scrollTop = container.scrollHeight;

  // Efeito visual
  balao.style.animation = 'pulse 0.5s';
}


/* =====================================================
   ANIMAÇÃO CSS (adicione ao seu CSS)
===================================================== */
const chatAnimations = `
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
`;

// Adiciona animação se não existir
if (!document.querySelector('#chat-animations')) {
  const style = document.createElement('style');
  style.id = 'chat-animations';
  style.textContent = chatAnimations;
  document.head.appendChild(style);
}

/* =====================================================
   EXPOR FUNÇÕES
===================================================== */
window.renderChatGlobal = renderChatGlobal;
window.enviarMensagemGlobal = enviarMensagemGlobal;



/* =====================================================
   DETALHE DA VIAGEM - CORRIGIDO
===================================================== */
async function renderDetalheViagem(viagemId) {
  if (!(await exigirLogin())) return;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  app.innerHTML = `<div class="page"><p>Carregando detalhes da viagem...</p></div>`;

  const { data: viagem, error: erroViagem } = await supabase
    .from("viagens")
    .select("*")
    .eq("id", viagemId)
    .single();

  if (erroViagem || !viagem) {
    alert("Erro ao carregar viagem");
    renderViagens();
    return;
  }

  const isMotorista = user.id === viagem.user_id;

  const { data: solicitacoes, error: erroSolic } = await supabase
    .from("solicitacoes")
    .select("*")
    .eq("viagem_id", viagem.id)
    .order("created_at", { ascending: true });

  if (erroSolic) {
    alert("Erro ao carregar solicitações");
    return;
  }

  const minhaSolicitacao = solicitacoes.find(s => s.user_id === user.id);

  // HTML da tela de detalhes
  app.innerHTML = `
    <div class="page">
      <h1>🚗 ${viagem.origem} → ${viagem.destino}</h1>
      
      <div class="card">
        <p>📅 ${viagem.data} • ⏰ ${viagem.hora}</p>
        <p>🪑 Vagas disponíveis: ${viagem.vagas}</p>
        ${viagem.valor ? `<p>💰 R$ ${viagem.valor}</p>` : ""}
        ${viagem.observacoes ? `<p>📝 ${viagem.observacoes}</p>` : ""}
        <p>Status: <strong>${viagem.status}</strong></p>
      </div>

      ${isMotorista && !['cancelada', 'concluida'].includes(viagem.status) ? `
        <button class="btn danger" onclick="cancelarViagem('${viagem.id}')">
          ❌ Cancelar viagem
        </button>
      ` : ""}

      <h2>Solicitações</h2>

      ${solicitacoes.length === 0 ? `
        <p>Nenhuma solicitação ainda.</p>
      ` : solicitacoes.map(s => `
        <div class="card">
          <p>Status: <strong>${s.status}</strong></p>
          
          ${isMotorista && s.status === "pendente" ? `
            <button class="btn" onclick="aprovarSolicitacao('${s.id}', '${viagem.id}')">
              ✅ Aprovar
            </button>
            <button class="btn danger" onclick="recusarSolicitacao('${s.id}', '${viagem.id}')">
              ❌ Recusar
            </button>
          ` : ""}
          
          ${!isMotorista && s.user_id === user.id && 
            (s.status === "pendente" || s.status === "aprovada") ? `
            <button class="btn danger" onclick="cancelarSolicitacaoPassageiro('${s.id}', '${viagem.id}')">
              ❌ Cancelar pedido
            </button>
          ` : ""}
          
          ${(viagem.status !== 'cancelada' && viagem.status !== 'concluida' &&
             (isMotorista || s.user_id === user.id)) ? `
            <button class="btn-link" onclick="window.location.hash='chat/${s.id}'">
              💬 Abrir chat
            </button>
          ` : ""}
        </div>
      `).join("")}

      ${!isMotorista && !minhaSolicitacao && 
        (viagem.status === "ativa" || viagem.status === "em_andamento") && 
        viagem.vagas > 0 ? `
        <button class="btn-primary" onclick="solicitarVaga('${viagem.id}')">
          ✋ Solicitar vaga
        </button>
      ` : ""}
    </div>
  `;
}

/* =====================================================
   SOLICITAR VAGA - NOVA FUNÇÃO
===================================================== */
async function solicitarVaga(viagemId) {
  if (!confirm('Deseja solicitar uma vaga nesta viagem?')) return;
  
  if (!(await exigirLogin())) return;
  
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  
  const { data: viagem } = await supabase
    .from('viagens')
    .select('*')
    .eq('id', viagemId)
    .single();
    
  if (viagem.vagas <= 0) {
    alert('Não há vagas disponíveis nesta viagem');
    return;
  }
  
  const { error } = await supabase
    .from('solicitacoes')
    .insert({
      user_id: user.id,
      viagem_id: viagemId,
      status: 'pendente'
    });
    
  if (error) {
    alert('Erro ao solicitar vaga: ' + error.message);
    return;
  }
  
  alert('Solicitação enviada! Aguarde aprovação do motorista.');
  renderDetalheViagem(viagemId);
}

/* =====================================================
   FUNÇÕES DE CHAT (MANTIDAS DO ORIGINAL)
===================================================== */
async function renderChatViagem(solicitacaoId) {
  if (!(await exigirLogin())) return;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  app.innerHTML = `
    <div class="page chat-page">
      <header class="chat-header">
        <button onclick="history.back()">⬅</button>
        <h3>Chat da Viagem</h3>
      </header>
      <div id="chat-mensagens" class="chat-mensagens"></div>
      <div class="chat-input">
        <input id="chat-texto" placeholder="Digite sua mensagem..." autocomplete="off" />
        <button id="btn-enviar" class="btn-enviar">➤</button>
      </div>
    </div>
  `;

  await carregarMensagens(solicitacaoId);
  scrollChatFinal();
  iniciarRealtimeChat(solicitacaoId);

  document.getElementById('btn-enviar').onclick = () => {
    enviarMensagem(solicitacaoId);
  };
}

async function carregarMensagens(solicitacaoId) {
  const { data, error } = await supabase
    .from('mensagens')
    .select('*')
    .eq('solicitacao_id', solicitacaoId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const container = document.getElementById('chat-mensagens');
  if (!container) return;
  
  container.innerHTML = '';

  data.forEach(msg => renderMensagem(msg));
  scrollChatFinal();
}

function iniciarRealtimeChat(solicitacaoId) {
  if (window.chatSubscription) {
    supabase.removeChannel(window.chatSubscription);
  }

  window.chatSubscription = supabase
    .channel('chat-' + solicitacaoId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `solicitacao_id=eq.${solicitacaoId}`
      },
      payload => {
        renderMensagem(payload.new);
        scrollChatFinal();
      }
    )
    .subscribe();
}

async function enviarMensagem(solicitacaoId) {
  const input = document.getElementById('chat-texto');
  const texto = input.value.trim();
  if (!texto) return;

  const { data: userData } = await supabase.auth.getUser();

  await supabase.from('mensagens').insert({
    solicitacao_id: solicitacaoId,
    sender_id: userData.user.id,
    mensagem: texto
  });

  input.value = '';
}

function renderMensagem(msg) {
  const container = document.getElementById('chat-mensagens');
  if (!container) return;
  
  const isMinha = msg.sender_id === window.usuarioLogado?.id;

  const div = document.createElement('div');
  div.className = `msg ${isMinha ? 'minha' : 'outra'}`;

  const hora = new Date(msg.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  div.innerHTML = `
    <div class="msg-balao">
      <span>${msg.mensagem}</span>
      <small>${hora}</small>
    </div>
  `;

  container.appendChild(div);
}

function scrollChatFinal() {
  const container = document.getElementById('chat-mensagens');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/* =====================================================
   FUNÇÕES DE AÇÃO (MANTIDAS)
===================================================== */
async function cancelarSolicitacaoPassageiro(solicitacaoId, viagemId) {
  if (!confirm('Deseja cancelar sua solicitação?')) return;
  try {
    const { data: solicitacao } = await supabase
      .from('solicitacoes')
      .select('status')
      .eq('id', solicitacaoId)
      .single();

    if (!solicitacao || solicitacao.status !== 'aprovada') {
      await supabase
        .from('solicitacoes')
        .update({ status: 'cancelada' })
        .eq('id', solicitacaoId);
      return;
    }

    const { data: viagem } = await supabase
      .from('viagens')
      .select('vagas')
      .eq('id', viagemId)
      .single();

    await supabase
      .from('solicitacoes')
      .update({ status: 'cancelada' })
      .eq('id', solicitacaoId);

    await supabase
      .from('viagens')
      .update({ vagas: viagem.vagas + 1 })
      .eq('id', viagemId);

    alert('Solicitação cancelada');
  } catch (e) {
    alert('Erro ao cancelar: ' + e.message);
  }
}

async function aprovarSolicitacao(solicitacaoId, viagemId) {
  const confirmacao = confirm('Aprovar esta solicitação?');
  if (!confirmacao) return;

  const { data: viagem } = await supabase
    .from('viagens')
    .select('vagas')
    .eq('id', viagemId)
    .single();

  if (!viagem || viagem.vagas <= 0) {
    alert('Não há vagas disponíveis.');
    return;
  }

  const { error: errSolic } = await supabase
    .from('solicitacoes')
    .update({ status: 'aprovada' })
    .eq('id', solicitacaoId);

  if (errSolic) {
    alert(errSolic.message);
    return;
  }

  await supabase
    .from('viagens')
    .update({ vagas: viagem.vagas - 1 })
    .eq('id', viagemId);

  alert('Solicitação aprovada!');
}

async function recusarSolicitacao(solicitacaoId, viagemId) {
  try {
    const { error } = await supabase
      .from("solicitacoes")
      .update({ status: "recusada" })
      .eq("id", solicitacaoId);

    if (error) {
      alert("Erro ao recusar: " + error.message);
      return;
    }

    alert("Solicitação recusada!");
  } catch (e) {
    alert("Erro JS: " + e.message);
  }
}

async function cancelarViagem(viagemId) {
  if (!confirm('Deseja cancelar esta viagem?')) return;
  try {
    const { error } = await supabase
      .from('viagens')
      .update({ status: 'cancelada' })
      .eq('id', viagemId);

    if (error) {
      alert('Erro ao cancelar viagem');
      return;
    }

    await supabase
      .from('solicitacoes')
      .update({ status: 'cancelada' })
      .eq('viagem_id', viagemId);

    alert('Viagem cancelada com sucesso');
    renderViagens();
  } catch (e) {
    alert('Erro JS: ' + e.message);
  }
}

/* =====================================================
   TELA PERFIL (MANTIDA)
===================================================== */
async function renderPerfil() {
  if (!(await exigirLogin())) return;

  const user = window.usuarioLogado;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Erro ao carregar perfil:', error);
    app.innerHTML = `<p>Erro ao carregar perfil.</p>`;
    return;
  }

  app.innerHTML = `
    <div class="page">
      <h1>Meu perfil</h1>
      <div class="card perfil-card">
        <div class="perfil-avatar">
          ${profile.foto
            ? `<img src="${profile.foto}" alt="Foto do perfil">`
            : `<div class="avatar-placeholder">${gerarIniciais(profile.nome)}</div>`
          }
        </div>
        <div class="perfil-linha">
          <strong>Nome:</strong>
          <span>${profile.nome || ''}</span>
        </div>
        <div class="perfil-linha">
          <strong>E-mail:</strong>
          <span>${user.email}</span>
        </div>
        <div class="perfil-linha">
          <strong>CPF:</strong>
          <span>${profile.cpf || '-'}</span>
        </div>
        <div class="perfil-linha">
          <strong>Data de nascimento:</strong>
          <span>${profile.data_nascimento || '-'}</span>
        </div>
        <div class="perfil-linha">
          <strong>Telefone:</strong>
          <span>${profile.telefone || '-'}</span>
        </div>
        ${profile.is_motorista ? `
          <hr>
          <div class="perfil-linha">
            <strong>Veículo:</strong>
            <span>${profile.veiculo_modelo || '-'}</span>
          </div>
          <div class="perfil-linha">
            <strong>Placa:</strong>
            <span>${profile.veiculo_placa || '-'}</span>
          </div>
        ` : ''}
        <div class="perfil-info">
          <small>
            Para alterar seus dados, é necessário enviar uma solicitação.
            As alterações passam por aprovação do administrador.
          </small>
        </div>
        <button class="btn-primary btn-center" onclick="solicitarEdicaoPerfil()">
          Solicitar edição de perfil
        </button>
      </div>
      <button class="btn-danger btn-logout full" onclick="logout()">
        Sair da conta
      </button>
    </div>
  `;
}

/* =====================================================
   FUNÇÕES DE LOGIN/CADASTRO (MANTIDAS)
===================================================== */
function renderLogin() {
  app.innerHTML = `
    <section class="page-container">
      <div class="card">
        <div class="login-logo">
          <img src="/icons/icon-512.png" alt="Vem Comigo">
        </div>
        <h2 class="page-title">Entrar</h2>
        <input id="login-email" type="email" placeholder="Email" />
        <input id="login-password" type="password" placeholder="Senha" />
        <button class="btn-primary" onclick="handleLogin()">Entrar</button>
        <p class="text-center">
          Não tem conta?
          <a href="#cadastro">Criar agora</a>
        </p>
      </div>
    </section>
  `;
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email || !password) {
    alert('Preencha todos os campos');
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  window.usuarioLogado = data.user;

  const { data: perfil, error: perfilError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .single();

  if (perfilError && perfilError.code === 'PGRST116') {
    await supabase.from('profiles').insert({
      id: data.user.id
    });
  }

  location.hash = 'buscar';
}

window.renderCadastro = function () {
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="page-container">
      <div class="card">
        <h2 class="page-title">Criar conta</h2>
        <input id="cad-email" type="email" placeholder="Email" />
        <input id="cad-password" type="password" placeholder="Senha" />
        <button class="btn-primary" onclick="handleCadastro()">Criar conta</button>
        <p class="text-center">
          Já tem conta?
          <a href="#login">Entrar</a>
        </p>
      </div>
    </section>
  `;
};

async function handleCadastro() {
  const email = document.getElementById('cad-email').value.trim();
  const password = document.getElementById('cad-password').value.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert('Conta criada! Confirme seu email antes de tentar entrar.');
  renderLogin();
}

/* =====================================================
   ROUTER - CORRIGIDO E COM MENU HAMBÚRGUER
===================================================== */
function router() {
  if (window.usuarioLogado === undefined) {
    setTimeout(router, 50);
    return;
  }

  const hash = location.hash.replace('#', '');

  // HOME
  if (hash === '' || hash === 'home') return renderHome();

  // PÚBLICAS
  if (hash === 'login') return renderLogin();
  if (hash === 'cadastro') return renderCadastro();
  if (hash === 'buscar') return renderBuscar();

  // OFERECER (privada)
  if (hash === 'oferecer') {
    if (!window.usuarioLogado) {
      sessionStorage.setItem('redirectAfterLogin', 'oferecer');
      renderLogin();
      return;
    }
    return renderOferecer();
  }

  // TELAS PRIVADAS
  if (hash === 'viagens') return renderViagens();
  if (hash === 'mensagens') return renderMensagens();
  if (hash === 'perfil') return renderPerfil();
  if (hash === 'chat-global') return renderChatGlobal();

  // 🔥 CHAT DA VIAGEM (rota dinâmica)
  if (hash.startsWith('chat/')) {
    const solicitacaoId = hash.split('/')[1];
    if (!solicitacaoId) return renderHome();
    return renderChatViagem(solicitacaoId);
  }

  // MENU HAMBÚRGUER
  if (hash === 'menu-perfil') return renderPerfil();
  if (hash === 'menu-sobre') return renderSobre();       // nova tela em desenvolvimento
  if (hash === 'menu-config') return renderConfig();     // nova tela em desenvolvimento
  if (hash === 'menu-como-funciona') return  renderComoFunciona();
  if (hash === 'menu-termos') return  renderTermos();
  // fallback
  return renderHome();
}


/* =====================================================
   FOOTER NAVEGAÇÃO + MENU HAMBÚRGUER
===================================================== */
function setActiveFooter(route) {
  const footerBtns = document.querySelectorAll('#footer button');
  if (footerBtns.length > 0) {
    footerBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === route);
    });
  }
}

function navegar(route) {
  setActiveFooter(route);

  switch (route) {
    case 'buscar': return renderBuscar();
    case 'oferecer': return renderOferecer();
    case 'viagens': return renderViagens();
    case 'mensagens': return renderMensagens();
    case 'perfil': return renderPerfil();
    // menu hambúrguer
    case 'menu-perfil': return renderPerfil();
    case 'menu-sobre': return renderSobre();
    case 'menu-como-funciona': return renderComoFunciona();
    case 'menu-termos': return renderTermos();
    case 'menu-config': return renderConfig();

    default:
      window.location.hash = '#home';
      return renderHome();
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  // Footer
  const footerBtns = document.querySelectorAll('#footer button');
  footerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navegar(btn.dataset.route);
    });
  });

  // Menu hambúrguer
  const menuItems = document.querySelectorAll('#menu-hamburger li');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      window.location.hash = '#' + item.dataset.route;
      router();
      closeHamburgerMenu(); // fecha o menu
    });
  });

  // Página inicial
  navegar('buscar');
});


function closeHamburgerMenu() {
  const menu = document.getElementById('menu-hamburger');
  if(menu) menu.classList.remove('active'); // assume que "active" abre o menu
}


function renderSobre() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div style="padding:16px; padding-bottom:160px;">

      <div style="
        background:#fff;
        border-radius:16px;
        padding:20px;
        box-shadow:0 6px 16px rgba(0,0,0,0.08);
      ">

        <!-- TÍTULO -->
        <div style="text-align:center; margin-bottom:16px;">
          <div style="font-size:42px;">🚗🤝</div>
          <h2 style="margin:8px 0; color:#FF7A00;">Vem Comigo</h2>
          <p style="color:#555; font-size:14px;">
            Mobilidade colaborativa, justa e flexível
          </p>
        </div>

        <!-- SOBRE -->
        <p style="text-align:justify; font-size:14px; color:#333; line-height:1.6; margin-bottom:18px;">
          O <strong>Vem Comigo</strong> é uma plataforma de caronas compartilhadas
          que une o melhor dos aplicativos de mobilidade, oferecendo liberdade
          total para motoristas e economia real para passageiros.
          Diferente de outros serviços, aqui quem define as regras da viagem
          são as próprias pessoas.
        </p>

        <!-- DIFERENCIAIS -->
        <h3 style="color:#FF7A00; margin-bottom:10px;">🚀 Diferenciais do Vem Comigo</h3>

        <div style="display:grid; grid-template-columns:1fr; gap:14px; margin-bottom:18px;">

          <div>
            <strong>💰 Motorista define o valor</strong>
            <p style="font-size:13px; color:#444; text-align:justify;">
              No Vem Comigo, o motorista escolhe livremente o valor da carona.
              Pode ser gratuito, simbólico ou conforme o custo desejado.
              O aplicativo não interfere no preço.
            </p>
          </div>

          <div>
            <strong>👥 Corridas compartilhadas</strong>
            <p style="font-size:13px; color:#444; text-align:justify;">
              Diferente de apps tradicionais, os passageiros podem dividir o
              trajeto com outras pessoas da mesma rota, reduzindo custos
              e aproveitando melhor cada viagem.
            </p>
          </div>

          <div>
            <strong>📍 Rotas curtas e recorrentes</strong>
            <p style="font-size:13px; color:#444; text-align:justify;">
              Ideal para trajetos do dia a dia, como ir ao trabalho, faculdade
              ou bairros próximos. É possível cadastrar rotas fixas,
              com ida e volta, do jeito que a rotina exige.
            </p>
          </div>

        </div>

        <!-- FUNCIONALIDADES -->
        <h3 style="color:#FF7A00; margin-bottom:12px;">✨ Funcionalidades</h3>

        <div style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
          gap:12px;
          margin-bottom:20px;
          text-align:center;
        ">
          <div>
            <div style="font-size:26px;">🔍</div>
            <small>Buscar caronas</small>
          </div>
          <div>
            <div style="font-size:26px;">🚗</div>
            <small>Oferecer viagens</small>
          </div>
          <div>
            <div style="font-size:26px;">💬</div>
            <small>Chat integrado</small>
          </div>
          <div>
            <div style="font-size:26px;">🧾</div>
            <small>Gerenciar viagens</small>
          </div>
        </div>

        <!-- MISSÃO -->
        <h3 style="color:#FF7A00; margin-bottom:8px;">🎯 Nossa missão</h3>
        <p style="text-align:justify; font-size:14px; color:#333; line-height:1.6;">
          Tornar a mobilidade mais acessível, humana e sustentável,
          promovendo economia, compartilhamento e conexões reais
          entre pessoas que seguem o mesmo caminho.
        </p>

        <!-- BENEFÍCIOS -->
        <div style="
          display:flex;
          justify-content:space-around;
          margin:18px 0;
          text-align:center;
        ">
          <div><div style="font-size:22px;">💰</div><small>Mais barato</small></div>
          <div><div style="font-size:22px;">✅</div><small>Perfis reais</small></div>
          <div><div style="font-size:22px;">🌱</div><small>Sustentável</small></div>
        </div>

        <!-- VERSÃO -->
        <div style="
          margin-top:20px;
          text-align:center;
          font-size:12px;
          color:#FF7A00;
          opacity:0.9;
        ">
          Versão ${typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.0.0'}
        </div>

      </div>
    </div>
  `;
}

/* =====================================================
   CF-001 | RENDER COMO FUNCIONA
   Tela institucional - Como funciona o Vem Comigo
===================================================== */
function renderComoFunciona() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page">

      <div class="card" style="margin:12px 8px;">

        <h2 style="
          text-align:center;
          color:#ff7a00;
          margin-bottom:18px;
        ">
          Como funciona o<br>
          <span style="font-weight:600;">Vem Comigo</span>
        </h2>

        <p style="
          text-align:justify;
          margin-bottom:14px;
        ">
          O <strong>Vem Comigo</strong> é um aplicativo de caronas e corridas compartilhadas
          que conecta motoristas e passageiros que possuem rotas semelhantes,
          seja para viagens curtas, longas, diárias ou ocasionais.
        </p>

        <p style="
          text-align:justify;
          margin-bottom:14px;
        ">
          Diferente de outros aplicativos, aqui o motorista tem total liberdade
          para definir o valor que desejar por pessoa. O aplicativo não interfere
          no preço, funcionando apenas como uma ponte entre quem oferece e quem
          procura uma carona.
        </p>

        <p style="
          text-align:justify;
          margin-bottom:16px;
        ">
          Os passageiros visualizam a rota, o valor por pessoa e a quantidade de
          vagas disponíveis, podendo aceitar ou não a proposta. O contato entre
          motorista e passageiros pode ocorrer pelo chat para alinhar detalhes
          como horários, pontos de encontro e outras combinações.
        </p>

        <div style="
          margin-left:16px;
          line-height:1.8;
          margin-bottom:16px;
        ">
          <div>🚗 <strong>Rotas curtas ou longas</strong></div>
          <div>📅 <strong>Viagens diárias ou ocasionais</strong></div>
          <div>🏙️ <strong>Deslocamentos urbanos ou intermunicipais</strong></div>
        </div>

        <p style="text-align:justify;">
          No <strong>Vem Comigo</strong>, você tem mais liberdade, transparência
          e controle sobre suas viagens, tornando o deslocamento mais econômico,
          social e acessível para todos.
        </p>

      </div>

    </div>
  `;
}
/* ===== FIM CF-001 | RENDER COMO FUNCIONA ===== */


/* =====================================================
   RENDER TERMOS DE USO + LGPD + RESPONSABILIDADE
   Código: RTU-001
===================================================== */
function renderTermos() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <section style="padding:16px 16px 120px;">
      <div style="
        background:#fff;
        border-radius:16px;
        padding:20px;
        box-shadow:0 4px 12px rgba(0,0,0,0.08);
        max-width:720px;
        margin:0 auto;
      ">

        <h2 style="
          text-align:center;
          color:#FF7A00;
          margin-bottom:16px;
        ">
          Termos de Uso<br>
          e Responsabilidade
        </h2>

        <p style="text-align:justify;">
          O <strong>Vem Comigo</strong> é uma plataforma digital que conecta
          motoristas e passageiros que compartilham rotas semelhantes,
          facilitando a comunicação e o acordo entre as partes.
        </p>

        <h3 style="color:#FF7A00;margin-top:18px;">1. Natureza da Plataforma</h3>
        <p style="text-align:justify;">
          O Vem Comigo atua exclusivamente como <strong>intermediador tecnológico</strong>.
          Não realiza transporte, não define preços, não intermedia pagamentos
          e não possui qualquer participação financeira nas viagens.
        </p>

        <p style="text-align:justify;">
          O valor da carona é <strong>definido livremente pelo motorista</strong>,
          e o passageiro decide se aceita ou não aquele valor.
          O aplicativo não interfere nessa negociação.
        </p>

        <h3 style="color:#FF7A00;margin-top:18px;">2. Sobre Valores e Viagens</h3>
        <p style="text-align:justify;">
          Cada viagem possui um valor <strong>por pessoa</strong>, de acordo com
          a quantidade de vagas oferecidas no veículo.
          A divisão do trajeto ocorre por múltiplos passageiros,
          porém <strong>cada passageiro é responsável pelo seu próprio pagamento</strong>.
        </p>

        <p style="text-align:justify;">
          O Vem Comigo permite rotas curtas, longas, urbanas,
          intermunicipais, recorrentes ou ocasionais,
          inclusive deslocamentos diários como trabalho, estudo ou rotina pessoal.
        </p>

        <h3 style="color:#FF7A00;margin-top:18px;">3. Responsabilidade</h3>
        <p style="text-align:justify;">
          O Vem Comigo <strong>não se responsabiliza</strong> por condutas,
          atrasos, cancelamentos, acidentes, valores acordados,
          comportamento dos usuários ou qualquer evento ocorrido durante a viagem.
        </p>

        <p style="text-align:justify;">
          A responsabilidade é <strong>integralmente dos usuários envolvidos</strong>,
          motoristas e passageiros, que devem agir com boa-fé,
          respeito à legislação vigente e às normas de trânsito.
        </p>

        <h3 style="color:#FF7A00;margin-top:18px;">4. LGPD e Privacidade</h3>
        <p style="text-align:justify;">
          O Vem Comigo respeita a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.
          Os dados fornecidos pelos usuários são utilizados exclusivamente
          para o funcionamento da plataforma.
        </p>

        <p style="text-align:justify;">
          Informações como nome, e-mail e dados de uso
          <strong>não são vendidas nem compartilhadas</strong> com terceiros,
          exceto quando exigido por lei ou ordem judicial.
        </p>

        <h3 style="color:#FF7A00;margin-top:18px;">5. Ausência de Vínculo Comercial</h3>
        <p style="text-align:justify;">
          O Vem Comigo não possui vínculo empregatício,
          comercial ou societário com motoristas ou passageiros.
          Trata-se de uma plataforma colaborativa de conexão entre usuários.
        </p>

        <h3 style="color:#FF7A00;margin-top:18px;">6. Aceitação dos Termos</h3>
        <p style="text-align:justify;">
          Ao utilizar o aplicativo, o usuário declara que leu,
          compreendeu e concorda com todos os termos aqui descritos.
        </p>

        <p style="
          margin-top:20px;
          font-size:13px;
          color:#777;
          text-align:center;
        ">
          Vem Comigo · Plataforma colaborativa de caronas
        </p>

      </div>
    </section>
  `;
}
/* =====================================================
   FIM — RENDER TERMOS DE USO
===================================================== */


function renderConfig() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="padding:20px;">
      <h2>Configurações</h2>
      <p>Em desenvolvimento.</p>
      <p>Aqui futuramente você poderá alterar preferências do aplicativo.</p>
    </div>
  `;
}


/* =====================================================
   FUNÇÕES AUXILIARES
===================================================== */
async function exigirLogin() {
  if (!window.usuarioLogado) {
    const rotaAtual = location.hash.replace('#', '');
    if (rotaAtual) {
      sessionStorage.setItem('redirectAfterLogin', rotaAtual);
    }
    renderLogin();
    return false;
  }
  return true;
}

/* =====================================================
   RENDER HOME
======================================================= */
function renderHome() {
  app.innerHTML = `
    <div class="page home">

      <section class="home-hero">
        <div class="home-logo">
          <div class="logo-circle">🚘</div>
          <h1>Vem Comigo</h1>
          <p>Caronas seguras e econômicas</p>
        </div>
      </section>

      <section class="home-card">
        <h2>Bem-vindo ao Vem Comigo!</h2>
        <p class="home-sub">
          Encontre ou ofereça caronas com segurança e economia.
        </p>

        <div class="home-stats">
          <div class="stat">
            <strong>1.234+</strong>
            <span>Viajantes</span>
          </div>
          <div class="stat">
            <strong>5.678+</strong>
            <span>Viagens</span>
          </div>
          <div class="stat">
            <strong>4.8</strong>
            <span>Avaliação</span>
          </div>
          <div class="stat">
            <strong>70%</strong>
            <span>Economia</span>
          </div>
        </div>

        <div class="home-actions">
          <button class="btn green" onclick="location.hash='buscar'">
            🔍 Buscar Viagens
          </button>
          <button class="btn orange" onclick="location.hash='oferecer'">
            🚘 Oferecer Carona
          </button>
        </div>
      </section>

      <section class="home-card">
        <h3>Por que escolher o Vem Comigo?</h3>

        <div class="home-features">
          <div class="feature">
            🛡️
            <strong>Segurança</strong>
            <span>Perfis verificados</span>
          </div>
          <div class="feature">
            💰
            <strong>Economia</strong>
            <span>Até 70% mais barato</span>
          </div>
          <div class="feature">
            🌱
            <strong>Sustentável</strong>
            <span>Menos emissões</span>
          </div>
        </div>
      </section>

      <section class="home-card">
        <h3>Acesso rápido</h3>

        <div class="home-quick">
          <button class="quick-btn">📲 Instalar App</button>
          <button class="quick-btn">📍 Viagens Próximas</button>
          <button class="quick-btn">➕ Nova Viagem</button>
          <button class="quick-btn">⚙️ Administração</button>
        </div>
      </section>

    </div>
  `;
}


function renderQueroSerMotorista() {
  app.innerHTML = `
    <div class="page">
      <h1>Quero ser motorista</h1>
      <div class="card">
        <p>Para oferecer caronas no <strong>Vem Comigo</strong>, você precisa se cadastrar como motorista.</p>
        <ul>
          <li>🚗 Publicar viagens</li>
          <li>💰 Receber auxílio de custo</li>
          <li>👥 Levar passageiros com segurança</li>
        </ul>
        <button class="btn-primary" onclick="renderCadastroMotorista()">Continuar cadastro</button>
        <button class="btn-secondary" onclick="renderHome()">Voltar</button>
      </div>
    </div>
  `;
}

async function renderCadastroMotorista() {
  if (!(await exigirLogin())) return;
  // ... (mantenha a função original)
}

function gerarIniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(' ');
  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase();
  }
  return (
    partes[0].charAt(0).toUpperCase() +
    partes[partes.length - 1].charAt(0).toUpperCase()
  );
}

async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Erro ao sair:', e);
  }

  window.usuarioLogado = null;
  window.location.href = '#login';
  window.location.reload();
}

// Event listeners
window.addEventListener('hashchange', router);
window.addEventListener('load', router);



/* =====================================================
   CARREGAR BANNERS DINÂMICOS (PWA) - SOLUÇÃO 2
   Busca banners da view pública e substitui os estáticos
===================================================== */
async function carregarBannersDinamicos() {
  const bannerArea = document.getElementById('banner-area');
  // Se a área de banners não existe nesta página, simplesmente sai
  if (!bannerArea) {
    console.log('Área de banners não encontrada nesta view.');
    return;
  }

  try {
    console.log('Buscando banners dinâmicos da view "public_banners"...');
    // 1. BUSCA: Busca os banners ativos da VIEW pública
    const { data: banners, error } = await supabase
      .from('public_banners')  // <-- BUSCA DA VIEW
      .select('titulo, imagem_url, link')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro na consulta ao Supabase:', error);
      return; // Em caso de erro, mantém os banners estáticos originais
    }

    // 2. VERIFICA: Se não houver banners, mantém os padrão e sai
    if (!banners || banners.length === 0) {
      console.log('Nenhum banner ativo encontrado na view.');
      return;
    }
    console.log(`✅ ${banners.length} banner(s) carregado(s) da view.`);

    // 3. LIMPA: Remove os banners estáticos originais
    bannerArea.innerHTML = '';

    // 4. CRIA: Gera os elementos HTML dinâmicos para cada banner
    banners.forEach((banner, index) => {
      const slideDiv = document.createElement('div');
      slideDiv.className = `banner-slide image ${index === 0 ? 'active' : ''}`;
      slideDiv.style.backgroundImage = `url('${banner.imagem_url}')`;

      slideDiv.innerHTML = `
        <div class="banner-content">
        </div>
        <span class="banner-tag">Patrocinado</span>
      `;

      // Se o banner tiver link, torna-o clicável
      if (banner.link) {
        slideDiv.style.cursor = 'pointer';
        slideDiv.addEventListener('click', () => {
          window.open(banner.link, '_blank');
        });
      }

      bannerArea.appendChild(slideDiv);
    });

    // 5. REATIVA: Chama a função para reiniciar o slider automático
    iniciarSliderBanners();

  } catch (error) {
    console.error('Erro inesperado em carregarBannersDinamicos:', error);
  }
}

/* =====================================================
   RE-INICIALIZAR SLIDER DE BANNERS
   Replica a lógica original do index.html para os novos elementos
===================================================== */
function iniciarSliderBanners() {
  const slides = document.querySelectorAll('.banner-slide');
  let index = 0;

  // Para qualquer intervalo anterior (evita múltiplos timers)
  if (window.bannerSliderInterval) {
    clearInterval(window.bannerSliderInterval);
  }

  // Só configura o slider se houver slides
  if (slides.length > 0) {
    // Configura o intervalo para troca automática (6 segundos, conforme original)
    window.bannerSliderInterval = setInterval(() => {
      slides[index].classList.remove('active');
      index = (index + 1) % slides.length;
      slides[index].classList.add('active');
    }, 6000);
  }
}

window.addEventListener('load', async () => {
  await restaurarSessao();
  router();
  // CHAMA A NOVA FUNÇÃO DE BANNERS DINÂMICOS
  carregarBannersDinamicos();
});





/* =====================================================
   EXPOR FUNÇÕES
===================================================== */
window.renderDetalheViagem = renderDetalheViagem;
window.cancelarViagem = cancelarViagem;
window.cancelarSolicitacaoPassageiro = cancelarSolicitacaoPassageiro;
window.aprovarSolicitacao = aprovarSolicitacao;
window.recusarSolicitacao = recusarSolicitacao;
window.solicitarVaga = solicitarVaga;
window.renderMensagens = renderMensagens;
window.renderChatGlobal = renderChatGlobal;
window.renderQueroSerMotorista = renderQueroSerMotorista;

// DEBUG: Força versão
console.log("🔄 APP.JS ATUALIZADO - " + new Date().toISOString());

