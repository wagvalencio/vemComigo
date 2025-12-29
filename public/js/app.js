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
   CHAT GLOBAL - VOLTANDO AO QUE FUNCIONAVA
===================================================== */
/*async function renderChatGlobal() {
  if (!(await exigirLogin())) return;

  app.innerHTML = `
    <div class="page">
      <h1>💬 Chat Global</h1>
      
      <div id="chat-global-container">
        <div id="chat-global-mensagens" class="chat-mensagens">
          <p style="text-align:center; padding:20px;">Carregando mensagens...</p>
        </div>
        
        <div class="chat-input">
          <input 
            id="chat-global-texto" 
            placeholder="Digite sua mensagem..." 
            autocomplete="off"
          />
          <button onclick="enviarMensagemChatGlobal()" class="btn-primary">
            Enviar
          </button>
        </div>
      </div>
      
      <div style="text-align:center; margin-top:15px;">
        <button onclick="renderMensagens()" class="btn-secondary">
          ⬅ Voltar para Mensagens
        </button>
      </div>
    </div>
  `;

  // Carrega mensagens
  await carregarMensagensChatGlobal();
}


/* =====================================================
   CARREGAR MENSAGENS - CORRIGIDA PARA CARREGAR DE UMA VEZ
===================================================== */
/*async function carregarMensagensChatGlobal() {
  try {
    const container = document.getElementById('chat-global-mensagens');
    if (!container) return;

    // MOSTRA LOADING
    container.innerHTML = '<p style="text-align:center; padding:20px;">Carregando...</p>';

    // 1. BUSCA TODAS AS MENSAGENS DE UMA VEZ
    const { data: todasMensagens, error } = await supabase
      .from('mensagens')
      .select('id, sender_id, mensagem, created_at, tipo, solicitacao_id')
      .order('created_at', { ascending: true });

    if (error) {
      container.innerHTML = `<p style="color:red; text-align:center;">Erro: ${error.message}</p>`;
      return;
    }

    // Se não tem mensagens
    if (!todasMensagens || todasMensagens.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:20px;">💬 Nenhuma mensagem</p>';
      return;
    }

    // 2. FILTRA AS GLOBAIS
    const mensagensGlobais = todasMensagens.filter(msg => 
      msg.tipo === 'global' || msg.solicitacao_id === null
    );

    if (mensagensGlobais.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:20px;">💬 Nenhuma mensagem global</p>';
      return;
    }

    // 3. BUSCA TODOS OS NOMES DE UMA VEZ (performance)
    const idsUnicos = [...new Set(mensagensGlobais.map(msg => msg.sender_id))];
    const nomesUsuarios = {};
    
    try {
      // Busca todos os perfis de uma vez
      const { data: perfis } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', idsUnicos);
      
      // Cria mapa de IDs para nomes
      if (perfis) {
        perfis.forEach(perfil => {
          nomesUsuarios[perfil.id] = perfil.nome || 'Usuário';
        });
      }
    } catch (e) {
      console.log('Erro ao buscar nomes:', e);
    }

    // 4. RENDERIZA TODAS DE UMA VEZ
    container.innerHTML = ''; // Limpa tudo de uma vez
    
    const fragment = document.createDocumentFragment(); // Para melhor performance
    
    mensagensGlobais.forEach(msg => {
      const isMinha = msg.sender_id === window.usuarioLogado?.id;
      
      // Pega o nome (já buscado antes)
      let nome = isMinha ? 'Você' : (nomesUsuarios[msg.sender_id] || 'Usuário');
      
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
        // MINHA - DIREITA
        balao.style.background = '#007bff';
        balao.style.color = 'white';
        balao.style.borderBottomRightRadius = '5px';
        balao.innerHTML = `
          <div>${msg.mensagem}</div>
          <div style="font-size:11px; text-align:right; margin-top:3px; opacity:0.8;">${hora}</div>
        `;
      } else {
        // OUTRA PESSOA - ESQUERDA
        balao.style.background = 'white';
        balao.style.border = '1px solid #ddd';
        balao.style.borderBottomLeftRadius = '5px';
        balao.innerHTML = `
          <div style="font-weight:bold; font-size:12px; margin-bottom:2px;">${nome}</div>
          <div>${msg.mensagem}</div>
          <div style="font-size:11px; text-align:right; margin-top:3px; color:#666;">${hora}</div>
        `;
      }
      
      msgDiv.appendChild(balao);
      fragment.appendChild(msgDiv);
    });
    
    // Adiciona tudo de uma vez ao container
    container.appendChild(fragment);
    
    // Scroll para baixo (uma vez só)
    container.scrollTop = container.scrollHeight;

  } catch (err) {
    const container = document.getElementById('chat-global-mensagens');
    if (container) {
      container.innerHTML = `<p style="color:red; text-align:center;">Erro: ${err.message}</p>`;
    }
  }
}







/* =====================================================
   ENVIAR MENSAGEM - VERSÃO MAIS SIMPLES
===================================================== */
/*async function enviarMensagemChatGlobal() {
  const input = document.getElementById('chat-global-texto');
  if (!input) return;
  
  const texto = input.value.trim();
  if (!texto) return;
  
  if (!window.usuarioLogado) {
    alert('Faça login');
    return;
  }

  // Salva o input e limpa
  const textoParaEnviar = texto;
  input.value = '';
  input.focus();
  
  try {
    // Envia para o servidor
    const { data, error } = await supabase
      .from('mensagens')
      .insert({
        sender_id: window.usuarioLogado.id,
        mensagem: textoParaEnviar,
        tipo: 'global',
        solicitacao_id: null
      })
      .select()
      .single(); // Retorna a mensagem criada

    if (error) {
      // Se der erro, devolve o texto ao input
      input.value = textoParaEnviar;
      alert('Erro: ' + error.message);
      return;
    }

    // APENAS adiciona a nova mensagem (não recarrega tudo)
    adicionarNovaMensagemApenas(data);
    
  } catch (err) {
    input.value = textoParaEnviar;
    alert('Erro: ' + err.message);
  }
}

/* =====================================================
   ADICIONAR APENAS NOVA MENSAGEM
===================================================== */
/*async function adicionarNovaMensagemApenas(mensagemData) {
  const container = document.getElementById('chat-global-mensagens');
  if (!container) return;
  
  const isMinha = mensagemData.sender_id === window.usuarioLogado?.id;
  
  // Busca nome se não for minha
  let nome = 'Você';
  if (!isMinha) {
    try {
      const { data: perfil } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', mensagemData.sender_id)
        .single();
      
      if (perfil?.nome) nome = perfil.nome;
    } catch (e) {
      nome = 'Usuário';
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
  msgDiv.style.justifyContent = isMinha ? 'flex-end' : 'flex-start';
  
  const balao = document.createElement('div');
  balao.style.padding = '10px 15px';
  balao.style.borderRadius = '15px';
  balao.style.maxWidth = '80%';
  balao.style.wordBreak = 'break-word';
  
  if (isMinha) {
    // MINHA - DIREITA
    balao.style.background = '#007bff';
    balao.style.color = 'white';
    balao.style.borderBottomRightRadius = '5px';
    balao.innerHTML = `
      <div>${mensagemData.mensagem}</div>
      <div style="font-size:11px; text-align:right; margin-top:3px; opacity:0.8;">${hora}</div>
    `;
  } else {
    // OUTRA PESSOA - ESQUERDA
    balao.style.background = 'white';
    balao.style.border = '1px solid #ddd';
    balao.style.borderBottomLeftRadius = '5px';
    balao.innerHTML = `
      <div style="font-weight:bold; font-size:12px; margin-bottom:2px;">${nome}</div>
      <div>${mensagemData.mensagem}</div>
      <div style="font-size:11px; text-align:right; margin-top:3px; color:#666;">${hora}</div>
    `;
  }
  
  msgDiv.appendChild(balao);
  container.appendChild(msgDiv);
  
  // Scroll para baixo
  container.scrollTop = container.scrollHeight;
}






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
   ROUTER - CORRIGIDO
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

  // fallback
  return renderHome();
}

/* =====================================================
   FOOTER NAVEGAÇÃO - ATUALIZADO
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
    case 'buscar':
      renderBuscar();
      break;
    case 'oferecer':
      renderOferecer();
      break;
    case 'viagens':
      renderViagens();
      break;
    case 'mensagens':
      renderMensagens();
      break;
    case 'perfil':
      renderPerfil();
      break;
    default:
  window.location.hash = '#home';
  renderHome();
 }
}

// Inicialização do footer
document.addEventListener("DOMContentLoaded", () => {
  const footerBtns = document.querySelectorAll('#footer button');
  if (footerBtns.length > 0) {
    footerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        navegar(btn.dataset.route);
      });
    });
  }
  
  // Página inicial
  navegar('buscar');
});




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


/*function renderHome() {
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
        <p class="home-sub">Encontre ou ofereça caronas com segurança e economia.</p>
        <div class="home-stats">
          <div class="stat"><strong>1.234+</strong><span>Viajantes</span></div>
          <div class="stat"><strong>5.678+</strong><span>Viagens</span></div>
          <div class="stat"><strong>4.8</strong><span>Avaliação</span></div>
          <div class="stat"><strong>70%</strong><span>Economia</span></div>
        </div>
        <div class="home-actions">
          <button class="btn green" onclick="location.hash='buscar'">🔍 Buscar Viagens</button>
          <button class="btn orange" onclick="location.hash='oferecer'">🚘 Oferecer Carona</button>
        </div>
      </section>
    </div>
  `;
}*/

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
