import os

with open('dashboard_template.html', 'r', encoding='utf-8') as f:
    template = f.read()

# Replace Javascript logic block to use the JSON data to update the DOM before animations.

new_js = """
  // ---------- Fill values from JSON instead of HTML hardcoding ----------
  document.getElementById('hero-number').setAttribute('data-value', data.totals.net_result);
  
  const formulas = document.querySelectorAll('.formula-v');
  if(formulas.length >= 4) {
    formulas[0].setAttribute('data-money', data.totals.gross_income);
    formulas[1].setAttribute('data-money', -data.totals.admin_commission); // Usually an expense
    formulas[2].setAttribute('data-money', -data.totals.operating_expenses); // Usually an expense 
    formulas[3].setAttribute('data-money', data.totals.net_result);
  }
  
  // Margen, Dias, Pagos
  const footnoteSpans = document.querySelectorAll('.hero-footnote span');
  if(footnoteSpans.length >= 5) {
      footnoteSpans[0].innerHTML = `Margen: <strong>${data.totals.gross_income !== 0 ? (data.totals.net_result / data.totals.gross_income * 100).toFixed(1).replace('.',',') : 0}%</strong>`;
      footnoteSpans[2].innerHTML = `Período: <strong>${data.period.days} días</strong>`;
      footnoteSpans[4].innerHTML = `<strong>${data.totals.rentals}</strong> pagos de alquiler`;
  }

  // Anomalía
  const anomalyCard = document.querySelector('.anomaly-card');
  if(anomalyCard) {
      if (data.totals.anomalies > 0 && data.top_expenses.length > 0) {
          const topA = data.top_expenses[0];
          const pct = data.totals.operating_expenses > 0 ? (topA.amount / data.totals.operating_expenses * 100).toFixed(1).replace('.',',') : 0;
          const noA_ops = data.totals.operating_expenses - topA.amount;
          const noA_net = data.totals.gross_income - data.totals.admin_commission - noA_ops;
          
          anomalyCard.querySelector('p.anomaly-body').innerHTML = `El ${dateTiny(topA.date)} se procesó <strong>${topA.category}</strong> por <strong class="anomaly-amount" data-money="${Math.round(topA.amount)}">$0</strong> — equivale al <strong>${pct}%</strong> de los gastos del período en una transacción.`;
          anomalyCard.querySelector('p.anomaly-body-sub').innerHTML = `Sin ese gasto extraordinario, el resultado neto habría sido aprox. <strong class="anomaly-pos" data-money="${Math.round(noA_net)}">$0</strong>.`;
      } else {
          anomalyCard.style.display = 'none';
      }
  }

  // ---------- Hero number animation ----------
"""

old_js_start = "// ---------- Hero number animation ----------"

if new_js not in template:
    template = template.replace("// ---------- Hero number animation ----------", new_js)

with open('dashboard_template.html', 'w', encoding='utf-8') as f:
    f.write(template)

print("Template JS dynamic injection completed.")
