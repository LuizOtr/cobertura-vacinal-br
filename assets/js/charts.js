const Charts = (() => {
  const AZUL = "#1f6f8b";
  const ALERTA = "#c0504d";
  const NEUTRO = "#8a97a5";
  const GRADE = "#e3e8ee";
  const TEXTO = "#33404d";

  function escala(valor, min, max, tam) {
    if (max === min) return tam / 2;
    return ((valor - min) / (max - min)) * tam;
  }

  function histograma(valores, meta, largura = 620, altura = 260) {
    const margem = { top: 18, right: 16, bottom: 42, left: 46 };
    const larg = largura - margem.left - margem.right;
    const alt = altura - margem.top - margem.bottom;
    const bins = 20;
    const passos = new Array(bins).fill(0);
    valores.forEach((v) => {
      const i = Math.min(bins - 1, Math.max(0, Math.floor(v / (100 / bins))));
      passos[i]++;
    });
    const topo = Math.max(1, ...passos);
    const passoLarg = larg / bins;
    const corMeta = [];
    let barras = "";
    passos.forEach((n, i) => {
      const centro = (i + 0.5) * (100 / bins);
      const cor = centro >= meta ? AZUL : ALERTA;
      const h = escala(n, 0, topo, alt);
      const x = margem.left + i * passoLarg;
      const y = margem.top + alt - h;
      barras += `<rect x="${x + 1}" y="${y}" width="${passoLarg - 2}" height="${h}" fill="${cor}" opacity="0.85"><title>${i * 5}% a ${i * 5 + 5}%: ${n} municípios</title></rect>`;
      if (i % 2 === 0) {
        barras += `<text x="${x + passoLarg / 2}" y="${altura - 22}" fill="${NEUTRO}" font-size="10" text-anchor="middle">${i * 5}</text>`;
      }
    });
    const linhasY = [0, 0.5, 1].map((f) => {
      const y = margem.top + alt - f * alt;
      return `<line x1="${margem.left}" y1="${y}" x2="${margem.left + larg}" y2="${y}" stroke="${GRADE}"/>
        <text x="${margem.left - 8}" y="${y + 4}" fill="${NEUTRO}" font-size="10" text-anchor="end">${Math.round(f * topo)}</text>`;
    }).join("");
    const xMeta = margem.left + escala(meta, 0, 100, larg);
    return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" role="img" aria-label="Distribuição da cobertura por município">
      ${linhasY}
      ${barras}
      <line x1="${xMeta}" y1="${margem.top}" x2="${xMeta}" y2="${margem.top + alt}" stroke="${TEXTO}" stroke-dasharray="5 4"/>
      <text x="${xMeta + 5}" y="${margem.top + 12}" fill="${TEXTO}" font-size="11">meta ${meta}%</text>
      <text x="${margem.left + larg / 2}" y="${altura - 4}" fill="${NEUTRO}" font-size="11" text-anchor="middle">cobertura estimada (%)</text>
    </svg>`;
  }

  function serie(pontos, largura = 620, altura = 260) {
    const margem = { top: 18, right: 20, bottom: 42, left: 46 };
    const larg = largura - margem.left - margem.right;
    const alt = altura - margem.top - margem.bottom;
    const quads = pontos.map((p) => p.quad);
    const passo = quads.length > 1 ? larg / (quads.length - 1) : larg;
    const cobertura = pontos.map((p) => p.mediana);
    const acima = pontos.map((p) => p.acimaMeta);
    const grade = [0, 25, 50, 75, 100].map((v) => {
      const y = margem.top + alt - escala(v, 0, 100, alt);
      return `<line x1="${margem.left}" y1="${y}" x2="${margem.left + larg}" y2="${y}" stroke="${GRADE}"/>
        <text x="${margem.left - 8}" y="${y + 4}" fill="${NEUTRO}" font-size="10" text-anchor="end">${v}%</text>`;
    }).join("");
    const linha1 = cobertura.map((v, i) => `${margem.left + i * passo},${margem.top + alt - escala(v, 0, 100, alt)}`).join(" ");
    const linha2 = acima.map((v, i) => `${margem.left + i * passo},${margem.top + alt - escala(v, 0, 100, alt)}`).join(" ");
    const pontos1 = cobertura.map((v, i) => `<circle cx="${margem.left + i * passo}" cy="${margem.top + alt - escala(v, 0, 100, alt)}" r="4" fill="${AZUL}"><title>cobertura mediana ${v.toFixed(1)}%</title></circle>`).join("");
    const pontos2 = acima.map((v, i) => `<circle cx="${margem.left + i * passo}" cy="${margem.top + alt - escala(v, 0, 100, alt)}" r="4" fill="${ALERTA}"><title>${v.toFixed(1)}% dos municípios na meta</title></circle>`).join("");
    const rotulos = quads.map((q, i) => `<text x="${margem.left + i * passo}" y="${altura - 22}" fill="${NEUTRO}" font-size="11" text-anchor="middle">${q}</text>`).join("");
    return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" role="img" aria-label="Evolução por quadrimestre">
      ${grade}
      <polyline points="${linha1}" fill="none" stroke="${AZUL}" stroke-width="2"/>
      <polyline points="${linha2}" fill="none" stroke="${ALERTA}" stroke-width="2" stroke-dasharray="6 4"/>
      ${pontos1}${pontos2}${rotulos}
      <g font-size="11">
        <rect x="${margem.left}" y="${margem.top - 12}" width="10" height="10" fill="${AZUL}"/><text x="${margem.left + 15}" y="${margem.top - 3}" fill="${TEXTO}">cobertura mediana</text>
        <rect x="${margem.left + 150}" y="${margem.top - 12}" width="10" height="10" fill="${ALERTA}"/><text x="${margem.left + 165}" y="${margem.top - 3}" fill="${TEXTO}">municípios na meta</text>
      </g>
    </svg>`;
  }

  function ranking(itens, titulo, largura = 620) {
    const linhaAlt = 26;
    const topo = 8;
    const margemEsq = 190;
    const altura = itens.length * linhaAlt + 34;
    const larg = largura - margemEsq - 60;
    const linhas = itens.map((d, i) => {
      const y = 26 + i * linhaAlt;
      const x0 = margemEsq + escala(0, 0, 100, larg);
      const x1 = margemEsq + escala(d.cobertura, 0, 100, larg);
      const xl = margemEsq + escala(d.ic.lo ?? d.cobertura, 0, 100, larg);
      const xh = margemEsq + escala(d.ic.hi ?? d.cobertura, 0, 100, larg);
      const cor = d.cobertura >= APP_CONFIG.META_VACINAL ? AZUL : ALERTA;
      const nome = d.mun.length > 26 ? d.mun.slice(0, 25) + "…" : d.mun;
      return `<g>
        <text x="${margemEsq - 10}" y="${y + 12}" fill="${TEXTO}" font-size="11" text-anchor="end">${nome}</text>
        <rect x="${x0}" y="${y + 3}" width="${Math.max(0, x1 - x0)}" height="12" fill="${cor}" opacity="0.85"><title>${d.mun}: ${d.cobertura.toFixed(1)}% (IC 95% ${(d.ic.lo ?? 0).toFixed(1)} a ${(d.ic.hi ?? 0).toFixed(1)})</title></rect>
        <line x1="${xl}" y1="${y + 9}" x2="${xh}" y2="${y + 9}" stroke="${TEXTO}" stroke-width="1.4"/>
        <line x1="${xl}" y1="${y + 5}" x2="${xl}" y2="${y + 13}" stroke="${TEXTO}" stroke-width="1.4"/>
        <line x1="${xh}" y1="${y + 5}" x2="${xh}" y2="${y + 13}" stroke="${TEXTO}" stroke-width="1.4"/>
        <text x="${largura - 8}" y="${y + 12}" fill="${NEUTRO}" font-size="10" text-anchor="end">${d.cobertura.toFixed(1)}%</text>
      </g>`;
    }).join("");
    const xMeta = margemEsq + escala(APP_CONFIG.META_VACINAL, 0, 100, larg);
    return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" role="img" aria-label="${titulo}">
      <line x1="${xMeta}" y1="16" x2="${xMeta}" y2="${altura - 8}" stroke="${TEXTO}" stroke-dasharray="5 4"/>
      <text x="${xMeta}" y="12" fill="${TEXTO}" font-size="10" text-anchor="middle">meta</text>
      ${linhas}
    </svg>`;
  }

  return { histograma, serie, ranking };
})();
