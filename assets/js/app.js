const S = {
  dados: [],
  carregado: false,
  erro: null,
  ufsOk: 0,
  uf: "BR",
  mun: "",
  ind: 50,
  quad: "2024Q3",
  visao: "geral",
  minDen: 20,
  malhaCache: new Map()
};

const fmt = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? "sem dado" : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const fmtInt = (v) => (v === null || v === undefined || Number.isNaN(v) ? "sem dado" : Math.round(v).toLocaleString("pt-BR"));

function cobertura(num, den) {
  if (!den || den <= 0 || num === null) return null;
  return (num / den) * 100;
}

function linhasDoRecorte() {
  return S.dados.filter(
    (r) => r.ind === S.ind && r.quad === S.quad && r.visao === S.visao && (S.uf === "BR" || r.uf === S.uf)
  );
}

function porMunicipio() {
  const mapa = new Map();
  linhasDoRecorte().forEach((r) => {
    const atual = mapa.get(r.cod) || { cod: r.cod, mun: r.mun, uf: r.uf, num: 0, den: 0, populacao: null };
    atual.num += r.num || 0;
    atual.den += r.den || 0;
    atual.mun = r.mun;
    if (r.populacao) atual.populacao = r.populacao;
    mapa.set(r.cod, atual);
  });
  return [...mapa.values()].map((d) => {
    const cob = cobertura(d.num, d.den);
    const ic = Stat.wilson(d.num, d.den);
    return { ...d, cobertura: cob, ic };
  });
}

function municipiosVisiveis() {
  const lista = porMunicipio().filter((d) => d.cobertura !== null && d.den >= S.minDen);
  if (S.mun) return lista.filter((d) => d.cod === S.mun);
  return lista;
}

function quadrimestres() {
  return [...new Set(S.dados.map((r) => r.quad))].sort();
}

function municipiosDoRecorte() {
  const uf = S.uf;
  const vistos = new Map();
  S.dados.filter((r) => uf === "BR" || r.uf === uf).forEach((r) => {
    if (!vistos.has(r.cod)) vistos.set(r.cod, { cod: r.cod, mun: r.mun, uf: r.uf });
  });
  return [...vistos.values()].sort((a, b) => a.mun.localeCompare(b.mun, "pt-BR"));
}

function renderTudo() {
  document.getElementById("status-carregando").hidden = S.carregado;
  document.getElementById("status-progresso").textContent = `${S.ufsOk} de 27 estados carregados, ${fmtInt(S.dados.length)} registros em memória`;
  document.getElementById("barra-preenche").style.width = `${(S.ufsOk / 27) * 100}%`;
  if (S.erro) {
    document.getElementById("status-erro").hidden = false;
    document.getElementById("status-erro").textContent = S.erro;
  }

  const lista = municipiosVisiveis();
  const coberturas = lista.map((d) => d.cobertura);
  const naMeta = lista.filter((d) => d.cobertura >= APP_CONFIG.META_VACINAL).length;

  renderKpis(lista, naMeta);
  renderHistograma(coberturas);
  renderSerie();
  renderRanking(lista);
  renderMapa(lista);
  renderTabela(lista);
  renderConclusao(lista, naMeta);
  renderInsights(lista, naMeta);
}

function renderKpis(lista, naMeta) {
  const cob = lista.map((d) => d.cobertura);
  const med = Stat.mediana(cob);
  const p25 = Stat.quantil(cob, 0.25);
  const p75 = Stat.quantil(cob, 0.75);
  const habitantes = lista.reduce((a, d) => a + (d.populacao || 0), 0);
  const menor = lista.reduce((a, d) => (a === null || d.cobertura < a.cobertura ? d : a), null);
  const pct = lista.length ? (naMeta / lista.length) * 100 : null;
  document.getElementById("kpis").innerHTML = `
    <div class="kpi"><span class="kpi-valor">${fmt(med)}%</span><span class="kpi-rotulo">cobertura mediana</span><span class="kpi-nota">faixa interquartil ${fmt(p25)}% a ${fmt(p75)}%</span></div>
    <div class="kpi"><span class="kpi-valor">${fmt(pct)}%</span><span class="kpi-rotulo">municípios na meta</span><span class="kpi-nota">${fmtInt(naMeta)} de ${fmtInt(lista.length)} na meta de ${APP_CONFIG.META_VACINAL}%</span></div>
    <div class="kpi"><span class="kpi-valor">${fmtInt(lista.length)}</span><span class="kpi-rotulo">municípios no recorte</span><span class="kpi-nota">${fmtInt(habitantes)} habitantes somados</span></div>
    <div class="kpi"><span class="kpi-valor">${menor ? fmt(menor.cobertura) + "%" : "sem dado"}</span><span class="kpi-rotulo">menor cobertura</span><span class="kpi-nota">${menor ? menor.mun : ""}</span></div>`;
}

