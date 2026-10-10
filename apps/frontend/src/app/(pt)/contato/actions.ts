'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { permitirEnvio } from '@/lib/rate-limit'
import { ipDoCliente } from '@/lib/ip'

const schema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(120),
  email: z.email('E-mail inválido.').max(160),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(4000).optional(),
  boatSlug: z.string().trim().max(120).optional(),
  kind: z
    .enum(['CONTATO', 'PROPOSTA', 'VISITA', 'SERVICOS', 'MANUAL', 'TRABALHE', 'BROKER', 'ANUNCIAR'])
    .default('CONTATO'),
  /* Origem da visita, vinda do navegador (ver components/Atribuicao.tsx).
     Opcionais porque lead organico nao tem nenhuma, e com teto curto porque
     o valor vem da barra de enderecos — e campo que o visitante controla. */
  utmSource: z.string().trim().max(200).optional(),
  utmMedium: z.string().trim().max(200).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
  utmTerm: z.string().trim().max(200).optional(),
  utmContent: z.string().trim().max(200).optional(),
  gclid: z.string().trim().max(200).optional(),
  fbclid: z.string().trim().max(200).optional(),
  referrer: z.string().trim().max(200).optional(),
  landingPath: z.string().trim().max(200).optional(),
  // Honeypot: preenchido apenas por bots.
  website: z.string().max(0).optional(),
})

export type ContactState = {
  ok?: boolean
  errors?: Record<string, string[]>
  message?: string
}

/** O assunto do aviso interno, por formulário de origem. */
const TITULO_POR_TIPO: Record<string, string> = {
  CONTATO: 'Contato pelo site',
  PROPOSTA: 'Pedido de proposta',
  MANUAL: 'Pedido de memorial descritivo',
  SERVICOS: 'Assistência técnica',
  TRABALHE: 'Trabalhe conosco',
  ANUNCIAR: 'Seja nosso fornecedor',
}

