const Api = (() => {
  const CAMINHO = "/atencao-primaria/indicador-desempenho-programa-previne-brasil";
  const DB = "cobertura-vacinal-br";
  const LOJA = "ufs";

  function url(uf, offset) {
    const p = new URLSearchParams();
    p.set("limit", String(APP_CONFIG.PAGINA));
    p.set("offset", String(offset));
    if (uf) p.set("uf", uf);
    return `${APP_CONFIG.API_BASE}${CAMINHO}?${p.toString()}`;
  }

  function extrair(json) {
    const chave = Object.keys(json).find((k) => Array.isArray(json[k]));
    return chave ? json[chave] : [];
  }

  function normalizar(bruto) {
    const num = Number(bruto.numerador);
    const den = Number(bruto.denominador_utilizador);
    const populacao = Number(bruto.populacao);
    return {
      uf: bruto.uf,
      cod: String(bruto.codigo_municipio).padStart(6, "0"),
      mun: bruto.municipio,
      ind: Number(bruto.codigo_tipo_indicador),
      quad: bruto.quadrimestre,
      visao: bruto.visao_equipe,
      num: Number.isFinite(num) ? num : null,
      den: Number.isFinite(den) ? den : null,
      denIdent: Number(bruto.denominador_identificado),
      denEst: Number(bruto.denominador_estimado),
      cadastro: Number(bruto.cadastro),
      populacao: Number.isFinite(populacao) ? populacao : null,
      percentualApi: Number(bruto.percentual_quadrimestre)
    };
  }

  async function buscarPagina(uf, offset, tentativas = 3) {
    let erro;
    for (let t = 0; t < tentativas; t++) {
      try {
        const resp = await fetch(url(uf, offset), { signal: AbortSignal.timeout(45000) });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return extrair(await resp.json()).map(normalizar);
      } catch (e) {
        erro = e;
        await new Promise((r) => setTimeout(r, 600 * (t + 1)));
      }
    }
    throw erro;
  }

  async function carregarUF(uf, aoProgredir) {
    const todas = [];
    let offset = 0;
    while (true) {
      const pagina = await buscarPagina(uf, offset);
      if (!pagina.length) break;
      todas.push(...pagina);
      aoProgredir && aoProgredir(uf, todas.length);
      if (pagina.length < APP_CONFIG.PAGINA) break;
      offset += APP_CONFIG.PAGINA;
    }
    return todas;
  }

  function abrirDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(LOJA);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function lerCache(chave) {
    try {
      const db = await abrirDB();
      const valor = await new Promise((resolve, reject) => {
        const tx = db.transaction(LOJA, "readonly").objectStore(LOJA).get(chave);
        tx.onsuccess = () => resolve(tx.result);
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      if (!valor) return null;
      const validade = APP_CONFIG.CACHE_HORAS * 3600 * 1000;
      if (Date.now() - valor.ts > validade) return null;
      return valor.dados;
    } catch (e) {
      return null;
    }
  }

  async function gravarCache(chave, dados) {
    try {
      const db = await abrirDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(LOJA, "readwrite").objectStore(LOJA).put({ ts: Date.now(), dados }, chave);
        tx.onsuccess = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) {
      /* cache é otimização, falha não interrompe */
    }
  }

  async function carregarBrasil(eventos) {
    const { aoProgredir, aoConcluirUF, aoErro } = eventos;
    const ufs = window.UFS.map((x) => x[0]);
    const acumulado = [];
    let indice = 0;
    let prontas = 0;

    async function trabalhador() {
      while (indice < ufs.length) {
        const uf = ufs[indice++];
        try {
          let dados = await lerCache("uf:" + uf);
          if (!dados) {
            dados = await carregarUF(uf, (u, n) => aoProgredir && aoProgredir(u, n, prontas, ufs.length));
            await gravarCache("uf:" + uf, dados);
          }
          acumulado.push(...dados);
          prontas++;
          aoConcluirUF && aoConcluirUF(uf, dados, prontas, ufs.length, acumulado);
        } catch (e) {
          aoErro && aoErro(uf, e);
          prontas++;
        }
      }
    }

    const operarios = [];
    for (let i = 0; i < APP_CONFIG.CONCORRENCIA; i++) operarios.push(trabalhador());
    await Promise.all(operarios);
    return acumulado;
  }

  async function carregarMalha(uf) {
    const urlMalha = `${APP_CONFIG.IBGE_BASE}/api/v3/malhas/estados/${uf}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`;
    const resp = await fetch(urlMalha, { signal: AbortSignal.timeout(40000) });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    return resp.json();
  }

  return { carregarBrasil, carregarUF, carregarMalha };
})();
