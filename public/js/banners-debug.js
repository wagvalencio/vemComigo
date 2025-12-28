/* =====================================================
   BANNERS DEBUG - VERSÃO COM LOGS VISÍVEIS
   Mostra o que está acontecendo DIRETAMENTE NA TELA
   ===================================================== */

(async function() {
  // 1. CRIAR ÁREA DE LOGS VISÍVEL
  const logContainer = document.createElement('div');
  logContainer.id = 'banners-debug-log';
  logContainer.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 15px;
    border-radius: 10px;
    z-index: 9999;
    max-width: 300px;
    font-family: monospace;
    font-size: 14px;
    border: 2px solid #ff7a00;
    display: none; /* Inicia escondido */
  `;
  
  // 2. BOTÃO PARA MOSTRAR/ESCONDER LOGS
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = '🔍 DEBUG';
  toggleBtn.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #ff7a00;
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    z-index: 10000;
    font-size: 20px;
    cursor: pointer;
  `;
  
  let logsVisible = false;
  toggleBtn.addEventListener('click', () => {
    logsVisible = !logsVisible;
    logContainer.style.display = logsVisible ? 'block' : 'none';
    addLog(logsVisible ? 'LOGS VISÍVEIS' : 'LOGS OCULTOS');
  });
  
  document.body.appendChild(toggleBtn);
  document.body.appendChild(logContainer);
  
  // 3. FUNÇÃO PARA ADICIONAR LOG
  function addLog(message, type = 'info') {
    const now = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.style.margin = '5px 0';
    logEntry.style.color = type === 'error' ? '#ff6b6b' : 
                          type === 'success' ? '#4cd964' : '#ffffff';
    logEntry.textContent = `[${now}] ${message}`;
    
    // Mantém apenas últimos 10 logs
    if (logContainer.children.length > 10) {
      logContainer.removeChild(logContainer.firstChild);
    }
    
    logContainer.appendChild(logEntry);
    console.log(`[BANNERS-DEBUG] ${message}`); // Também no console se tiver
  }
  
  addLog('🔧 DEBUG INICIADO');
  
  // 4. VERIFICAÇÃO PASSO A PASSO
  
  // Passo 1: Verificar se supabase existe
  addLog('1. Verificando Supabase...');
  if (!window.supabase) {
    addLog('❌ Supabase não carregado', 'error');
    return;
  }
  addLog('✅ Supabase OK', 'success');
  
  // Passo 2: Verificar área de banners
  addLog('2. Buscando área de banners...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const bannerArea = document.getElementById('banner-area');
  if (!bannerArea) {
    addLog('❌ #banner-area não encontrado', 'error');
    addLog('Procurando em todo o documento...');
    
    // Procura qualquer elemento com classe banner
    const allBanners = document.querySelectorAll('[class*="banner"], .banner-slide');
    addLog(`Encontrados ${allBanners.length} elementos com "banner"`);
    
    if (allBanners.length > 0) {
      addLog('Elementos encontrados:', 'success');
      allBanners.forEach((el, i) => {
        addLog(`  ${i+1}. ${el.className || el.tagName}`);
      });
    }
    return;
  }
  
  addLog(`✅ Área encontrada! Tem ${bannerArea.children.length} banners estáticos`, 'success');
  
  // Passo 3: Contar banners estáticos
  const staticBanners = bannerArea.querySelectorAll('.banner-slide');
  addLog(`3. ${staticBanners.length} banners estáticos encontrados`);
  
  // Passo 4: Buscar banners do Supabase
  addLog('4. Consultando Supabase...');
  try {
    const { data: banners, error } = await supabase
      .from('public_banners')
      .select('titulo, imagem_url, link, id')
      .order('created_at', { ascending: false });
    
    if (error) {
      addLog(`❌ Erro Supabase: ${error.message}`, 'error');
      return;
    }
    
    addLog(`✅ ${banners?.length || 0} banners do Supabase`, 'success');
    
    if (!banners || banners.length === 0) {
      addLog('Nenhum banner ativo no banco de dados');
      return;
    }
    
    // Mostrar info de cada banner do Supabase
    banners.forEach((b, i) => {
      addLog(`   Banner ${i+1}: "${b.titulo}"`);
    });
    
    // Passo 5: SUBSTITUIR banners
    addLog('5. Substituindo banners estáticos...');
    
    // SALVAR banners estáticos originais (backup)
    const originalHTML = bannerArea.innerHTML;
    
    // LIMPAR área
    bannerArea.innerHTML = '';
    
    // ADICIONAR banners dinâmicos
    banners.forEach((banner, index) => {
      const slide = document.createElement('div');
      slide.className = `banner-slide image ${index === 0 ? 'active' : ''}`;
      slide.style.backgroundImage = `url('${banner.imagem_url}')`;
      
      slide.innerHTML = `
        <div class="banner-content">
          ${banner.titulo ? `<h3 style="color: white;">${banner.titulo} (DINÂMICO)</h3>` : ''}
          <p style="color: white; font-size: 12px;">ID: ${banner.id}</p>
        </div>
        <span class="banner-tag" style="background: red;">DO SUPABASE</span>
      `;
      
      if (banner.link) {
        slide.style.cursor = 'pointer';
        slide.addEventListener('click', () => window.open(banner.link, '_blank'));
      }
      
      bannerArea.appendChild(slide);
    });
    
    addLog(`✅ ${banners.length} banners dinâmicos adicionados!`, 'success');
    
    // Passo 6: Reiniciar slider
    addLog('6. Reiniciando slider...');
    setTimeout(() => {
      const slides = document.querySelectorAll('.banner-slide');
      if (slides.length > 1) {
        let current = 0;
        setInterval(() => {
          slides[current].classList.remove('active');
          current = (current + 1) % slides.length;
          slides[current].classList.add('active');
        }, 6000);
        addLog('✅ Slider reiniciado', 'success');
      }
    }, 1000);
    
    // BOTÃO PARA RESTAURAR ORIGINAL (caso queira voltar)
    const restoreBtn = document.createElement('button');
    restoreBtn.textContent = '↻ Restaurar Originais';
    restoreBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #e74c3c;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10000;
      cursor: pointer;
    `;
    
    restoreBtn.addEventListener('click', () => {
      bannerArea.innerHTML = originalHTML;
      addLog('Banners originais restaurados');
      restoreBtn.remove();
    });
    
    document.body.appendChild(restoreBtn);
    
  } catch (error) {
    addLog(`❌ Erro geral: ${error.message}`, 'error');
  }
  
  addLog('✅ DEBUG COMPLETO');
})();

