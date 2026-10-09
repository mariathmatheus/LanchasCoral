import { prisma } from './prisma'
import { COMPANY } from './company'

/**
 * Pontos focais de atendimento, lidos do banco.
 *
 * O painel edita uma vez e todo lugar que serve àquela finalidade muda junto:
 * rodapé, /contatos, /contato e o JSON-LD do Google. Antes cada um lia a
 * constante `COMPANY.areas`, e trocar um número exigia editar o código.
 *
 * `COMPANY` continua sendo o padrão de segurança: se a tabela estiver vazia
 * (banco novo, seed ainda não rodado), o site mostra os números conhecidos em
 * vez de uma página de contatos em branco.
 */

export type PontoFocal = {
  key: string
  label: string | null
  labelEn: string | null
  phones: string[]
  whatsapp: string | null
  email: string | null
  hours: string | null
  hoursEn: string | null
}

/** Reserva a partir de `company.ts`, para quando a tabela ainda não tem linhas. */
const RESERVA: PontoFocal[] = COMPANY.areas.map((a) => ({
  key: a.key,
  label: null,
  labelEn: null,
  // `COMPANY` é `as const`, então os arrays chegam somente-leitura.
  phones: [...a.phones],
  whatsapp: a.whatsapp,
  email: null,
  hours: null,
  hoursEn: null,
}))

export async function getPontosFocais(): Promise<PontoFocal[]> {
  const linhas = await prisma.contactPoint.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    select: {
      key: true, label: true, labelEn: true, phones: true,
      whatsapp: true, email: true, hours: true, hoursEn: true,
    },
  })
  return linhas.length ? linhas : RESERVA
}

/**
 * O ponto focal comercial — quem atende quem está comprando.
 *
 * As páginas de produto (anúncio do Broker, modelo) mostram este contato ao
 * lado do formulário, então o telefone e o e-mail exibidos ali são os mesmos
 * que o painel edita, sem uma segunda cópia no código.
 *
 * Devolve `null` quando o ponto não existe: a página simplesmente não desenha
 * o bloco, em vez de mostrar um cartão vazio.
 */
export async function getComercial(): Promise<PontoFocal | null> {
  const pontos = await getPontosFocais()
  return pontos.find((p) => p.key === 'comercial') ?? null
}

/**
 * O WhatsApp do comercial, em dígitos com DDI — o formato que o `wa.me` exige.
 *
 * Ordem de preferência:
 *  1. o campo WhatsApp do ponto `comercial`, quando o painel o preencheu;
 *  2. o celular do próprio comercial, que é o número que atende no aplicativo.
 *
 * O passo 2 existe porque hoje só a assistência técnica tem WhatsApp gravado
 * no painel, e mandar quem quer COMPRAR para a assistência é exatamente a
 * confusão que a separação por área existe para evitar. Um celular é
 * reconhecido pelos 11 dígitos após o DDD (9 + 8 do número); o fixo, com 10,
 * fica de fora porque não atende no aplicativo.
 *
 * Devolve `null` quando não há número utilizável — aí o botão não aparece, em
 * vez de abrir uma conversa com ninguém.
 */
export async function getZapComercial(): Promise<string | null> {
  const comercial = await getComercial()
  if (!comercial) return null

  if (comercial.whatsapp) return comercial.whatsapp.replace(/\D/g, '')

  const celular = comercial.phones.find((p) => p.replace(/\D/g, '').length === 11)
  return celular ? `55${celular.replace(/\D/g, '')}` : null
}

/** Todos os telefones publicados, sem repetição — usado pelo JSON-LD. */
export async function getTelefonesPublicados(): Promise<string[]> {
  const pontos = await getPontosFocais()
  return [...new Set(pontos.flatMap((p) => p.phones))]
}
