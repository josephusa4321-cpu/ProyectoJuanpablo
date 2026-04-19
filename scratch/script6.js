
/* App wiring: reveal animations, hero number, ops tiles, tweaks, print mode */
(function () {
  const data = JSON.parse(document.getElementById('report-data').textContent);
  const { COP, COPShort, dateLong, dateTiny, updated, animateNumber } = window.FMT;
  const { renderWaterfall, renderDonut, renderTimeline, renderSpark } = window.CHARTS;
  const { initTopTable, initMovements } = window.TABLES;
  const M = window.Motion || null;

  // ---------- Fill header text ----------
  document.getElementById('h-plate').textContent = data.vehicle.plate;
  document.getElementById('h-vehicle').textContent = `${data.vehicle.make} ${data.vehicle.model} ${data.vehicle.year}`;
  document.getElementById('h-owner').textContent = data.owner;
  document.getElementById('h-start').textContent = dateLong(data.period.start);
  document.getElementById('h-end').textContent = dateLong(data.period.end);
  document.getElementById('h-days').textContent = `${data.period.days} días de operación`;
  document.getElementById('f-owner').textContent = data.owner;
  document.getElementById('f-plate').textContent = data.vehicle.plate;

  // Meta sidebar
  const d0 = new Date(data.period.start + 'T00:00:00');
  const d1 = new Date(data.period.end + 'T00:00:00');
  const shortRange = `${dateTiny(data.period.start)} — ${dateTiny(data.period.end)}`;
  document.getElementById('m-period').textContent = shortRange;
  document.getElementById('m-days').textContent = data.period.days;
  document.getElementById('m-rentals').textContent = data.totals.rentals;
  document.getElementById('m-drivers').textContent = data.totals.drivers;
  document.getElementById('m-updated').textContent = updated(data.updated);

  // ---------- Reveal animations (IntersectionObserver) ----------
  const revealEls = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const i = parseInt(el.dataset.revealIdx || '0', 10);
        if (M) {
          M.animate(el, { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0)'] },
            { duration: 0.8, delay: Math.min(i, 4) * 0.06, easing: [0.2, 0.7, 0.2, 1] });
        } else {
          el.style.transition = 'opacity .7s, transform .8s';
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
        io.unobserve(el);
      }
    });
  }, { threshold: 0.1 });
  revealEls.forEach((el, i) => {
    el.dataset.revealIdx = i;
    io.observe(el);
  });

  // ---------- Hero number animation ----------
  const heroNum = document.getElementById('hero-number');
  const heroInt = document.getElementById('hero-int');
  const target = parseInt(heroNum.getAttribute('data-value'), 10);
  heroNum.classList.toggle('positive', target >= 0);
  document.getElementById('hero-sign').textContent = target < 0 ? '−' : '+';
  const triggerHero = () => {
    animateNumber(heroInt, Math.abs(target), {
      duration: 1800,
      delay: 300,
      format: (v) => COP(v, { bare: true }).replace('-', ''),
    });
  };
  setTimeout(triggerHero, 200);

  // Formula chips + anomaly chips — animate all data-money
  document.querySelectorAll('[data-money]').forEach((el, i) => {
    const v = parseInt(el.getAttribute('data-money'), 10);
    const abs = Math.abs(v);
    const sign = v < 0 ? '−' : '';
    animateNumber(el, abs, {
      duration: 1200,
      delay: 400 + i * 50,
      format: (x) => sign + '$' + COP(x, { bare: true }).replace(/^-/, '').replace('$',''),
    });
  });

  // ---------- Waterfall ----------
  renderWaterfall(document.getElementById('waterfall'), data);

  // ---------- Donut + legend ----------
  const legendEl = document.getElementById('donut-legend');
  legendEl.innerHTML = '';
  renderDonut(document.getElementById('donut'), data.expense_distribution, legendEl);

  // ---------- Timeline ----------
  let timelineMode = 'area';
  renderTimeline(document.getElementById('timeline'), data.weekly, timelineMode);
  document.querySelectorAll('#timeline-mode .seg').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#timeline-mode .seg').forEach(x => { x.classList.remove('seg-on'); x.setAttribute('aria-selected', 'false'); });
      b.classList.add('seg-on'); b.setAttribute('aria-selected', 'true');
      timelineMode = b.getAttribute('data-mode');
      renderTimeline(document.getElementById('timeline'), data.weekly, timelineMode);
    });
  });

  // ---------- Ops tiles ----------
  const ops = data.ops;
  const totalExpensesNoAnomaly = data.totals.operating_expenses - 1310000;
  const tiles = [
    {
      k: 'Días de operación',
      v: ops.days, u: 'días',
      sub: `${ops.occupancy_pct.toFixed(1).replace('.',',')}% ocupación estimada`,
      spark: data.weekly.map(w => w.income > 0 ? 1 : 0).map((_, i) => data.weekly[i].income/1000),
      sparkColor: 'var(--income)',
    },
    {
      k: 'Pagos de alquiler',
      v: ops.rentals, u: 'pagos',
      sub: `Promedio ${COP(ops.avg_rental_value)} por pago`,
    },
    {
      k: 'Utilidad por día',
      v: ops.utility_per_day, u: '/día',
      sub: 'Neto ÷ días de operación',
      tone: ops.utility_per_day < 0 ? 'neg' : 'pos',
      money: true,
    },
    {
      k: 'Conductores',
      v: ops.drivers, u: '',
      sub: data.top_expenses.slice(0,1) && 'José Daniel, Hernán, Juan Pablo',
    },
    {
      k: 'Sin overhaul',
      v: data.totals.gross_income - data.totals.admin_commission - totalExpensesNoAnomaly,
      u: '', sub: 'Resultado hipotético sin el gasto anómalo',
      tone: (data.totals.gross_income - data.totals.admin_commission - totalExpensesNoAnomaly) >= 0 ? 'pos' : 'neg',
      money: true,
    },
    {
      k: 'Anomalías',
      v: ops.anomaly_count, u: ops.anomaly_count === 1 ? 'gasto' : 'gastos',
      sub: 'Transacciones &gt; $500.000',
      tone: 'flag',
    },
  ];
  const opsGrid = document.getElementById('ops-grid');
  tiles.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'ops-tile' + (t.tone ? ' ' + t.tone : '');
    const vFormatted = t.money ? (t.v < 0 ? '−' : '') + COPShort(Math.abs(t.v)) : t.v.toString();
    div.innerHTML = `
      <div class="ops-tile-k">${t.k}</div>
      <div class="ops-tile-v"><span class="ops-val">${vFormatted}</span>${t.u ? `<span class="ops-tile-u">${t.u}</span>` : ''}</div>
      <div class="ops-tile-sub">${t.sub || ''}</div>
      ${t.spark ? '<div class="tile-spark"></div>' : ''}
    `;
    opsGrid.appendChild(div);
    // Animate counts for integer tiles
    const valEl = div.querySelector('.ops-val');
    if (!t.money && Number.isFinite(t.v)) {
      animateNumber(valEl, t.v, { duration: 1200, delay: 200 + i * 60, format: v => Math.round(v).toString() });
    }
    if (t.spark) {
      renderSpark(div.querySelector('.tile-spark'), t.spark, t.sparkColor || 'var(--text-3)');
    }
  });

  // ---------- Tables ----------
  initTopTable(document.getElementById('top-table'), data.top_expenses);
  initMovements(document.getElementById('mov-table'), data.movements);

  // ---------- Parallax glow on scroll ----------
  const glow1 = document.querySelector('.ambient-glow-1');
  const glow2 = document.querySelector('.ambient-glow-2');
  let scrollY = 0, ticking = false;
  function onScroll() {
    scrollY = window.scrollY;
    if (!ticking) {
      requestAnimationFrame(() => {
        if (glow1) glow1.style.transform = `translate3d(0, ${scrollY * 0.15}px, 0)`;
        if (glow2) glow2.style.transform = `translate3d(0, ${scrollY * -0.08}px, 0)`;
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- Tweaks (protocol + local panel) ----------
  const ACCENTS = [
    { key: 'violet',  color: '#A78BFA' },
    { key: 'cyan',    color: '#22D3EE' },
    { key: 'amber',   color: '#F5B547' },
    { key: 'emerald', color: '#34D399' },
    { key: 'rose',    color: '#FB7185' },
  ];
  const defaults = window.__TWEAK_DEFAULTS || { accent: 'violet' };
  let currentAccent = defaults.accent || 'violet';

  function applyAccent(k) {
    currentAccent = k;
    document.documentElement.setAttribute('data-accent', k);
    // Update swatches
    document.querySelectorAll('.swatch').forEach(s => {
      s.classList.toggle('on', s.getAttribute('data-accent') === k);
    });
  }
  applyAccent(currentAccent);

  // Build swatches
  const swEl = document.getElementById('swatches');
  ACCENTS.forEach(a => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'swatch' + (a.key === currentAccent ? ' on' : '');
    s.setAttribute('data-accent', a.key);
    s.style.background = a.color;
    s.title = a.key;
    s.addEventListener('click', () => {
      applyAccent(a.key);
      // Persist
      try {
        window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { accent: a.key } }, '*');
      } catch (e) {}
    });
    swEl.appendChild(s);
  });

  // Tweaks toggle UI (local button always works)
  const tweaksPanel = document.getElementById('tweaks');
  const tweaksBtn = document.getElementById('tweaks-toggle');
  const tweaksClose = document.getElementById('tweaks-close');
  function openTweaks() { tweaksPanel.classList.add('on'); tweaksPanel.setAttribute('aria-hidden','false'); tweaksBtn.setAttribute('aria-pressed','true'); }
  function closeTweaks() { tweaksPanel.classList.remove('on'); tweaksPanel.setAttribute('aria-hidden','true'); tweaksBtn.setAttribute('aria-pressed','false'); }
  tweaksBtn.addEventListener('click', () => tweaksPanel.classList.contains('on') ? closeTweaks() : openTweaks());
  tweaksClose.addEventListener('click', closeTweaks);

  // Listen for host edit-mode events
  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === '__activate_edit_mode') openTweaks();
    if (d.type === '__deactivate_edit_mode') closeTweaks();
  });
  // Announce availability AFTER listener is live
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  // ---------- Print mode toggle ----------
  const printBtn = document.getElementById('print-toggle');
  printBtn.addEventListener('click', () => {
    const on = document.documentElement.getAttribute('data-print') === 'on';
    if (on) {
      document.documentElement.removeAttribute('data-print');
      printBtn.setAttribute('aria-pressed', 'false');
    } else {
      document.documentElement.setAttribute('data-print', 'on');
      printBtn.setAttribute('aria-pressed', 'true');
      // Re-render charts so colors update
      setTimeout(() => {
        renderWaterfall(document.getElementById('waterfall'), data);
        document.getElementById('donut-legend').innerHTML = '';
        renderDonut(document.getElementById('donut'), data.expense_distribution, document.getElementById('donut-legend'));
        renderTimeline(document.getElementById('timeline'), data.weekly, timelineMode);
      }, 50);
    }
  });

  // ---------- Re-render charts on resize (debounced) ----------
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderWaterfall(document.getElementById('waterfall'), data);
      document.getElementById('donut-legend').innerHTML = '';
      renderDonut(document.getElementById('donut'), data.expense_distribution, document.getElementById('donut-legend'));
      renderTimeline(document.getElementById('timeline'), data.weekly, timelineMode);
    }, 200);
  });
})();

