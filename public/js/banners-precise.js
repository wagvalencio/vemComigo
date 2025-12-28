/* =====================================================
   BANNERS PRECISE - SUBSTITUIÇÃO EXATA
   Remove banners estáticos e coloca dinâmicos NO MESMO LUGAR
   ===================================================== */

(function() {
  console.log('🎯 BANNERS PRECISE: Iniciando...');
  
  // CONFIGURAÇÃO: Tempo máximo de espera (milissegundos)
  const MAX_WAIT = 5000;
  const CHECK_INTERVAL = 100;
  
  let attempts = 0;
  
  const waitForBannerArea = setInterval(() => {
    attempts++;
    
    // 1. PROCURA a área de banners EXATA do HTML original
    const originalBannerArea = document.querySelector('section#banner-area');
    
    if (originalBannerArea) {
      clearInterval(waitForBannerArea);
      console.log('🎯 Área original de banners ENCONTRADA!');
      processBannerArea(originalBannerArea);
    } 
    else if (attempts * CHECK_INTERVAL >= MAX_WAIT) {
      clearInterval(waitForBannerArea);
      console.log('🎯 Timeout: banner-area não encontrado após 5 segundos');
      fallbackBanners();
    }
    else {
      console.log(`🎯 Tentativa ${attempts}: banner-area ainda não encontrado...`);
    }
  }, CHECK_INTERVAL);
  
  async function processBannerArea(bannerArea) {
    try {
      console.log('🎯 Analisando estrutura original...');
      
      // 2. SALVA a POSIÇÃO EXATA e ESTILOS do elemento original
      const parent = bannerArea.parentElement;
      const nextSibling = bannerArea.nextElementSibling;
      const originalStyles = window.getComputedStyle(bannerArea);
      
      console.log('🎯 Posição:', {
        parent: parent?.tagName,
        nextSibling: nextSibling?.tagName,
        styles: {
          display: originalStyles.display,
          margin: originalStyles.margin,
          width: originalStyles.width
        }
      });
      
      // 3. BUSCA banners do Supabase
      console.log('🎯 Buscando banners dinâmicos...');
      const { data: banners, error } = await supabase
        .from('public_banners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // 4. PREPARA NOVO CONTEÚDO (mantendo MESMA estrutura HTML)
      let newBannerHTML = '';
      
      if (!banners || banners.length === 0) {
        console.log('🎯 Nenhum banner ativo no Supabase, mantendo originais');
        return; // Não substitui
      }
      
      console.log(`🎯 ${banners.length} banner(s) encontrado(s) no Supabase`);
      
      // 5. CONSTRÓI HTML IDÊNTICO à estrutura original
      banners.forEach((banner, index) => {
        newBannerHTML += `
          <div class="banner-slide image ${index === 0 ? 'active' : ''}" 
               style="background-image: url('${banner.imagem_url}'); 
                      /* ESTILOS ORIGINAIS PRESERVADOS */
                      background-size: cover;
                      background-position: center;
                      height: 200px;
                      border-radius: 12px;
                      position: relative;
                      overflow: hidden;
                      margin-bottom: 10px;">
            <div class="banner-content" style="
                      position: absolute;
                      bottom: 20px;
                      left: 20px;
                      color: white;
                      text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">
              <h3 style="margin: 0 0 5px 0; font-size: 1.5em;">${banner.titulo || 'Vem Comigo'}</h3>
              <p style="margin: 0; opacity: 0.9; font-size: 0.9em;">Carregado dinamicamente</p>
            </div>
            <span class="banner-tag" style="
                      position: absolute;
                      top: 15px;
                      right: 15px;
                      background: #00ff00;
                      color: #000;
                      padding: 4px 8px;
                      border-radius: 4px;
                      font-size: 0.8em;
                      font-weight: bold;">
              ✓ DINÂMICO
            </span>
          </div>
        `;
      });
      
      // 6. SUBSTITUI APENAS O CONTEÚDO INTERNO (mantém a section#banner-area)
      bannerArea.innerHTML = newBannerHTML;
      
      console.log('🎯 Banners estáticos substituídos por dinâmicos!');
      
      // 7. REATIVA o slider automático (mesmo código do original)
      initSlider();
      
      // 8. MARCA visualmente que funcionou
      showSuccessIndicator();
      
    } catch (error) {
      console.error('🎯 Erro no processamento:', error);
      // Se der erro, os banners originais permanecem
    }
  }
  
  function initSlider() {
    setTimeout(() => {
      const slides = document.querySelectorAll('.banner-slide');
      if (slides.length > 1) {
        let currentIndex = 0;
        
        // Para qualquer intervalo anterior
        if (window.bannerSlider) clearInterval(window.bannerSlider);
        
        window.bannerSlider = setInterval(() => {
          slides[currentIndex].classList.remove('active');
          currentIndex = (currentIndex + 1) % slides.length;
          slides[currentIndex].classList.add('active');
        }, 6000);
        
        console.log('🎯 Slider automático reiniciado');
      }
    }, 1000);
  }
  
  function showSuccessIndicator() {
    const indicator = document.createElement('div');
    indicator.innerHTML = '✅ Banners do Painel ADM';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: #00ff00;
      color: #000;
      padding: 8px 12px;
      border-radius: 6px;
      font-weight: bold;
      z-index: 10000;
      font-size: 14px;
      opacity: 0.9;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(indicator);
    
    // Remove após 3 segundos
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 500);
    }, 3000);
  }
  
  function fallbackBanners() {
    console.log('🎯 Usando fallback: procurando qualquer lugar para banners');
    
    // Procura o primeiro container principal
    const mainContainers = [
      document.querySelector('main'),
      document.querySelector('.container'),
      document.querySelector('#app'),
      document.body
    ].filter(Boolean);
    
    if (mainContainers[0]) {
      const fallbackArea = document.createElement('section');
      fallbackArea.id = 'banner-area-fallback';
      fallbackArea.style.cssText = `
        max-width: 95%;
        margin: 20px auto;
        padding: 0;
      `;
      
      mainContainers[0].insertBefore(fallbackArea, mainContainers[0].firstChild);
      
      // Adiciona um banner simples
      fallbackArea.innerHTML = `
        <div class="banner-slide image active" style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          height: 180px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2em;
          text-align: center;">
          <div>
            <strong>Banners Dinâmicos</strong><br>
            <small>Configure no Painel ADM</small>
          </div>
        </div>
      `;
    }
  }
  
  // Inicia quando Supabase estiver pronto
  if (window.supabase) {
    console.log('🎯 Supabase já carregado');
  } else {
    console.log('🎯 Aguardando Supabase...');
    document.addEventListener('supabase-ready', () => {
      console.log('🎯 Supabase sinalizado como pronto');
    });
  }
})();
