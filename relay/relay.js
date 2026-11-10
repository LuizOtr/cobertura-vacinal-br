const http = require("http");
const https = require("https");

const ORIGEM = "apidadosabertos.saude.gov.br";
const PORTA = Number(process.env.PORT || 8791);
const HOST = process.env.HOST || "127.0.0.1";
const TTL = 3600 * 1000;
const cache = new Map();

const CABECALHOS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400"
};

function guardado(chave) {
  const item = cache.get(chave);
  if (!item) return null;
  if (Date.now() - item.em > TTL) {
    cache.delete(chave);
    return null;
  }
  return item;
}

function buscar(caminho, aceita) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host: ORIGEM, path: caminho, method: "GET", headers: { "Accept-Encoding": aceita || "br, gzip", "User-Agent": "cobertura-vacinal-relay" } },
      (resp) => {
        const partes = [];
        resp.on("data", (c) => partes.push(c));
        resp.on("end", () => resolve({ status: resp.statusCode, headers: resp.headers, corpo: Buffer.concat(partes) }));
      }
    );
    req.on("error", reject);
    req.setTimeout(60000, () => req.destroy(new Error("tempo esgotado")));
    req.end();
  });
}

const servidor = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CABECALHOS);
    return res.end();
  }
  if (req.method !== "GET") {
    res.writeHead(405, CABECALHOS);
    return res.end("método não permitido");
  }

  const chave = req.url;
  let item = guardado(chave);

  try {
    if (!item) {
      const r = await buscar(req.url, req.headers["accept-encoding"]);
      item = { status: r.status, headers: r.headers, corpo: r.corpo, em: Date.now() };
      if (r.status === 200) cache.set(chave, item);
    }
    const saida = {
      ...CABECALHOS,
      "Content-Type": item.headers["content-type"] || "application/json; charset=utf-8"
    };
    if (item.headers["content-encoding"]) saida["Content-Encoding"] = item.headers["content-encoding"];
    if (item.status === 200) saida["Cache-Control"] = "public, max-age=3600";
    res.writeHead(item.status, saida);
    res.end(item.corpo);
  } catch (e) {
    res.writeHead(502, { ...CABECALHOS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ erro: "falha ao falar com a origem", detalhe: e.message }));
  }
});

servidor.listen(PORTA, HOST, () => {
  console.log(`relay ouvindo em http://${HOST}:${PORTA} -> https://${ORIGEM}`);
});
