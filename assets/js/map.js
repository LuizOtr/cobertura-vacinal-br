const Mapa = (() => {
  const LARGURA = 620;
  const SEM_DADO = "#dfe4ea";

  function cor(valor) {
    if (valor === null || valor === undefined) return SEM_DADO;
    const t = Math.max(0, Math.min(130, valor)) / 130;
    return `rgb(${Math.round(176 + (31 - 176) * t)},${Math.round(58 + (111 - 58) * t)},${Math.round(72 + (139 - 72) * t)})`;
  }

  function desenhar(geojson, valores) {
    const feats = geojson.features.filter((f) => f.geometry);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    feats.forEach((f) => {
      const tipos = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
      tipos.forEach((pol) => pol.forEach((anel) => anel.forEach(([lon, lat]) => {
        minX = Math.min(minX, lon); maxX = Math.max(maxX, lon);
        minY = Math.min(minY, lat); maxY = Math.max(maxY, lat);
      })));
    });
    const fator = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
    const larguraGeo = (maxX - minX) * fator || 1;
    const alturaGeo = maxY - minY || 1;
    const PAD = 12;
    const LEGENDA = 34;
    const escala = (LARGURA - PAD * 2) / larguraGeo;
    const alturaMapa = alturaGeo * escala;
    const alturaTotal = alturaMapa + PAD * 2 + LEGENDA;
    const proj = (lon, lat) => [
      (lon - minX) * fator * escala + PAD,
      (maxY - lat) * escala + PAD
    ];

    const corpo = feats.map((f) => {
      const cod = String(f.properties.codarea).slice(0, 6);
      const valor = valores.has(cod) ? valores.get(cod) : null;
      const tipos = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
      let d = "";
      tipos.forEach((pol) => pol.forEach((anel) => {
        d += "M" + anel.map(([lon, lat]) => {
          const [x, y] = proj(lon, lat);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join("L") + "Z";
      }));
      const rotulo = valor === null ? "sem dado" : valor.toFixed(1) + "%";
      return `<path d="${d}" fill="${cor(valor)}" stroke="#ffffff" stroke-width="0.6"><title>${f.properties.codarea}: ${rotulo}</title></path>`;
    }).join("");

    const marcas = [0, 25, 50, 75, 100, 130].map((v) => `<rect x="${(v / 130) * 130}" y="0" width="26" height="10" fill="${cor(v)}"/>`).join("");
    const numeros = [0, 50, 100].map((v) => `<text x="${(v / 130) * 130 + 13}" y="24" fill="#5b6875" font-size="9" text-anchor="middle">${v}%</text>`).join("");

    return `<svg viewBox="0 0 ${LARGURA} ${alturaTotal.toFixed(0)}" width="100%" role="img" aria-label="Mapa da cobertura por município">
      <g>${corpo}</g>
      <g transform="translate(${PAD},${(alturaTotal - LEGENDA + 6).toFixed(0)})">${marcas}${numeros}</g>
    </svg>`;
  }

  return { desenhar };
})();
