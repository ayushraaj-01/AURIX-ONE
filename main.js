/**
 * AURIX ONE — Flagship Interactive Controller
 * Features:
 * 1. High-Performance Exploded-View Canvas Sequencer (50 frames, 60fps lerped hover & scrub)
 * 2. HUD Technical Callout Pin Tracking & Component Inspector
 * 3. Web Audio API Acoustic Engine & Real-Time Waveform Visualizer
 * 4. 3D Tilt Perspective on Hero Hardware
 * 5. Interactive Pre-order Drawer & Colorway Switcher
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initHeroTilt();
  initExplodedViewer();
  initSoundwaveEngine();
  initPreorderControls();
  initNavScrollSpy();
});

/* ==========================================================================
   1. EXPLODED-VIEW CANVAS SEQUENCER (SCROLL-DRIVEN SHOWCASE)
   ========================================================================== */
function initExplodedViewer() {
  const canvas = document.getElementById('explodedCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const engineeringSection = document.getElementById('engineering');
  const engineeringBanner = document.getElementById('engineeringBanner');
  const engineeringProgressFill = document.getElementById('engineeringProgressFill');
  const header = document.getElementById('header');
  const loader = document.getElementById('explodedLoader');
  const loaderBar = document.getElementById('loaderBarFill');
  const loaderText = document.getElementById('loaderText');
  const caption = document.getElementById('sequenceCaption');
  const captionIndexEl = document.getElementById('captionIndex');
  const captionTitleEl = document.getElementById('captionTitle');
  const captionNoteEl = document.getElementById('captionNote');
  const counterValueEl = document.getElementById('counterValue');

  const TOTAL_FRAMES = 300;
  const LOAD_CONCURRENCY = 6;

  const chapters = [
    {
      index: '01',
      title: 'The complete instrument',
      note: 'Sealed. 248 grams. Nothing visible, everything present.',
      until: 0.14
    },
    {
      index: '02',
      title: 'The cup opens',
      note: 'Bead-blasted aluminium shell lifts off the non-parallel damping walls.',
      until: 0.32
    },
    {
      index: '03',
      title: 'Inside the chamber',
      note: '40mm graphene diaphragm, copper voice coil, oxygen-free signal path.',
      until: 0.55
    },
    {
      index: '04',
      title: 'Power & processing',
      note: 'Dual-cell battery and the hybrid ANC logic board, edge to edge.',
      until: 0.74
    },
    {
      index: '05',
      title: 'Fully deconstructed',
      note: 'Five assemblies. One acoustic chamber, machined to ±0.02mm.',
      until: 1
    }
  ];

  const frames = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let loadStarted = false;
  let nextFrameToLoad = 0;

  let currentFrame = 1;
  let targetFrame = 1;
  let drawnKey = '';
  let lastChapter = -1;
  let canvasMetrics = { w: 0, h: 0, dpr: 0 };

  let rafId = null;
  let lastTimestamp = 0;
  let isInView = false;

  function frameUrl(frameNumber) {
    return `/assets/aurix/exploded-frames/frame-${String(frameNumber).padStart(3, '0')}.jpg`;
  }

  /* ---------- Progressive frame loading (paced, not 300 at once) ---------- */
  function updateLoader() {
    const percent = Math.round((loadedCount / TOTAL_FRAMES) * 100);
    if (loaderBar) loaderBar.style.width = `${percent}%`;
    if (loaderText) loaderText.textContent = `Loading the sequence — ${percent}%`;
  }

  function hideLoader() {
    if (loader) loader.classList.add('loaded');
  }

  function startLoading() {
    if (loadStarted) return;
    loadStarted = true;
    for (let i = 0; i < LOAD_CONCURRENCY; i++) loadNextFrame();
  }

  function loadNextFrame() {
    if (nextFrameToLoad >= TOTAL_FRAMES) return;

    const index = nextFrameToLoad++;
    const img = new Image();
    img.decoding = 'async';
    frames[index] = img;

    const settle = () => {
      loadedCount++;
      updateLoader();

      // First frame: paint immediately and lift the loader.
      if (index === 0) {
        drawFrame(targetFrame, true);
        hideLoader();
      } else if (index === Math.round(targetFrame) - 1) {
        // The frame we were waiting on just arrived — repaint it.
        drawFrame(targetFrame, true);
      }

      if (loadedCount === TOTAL_FRAMES) hideLoader();
      loadNextFrame();
    };

    img.onload = settle;
    img.onerror = settle;
    img.src = frameUrl(index + 1);
  }

  /* ---------- Canvas painting ---------- */
  function nearestLoadedFrame(index) {
    const img = frames[index];
    if (img && img.complete && img.naturalWidth > 0) return img;

    for (let offset = 1; offset <= 60; offset++) {
      const lower = frames[index - offset];
      if (lower && lower.complete && lower.naturalWidth > 0) return lower;

      const higher = frames[index + offset];
      if (higher && higher.complete && higher.naturalWidth > 0) return higher;
    }
    return null;
  }

  function drawFrame(frameNumber, force) {
    const wanted = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(frameNumber)));
    const img = nearestLoadedFrame(wanted - 1);
    if (!img) return;

    // Clamp DPR: forcing 2x on 1x displays wasted fill rate every frame.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvasMetrics.w !== w || canvasMetrics.h !== h || canvasMetrics.dpr !== dpr) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvasMetrics = { w, h, dpr };
      force = true;
    }

    // Skip identical paints — the scrub changes slower than the frame loop.
    const key = `${wanted}:${img.currentSrc || img.src}`;
    if (!force && key === drawnKey) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const drawW = Math.round(img.naturalWidth * scale);
    const drawH = Math.round(img.naturalHeight * scale);

    ctx.drawImage(
      img,
      Math.round((w - drawW) / 2),
      Math.round((h - drawH) / 2),
      drawW,
      drawH
    );

    drawnKey = key;
  }

  /* ---------- Captions & counter ---------- */
  function updateChapter(progress) {
    let index = chapters.length - 1;
    for (let i = 0; i < chapters.length; i++) {
      if (progress <= chapters[i].until) { index = i; break; }
    }
    if (index === lastChapter) return;
    lastChapter = index;

    const chapter = chapters[index];
    if (captionIndexEl) captionIndexEl.textContent = chapter.index;
    if (captionTitleEl) captionTitleEl.textContent = chapter.title;
    if (captionNoteEl) captionNoteEl.textContent = chapter.note;

    if (caption) {
      caption.classList.remove('is-swapping');
      void caption.offsetWidth;
      caption.classList.add('is-swapping');
    }
  }

  function updateCounter() {
    if (!counterValueEl) return;
    counterValueEl.textContent = String(Math.round(targetFrame)).padStart(3, '0');
  }

  /* ---------- Scroll → frame mapping (unchanged timeline) ---------- */
  function handleScroll() {
    if (!engineeringSection) return;

    const rect = engineeringSection.getBoundingClientRect();
    const scrollable = engineeringSection.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;

    if (rect.top <= 0 && rect.bottom >= window.innerHeight) {
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
      targetFrame = 1 + progress * (TOTAL_FRAMES - 1);

      const pastIntro = progress > 0.02;
      if (engineeringBanner) engineeringBanner.classList.toggle('faded-out', pastIntro);
      if (header) header.classList.toggle('nav-hidden', pastIntro);
      if (engineeringProgressFill) engineeringProgressFill.style.width = `${progress * 100}%`;
      if (caption) caption.classList.toggle('is-visible', progress > 0.035);

      updateChapter(progress);
    } else if (rect.top > 0) {
      targetFrame = 1;
      if (engineeringBanner) engineeringBanner.classList.remove('faded-out');
      if (header) header.classList.remove('nav-hidden');
      if (engineeringProgressFill) engineeringProgressFill.style.width = '0%';
      if (caption) caption.classList.remove('is-visible');
    } else {
      targetFrame = TOTAL_FRAMES;
      if (header) header.classList.remove('nav-hidden');
      if (engineeringProgressFill) engineeringProgressFill.style.width = '100%';
      if (caption) caption.classList.remove('is-visible');
    }

    updateCounter();
  }

  /* ---------- Smoothing loop (frame-rate independent) ---------- */
  function tick(timestamp) {
    rafId = requestAnimationFrame(tick);

    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min(64, timestamp - lastTimestamp) || 16.7;
    lastTimestamp = timestamp;

    const delta = targetFrame - currentFrame;
    if (Math.abs(delta) < 0.02) {
      currentFrame = targetFrame;
    } else {
      // Exponential damping tuned per second, so 60Hz and 120Hz feel identical.
      currentFrame += delta * (1 - Math.exp(-dt * 0.013));
    }

    drawFrame(currentFrame);
  }

  function startLoop() {
    if (rafId !== null) return;
    lastTimestamp = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* ---------- Wiring ---------- */
  window.addEventListener('scroll', handleScroll, { passive: true });

  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf !== null) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      handleScroll();
      drawFrame(currentFrame, true);
    });
  }, { passive: true });

  // Only animate while the showpiece is on screen.
  if ('IntersectionObserver' in window && engineeringSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isInView = entry.isIntersecting;
        if (isInView) {
          handleScroll();
          startLoop();
        } else {
          stopLoop();
        }
      });
    }, { rootMargin: '20% 0px' });
    observer.observe(engineeringSection);
  } else {
    startLoop();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (isInView) startLoop();
  });

  handleScroll();

  const kickoff = () => {
    startLoading();
    handleScroll();
  };

  const scheduleKickoff = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(kickoff, { timeout: 600 });
    } else {
      setTimeout(kickoff, 120);
    }
  };

  if (document.readyState === 'complete') scheduleKickoff();
  else window.addEventListener('load', scheduleKickoff, { once: true });
}

