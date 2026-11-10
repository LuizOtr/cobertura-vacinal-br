window.APP_CONFIG = {
  API_BASE: "https://saude-api.luizc.dev",
  IBGE_BASE: "https://servicodados.ibge.gov.br",
  META_VACINAL: 95,
  PAGINA: 1000,
  CACHE_HORAS: 12,
  CONCORRENCIA: 6
};

window.INDICADORES = {
  10: { nome: "Pré-natal com 6 ou mais consultas", grupo: "Gestante", meta: 45 },
  20: { nome: "Testagem de sífilis e HIV na gestação", grupo: "Gestante", meta: 60 },
  30: { nome: "Atendimento odontológico da gestante", grupo: "Gestante", meta: 60 },
  40: { nome: "Citopatológico do colo do útero (25 a 64 anos)", grupo: "Mulher", meta: 40 },
  50: { nome: "Cobertura vacinal de crianças de 1 ano", grupo: "Criança", meta: 95 },
  70: { nome: "Hemoglobina glicada em pessoas com diabetes", grupo: "Crônico", meta: 50 }
};

window.UFS = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"],
  ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"],
  ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
  ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"],
  ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"]
];
