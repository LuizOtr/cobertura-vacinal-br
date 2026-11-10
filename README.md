# Cobertura vacinal de crianças de 1 ano

Painel interativo sobre a cobertura vacinal infantil nos municípios brasileiros, feito só com HTML, CSS e JavaScript e publicado no GitHub Pages.

## A pergunta

Quantos municípios alcançam a meta de 95% de cobertura vacinal de crianças de 1 ano, e onde estão as maiores lacunas? O painel cruza isso com o indicador do Previne Brasil e permite trocar de estado, de município, de quadrimestre e de indicador. Tudo recalcula na hora, sem recarregar a página.

## De onde vem o dado

Os dados são da API de Dados Abertos do Ministério da Saúde, na base de indicadores de desempenho do Previne Brasil:

```
/atencao-primaria/indicador-desempenho-programa-previne-brasil
```

O indicador usado por padrão é o de código 50, que o Ministério descreve como a proporção de crianças de 1 ano vacinadas na atenção primária contra difteria, tétano, coqueluche, hepatite B, Haemophilus influenzae tipo b e poliomielite inativada.

O recorte disponível na API é o ano de 2024, em três quadrimestres (2024Q1, 2024Q2 e 2024Q3), com numerador, denominador e percentual por município.

## Por que existe um relay

A API do Ministério da Saúde não envia cabeçalho `Access-Control-Allow-Origin`, nem no GET nem no preflight. Testado no navegador: a chamada direta falha em cerca de 45 ms, enquanto `api.github.com` e `brasilapi.com.br` respondem normalmente no mesmo ambiente. Sem esse cabeçalho, nenhum ajuste de front-end resolve.

O painel lê os dados por um relay que só repassa a API do Ministério e acrescenta o cabeçalho de CORS. Há duas implementações no repositório, com o mesmo comportamento:

- `worker/` — Cloudflare Worker. É o caminho recomendado. O app continua estático no GitHub Pages e o Worker só repassa e cacheia no edge.
- `relay/` — relay em Node, sem dependências, para quem preferir rodar em servidor próprio atrás de um túnel.

O endereço do relay fica em uma linha de `assets/js/config.js`:

```js
API_BASE: "https://saude-api.luizc.dev"
```

Para trocar de relay, mude essa linha. Nada mais depende do endereço.

## Como o app carrega

O navegador busca o país inteiro, um estado por vez, com seis requisições em paralelo, e guarda cada estado no IndexedDB por 12 horas. A primeira visita baixa cerca de 5 MB, porque a API responde em brotli (uma página de mil registros cai de 409 KB para 16 KB); as visitas seguintes leem do cache e abrem na hora. Enquanto o carregamento corre, o painel já mostra o que chegou e vai se atualizando.

## Método e limites

O que o painel calcula:

- Cobertura = numerador ÷ denominador utilizador, reproduzível a partir dos campos que a API devolve. O campo `percentual` da própria API não reconcilia com esses dois números, então ele não é usado.
- Intervalo de confiança de 95% pelo método de Wilson para cada município.
- Teste binomial unilateral contra a meta de 95%, com correção de Benjamini-Hochberg para comparações múltiplas, para destacar na tabela os casos que resistem à correção.
- Mediana e faixa interquartil entre municípios, além da fatia que alcança a meta.

O que ele não sustenta:

- Três quadrimestres descrevem um ano, não uma tendência. Séries curtas sofrem com represamento de digitação e mudança de cadastro.
- O denominador é a população utilizadora do SUS registrada no sistema, não as crianças nascidas no município. Onde a rede privada é forte, o denominador cai e a cobertura fica mais instável.
- Cobertura de município pequeno tem intervalo largo. Sem o intervalo, o pior colocado do estado pode ser só ruído.
- Comparações entre municípios são ecológicas, não causais.
- Os indicadores do Previne Brasil foram descontinuados como modelo de financiamento. O dado é histórico.

## Estrutura

```
index.html
assets/css/styles.css
assets/js/config.js   endereços e parâmetros
assets/js/stats.js    intervalo de Wilson, teste contra a meta, Benjamini-Hochberg
assets/js/api.js      paginação, cache no IndexedDB, malha do IBGE
assets/js/charts.js   histograma, série e ranking em SVG
assets/js/map.js      coroplético municipal em SVG
assets/js/app.js      estado, filtros e render
worker/               Cloudflare Worker
relay/                relay Node
```

Malha municipal: IBGE, malhas v2, qualidade mínima.