function renderHistograma(coberturas) {
  document.getElementById("grafico-histograma").innerHTML = coberturas.length
    ? Charts.histograma(coberturas, APP_CONFIG.META_VACINAL)
    : `<p class="aviso">Sem registros para o recorte escolhido.</p>`;
}

function renderSerie() {
  const pontos = quadrimestres().map((q) => {
    const agregado = S.dados
      .filter((r) => r.ind === S.ind && r.quad === q && r.visao === S.visao && (S.uf === "BR" || r.uf === S.uf))
      .reduce((acc, r) => {
        const atual = acc.get(r.cod) || { num: 0, den: 0 };
        atual.num += r.num || 0;
        atual.den += r.den || 0;
        acc.set(r.cod, atual);
        return acc;
      }, new Map());
    const vals = [...agregado.values()]
      .filter((d) => d.den >= S.minDen)
      .map((d) => cobertura(d.num, d.den))
      .filter((c) => c !== null);
    const na = vals.filter((c) => c >= APP_CONFIG.META_VACINAL).length;
    return { quad: q, mediana: Stat.mediana(vals) || 0, acimaMeta: vals.length ? (na / vals.length) * 100 : 0 };
  });
  document.getElementById("grafico-serie").innerHTML = pontos.length > 1
    ? Charts.serie(pontos)
    : `<p class="aviso">São necessários pelo menos dois quadrimestres no recorte.</p>`;
}

function renderRanking(lista) {
  const comValor = lista.filter((d) => d.cobertura !== null);
  const baixos = [...comValor].sort((a, b) => a.cobertura - b.cobertura).slice(0, 8);
  const altos = [...comValor].sort((a, b) => b.cobertura - a.cobertura).slice(0, 8);
  document.getElementById("grafico-baixos").innerHTML = baixos.length ? Charts.ranking(baixos, "Menores coberturas") : `<p class="aviso">Sem dados.</p>`;
  document.getElementById("grafico-altos").innerHTML = altos.length ? Charts.ranking(altos, "Maiores coberturas") : `<p class="aviso">Sem dados.</p>`;
}

function renderMapa(lista) {
  const alvo = document.getElementById("grafico-mapa");
  if (S.uf === "BR") {
    alvo.innerHTML = `<p class="aviso">Selecione um estado no painel lateral para desenhar o mapa municipal. A malha do IBGE é buscada na hora e varia de 85 KB a 400 KB por estado.</p>`;
    return;
  }
  const valores = new Map(lista.map((d) => [d.cod, d.cobertura]));
  const desenharComMalha = (geojson) => { alvo.innerHTML = Mapa.desenhar(geojson, valores); };
  if (S.malhaCache.has(S.uf)) return desenharComMalha(S.malhaCache.get(S.uf));
  alvo.innerHTML = `<p class="aviso">Baixando a malha de ${S.uf} no IBGE…</p>`;
  Api.carregarMalha(S.uf)
    .then((g) => { S.malhaCache.set(S.uf, g); desenharComMalha(g); })
    .catch(() => { alvo.innerHTML = `<p class="aviso">Não foi possível carregar a malha do IBGE para ${S.uf}.</p>`; });
}

function renderTabela(lista) {
  const ordenado = [...lista].sort((a, b) => a.cobertura - b.cobertura);
  const mv = ordenado.map((d) => Stat.pValorAbaixo(d.num, d.den, APP_CONFIG.META_VACINAL));
  const q = Stat.benjaminiHochberg(mv);
  document.getElementById("contagem-tabela").textContent = `${fmtInt(ordenado.length)} municípios listados, do menor para o maior`;
  document.getElementById("corpo-tabela").innerHTML = ordenado.map((d, i) => {
    const relevante = q[i] !== null && q[i] < 0.05 && d.cobertura < APP_CONFIG.META_VACINAL;
    return `<tr>
      <td>${d.mun}</td><td>${d.uf}</td>
      <td class="num">${fmtInt(d.num)}</td>
      <td class="num">${fmtInt(d.den)}</td>
      <td class="num">${fmt(d.cobertura)}%</td>
      <td class="num">${fmt(d.ic.lo)} a ${fmt(d.ic.hi)}</td>
      <td>${relevante ? '<span class="marca-baixa">abaixo da meta</span>' : ""}</td>
    </tr>`;
  }).join("");
}

