# Histórico do trabalho

## 2026-11-10: painel de cobertura vacinal

Pedido: dashboard interativo no estilo Shiny, só com HTML, CSS e JavaScript, sobre dados reais da API de Dados Abertos do Ministério da Saúde, publicado no GitHub Pages.

### Auditoria da fonte (tudo medido ao vivo)

| O que foi medido | Resultado |
| --- | --- |
| CORS da API do MS no navegador real | `TypeError: Failed to fetch` em ~45 ms, com `api.github.com` e `brasilapi.com.br` respondendo 200 na mesma sessão |
| CORS do portal CKAN e do S3 do SINAN | mesma falha |
| Compressão | página de 1.000 registros cai de 409 KB para 16 KB em brotli |
| Filtros do Previne Brasil | `uf`, `codigo_municipio`, `quadrimestre`, `competencia` funcionam |
| Volume do Previne Brasil | ~300.732 linhas nacionais, 54 por município |
| Recorte temporal | só 2024Q1, 2024Q2 e 2024Q3 |
| PNI doses aplicadas | 3+ milhões de linhas por ano e nenhum filtro honrado |
| Relays CORS públicos | corsproxy.io pede chave, allorigins estoura tempo, codetabs 522, cors.eu.org devolve erro |

Lido em fonte oficial, não medido: o significado do `codigo_tipo_indicador = 50` como indicador 5 do Previne Brasil (cobertura vacinal de crianças de 1 ano). A API não publica dicionário de códigos.

### Decisão de arquitetura

O tema pedido (doses aplicadas do PNI) não é processável ao vivo. O caminho viável foi o Previne Brasil, indicador 5, com relay de CORS para o navegador ler a API direto.

### Estado de prova

- Relay em Node ativo como `cobertura-vacinal-relay.service` no octopus, ouvindo em 127.0.0.1:8791.
- Túnel Cloudflare com a regra `saude-api.luizc.dev` e o CNAME criado; testado em HTTPS público com `Access-Control-Allow-Origin: *`.
- App publicado em https://luizotr.github.io/cobertura-vacinal-br/ e verificado no navegador: 27 de 27 estados, 300.732 registros, mapa e tabela renderizando.
- HEAD do repositório igual ao do remoto.

### Não executado

- Deploy do Cloudflare Worker. O token da conta não tem `Workers Scripts: Edit`; a chamada de publicação respondeu `No access to the specified resource`. O Worker está no repositório, pronto para publicar quando a permissão existir.
- Teste de acessibilidade com leitor de tela.
- Teste em navegador que não seja o Chromium do harness.

### Incidente

Ao trocar o relay de processo avulso para serviço systemd, um `pkill -f` com o caminho do próprio script na linha de comando casou com o shell que executava o comando e matou o processo antes de terminar. O serviço acabou criado, mas a verificação na mesma chamada não rodou. Passou a ser usada a morte por PID.
