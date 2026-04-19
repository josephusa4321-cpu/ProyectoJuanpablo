/* Hand-rolled SVG charts for Cargun360 report */
(function () {
  const { COP, COPShort, dateTiny, easeOutCubic } = window.FMT;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  const CAT_COLORS = {
    labor:       '#60A5FA',
    parts:       '#F87171',
    admin:       '#A78BFA',
    accessories: '#22D3EE',
    maintenance: '#F5B547',
    inspection:  '#F472B6',
  };
  const TYPE_COLORS = {
    income: 'var(--income)',
    expense: 'var(--expense)',
    net_neg: 'var(--expense)',
    net_pos: 'var(--income)',
  };

  // ---------- Tooltip ----------
  const tooltip = document.getElementById('tooltip');
  function showTip(html, x, y) {
    tooltip.innerHTML = html;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    tooltip.classList.add('on');
    tooltip.setAttribute('aria-hidden', 'false');
  }
  function hideTip() {
    tooltip.classList.remove('on');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  // ---------- Shared axis helpers ----------
  function niceCeil(n) {
    if (n <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(n)));
    const f = n / mag;
    let nf;
    if (f <= 1) nf = 1;
    else if (f <= 2) nf = 2;
    else if (f <= 5) nf = 5;
    else nf = 10;
    return nf * mag;
  }

  // ---------- WATERFALL ----------
  // Steps: gross(+), commission(-), expenses(-) => net
  function renderWaterfall(container, data) {
    const { gross_income, admin_commission, operating_expenses, net_result } = data.totals;

    const steps = [
      { label: 'Ingreso bruto',    value:  gross_income,        type: 'income',  runningStart: 0,            runningEnd: gross_income },
      { label: 'Comisión admin.',  value: -admin_commission,    type: 'expense', runningStart: gross_income - admin_commission, runningEnd: gross_income },
      { label: 'Gastos operativos',value: -operating_expenses,  type: 'expense', runningStart: gross_income - admin_commission - operating_expenses, runningEnd: gross_income - admin_commission },
      { label: 'Resultado neto',   value:  net_result,          type: net_result < 0 ? 'net_neg' : 'net_pos', runningStart: Math.min(0, net_result), runningEnd: Math.max(0, net_result), isTotal: true },
    ];

    const width = container.clientWidth || 900;
    const mobile = width < 640;
    const height = mobile ? 300 : 360;
    const pad = { top: 30, right: 20, bottom: 50, left: mobile ? 40 : 70 };

    const yMin = Math.min(0, ...steps.map(s => s.runningStart));
    const yMaxRaw = Math.max(...steps.map(s => s.runningEnd));
    const yMax = yMaxRaw * 1.05;

    const xScale = i => pad.left + (i + 0.5) * ((width - pad.left - pad.right) / steps.length);
    const barW = ((width - pad.left - pad.right) / steps.length) * 0.55;
    const yScale = v => pad.top + (1 - (v - yMin) / (yMax - yMin)) * (height - pad.top - pad.bottom);
    const y0 = yScale(0);

    container.innerHTML = '';
    const svg = el('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width: '100%', height,
      role: 'img',
      'aria-label': 'Cascada financiera de ingresos a resultado neto'
    }, container);

    // grid
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const v = yMin + (yMax - yMin) * (i / gridCount);
      const y = yScale(v);
      el('line', {
        x1: pad.left, x2: width - pad.right, y1: y, y2: y,
        stroke: 'rgba(255,255,255,0.05)', 'stroke-width': 1
      }, svg);
      const label = el('text', {
        x: pad.left - 10, y: y + 3,
        'text-anchor': 'end', fill: 'var(--text-4)',
        'font-size': 10, 'font-family': 'var(--font-mono, monospace)'
      }, svg);
      label.textContent = COPShort(v);
    }
    // zero baseline
    el('line', {
      x1: pad.left, x2: width - pad.right, y1: y0, y2: y0,
      stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1, 'stroke-dasharray': '3 3'
    }, svg);

    // connector lines (drawn first so bars overlap)
    for (let i = 0; i < steps.length - 1; i++) {
      const s = steps[i];
      const next = steps[i + 1];
      if (next.isTotal) continue;
      const y = yScale(s.runningStart < 0 ? s.runningStart : s.runningEnd) -
                ((s.type === 'income' || (i === 0)) ? 0 : 0); // simplified
      // Connect from top of THIS bar's end to top of NEXT bar's start
      const yConn = yScale(Math.max(s.runningStart, s.runningEnd) === s.runningEnd ? s.runningEnd : s.runningStart);
      const x1 = xScale(i) + barW / 2;
      const x2 = xScale(i + 1) - barW / 2;
      const line = el('line', {
        x1, y1: yConn, x2, y2: yConn,
        stroke: 'rgba(255,255,255,0.18)',
        'stroke-width': 1, 'stroke-dasharray': '2 3',
        'stroke-dashoffset': (x2 - x1),
        opacity: 0,
      }, svg);
      line.style.strokeDasharray = (x2 - x1) + 'px';
      line.style.strokeDashoffset = (x2 - x1) + 'px';
      line.style.transition = 'stroke-dashoffset 0.6s ease-out ' + (0.4 + i * 0.25) + 's, opacity 0.3s ease ' + (0.4 + i * 0.25) + 's';
      setTimeout(() => { line.style.strokeDashoffset = '0'; line.style.opacity = '0.7'; }, 30);
    }

    // bars
    steps.forEach((s, i) => {
      const cx = xScale(i);
      const top = yScale(Math.max(s.runningStart, s.runningEnd));
      const bot = yScale(Math.min(s.runningStart, s.runningEnd));
      const h = Math.max(2, bot - top);
      let fillVar, labelColor;
      if (s.type === 'income')  { fillVar = 'var(--income)'; labelColor = 'var(--income)'; }
      else if (s.type === 'expense') { fillVar = 'var(--expense)'; labelColor = 'var(--expense)'; }
      else { fillVar = s.value < 0 ? 'var(--expense)' : 'var(--income)'; labelColor = fillVar; }

      const g = el('g', { class: 'wf-bar', style: 'cursor: default;' }, svg);

      const rect = el('rect', {
        x: cx - barW/2, y: top + h, width: barW, height: 0,
        fill: fillVar, rx: 3, ry: 3,
        opacity: s.isTotal ? 1 : 0.85
      }, g);

      // Animate
      rect.style.transition = 'height 0.75s cubic-bezier(.2,.7,.2,1) ' + (i * 0.18) + 's, y 0.75s cubic-bezier(.2,.7,.2,1) ' + (i * 0.18) + 's, opacity .3s ease';
      setTimeout(() => {
        rect.setAttribute('y', top);
        rect.setAttribute('height', h);
      }, 40);

      // outline highlight for net total
      if (s.isTotal) {
        const ring = el('rect', {
          x: cx - barW/2 - 3, y: top - 3, width: barW + 6, height: h + 6,
          fill: 'none', stroke: fillVar, 'stroke-width': 1, 'stroke-dasharray': '3 3',
          rx: 5, ry: 5, opacity: 0,
        }, g);
        ring.style.transition = 'opacity 0.4s ease ' + (0.9 + i * 0.18) + 's';
        setTimeout(() => ring.setAttribute('opacity', '0.6'), 40);
      }

      // Value label (above or below bar)
      const labelY = s.value >= 0 ? top - 8 : bot + 16;
      const lbl = el('text', {
        x: cx, y: labelY,
        'text-anchor': 'middle',
        fill: labelColor,
        'font-size': mobile ? 11 : 13,
        'font-weight': 600,
        'font-family': 'var(--font-sans)',
        opacity: 0
      }, g);
      lbl.textContent = (s.value >= 0 ? '+' : '−') + COP(Math.abs(s.value), { bare: false });
      lbl.style.transition = 'opacity 0.4s ease ' + (0.75 + i * 0.18) + 's';
      setTimeout(() => lbl.setAttribute('opacity', '1'), 40);

      // Category label (below chart)
      const cat = el('text', {
        x: cx, y: height - 22,
        'text-anchor': 'middle',
        fill: 'var(--text-3)',
        'font-size': mobile ? 10 : 12,
      }, svg);
      cat.textContent = mobile && s.label.length > 12 ? s.label.split(' ')[0] : s.label;

      // Running total under category
      const run = el('text', {
        x: cx, y: height - 8,
        'text-anchor': 'middle',
        fill: 'var(--text-4)',
        'font-size': mobile ? 9 : 10,
        'font-family': 'var(--font-mono)'
      }, svg);
      const runValue = s.isTotal ? net_result : (i === 0 ? gross_income : (i === 1 ? gross_income - admin_commission : gross_income - admin_commission - operating_expenses));
      run.textContent = COPShort(runValue);

      // Hover
      g.addEventListener('mouseenter', (e) => {
        rect.setAttribute('opacity', 1);
        const html = `
          <div class="tt-title">${s.label}</div>
          <div class="tt-row"><span class="tt-k">Monto</span><span style="color:${labelColor}">${(s.value >= 0 ? '+' : '−')}${COP(Math.abs(s.value))}</span></div>
          <div class="tt-row"><span class="tt-k">Total acumulado</span><span>${COP(runValue)}</span></div>
        `;
        const rect_ = svg.getBoundingClientRect();
        showTip(html, rect_.left + cx, rect_.top + top);
      });
      g.addEventListener('mousemove', (e) => {
        const rect_ = svg.getBoundingClientRect();
        showTip(tooltip.innerHTML, rect_.left + cx, rect_.top + top);
      });
      g.addEventListener('mouseleave', () => {
        rect.setAttribute('opacity', s.isTotal ? 1 : 0.85);
        hideTip();
      });
    });
  }

  // ---------- DONUT ----------
  function renderDonut(container, items, legendEl) {
    const size = 340;
    const cx = size/2, cy = size/2;
    const rOuter = 150, rInner = 100;
    const gap = 0.015; // radians

    container.innerHTML = '';
    const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, width: '100%', height: '100%', role:'img','aria-label':'Distribución de gastos por categoría' }, container);

    const total = items.reduce((s, it) => s + it.pct, 0);
    let angle = -Math.PI / 2;

    items.forEach((it, i) => {
      const fraction = it.pct / total;
      const aStart = angle + gap/2;
      const aEnd = angle + fraction * Math.PI * 2 - gap/2;
      angle += fraction * Math.PI * 2;

      const color = CAT_COLORS[it.key] || 'var(--accent)';

      const x1 = cx + rOuter * Math.cos(aStart), y1 = cy + rOuter * Math.sin(aStart);
      const x2 = cx + rOuter * Math.cos(aEnd),   y2 = cy + rOuter * Math.sin(aEnd);
      const xi1 = cx + rInner * Math.cos(aEnd),  yi1 = cy + rInner * Math.sin(aEnd);
      const xi2 = cx + rInner * Math.cos(aStart),yi2 = cy + rInner * Math.sin(aStart);
      const large = (aEnd - aStart) > Math.PI ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
        `L ${xi1} ${yi1}`,
        `A ${rInner} ${rInner} 0 ${large} 0 ${xi2} ${yi2}`,
        'Z'
      ].join(' ');

      const path = el('path', {
        d, fill: color, stroke: 'var(--bg)', 'stroke-width': 2,
        opacity: 0, style: 'cursor: pointer;'
      }, svg);
      path.style.transition = 'opacity 0.6s ease ' + (i * 0.08) + 's, transform 0.35s cubic-bezier(.2,.7,.2,1)';
      path.style.transformOrigin = `${cx}px ${cy}px`;
      setTimeout(() => path.setAttribute('opacity', '1'), 40);

      const updateCenter = (inHover) => {
        const center = document.getElementById('donut-center');
        if (!inHover) {
          center.innerHTML = `
            <span class="donut-center-k">Total gastado</span>
            <span class="donut-center-v">${COP(5780130)}</span>
            <span class="donut-center-sub">+ comisión admin. ${COP(1640140)}</span>`;
        } else {
          center.innerHTML = `
            <span class="donut-center-k" style="color:${color}">${it.label}</span>
            <span class="donut-center-v">${COP(it.amount)}</span>
            <span class="donut-center-sub">${it.pct.toFixed(1).replace('.',',')}% del total</span>`;
        }
      };

      const li = document.createElement('li');
      li.innerHTML = `
        <span class="legend-dot" style="background:${color}"></span>
        <span class="legend-label">${it.label}</span>
        <span class="legend-pct">${it.pct.toFixed(1).replace('.',',')}%</span>
        <span class="legend-amt">${COP(it.amount)}</span>
      `;
      legendEl.appendChild(li);

      const hoverIn = () => {
        path.style.transform = 'scale(1.035)';
        updateCenter(true);
        items.forEach((_, j) => {
          if (j !== i) svg.children[j]?.setAttribute('opacity', '0.25');
        });
        li.style.background = 'rgba(255,255,255,0.04)';
      };
      const hoverOut = () => {
        path.style.transform = 'scale(1)';
        updateCenter(false);
        items.forEach((_, j) => svg.children[j]?.setAttribute('opacity', '1'));
        li.style.background = '';
      };
      path.addEventListener('mouseenter', hoverIn);
      path.addEventListener('mouseleave', hoverOut);
      li.addEventListener('mouseenter', hoverIn);
      li.addEventListener('mouseleave', hoverOut);
    });
  }

  // ---------- TIMELINE ----------
  function renderTimeline(container, weekly, mode = 'area') {
    const width = container.clientWidth || 900;
    const mobile = width < 640;
    const height = mobile ? 300 : 340;
    const pad = { top: 20, right: 20, bottom: 48, left: mobile ? 40 : 60 };

    const maxV = Math.max(...weekly.map(w => Math.max(w.income, w.expenses)));
    const yMax = niceCeil(maxV);

    const xScale = i => pad.left + (i / (weekly.length - 1)) * (width - pad.left - pad.right);
    const yScale = v => pad.top + (1 - v / yMax) * (height - pad.top - pad.bottom);

    container.innerHTML = '';
    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height, role: 'img', 'aria-label': 'Ingresos y gastos semanales' }, container);

    // grid
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const v = yMax * i / gridCount;
      const y = yScale(v);
      el('line', { x1: pad.left, x2: width - pad.right, y1: y, y2: y, stroke: 'rgba(255,255,255,0.05)' }, svg);
      const t = el('text', { x: pad.left - 8, y: y + 3, 'text-anchor': 'end', fill: 'var(--text-4)', 'font-size': 10, 'font-family': 'var(--font-mono)' }, svg);
      t.textContent = COPShort(v);
    }

    // x labels (sparse)
    const xLabelEvery = mobile ? 4 : 2;
    weekly.forEach((w, i) => {
      if (i % xLabelEvery !== 0 && i !== weekly.length - 1) return;
      const t = el('text', { x: xScale(i), y: height - 22, 'text-anchor': 'middle', fill: 'var(--text-4)', 'font-size': 10 }, svg);
      t.textContent = w.w.replace('Sem ', '').replace(" '", "·'");
    });

    if (mode === 'area') {
      // Defs for gradients
      const defs = el('defs', {}, svg);
      const gIn = el('linearGradient', { id: 'gradIn', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el('stop', { offset: '0%', 'stop-color': 'var(--income)', 'stop-opacity': 0.35 }, gIn);
      el('stop', { offset: '100%', 'stop-color': 'var(--income)', 'stop-opacity': 0 }, gIn);
      const gOut = el('linearGradient', { id: 'gradOut', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el('stop', { offset: '0%', 'stop-color': 'var(--expense)', 'stop-opacity': 0.35 }, gOut);
      el('stop', { offset: '100%', 'stop-color': 'var(--expense)', 'stop-opacity': 0 }, gOut);

      const buildArea = (key) => {
        let d = `M ${xScale(0)} ${yScale(weekly[0][key])} `;
        for (let i = 1; i < weekly.length; i++) {
          const x0 = xScale(i-1), y0 = yScale(weekly[i-1][key]);
          const x1 = xScale(i),   y1 = yScale(weekly[i][key]);
          const mx = (x0 + x1) / 2;
          d += `C ${mx} ${y0} ${mx} ${y1} ${x1} ${y1} `;
        }
        const base = `L ${xScale(weekly.length-1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`;
        return { area: d + base, line: d };
      };

      const inP = buildArea('income');
      const outP = buildArea('expenses');

      const areaIn = el('path', { d: inP.area, fill: 'url(#gradIn)', opacity: 0 }, svg);
      const areaOut = el('path', { d: outP.area, fill: 'url(#gradOut)', opacity: 0 }, svg);
      const lineIn = el('path', { d: inP.line, fill: 'none', stroke: 'var(--income)', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      const lineOut = el('path', { d: outP.line, fill: 'none', stroke: 'var(--expense)', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);

      // animate draw
      [lineIn, lineOut].forEach((p, i) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        p.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1) ' + (0.1 + i * 0.15) + 's';
        setTimeout(() => p.style.strokeDashoffset = '0', 40);
      });
      [areaIn, areaOut].forEach((a, i) => {
        a.style.transition = 'opacity 0.8s ease ' + (0.6 + i * 0.1) + 's';
        setTimeout(() => a.setAttribute('opacity', '1'), 40);
      });

      // hover dots + vertical guide
      const guideLine = el('line', { x1: 0, x2: 0, y1: pad.top, y2: height - pad.bottom, stroke: 'rgba(255,255,255,0.2)', 'stroke-dasharray': '3 3', opacity: 0 }, svg);
      const dotIn = el('circle', { cx: 0, cy: 0, r: 5, fill: 'var(--income)', stroke: 'var(--bg)', 'stroke-width': 2, opacity: 0 }, svg);
      const dotOut = el('circle', { cx: 0, cy: 0, r: 5, fill: 'var(--expense)', stroke: 'var(--bg)', 'stroke-width': 2, opacity: 0 }, svg);

      // anomaly marker (week with big expense — sem 03)
      weekly.forEach((w, i) => {
        if (w.expenses > 1_000_000) {
          const ax = xScale(i);
          const ay = yScale(w.expenses);
          el('circle', { cx: ax, cy: ay, r: 6, fill: 'var(--warn)', stroke: 'var(--bg)', 'stroke-width': 2 }, svg);
          const flag = el('text', { x: ax, y: ay - 14, 'text-anchor': 'middle', fill: 'var(--warn)', 'font-size': 10, 'font-weight': 600 }, svg);
          flag.textContent = '⚠ overhaul';
        }
      });

      // invisible overlay for mouse tracking
      const overlay = el('rect', { x: pad.left, y: pad.top, width: width - pad.left - pad.right, height: height - pad.top - pad.bottom, fill: 'transparent' }, svg);
      overlay.addEventListener('mousemove', (e) => {
        const rect = svg.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (width / rect.width);
        const frac = (px - pad.left) / (width - pad.left - pad.right);
        const i = Math.round(Math.max(0, Math.min(weekly.length - 1, frac * (weekly.length - 1))));
        const w = weekly[i];
        const x = xScale(i);
        guideLine.setAttribute('x1', x); guideLine.setAttribute('x2', x); guideLine.setAttribute('opacity', 1);
        dotIn.setAttribute('cx', x); dotIn.setAttribute('cy', yScale(w.income)); dotIn.setAttribute('opacity', 1);
        dotOut.setAttribute('cx', x); dotOut.setAttribute('cy', yScale(w.expenses)); dotOut.setAttribute('opacity', 1);
        showTip(`
          <div class="tt-title">${w.w}</div>
          <div class="tt-row"><span class="tt-k"><span class="tt-dot" style="background:var(--income)"></span>Ingreso</span><span style="color:var(--income)">${COP(w.income)}</span></div>
          <div class="tt-row"><span class="tt-k"><span class="tt-dot" style="background:var(--expense)"></span>Gasto</span><span style="color:var(--expense)">${COP(w.expenses)}</span></div>
          <div class="tt-row"><span class="tt-k">Neto</span><span style="color:${w.income - w.expenses >= 0 ? 'var(--income)' : 'var(--expense)'}">${(w.income - w.expenses >= 0 ? '+' : '−')}${COP(Math.abs(w.income - w.expenses))}</span></div>
        `, rect.left + x, rect.top + Math.min(yScale(w.income), yScale(w.expenses)));
      });
      overlay.addEventListener('mouseleave', () => {
        guideLine.setAttribute('opacity', 0);
        dotIn.setAttribute('opacity', 0);
        dotOut.setAttribute('opacity', 0);
        hideTip();
      });
    } else {
      // paired bars
      const slot = (width - pad.left - pad.right) / weekly.length;
      const barW = Math.min(14, slot * 0.35);
      weekly.forEach((w, i) => {
        const cx = xScale(i);
        const hIn = (height - pad.top - pad.bottom) * (w.income / yMax);
        const hOut = (height - pad.top - pad.bottom) * (w.expenses / yMax);
        const bIn = el('rect', { x: cx - barW - 1, y: yScale(0), width: barW, height: 0, fill: 'var(--income)', rx: 2, opacity: 0.85 }, svg);
        const bOut = el('rect', { x: cx + 1, y: yScale(0), width: barW, height: 0, fill: 'var(--expense)', rx: 2, opacity: 0.85 }, svg);
        [[bIn, hIn], [bOut, hOut]].forEach(([b, h], j) => {
          b.style.transition = 'y 0.6s cubic-bezier(.2,.7,.2,1) ' + (i * 0.04 + j * 0.05) + 's, height 0.6s cubic-bezier(.2,.7,.2,1) ' + (i * 0.04 + j * 0.05) + 's';
          setTimeout(() => {
            b.setAttribute('y', yScale(j === 0 ? w.income : w.expenses));
            b.setAttribute('height', h);
          }, 40);
        });
        // anomaly marker
        if (w.expenses > 1_000_000) {
          const flag = el('text', { x: cx + 1 + barW/2, y: yScale(w.expenses) - 6, 'text-anchor': 'middle', fill: 'var(--warn)', 'font-size': 10, 'font-weight': 600 }, svg);
          flag.textContent = '⚠';
        }

        // hover
        const hit = el('rect', { x: cx - slot/2, y: pad.top, width: slot, height: height - pad.top - pad.bottom, fill: 'transparent' }, svg);
        hit.addEventListener('mouseenter', () => {
          bIn.setAttribute('opacity', 1); bOut.setAttribute('opacity', 1);
          const rect = svg.getBoundingClientRect();
          showTip(`
            <div class="tt-title">${w.w}</div>
            <div class="tt-row"><span class="tt-k"><span class="tt-dot" style="background:var(--income)"></span>Ingreso</span><span style="color:var(--income)">${COP(w.income)}</span></div>
            <div class="tt-row"><span class="tt-k"><span class="tt-dot" style="background:var(--expense)"></span>Gasto</span><span style="color:var(--expense)">${COP(w.expenses)}</span></div>
          `, rect.left + cx, rect.top + Math.min(yScale(w.income), yScale(w.expenses)));
        });
        hit.addEventListener('mouseleave', () => {
          bIn.setAttribute('opacity', 0.85); bOut.setAttribute('opacity', 0.85);
          hideTip();
        });
      });
    }

    // legend at top-left
    const legGrp = el('g', {}, svg);
    const legend = [
      { color: 'var(--income)', label: 'Ingreso' },
      { color: 'var(--expense)', label: 'Gasto' },
    ];
    let lx = pad.left;
    legend.forEach((lg) => {
      const dot = el('circle', { cx: lx + 5, cy: pad.top - 6, r: 4, fill: lg.color }, legGrp);
      const t = el('text', { x: lx + 14, y: pad.top - 2, fill: 'var(--text-3)', 'font-size': 11 }, legGrp);
      t.textContent = lg.label;
      lx += t.getComputedTextLength() + 40;
    });
  }

  // ---------- Tiny sparkline ----------
  function renderSpark(container, values, color = 'var(--text-3)') {
    const width = 64, height = 22;
    const max = Math.max(...values), min = Math.min(...values);
    const span = max - min || 1;
    const xScale = i => (i / (values.length - 1)) * width;
    const yScale = v => height - ((v - min) / span) * height;
    let d = `M ${xScale(0)} ${yScale(values[0])} `;
    for (let i = 1; i < values.length; i++) d += `L ${xScale(i)} ${yScale(values[i])} `;
    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  window.CHARTS = {
    renderWaterfall, renderDonut, renderTimeline, renderSpark,
    CAT_COLORS,
  };
})();
