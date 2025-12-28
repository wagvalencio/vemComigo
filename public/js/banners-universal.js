/* =====================================================
   BANNERS UNIVERSAL - FUNCIONA EM QUALQUER PÁGINA
   ===================================================== */

class BannerManager {
  constructor() {
    this.bannerData = null;
    this.initialized = false;
    this.init();
  }
  
  async init() {
    console.log('🎯 BANNER MANAGER: Iniciando...');
    
    // 1. Aguarda Supabase carregar
    await this.waitForSupabase();
    
    // 2. Carrega banners do Supabase UMA VEZ
    await this.loadBanners();
    
    // 3. Observa mudanças no DOM para injetar banners
    this.observeDOM();
    
    // 4. Injeta banners imediatamente se já houver área
    this.injectBanners();
    
    this.initialized = true;
    console.log('🎯 BANNER MANAGER: Pronto!');
  }
  
  async waitForSupabase() {
    let attempts = 0;
    while (!window.supabase && attempts < 30) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (!window.supabase) throw new Error('Supabase não carregou');
    console.log('🎯 Supabase carregado após', attempts * 100, 'ms');
  }
  
  async loadBanners() {
    try {
      const { data, error } = await supabase
        .from('public_banners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      this.bannerData = data || [];
      console.log(`🎯 ${this.bannerData.length} banners carregados`);
      
      // Log dos banners
      this.bannerData.forEach(b => {
        console.log(`   - "${b.titulo}" (${b.ativo ? 'ativo' : 'inativo'})`);
      });
      
    } catch (error) {
      console.error('🎯 Erro ao carregar banners:', error);
      this.bannerData = [];
    }
  }
  
  observeDOM() {
    // Observa mudanças no DOM para detectar quando o router renderiza nova página
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          setTimeout(() => this.injectBanners(), 100);
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Também observa mudanças de rota (hash changes)
    window.addEventListener('hashchange', () => {
      setTimeout(() => this.injectBanners(), 300);
    });
  }
  
  injectBanners() {
    // Procura por container de banners
    let container = document.getElementById('banner-area');
    
    // Se não encontrar, PROCURA por qualquer elemento que possa conter banners
    if (!container) {
      // Procura por elementos com classe que sugere ser área principal
      const possibleContainers = [
        document.querySelector('main'),
        document.querySelector('.page'),
        document.querySelector('#app > div'),
        document.querySelector('section:first-of-type')
      ].filter(Boolean);
      
      if (possibleContainers.length > 0) {
        // Cria banner-area no primeiro container válido
        container = document.createElement('section');
        container.id = 'banner-area';
        container.className = 'universal-banner-area';
        container.style.cssText = `
          margin: 20px auto;
          max-width: 100%;
          position: relative;
        `;
        
        // Insere no topo do container
        possibleContainers[0].insertBefore(container, possibleContainers[0].firstChild);
        console.log('🎯 Criada nova banner-area');
      }
    }
    
    // Se ainda não tem container, desiste
    if (!container) {
      console.log('🎯 Nenhum container adequado encontrado para banners');
      return;
    }
    
    // Se já tem banners (estáticos ou dinâmicos), não faz nada
    if (container.children.length > 0 && 
        container.querySelector('.banner-slide')) {
      console.log('🎯 Já existem banners no container');
      return;
    }
    
    // INJETA BANNERS DINÂMICOS
    this.renderBanners(container);
  }
  
  renderBanners(container) {
    if (!this.bannerData || this.bannerData.length === 0) {
      console.log('🎯 Nenhum dado de banners para renderizar');
      
      // Banner padrão de fallback
      container.innerHTML = `
        <div class="banner-slide image active" 
             style="background-image:url('https://tireabundadosofa.com.br/wp-content/uploads/2017/06/o-que-fazer-em-itapoa.png')">
          <div class="banner-content">
            <h3>Vem Comigo</h3>
            <p>Carona solidária</p>
          </div>
          <span class="banner-tag" style="background: orange;">Padrão</span>
        </div>
      `;
      return;
    }
    
    console.log(`🎯 Renderizando ${this.bannerData.length} banners dinâmicos`);
    
    // Limpa container
    container.innerHTML = '';
    
    // Adiciona cada banner
    this.bannerData.forEach((banner, index) => {
      const slide = document.createElement('div');
      slide.className = `banner-slide image ${index === 0 ? 'active' : ''}`;
      slide.style.backgroundImage = `url('${banner.imagem_url}')`;
      slide.style.border = '2px solid #00ff00'; // Borda verde para identificar
      
      slide.innerHTML = `
        <div class="banner-content">
          <h3 style="color: white; text-shadow: 2px 2px 4px black;">${banner.titulo}</h3>
          <p style="color: white; background: rgba(0,0,0,0.5); padding: 2px 5px; border-radius: 3px;">
            Dinâmico • ID: ${banner.id}
          </p>
        </div>
        <span class="banner-tag" style="background: #00ff00; color: black; font-weight: bold;">AO VIVO</span>
      `;
      
      if (banner.link) {
        slide.style.cursor = 'pointer';
        slide.addEventListener('click', () => window.open(banner.link, '_blank'));
      }
      
      container.appendChild(slide);
    });
    
    // Inicia slider
    this.startSlider();
    
    // Adiciona indicador visual
    this.addVisualIndicator();
  }
  
  startSlider() {
    setTimeout(() => {
      const slides = document.querySelectorAll('.banner-slide');
      if (slides.length > 1) {
        let current = 0;
        setInterval(() => {
          slides[current].classList.remove('active');
          current = (current + 1) % slides.length;
          slides[current].classList.add('active');
        }, 6000);
        console.log('🎯 Slider iniciado');
      }
    }, 500);
  }
  
  addVisualIndicator() {
    // Remove indicador anterior se existir
    const oldIndicator = document.getElementById('banner-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    // Cria novo indicador
    const indicator = document.createElement('div');
    indicator.id = 'banner-indicator';
    indicator.innerHTML = '🎯 BANNERS DINÂMICOS ATIVOS';
    indicator.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: #00ff00;
      color: black;
      padding: 5px 10px;
      border-radius: 5px;
      font-weight: bold;
      z-index: 9999;
      font-size: 12px;
    `;
    
    document.body.appendChild(indicator);
    
    // Remove após 5 segundos
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.opacity = '0.5';
      }
    }, 5000);
  }
}

// INICIALIZA quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.bannerManager = new BannerManager();
  });
} else {
  window.bannerManager = new BannerManager();
}
