/* Tables: Top 10 sortable + Movements filterable paginated */
(function () {
  const { COP, dateTiny } = window.FMT;
  const { CAT_COLORS } = window.CHARTS;

  const CAT_KEY_MAP = {
    'Mano de obra': 'labor',
    'Repuestos': 'parts',
    'Administración': 'admin',
    'Accesorios': 'accessories',
    'Mantenimiento': 'maintenance',
    'Revisión técnica': 'inspection',
    'Ingreso por alquiler': 'income',
  };
  function catColor(label) {
    const key = CAT_KEY_MAP[label];
    if (key === 'income') return 'var(--income)';
    return CAT_COLORS[key] || 'var(--text-3)';
  }

  // ---------- Top 10 sortable ----------
  function initTopTable(tableEl, rows) {
    const tbody = tableEl.querySelector('tbody');
    let state = { key: 'amount', dir: 'desc' };

    function render() {
      const sorted = [...rows].sort((a, b) => {
        const av = a[state.key], bv = b[state.key];
        if (av < bv) return state.dir === 'asc' ? -1 : 1;
        if (av > bv) return state.dir === 'asc' ? 1 : -1;
        return 0;
      });
      tbody.innerHTML = sorted.map(r => `
        <tr>
          <td>${dateTiny(r.date)}</td>
          <td><span class="cat-pill"><span class="cat-dot" style="background:${catColor(r.category)}"></span>${r.category}</span></td>
          <td style="color:var(--text-2)">${r.driver}</td>
          <td>${r.description}${r.anomaly ? '<span class="flag-badge">Anomalía</span>' : ''}</td>
          <td class="num money money-out">−${COP(r.amount)}</td>
        </tr>
      `).join('');
      // Update sort indicators
      tableEl.querySelectorAll('th.sortable').forEach(th => {
        const k = th.getAttribute('data-sort');
        if (k === state.key) th.setAttribute('aria-sort', state.dir === 'asc' ? 'ascending' : 'descending');
        else th.removeAttribute('aria-sort');
      });
    }
    tableEl.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.getAttribute('data-sort');
        if (state.key === k) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
        else { state.key = k; state.dir = k === 'amount' ? 'desc' : 'asc'; }
        render();
      });
    });
    render();
  }

  // ---------- Movements table ----------
  function initMovements(tableEl, movements) {
    const tbody = tableEl.querySelector('tbody');
    const catSel = document.getElementById('filter-cat');
    const fromIn = document.getElementById('filter-from');
    const toIn = document.getElementById('filter-to');
    const segBtns = document.querySelectorAll('#filters [data-type]');
    const resetBtn = document.getElementById('filter-reset');
    const pagInfo = document.getElementById('pag-info');
    const pagPages = document.getElementById('pag-pages');
    const pagPrev = document.getElementById('pag-prev');
    const pagNext = document.getElementById('pag-next');
    const PAGE_SIZE = 10;

    // Populate categories
    const cats = [...new Set(movements.map(m => m.category))].sort();
    cats.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      catSel.appendChild(o);
    });

    let state = { cat: '__all', from: '', to: '', type: 'all', page: 1 };

    function filtered() {
      return movements.filter(m => {
        if (state.cat !== '__all' && m.category !== state.cat) return false;
        if (state.from && m.date < state.from) return false;
        if (state.to && m.date > state.to) return false;
        if (state.type !== 'all' && m.type !== state.type) return false;
        return true;
      }).sort((a, b) => a.date < b.date ? 1 : -1);
    }

    function render() {
      const rows = filtered();
      const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
      if (state.page > totalPages) state.page = totalPages;
      const start = (state.page - 1) * PAGE_SIZE;
      const slice = rows.slice(start, start + PAGE_SIZE);

      tbody.innerHTML = slice.map(m => `
        <tr>
          <td>${dateTiny(m.date)}</td>
          <td><span class="type-pill ${m.type === 'in' ? 'type-in' : 'type-out'}">${m.type === 'in' ? 'Ingreso' : 'Gasto'}</span></td>
          <td><span class="cat-pill"><span class="cat-dot" style="background:${catColor(m.category)}"></span>${m.category}</span></td>
          <td style="color:var(--text-2)">${m.driver}</td>
          <td>${m.description}${m.anomaly ? '<span class="flag-badge">Anomalía</span>' : ''}</td>
          <td class="num money ${m.type === 'in' ? 'money-in' : 'money-out'}">${m.type === 'in' ? '+' : '−'}${COP(m.amount)}</td>
        </tr>
      `).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:28px">Sin movimientos para los filtros aplicados.</td></tr>`;

      pagInfo.textContent = rows.length === 0
        ? 'Sin resultados'
        : `${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} de ${rows.length} movimientos`;

      pagPages.innerHTML = '';
      for (let p = 1; p <= totalPages; p++) {
        const b = document.createElement('button');
        b.className = 'pag-page' + (p === state.page ? ' on' : '');
        b.textContent = p;
        b.addEventListener('click', () => { state.page = p; render(); });
        pagPages.appendChild(b);
      }
      pagPrev.disabled = state.page === 1;
      pagNext.disabled = state.page === totalPages;
    }

    catSel.addEventListener('change', () => { state.cat = catSel.value; state.page = 1; render(); });
    fromIn.addEventListener('change', () => { state.from = fromIn.value; state.page = 1; render(); });
    toIn.addEventListener('change', () => { state.to = toIn.value; state.page = 1; render(); });
    segBtns.forEach(b => b.addEventListener('click', () => {
      segBtns.forEach(x => x.classList.remove('seg-on'));
      b.classList.add('seg-on');
      state.type = b.getAttribute('data-type');
      state.page = 1;
      render();
    }));
    resetBtn.addEventListener('click', () => {
      state = { cat: '__all', from: '', to: '', type: 'all', page: 1 };
      catSel.value = '__all'; fromIn.value = ''; toIn.value = '';
      segBtns.forEach(x => x.classList.remove('seg-on'));
      segBtns[0].classList.add('seg-on');
      render();
    });
    pagPrev.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
    pagNext.addEventListener('click', () => { state.page++; render(); });

    // Initialize date range
    const dates = movements.map(m => m.date).sort();
    fromIn.min = dates[0]; fromIn.max = dates[dates.length - 1];
    toIn.min = dates[0];   toIn.max = dates[dates.length - 1];

    render();
  }

  window.TABLES = { initTopTable, initMovements };
})();
