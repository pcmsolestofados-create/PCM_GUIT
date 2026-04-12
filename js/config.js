// ============================================================
//  CONFIGURAÇÃO — preencha com seus dados
// ============================================================

const CONFIG = {

  // Cole aqui o ID da sua planilha Google Sheets
  // Exemplo: "1OeAHhSAxX_ZcTqA2ZxR0V1B_PN8Z2qwxJaxH86UQGVQ"
  SPREADSHEET_ID: "1OeAHhSAxX_ZcTqA2ZxR0V1B_PN8Z2qwxJaxH86UQGVQ",

  // Cole aqui a sua API Key do Google (passo 3 do guia)
  API_KEY: "COLE_SUA_API_KEY_AQUI",

  // Nome das abas da planilha (exatamente como aparecem nas abas)
  ABA_OS:      "Respostas ao formulário 1",   // aba principal das OS
  ABA_ESTOQUE: "Estoque de peças",            // aba de estoque

  // Colunas da planilha de OS (A=0, B=1, C=2, D=3...)
  // Ajuste se as colunas forem diferentes na sua planilha
  COLUNAS: {
    NUM_OS:       0,   // A - Nº OS
    DATA:         1,   // B - Data
    HORA:         2,   // C - Hora
    SOLICITANTE:  3,   // D - Solicitante (coluna E no sheets = índice 4 se há coluna oculta)
    SETOR:        5,   // F - Setor
    EQUIPAMENTO:  7,   // H - Equipamento
    FALHA:        25,  // Z - Descrição da falha
    INTERVENCAO:  28,  // AC - Tipo de intervenção
    SERVICO:      29,  // AD - Serviço realizado
    PECA:         30,  // AE - Peças
    SEGURANCA:    31,  // AF - Segurança
    TECNICO:      34,  // AI - Técnico
    STATUS:       35,  // AJ - Status da OS
  },

  // Link do formulário para abertura de OS
  FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSfQBUkaWl5gUqxcgDWs5Xk33K4ZDo2oqOgbFWUu_suXFIGrIQ/viewform",

  // Atualização automática a cada X minutos (0 = desligado)
  AUTO_REFRESH_MINUTOS: 5,

};
