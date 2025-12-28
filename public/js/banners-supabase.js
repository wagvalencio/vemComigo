/* =====================================================
   BANNERS SUPABASE - VERSÃO LIMPA E FUNCIONAL
   Sem debug, badge "Patrocinado" mantida
   ===================================================== */

(async function() {
    'use strict';

    // 1. Aguarda Supabase carregar
    let attempts = 0;
    while (!window.supabase && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.supabase) return;

    // 2. Função principal
    async function carregarBanners() {
        const bannerArea = document.getElementById('banner-area');
        if (!bannerArea) return; // Só executa na Home

        try {
            // Busca banners ativos
            const { data: banners, error } = await supabase
                .from('public_banners')
                .select('titulo, imagem_url, link')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!banners || banners.length === 0) return;

            // Limpa área
            bannerArea.innerHTML = '';

            // Adiciona cada banner (ESTILO IDÊNTICO AO ORIGINAL)
            banners.forEach((banner, index) => {
                const slideDiv = document.createElement('div');
                slideDiv.className = `banner-slide image ${index === 0 ? 'active' : ''}`;
                
                // **IMPORTANTE: Só background-image no style, o CSS original faz o resto**
                slideDiv.style.backgroundImage = `url('${banner.imagem_url}')`;
                
                // **HTML IDÊNTICO ao original (com "Patrocinado")**
                slideDiv.innerHTML = `
    <div class="banner-content">
        ${banner.titulo ? `<h3>${banner.titulo}</h3>` : ''}
    </div>
    <span class="banner-tag">Patrocinado</span>
`;

                // Se tiver link, clicável
                if (banner.link) {
                    slideDiv.style.cursor = 'pointer';
                    slideDiv.addEventListener('click', () => {
                        window.open(banner.link, '_blank');
                    });
                }

                bannerArea.appendChild(slideDiv);
            });

            // Reinicia slider (mesmo código do index.html original)
            initSlider();

        } catch (err) {
            console.error('Banners erro:', err);
            // Em erro, mantém banners estáticos originais
        }
    }

    // 3. Slider IDÊNTICO ao original do index.html
    function initSlider() {
        setTimeout(() => {
            const slides = document.querySelectorAll('.banner-slide');
            let index = 0;
            
            if (window.bannerInterval) clearInterval(window.bannerInterval);
            
            if (slides.length > 1) {
                window.bannerInterval = setInterval(() => {
                    slides[index].classList.remove('active');
                    index = (index + 1) % slides.length;
                    slides[index].classList.add('active');
                }, 6000);
            }
        }, 100);
    }

    // 4. Sincroniza com router
    function syncRouter() {
        function checkAndRun() {
            const hash = window.location.hash.replace('#', '');
            if (hash === '' || hash === 'home') {
                carregarBanners();
            }
        }
        
        checkAndRun();
        window.addEventListener('hashchange', checkAndRun);
    }

    // Inicia
    syncRouter();

})();
