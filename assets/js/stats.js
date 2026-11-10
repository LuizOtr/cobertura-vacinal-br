const Stat = (() => {
  function wilson(k, n, z = 1.96) {
    if (!n || n <= 0) return { lo: null, hi: null, ponto: null };
    const p = k / n;
    const den = 1 + (z * z) / n;
    const centro = (p + (z * z) / (2 * n)) / den;
    const meia = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
    return {
      ponto: p * 100,
      lo: Math.max(0, centro - meia) * 100,
      hi: Math.min(1, centro + meia) * 100
    };
  }

  function phi(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  function pValorAbaixo(k, n, meta) {
    if (!n || n <= 0) return null;
    const p0 = meta / 100;
    const z = ((k - n * p0) + 0.5) / Math.sqrt(n * p0 * (1 - p0));
    return Math.max(0, Math.min(1, phi(z)));
  }

  function benjaminiHochberg(valores) {
    const itens = valores
      .map((p, i) => ({ p, i }))
      .filter((x) => x.p !== null && x.p !== undefined)
      .sort((a, b) => a.p - b.p);
    const m = itens.length;
    const q = new Array(valores.length).fill(null);
    let anterior = 1;
    for (let j = m - 1; j >= 0; j--) {
      const val = Math.min(anterior, (itens[j].p * m) / (j + 1));
      q[itens[j].i] = val;
      anterior = val;
    }
    return q;
  }

  function mediana(xs) {
    const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
    if (!v.length) return null;
    const meio = Math.floor(v.length / 2);
    return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
  }

  function media(xs) {
    const v = xs.filter((x) => Number.isFinite(x));
    if (!v.length) return null;
    return v.reduce((a, b) => a + b, 0) / v.length;
  }

  function quantil(xs, q) {
    const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
    if (!v.length) return null;
    const pos = (v.length - 1) * q;
    const base = Math.floor(pos);
    const resto = pos - base;
    return v[base + 1] !== undefined ? v[base] + resto * (v[base + 1] - v[base]) : v[base];
  }

  return { wilson, benjaminiHochberg, pValorAbaixo, mediana, media, quantil, phi };
})();
