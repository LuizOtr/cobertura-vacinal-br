const ORIGEM = "https://apidadosabertos.saude.gov.br";
const CACHE_SEGUNDOS = 3600;

const CABECALHOS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400"
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CABECALHOS });
    }

    const destino = new URL(ORIGEM + url.pathname + url.search);
    const chave = new Request(destino.toString(), { method: "GET" });

    const cache = caches.default;
    let resposta = await cache.match(chave);

    if (!resposta) {
      resposta = await fetch(destino.toString(), {
        headers: { "accept-encoding": "br, gzip" },
        cf: { cacheTtl: CACHE_SEGUNDOS, cacheEverything: true }
      });
      const copia = new Response(resposta.clone().body, resposta);
      copia.headers.set("cache-control", `public, max-age=${CACHE_SEGUNDOS}`);
      ctx.waitUntil(cache.put(chave, copia));
    }

    const saida = new Response(resposta.body, resposta);
    Object.entries(CABECALHOS).forEach(([k, v]) => saida.headers.set(k, v));
    return saida;
  }
};