export async function submitInquiry(
  _prev: ContactState,
  fd: FormData,
): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: fd.get('name') ?? '',
    email: fd.get('email') ?? '',
    phone: fd.get('phone') ?? undefined,
    message: fd.get('message') ?? undefined,
    boatSlug: fd.get('boatSlug') ?? undefined,
    kind: fd.get('kind') ?? 'CONTATO',
    /* Origem da visita. Anexada pelo ContactForm no momento do envio; ausente
       quando o lead e organico ou o storage esta bloqueado. */
    utmSource: fd.get('utmSource') ?? undefined,
    utmMedium: fd.get('utmMedium') ?? undefined,
    utmCampaign: fd.get('utmCampaign') ?? undefined,
    utmTerm: fd.get('utmTerm') ?? undefined,
    utmContent: fd.get('utmContent') ?? undefined,
    gclid: fd.get('gclid') ?? undefined,
    fbclid: fd.get('fbclid') ?? undefined,
    referrer: fd.get('referrer') ?? undefined,
    landingPath: fd.get('landingPath') ?? undefined,
    website: fd.get('website') ?? undefined,
  })

  if (!parsed.success) {
    // Mesma convenção das actions do painel.
    return { ok: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { website, ...data } = parsed.data
  // Bot detectado pelo campo-isca: responde como se tivesse dado certo, mas
  // não grava nada. Sinalizar a recusa só ensinaria o autor a contorná-la.
  if (website) return { ok: true, message: 'Recebemos sua mensagem.' }

  /*
   * Teto de envios por IP.
   *
   * O campo-isca sozinho não segurava nada: bastava um script que não o
   * preenchesse para gravar uma linha por requisição, enchendo a caixa de
   * contatos do estaleiro. O limite é folgado o bastante para quem manda
   * mensagens legítimas de vários formulários do site (proposta, visita,
   * catálogo) numa mesma visita.
   */
  const ip = await ipDoCliente()
  if (!(await permitirEnvio(`contato:${ip}`, 8, 60))) {
    return {
      ok: false,
      message: 'Você já enviou várias mensagens agora há pouco. Aguarde alguns minutos ou fale com a gente pelo WhatsApp.',
    }
  }

  let criado
  try {
    criado = await prisma.inquiry.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.message || null,
        boatSlug: data.boatSlug || null,
        kind: data.kind,
        /* Gravada junto com o lead, e nao so no analytics: bloqueador de
           anuncio, cookie recusado e tag mal configurada fazem o relatorio da
           plataforma divergir: o banco e a fonte que sobrevive aos tres. */
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        utmTerm: data.utmTerm || null,
        utmContent: data.utmContent || null,
        gclid: data.gclid || null,
        fbclid: data.fbclid || null,
        referrer: data.referrer || null,
        landingPath: data.landingPath || null,
      },
    })
  } catch {
    return {
      ok: false,
      message: 'Não foi possível enviar agora. Tente novamente em instantes.',
    }
  }

  /*
   * Envio automático do memorial, quando ligado no painel.
   *
   * Nasce desligado: o disparo manual é a proteção contra mandar material
   * técnico a um concorrente. Quando ligado, a lista de domínios negados e o
   * teto por hora ainda valem — um pedido barrado fica pendente no painel em
   * vez de sumir.
   *
   * O `catch` é largo de propósito: qualquer falha no envio não pode fazer o
   * visitante ver "não foi possível enviar" depois de a mensagem já estar
   * gravada. O pedido fica pendente e alguém resolve pelo painel.
   */
  if (data.kind === 'MANUAL' && data.boatSlug) {
    try {
      const { getConfigDeEnvio } = await import('@/lib/email/config')
      const cfg = await getConfigDeEnvio()
      if (cfg.autoSend) {
        const { enviarMemorialPara } = await import('@/lib/email/enviar-memorial')
        await enviarMemorialPara(criado.id, { trigger: 'automatico' })
      }
    } catch {
      // Fica pendente no painel.
    }
  }

  /*
   * Aviso ao setor responsável.
   *
   * Cada formulário vai para uma caixa diferente, então quem lê já é quem
   * resolve. Antes a solicitação só ficava no painel, e alguém precisava
   * lembrar de olhar.
   *
   * Falha aqui não vira erro para o visitante: a mensagem já está gravada, e
   * o pedido continua no painel. Avisar é conveniência, não a garantia.
   */
  try {
    const [{ enviarEmail }, { avisoDeFormulario }, { destinoDe }] = await Promise.all([
      import('@/lib/email/mailer'),
      import('@/lib/email/templates'),
      import('@/lib/email/destinos'),
    ])
    const { assunto, html, texto } = avisoDeFormulario({
      titulo: TITULO_POR_TIPO[data.kind] ?? 'Contato pelo site',
      nome: data.name,
      email: data.email,
      telefone: data.phone,
      mensagem: data.message,
      modelo: data.boatSlug,
    })
    await enviarEmail({
      para: destinoDe(data.kind),
      assunto,
      html,
      texto,
      // Responder fala com quem escreveu, sem copiar o endereço à mão.
      responderPara: data.email,
    })
  } catch (erro) {
    /* A solicitação está gravada e aparece no painel de qualquer forma, então
       o visitante não vê erro nenhum — avisar por e-mail é conveniência.

       Mas o silêncio total escondia o problema de quem precisa saber: numa
       conferência do roteamento não havia como distinguir "o e-mail chegou"
       de "o envio falhou e ninguém soube". Registrar no log não muda o que o
       visitante vê e dá o rastro quando a caixa não recebe. */
    console.error(
      `[contato] aviso por e-mail falhou (tipo ${data.kind}, registro ${criado.id}):`,
      erro instanceof Error ? erro.message : erro,
    )
  }

  return { ok: true, message: 'Recebemos seu contato. Nossa equipe responde em breve.' }
}
