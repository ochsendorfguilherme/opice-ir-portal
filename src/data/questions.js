export const QUESTION_SECTIONS = [
  {
    id: 1,
    title: "INFORMAÇÕES GERAIS DO INCIDENTE",
    questions: [
      "Como o incidente foi detectado inicialmente?",
      "Quem detectou o incidente?",
      "Como o incidente ocorreu (causa raiz e vetor de ataque)?",
      "Quais componentes da infraestrutura de segurança existem no ambiente afetado?",
      "Quais grupos ou organizações foram afetados? Estão cientes do incidente?",
    ]
  },
  {
    id: 2,
    title: "INFORMAÇÕES SOBRE DADOS IMPACTADOS",
    questions: [
      "Quais dados pessoais foram afetados?",
      "Como o incidente violou os dados (confidencialidade, disponibilidade, integridade e/ou autenticidade)?",
      "Quais categorias de titulares foram afetadas e quantos titulares existem em cada categoria?",
      "Há dados de crianças, adolescentes ou idosos?",
      "Estamos cientes de obrigações de conformidade ou legais vinculadas ao incidente?",
    ]
  },
  {
    id: 3,
    title: "ESCOPO E MEDIDAS TÉCNICAS E ADMINISTRATIVAS",
    questions: [
      "Quais teorias existem sobre como o comprometimento inicial ocorreu?",
      "Quais componentes da infraestrutura de TI são diretamente afetados?",
      "Quais aplicativos e processos de dados usam os componentes afetados?",
      "Quais medidas foram adotadas para corrigir as causas do incidente?",
      "Quais medidas técnicas e administrativas foram adotadas para mitigar os riscos aos titulares?",
      "Quais medidas técnicas e administrativas de segurança eram adotadas antes e depois do incidente?",
      "Quais são os possíveis pontos de entrada e saída para o ambiente afetado?",
      "A infraestrutura de TI afetada representa algum risco para outras organizações?",
      "A organização precisará de consultoria forense especializada?",
    ]
  },
  {
    id: 4,
    title: "ETAPAS DE INVESTIGAÇÃO",
    questions: [
      "Quais ações de análise foram tomadas durante a pesquisa inicial?",
      "Quais ferramentas estão disponíveis para monitorar atividades de rede ou host?",
      "Quais comandos ou ferramentas foram executados nos sistemas afetados?",
      "Quais medidas foram tomadas para conter o escopo do incidente?",
      "Quais alertas foram gerados pelos componentes da infraestrutura de segurança?",
      "Se os logs foram revisados, quais entradas suspeitas foram encontradas?",
    ]
  },
  {
    id: 5,
    title: "PARÂMETROS DE COMUNICAÇÃO",
    questions: [
      "Quem é designado como o coordenador de resposta a incidentes?",
      "Quem está autorizado a tomar decisões de negócios em relação às operações afetadas?",
      "Quais mecanismos a equipe usará para se comunicar ao lidar com o incidente?",
      "Quem fará a interface com as equipes jurídicas, executivas e de relações públicas?",
    ]
  },
];