/* ==========================================================================
   2. ACOUSTIC ENGINE & REAL-TIME SOUNDWAVE VISUALIZER (Web Audio API)
   ========================================================================== */
function initSoundwaveEngine() {
  const canvas = document.getElementById('soundwaveCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Plot colours are read from the active theme's CSS tokens
  let waveTheme = null;
  let waveColors = { ambient: '#9a9184', anti: '#a6844f', pure: '#8a2f27', grid: 'rgba(25,22,16,0.14)' };

  function refreshWaveColors() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    if (theme === waveTheme) return;
    waveTheme = theme;
    const styles = getComputedStyle(canvas);
    const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    waveColors = {
      ambient: read('--wave-ambient', '#9a9184'),
      anti: read('--wave-anti', '#a6844f'),
      pure: read('--wave-pure', '#8a2f27'),
      grid: read('--wave-grid', 'rgba(25,22,16,0.14)')
    };
  }

  let currentMode = 'anc';
  let isSoundActive = false;
  let audioCtx = null;
  let osc = null;
  let gainNode = null;

  const modeButtons = document.querySelectorAll('.mode-btn');
  const previewBtn = document.getElementById('audioPreviewBtn');
  const previewText = document.getElementById('audioPreviewBtnText');
  const globalSoundBtn = document.getElementById('globalSoundToggle');
  const modeTitle = document.getElementById('modeTitle');
  const modeText = document.getElementById('modeText');
  const monitorLabel = document.getElementById('visualizerModeLabel');

  const modeData = {
    anc: {
      title: "Adaptive Active Noise Cancellation (-55dB)",
      text: "Continuously samples ambient sound pressure at 380k ops/sec. Eliminates low-frequency airplane rumble and human vocal registers, leaving an acoustic vacuum of total focus.",
      monitor: "LIVE FEEDFORWARD INVERSION",
      ambientAmp: 35,
      antiphaseAmp: 35,
      pureAmp: 4,
      freq: 0.02
    },
    transparency: {
      title: "Bionic Acoustic Transparency Mode",
      text: "Quad beamforming external microphones capture ambient conversations and street awareness, blending them in ultra-low latency with zero natural occlusion.",
      monitor: "BIONIC REAL-TIME PASS-THROUGH",
      ambientAmp: 25,
      antiphaseAmp: 0,
      pureAmp: 28,
      freq: 0.035
    },
    spatial: {
      title: "Aurix Spatial Immersion 360°",
      text: "Proprietary HRTF binaural filters with six-axis gyroscope head tracking create an expansive, three-dimensional architectural soundstage that stays locked in physical space.",
      monitor: "360° BINAURAL SOUNDSTAGE STABILIZATION",
      ambientAmp: 15,
      antiphaseAmp: 22,
      pureAmp: 45,
      freq: 0.05
    }
  };

  // Mode button click
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      currentMode = btn.getAttribute('data-mode');
      const data = modeData[currentMode];
      if (data) {
        modeTitle.textContent = data.title;
        modeText.textContent = data.text;
        monitorLabel.textContent = data.monitor;
      }

      if (isSoundActive && osc) {
        updateAudioTone();
      }
    });
  });

  // Audio Toggle Button
  function toggleAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (!isSoundActive) {
      // Start audio tone
      audioCtx.resume();
      osc = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, audioCtx.currentTime); // Deep warm sub-bass

      gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 0.5);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();

      isSoundActive = true;
      if (previewBtn) previewBtn.classList.add('active');
      if (previewText) previewText.textContent = "Mute Acoustic Simulation";
      if (globalSoundBtn) globalSoundBtn.classList.add('active');
    } else {
      // Stop audio tone
      if (gainNode) {
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
        setTimeout(() => {
          if (osc) { osc.stop(); osc.disconnect(); osc = null; }
          isSoundActive = false;
        }, 200);
      }
      if (previewBtn) previewBtn.classList.remove('active');
      if (previewText) previewText.textContent = "Simulate Acoustic Mode";
      if (globalSoundBtn) globalSoundBtn.classList.remove('active');
    }
  }

  function updateAudioTone() {
    if (!osc || !audioCtx) return;
    if (currentMode === 'anc') {
      osc.frequency.setTargetAtTime(80, audioCtx.currentTime, 0.1);
      gainNode.gain.setTargetAtTime(0.03, audioCtx.currentTime, 0.1);
    } else if (currentMode === 'transparency') {
      osc.frequency.setTargetAtTime(440, audioCtx.currentTime, 0.1);
      gainNode.gain.setTargetAtTime(0.04, audioCtx.currentTime, 0.1);
    } else if (currentMode === 'spatial') {
      osc.frequency.setTargetAtTime(220, audioCtx.currentTime, 0.1);
      gainNode.gain.setTargetAtTime(0.07, audioCtx.currentTime, 0.1);
    }
  }

  if (previewBtn) previewBtn.addEventListener('click', toggleAudio);
  if (globalSoundBtn) globalSoundBtn.addEventListener('click', toggleAudio);

  // Waveform Animation Loop
  let phase = 0;

  function renderWaveforms() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const w = rect.width;
    const h = rect.height;
    const centerY = h / 2;

    const data = modeData[currentMode] || modeData.anc;
    phase += 0.035;
    refreshWaveColors();

    // Grid lines
    ctx.strokeStyle = waveColors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    // 1. Ambient noise wave
    ctx.strokeStyle = waveColors.ambient;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const noise = Math.sin(x * data.freq + phase) * 0.7 + Math.cos(x * 0.04 + phase * 1.5) * 0.3;
      const y = centerY + noise * data.ambientAmp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 2. Inverted anti-phase wave
    if (data.antiphaseAmp > 0) {
      ctx.strokeStyle = waveColors.anti;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const noise = Math.sin(x * data.freq + phase) * 0.7 + Math.cos(x * 0.04 + phase * 1.5) * 0.3;
        const y = centerY - noise * data.antiphaseAmp; // Exact inverted phase
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Resultant pure wave
    ctx.strokeStyle = waveColors.pure;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      let y;
      if (currentMode === 'anc') {
        // Flat calm with slight pure musical ripple
        y = centerY + Math.sin(x * 0.01 + phase * 0.8) * data.pureAmp;
      } else if (currentMode === 'spatial') {
        // Rich lush harmonized double sine wave
        y = centerY + (Math.sin(x * 0.02 + phase) * 0.6 + Math.sin(x * 0.04 - phase * 0.5) * 0.4) * data.pureAmp;
      } else {
        // Natural linear pass-through
        y = centerY + Math.sin(x * 0.025 + phase * 1.2) * data.pureAmp;
      }
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
    requestAnimationFrame(renderWaveforms);
  }

  renderWaveforms();
}