function renderInsights(lista, naMeta) {
  const sugeridos = [];
  if (lista.length) {
    const pior = [...lista].sort((a, b) => a.cobertura - b.cobertura)[0];
    const melhor = [...lista].sort((a, b) => b.cobertura - a.cobertura)[0];
    sugeridos.push(`Comparar ${melhor.mun} (${melhor.uf}) com ${pior.mun} (${pior.uf})`);
  }
  document.getElementById("insights").innerHTML = sugeridos.map((s) => `<button class="sugestao">${s}</button>`).join("");
}

function renderConclusao(lista, naMeta) {
  if (!lista.length) {
    document.getElementById("conclusao").innerHTML = `<p>Não há municípios com denominador de pelo menos ${S.minDen} no recorte atual.</p>`;
    return;
  }
  const cob = lista.map((d) => d.cobertura);
  const med = Stat.mediana(cob);
  const pct = (naMeta / lista.length) * 100;
  const quads = quadrimestres();
  const primeiro = quads[0];
  const ultimo = quads[quads.length - 1];
  const coberturaDe = (q) => {
    const vals = S.dados
      .filter((r) => r.ind === S.ind && r.quad === q && r.visao === S.visao && (S.uf === "BR" || r.uf === S.uf))
      .reduce((acc, r) => {
        const atual = acc.get(r.cod) || { num: 0, den: 0 };
        atual.num += r.num || 0; atual.den += r.den || 0; acc.set(r.cod, atual); return acc;
      }, new Map());
    return Stat.mediana([...vals.values()].map((d) => cobertura(d.num, d.den)).filter((c) => c !== null));
  };
  const inicio = coberturaDe(primeiro);
  const fim = coberturaDe(ultimo);
  const delta = inicio !== null && fim !== null ? fim - inicio : null;
  const indicador = INDICADORES[S.ind] ? INDICADORES[S.ind].nome : "indicador " + S.ind;

  const fraseLocal = S.uf === "BR" ? "no Brasil" : `em ${S.uf}`;
  const fraseMun = S.mun ? `, restrito a ${lista[0].mun}` : "";
  const direcao = delta === null ? "sem comparativo entre quadrimestres" : delta > 0.5 ? `subiu ${fmt(delta)} ponto${Math.abs(delta) >= 2 ? "s" : ""} percentual${Math.abs(delta) >= 2 ? "is" : ""} na mediana` : delta < -0.5 ? `caiu ${fmt(Math.abs(delta))} ponto${Math.abs(delta) >= 2 ? "s" : ""} percentual${Math.abs(delta) >= 2 ? "is" : ""} na mediana` : "ficou estável na mediana";

  document.getElementById("conclusao").innerHTML = `
    <p>Recorte de <strong>${indicador}</strong> ${fraseLocal}${fraseMun}, quadrimestre ${S.quad}, visão ${S.visao}.</p>
    <p>Com ${fmtInt(lista.length)} municípios no recorte, a cobertura mediana é de <strong>${fmt(med)}%</strong> e ${fmt(pct)}% deles alcançam a meta de ${APP_CONFIG.META_VACINAL}%. Entre ${primeiro} e ${ultimo} a cobertura ${direcao}.</p>
    <p>Leitura honesta dos limites:</p>
    <ul>
      <li>São apenas três quadrimestres de 2024. Isso descreve o ano, não uma tendência. Uma série curta é sensível a represamento de digitação e a mudanças de cadastro.</li>
      <li>O denominador é a população utilizadora do SUS registrada no sistema, não o número de crianças nascidas no município. Municípios com rede privada forte aparecem com denominador menor e cobertura mais instável.</li>
      <li>Cada ponto carrega intervalo de confiança de 95%. Município pequeno tem intervalo largo; sem ele, um município de poucas centenas de crianças parece o pior do estado por sorteio, não por desempenho.</li>
      <li>A coluna de destaque na tabela usa teste binomial unilateral contra a meta com correção de Benjamini-Hochberg para comparações múltiplas. Sem a correção, com centenas de municípios, o achado seria ruído.</li>
      <li>Os indicadores do Previne Brasil foram descontinuados como modelo de financiamento. O dado aqui é histórico e serve para estudo, não para repasse.</li>
      <li>A API publica um campo <em>percentual</em> que não reconcilia com o numerador e o denominador que ela mesma devolve. Por isso a cobertura exibida é calculada aqui como numerador ÷ denominador utilizador.</li>
    </ul>`;
}

