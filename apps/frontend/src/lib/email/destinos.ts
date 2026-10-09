import 'server-only'

/**
 * Para quem vai cada formulário do site.
 *
 * Antes tudo caía numa caixa só, e separar era trabalho manual de quem lia.
 * Cada finalidade tem um setor responsável, então a mensagem chega direto a
 * quem resolve.
 *
 * Os endereços são os fornecidos pelo cliente. Ficam aqui, e não no banco,
 * porque são estrutura de atendimento e não conteúdo editável: mudar um deles
 * é decisão de quem organiza os setores, não de quem atualiza o catálogo.
 */

/** Setores de atendimento da Lanchas Coral. */
export const CAIXAS = {
  assistencia: 'assistencia@lanchascoral.com.br',
  comercial: 'comercial@lanchascoral.com.br',
  dp: 'dp@lanchascoral.com.br',
  compras: 'compras@lanchascoral.com.br',
} as const

export type Caixa = (typeof CAIXAS)[keyof typeof CAIXAS]

/**
 * O `kind` que cada formulário grava no `Inquiry`, e o setor correspondente.
 *
 * `CONTATO` é o padrão do banco, usado pelo formulário geral e por quem pede
 * proposta de um modelo: os dois são assunto comercial.
 */
const POR_TIPO: Record<string, Caixa> = {
  CONTATO: CAIXAS.comercial,
  PROPOSTA: CAIXAS.comercial,
  MANUAL: CAIXAS.assistencia,
  SERVICOS: CAIXAS.assistencia,
  TRABALHE: CAIXAS.dp,
  /* Quem quer ANUNCIAR a propria lancha fala com o comercial, nao com
     compras. `compras@` e descrito no site como "fornecimento de pecas,
     insumos e parcerias com o estaleiro": quem le aquela caixa nao e quem
     intermedia a venda de um seminovo, e o pedido chegaria a um setor que
     nao tem o que fazer com ele. O Broker e operacao comercial. */
  ANUNCIAR: CAIXAS.comercial,
  /* Aceitos pelo schema e ainda sem formulario proprio; declarados para que
     um `kind` novo nao dependa do fallback silencioso. */
  BROKER: CAIXAS.comercial,
  VISITA: CAIXAS.comercial,
}

/**
 * A caixa que recebe uma solicitação.
 *
 * Tipo desconhecido cai no comercial em vez de se perder: um `kind` novo que
 * alguém acrescente sem passar por aqui ainda chega a alguém.
 */
export function destinoDe(kind: string | null | undefined): Caixa {
  if (!kind) return CAIXAS.comercial
  return POR_TIPO[kind.toUpperCase()] ?? CAIXAS.comercial
}

/**
 * Quem recebe cópia do memorial enviado ao visitante.
 *
 * A assistência técnica guarda o registro de que material saiu, para quem e
 * quando, sem depender de alguém lembrar de encaminhar.
 */
export const COPIA_MEMORIAL: Caixa = CAIXAS.assistencia
