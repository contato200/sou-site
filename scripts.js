/* ============================================
   SOU · scripts-v2.js
   Aurora canvas + particles + spotlight + scroll progress + reveals
   ============================================ */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isLowPower = isMobile || isIOS || (navigator.deviceMemory && navigator.deviceMemory < 4);

  // Set viewport height fix pra iOS (resolve 100vh com browser bar)
  const setVH = () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  };
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);

  // ============ NAV MOBILE TOGGLE ============
  const navToggle = document.querySelector('.nav__toggle');
  const navLinks = document.querySelector('.nav__links');
  navToggle?.addEventListener('click', () => navLinks.classList.toggle('open'));
  document.querySelectorAll('.nav__links a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  // ============ NAV SCROLL EFFECT ============
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 100);
  }, { passive: true });

  // ============ AURORA CANVAS — gradient mesh "vídeo no fundo" ============
  const auroraCanvas = document.getElementById('aurora-canvas');
  if (auroraCanvas && !reduceMotion) {
    const ctx = auroraCanvas.getContext('2d');
    let w, h;
    // Mobile/low-power: 2 blobs em vez de 3, raios menores, alpha menor
    const blobs = isLowPower ? [
      { x: 0.3, y: 0.3, r: 350, hue: 42, sat: 50, light: 50, alpha: 0.07, phaseX: 0, phaseY: 1.2, speedX: 0.00010, speedY: 0.00010 },
      { x: 0.7, y: 0.7, r: 400, hue: 38, sat: 55, light: 48, alpha: 0.06, phaseX: 2.1, phaseY: 0.5, speedX: 0.00008, speedY: 0.00012 }
    ] : [
      { x: 0.2, y: 0.3, r: 500, hue: 42, sat: 50, light: 50, alpha: 0.10, phaseX: 0, phaseY: 1.2, speedX: 0.00015, speedY: 0.00012 },
      { x: 0.7, y: 0.6, r: 600, hue: 38, sat: 55, light: 48, alpha: 0.08, phaseX: 2.1, phaseY: 0.5, speedX: 0.00010, speedY: 0.00018 },
      { x: 0.5, y: 0.8, r: 450, hue: 45, sat: 45, light: 52, alpha: 0.07, phaseX: 4.0, phaseY: 3.2, speedX: 0.00013, speedY: 0.00009 }
    ];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = auroraCanvas.width = window.innerWidth * dpr;
      h = auroraCanvas.height = window.innerHeight * dpr;
      auroraCanvas.style.width = window.innerWidth + 'px';
      auroraCanvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    let lastTime = 0;
    // Cap de framerate: 30fps em mobile/low-power, 60fps em desktop
    const targetFPS = isLowPower ? 30 : 60;
    const frameMs = 1000 / targetFPS;
    let isVisible = !document.hidden;

    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });

    const tick = (now) => {
      if (!isVisible) {
        requestAnimationFrame(tick);
        return;
      }
      if (now - lastTime < frameMs) {
        requestAnimationFrame(tick);
        return;
      }
      lastTime = now;

      const W = window.innerWidth, H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen';

      blobs.forEach(b => {
        const x = (b.x + Math.sin(t * b.speedX + b.phaseX) * 0.15) * W;
        const y = (b.y + Math.cos(t * b.speedY + b.phaseY) * 0.18) * H;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        grad.addColorStop(0, `hsla(${b.hue}, ${b.sat}%, ${b.light}%, ${b.alpha})`);
        grad.addColorStop(1, `hsla(${b.hue}, ${b.sat}%, ${b.light}%, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      t += frameMs;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ============ PARTICLES — pó dourado no hero ============
  const particlesCanvas = document.getElementById('particles-canvas');
  if (particlesCanvas && !reduceMotion && !isMobile) {
    const ctx = particlesCanvas.getContext('2d');
    let pw, ph;
    const particles = [];
    const COUNT = 50;

    const resizeP = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const hero = document.getElementById('hero');
      pw = particlesCanvas.width = hero.offsetWidth * dpr;
      ph = particlesCanvas.height = hero.offsetHeight * dpr;
      particlesCanvas.style.width = hero.offsetWidth + 'px';
      particlesCanvas.style.height = hero.offsetHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resizeP();
    window.addEventListener('resize', resizeP);

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.5 + 0.4,
        vy: -(Math.random() * 0.3 + 0.05),
        vx: (Math.random() - 0.5) * 0.15,
        alpha: Math.random() * 0.5 + 0.1,
        flicker: Math.random() * 0.02 + 0.005
      });
    }

    const tickP = () => {
      const W = particlesCanvas.style.width.replace('px', '') | 0 || window.innerWidth;
      const H = particlesCanvas.style.height.replace('px', '') | 0 || window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      particles.forEach(p => {
        p.y += p.vy;
        p.x += p.vx;
        p.alpha += (Math.sin(Date.now() * p.flicker) * 0.005);

        if (p.y < -10) {
          p.y = H + 10;
          p.x = Math.random() * W;
        }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 169, 97, ${Math.max(0.05, Math.min(0.6, p.alpha))})`;
        ctx.fill();
      });

      requestAnimationFrame(tickP);
    };
    tickP();
  }

  // ============ CURSOR SPOTLIGHT — luz que segue o mouse ============
  const spotlight = document.querySelector('.cursor-spotlight');
  if (spotlight && !reduceMotion && !isMobile) {
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let cx = mx, cy = my;
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
    });
    const lerpTick = () => {
      cx += (mx - cx) * 0.08;
      cy += (my - cy) * 0.08;
      spotlight.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(lerpTick);
    };
    lerpTick();
  }

  // ============ REVEAL ON SCROLL ============
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  document.querySelectorAll('.reveal-stagger').forEach(parent => {
    Array.from(parent.children).forEach((child, i) => {
      child.classList.add('reveal-stagger__item');
      child.style.transitionDelay = `${i * 90}ms`;
    });
    const staggerObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          Array.from(entry.target.children).forEach(child => child.classList.add('is-visible'));
          staggerObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });
    staggerObserver.observe(parent);
  });

  // ============ MÉTODO — LINHA PROGRESSIVA ============
  const metodoSection = document.querySelector('#metodo');
  const metodoList = document.querySelector('.metodo__list');
  if (metodoSection && metodoList) {
    const updateMetodoLine = () => {
      const rect = metodoList.getBoundingClientRect();
      const listTop = rect.top;
      const listHeight = rect.height;
      const viewportH = window.innerHeight;
      const startTrigger = viewportH * 0.7;
      const endTrigger = viewportH * 0.2;
      const totalDistance = listHeight + (startTrigger - endTrigger);
      const scrolled = startTrigger - listTop;
      const progress = Math.max(0, Math.min(1, scrolled / totalDistance));
      metodoList.style.setProperty('--metodo-progress', (progress * 100).toFixed(2) + '%');
      if (progress > 0.02) metodoList.classList.add('is-active');
    };
    window.addEventListener('scroll', updateMetodoLine, { passive: true });
    window.addEventListener('resize', updateMetodoLine, { passive: true });
    updateMetodoLine();
  }

  // ============ ETAPAS — REVEAL DRAMÁTICO ============
  const etapaObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('etapa--active');
        etapaObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4, rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.etapa').forEach(et => etapaObserver.observe(et));

  // ============ TILT 3D NOS CARDS ============
  if (!reduceMotion && !isMobile) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rotY = (x - 0.5) * 8;
        const rotX = (0.5 - y) * 8;
        card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(0)`;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ============ PARALLAX SUTIL DO GRID + GLOWS ============
  const bgGrid = document.querySelector('.bg-grid');
  if (bgGrid && !isMobile) {
    window.addEventListener('scroll', () => {
      const offset = window.scrollY * 0.15;
      bgGrid.style.transform = `translateY(${offset}px)`;
    }, { passive: true });
  }

  // ============ NÚMEROS GIGANTES PARALLAX (descendem mais devagar que o conteúdo) ============
  const giants = document.querySelectorAll('.section__giant-num');
  if (giants.length && !isMobile) {
    window.addEventListener('scroll', () => {
      giants.forEach(g => {
        const rect = g.parentElement.getBoundingClientRect();
        const offset = (rect.top - window.innerHeight / 2) * 0.05;
        g.style.transform = `translateY(${offset}px)`;
      });
    }, { passive: true });
  }

  // ============ HERO STAKES INDICADOR ============
  document.querySelector('.hero__stakes')?.classList.add('stakes-loaded');

  // ============ TRACKING DE CLIQUES NO WHATSAPP ============
  document.querySelectorAll('[data-track-whatsapp]').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof fbq !== 'undefined') {
        fbq('track', 'Contact', { content_name: 'WhatsApp Click' });
      }
      if (typeof gtag !== 'undefined') {
        gtag('event', 'whatsapp_click', {
          event_category: 'engagement',
          event_label: 'WhatsApp Direct'
        });
      }
    });
  });

  // ============ FORM — TRACKING + UX ============
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Enviando...';
      btn.disabled = true;

      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          // Conversão: Meta Pixel
          if (typeof fbq !== 'undefined') {
            fbq('track', 'Lead', {
              content_name: 'SOU Contato',
              content_category: 'Consultoria'
            });
          }
          // Conversão: GA4
          if (typeof gtag !== 'undefined') {
            gtag('event', 'generate_lead', {
              event_category: 'engagement',
              event_label: 'SOU Contato',
              value: 1
            });
          }
          // UX: tela de sucesso
          form.innerHTML = `
            <div style="text-align:center; padding: 3rem 1rem; color: var(--text);">
              <div style="font-size: 3rem; margin-bottom: 1rem; color: var(--accent); line-height: 1;">✓</div>
              <h3 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 700;">Mensagem recebida.</h3>
              <p style="color: var(--text-muted); font-size: 0.9375rem;">Resposta em até 1 dia útil. Sem proposta automática.</p>
            </div>
          `;
        } else {
          throw new Error('Falha no envio');
        }
      } catch (err) {
        btn.textContent = originalText;
        btn.disabled = false;
        alert('Não conseguimos enviar agora. Tente o WhatsApp: (11) 99206-0658');
      }
    });
  }
})();