function preencherControles() {
  const selUf = document.getElementById("filtro-uf");
  selUf.innerHTML = `<option value="BR">Brasil inteiro</option>` + window.UFS.map(([sigla, nome]) => `<option value="${sigla}">${nome}</option>`).join("");
  selUf.value = S.uf;

  const selInd = document.getElementById("filtro-indicador");
  selInd.innerHTML = Object.entries(INDICADORES).map(([cod, d]) => `<option value="${cod}">${d.nome}</option>`).join("");
  selInd.value = String(S.ind);

  const selVisao = document.getElementById("filtro-visao");
  selVisao.value = S.visao;
}

function preencherQuadrimestres() {
  const qs = quadrimestres();
  const sel = document.getElementById("filtro-quadrimestre");
  const atual = sel.value;
  sel.innerHTML = qs.map((q) => `<option value="${q}">${q}</option>`).join("");
  sel.value = qs.includes(atual) ? atual : qs[qs.length - 1] || "";
  if (sel.value) S.quad = sel.value;
}

function preencherMunicipios() {
  const sel = document.getElementById("filtro-municipio");
  const lista = municipiosDoRecorte();
  sel.innerHTML = `<option value="">Todos os municípios</option>` + lista.map((m) => `<option value="${m.cod}">${m.mun}</option>`).join("");
  if (S.mun && !lista.some((m) => m.cod === S.mun)) S.mun = "";
  sel.value = S.mun;
}

function ligarEventos() {
  document.getElementById("filtro-uf").addEventListener("change", (e) => {
    S.uf = e.target.value; S.mun = ""; preencherMunicipios(); renderTudo();
  });
  document.getElementById("filtro-municipio").addEventListener("change", (e) => { S.mun = e.target.value; renderTudo(); });
  document.getElementById("filtro-indicador").addEventListener("change", (e) => { S.ind = Number(e.target.value); S.mun = ""; preencherMunicipios(); renderTudo(); });
  document.getElementById("filtro-quadrimestre").addEventListener("change", (e) => { S.quad = e.target.value; renderTudo(); });
  document.getElementById("filtro-visao").addEventListener("change", (e) => { S.visao = e.target.value; renderTudo(); });
  document.getElementById("filtro-min-den").addEventListener("input", (e) => { S.minDen = Number(e.target.value); document.getElementById("min-den-valor").textContent = S.minDen; renderTudo(); });
  document.getElementById("botao-recarregar").addEventListener("click", () => {
    indexedDB.deleteDatabase("cobertura-vacinal-br");
    location.reload();
  });
  document.getElementById("insights").addEventListener("click", (e) => {
    if (!e.target.classList.contains("sugestao")) return;
    const achou = municipiosDoRecorte().find((m) => e.target.textContent.includes(m.mun));
    if (achou) { S.mun = achou.cod; document.getElementById("filtro-municipio").value = achou.cod; renderTudo(); }
  });
}

function iniciar() {
  preencherControles();
  ligarEventos();
  renderTudo();
  Api.carregarBrasil({
    aoProgredir: () => {},
    aoConcluirUF: (uf, dados, prontas, total, acumulado) => {
      S.dados = acumulado.slice();
      S.ufsOk = prontas;
      preencherQuadrimestres();
      preencherMunicipios();
      renderTudo();
    },
    aoErro: (uf) => { S.erro = `Falha ao carregar ${uf}. Verifique o relay de dados e tente novamente.`; }
  }).then((dados) => {
    S.dados = dados;
    S.carregado = true;
    S.ufsOk = 27;
    preencherQuadrimestres();
    preencherMunicipios();
    renderTudo();
  }).catch((e) => {
    S.erro = "Não foi possível carregar os dados: " + e.message;
    renderTudo();
  });
}

document.addEventListener("DOMContentLoaded", iniciar);