/* ==========================================================================
   3. HERO 3D TILT INTERACTION
   ========================================================================== */
function initHeroTilt() {
  const stage = document.getElementById('heroVisualStage');
  const card = document.getElementById('heroCard');
  const lighting = document.getElementById('heroLighting');

  if (!stage || !card) return;

  stage.addEventListener('mousemove', (e) => {
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xRatio = (x / rect.width) * 2 - 1; // -1 to 1
    const yRatio = (y / rect.height) * 2 - 1;

    const rotateY = xRatio * 14;
    const rotateX = -yRatio * 14;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

    if (lighting) {
      lighting.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255, 255, 255, 0.12) 0%, transparent 60%)`;
      lighting.style.opacity = '1';
    }
  });

  stage.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    if (lighting) lighting.style.opacity = '0';
  });
}

/* ==========================================================================
   4. PRE-ORDER CONTROLS & CHECKOUT MODAL
   ========================================================================== */
function initPreorderControls() {
  const modal = document.getElementById('checkoutModal');
  const openBtn = document.getElementById('openCheckoutModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const form = document.getElementById('reservationForm');
  const modalItemTitle = document.getElementById('modalItemTitle');

  const colorButtons = document.querySelectorAll('.color-btn');
  let selectedColor = "Obsidian Noir";

  colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      colorButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const name = btn.querySelector('.color-name');
      if (name) {
        selectedColor = name.textContent.trim();
        if (modalItemTitle) {
          modalItemTitle.textContent = `AURIX ONE — ${selectedColor}`;
        }
      }
    });
  });

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
  }

  // Close on backdrop click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    });
  }

  // Form submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('resName');
      const emailInput = document.getElementById('resEmail');
      const userName = nameInput.value.trim() || "Valued Backer";

      const confirmBtn = document.getElementById('confirmReservationBtn');
      confirmBtn.innerHTML = `✓ Batch 01 Reserved (#AUR-${Math.floor(1000 + Math.random() * 9000)})`;
      confirmBtn.style.background = '#10b981';

      setTimeout(() => {
        alert(`Thank you, ${userName}! Your AURIX ONE (${selectedColor}) Batch 01 reservation is confirmed. A priority dispatch confirmation will be sent to ${emailInput.value}.`);
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        confirmBtn.innerHTML = `Confirm Batch 01 Reservation`;
        confirmBtn.style.background = '';
        form.reset();
      }, 1200);
    });
  }
}

