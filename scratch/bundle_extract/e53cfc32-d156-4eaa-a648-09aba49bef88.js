/* Formatting helpers — Colombian pesos, dates in Spanish, number animation */
(function () {
  const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const MONTHS_ES_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  function formatCOP(n, opts = {}) {
    const v = Math.abs(Math.round(n));
    // Colombian format: thousand separator = '.', decimal = ','
    const s = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const sign = n < 0 ? (opts.signed ? '−' : '-') : '';
    if (opts.bare) return sign + s;
    return sign + '$' + s;
  }
  function formatCOPShort(n) {
    const a = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    if (a >= 1_000_000) return sign + '$' + (a/1_000_000).toFixed(a >= 10_000_000 ? 1 : 2).replace('.',',') + 'M';
    if (a >= 1_000) return sign + '$' + Math.round(a/1_000) + 'K';
    return sign + '$' + a;
  }
  function formatDateLong(iso) {
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
  }
  function formatDateShort(iso) {
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return `${d.getDate().toString().padStart(2,'0')} ${MONTHS_ES_SHORT[d.getMonth()]}`;
  }
  function formatDateTiny(iso) {
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return `${MONTHS_ES_SHORT[d.getMonth()]} ${d.getDate()} '${String(d.getFullYear()).slice(2)}`;
  }
  function formatUpdated(iso) {
    const d = new Date(iso);
    const dd = d.getDate().toString().padStart(2,'0');
    const mm = MONTHS_ES_SHORT[d.getMonth()];
    const hh = d.getHours().toString().padStart(2,'0');
    const mi = d.getMinutes().toString().padStart(2,'0');
    return `${dd} ${mm} · ${hh}:${mi}`;
  }

  // Easing: cubic ease-out
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  // Animate an integer count-up
  function animateNumber(el, to, { duration = 1400, format = (v) => v.toString(), delay = 0 } = {}) {
    const from = 0;
    let start = null;
    function step(ts) {
      if (!start) start = ts + delay;
      const elapsed = ts - start;
      if (elapsed < 0) { requestAnimationFrame(step); return; }
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const val = from + (to - from) * eased;
      el.textContent = format(val);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = format(to);
    }
    requestAnimationFrame(step);
  }

  window.FMT = {
    COP: formatCOP,
    COPShort: formatCOPShort,
    dateLong: formatDateLong,
    dateShort: formatDateShort,
    dateTiny: formatDateTiny,
    updated: formatUpdated,
    animateNumber,
    easeOutCubic,
  };
})();