/* ==========================================================================
   5. NAVIGATION SCROLL SPY
   ========================================================================== */
function initNavScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;

    sections.forEach(sec => {
      const top = sec.offsetTop - 140;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');

      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  });
}

/* ==========================================================================
   6. ANIMATED THEME TOGGLE (DARK / LIGHT MODE WITH CIRCULAR RIPPLE & ICON DYNAMICS)
   ========================================================================== */
function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return;

  // Check stored preference or system preference
  const storedTheme = localStorage.getItem('aurix_theme');
  const initialTheme = storedTheme ? storedTheme : 'light';

  applyTheme(initialTheme);

  toggleBtn.addEventListener('click', (e) => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    triggerThemeRipple(e, nextTheme);
    applyTheme(nextTheme);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.classList.remove('theme-noir', 'theme-light');
  document.body.classList.add(theme === 'light' ? 'theme-light' : 'theme-noir');
  localStorage.setItem('aurix_theme', theme);

  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    toggleBtn.setAttribute('title', `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`);
    toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`);
  }
}

function triggerThemeRipple(event, nextTheme) {
  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const ripple = document.createElement('div');
  ripple.className = `theme-transition-ripple ripple-${nextTheme}`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  document.body.appendChild(ripple);

  // Force layout reflow before triggering scale animation
  void ripple.offsetWidth;
  ripple.classList.add('active');

  setTimeout(() => {
    ripple.remove();
  }, 750);
}
