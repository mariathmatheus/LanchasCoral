import PageShell from '@/components/PageShell'
import type { Locale } from '@/i18n/config'

type Secao = { title: string; body: string[] }

export default function PoliticaDePrivacidadeView({ locale }: { locale: Locale }) {
  const COPY: {
    eyebrow: string
    title: string
    lede: string
    sections: Secao[]
    disclaimer: string
  } = {
    pt: {
      eyebrow: 'Institucional',
      title: 'Política de privacidade',
      lede: 'Como tratamos os dados pessoais coletados neste site.',
      /*
       * Transcrito da página /politica-de-privacidade/ do site legado.
       * As seções referentes a comentários e contas de usuário (recursos do
       * WordPress antigo) foram omitidas por não existirem neste site; as seções
       * sobre formulários, cookies e direitos do titular foram preservadas.
       */
      sections: [
        {
          title: 'Quem somos',
          body: ['O endereço do nosso site é: https://lanchascoral.com.br'],
        },
        {
          title: 'Formulários',
          body: [
            'Nos formulários coletamos e mantemos as informações: nome, sobrenome, e-mail, telefone, tipo de serviço, modelo da embarcação e currículo, para efetuar o atendimento ao consumidor.',
          ],
        },
        {
          title: 'Cookies',
          body: [
            'Utilizamos cookies, pequenos arquivos de texto que sites armazenam no seu navegador para salvar preferências e configurações. Quando você acessa o site novamente, seu navegador envia esse arquivo, e suas preferências são aplicadas automaticamente.',
            'Essenciais: permitem manter as sessões do usuário e prevenir ameaças à segurança. Não coletam nem armazenam informação pessoal.',
            'Estatísticas: armazenam informações como número de visitantes, páginas visitadas e origem da visita, para analisarmos o desempenho do site.',
            'Marketing: usados para personalizar os anúncios exibidos e acompanhar a eficiência das campanhas.',
            'Funcionais: auxiliam funcionalidades não essenciais, como incorporação de vídeos e compartilhamento em redes sociais.',
          ],
        },
        {
          title: 'Mídia incorporada de outros sites',
          body: [
            'Páginas deste site podem incluir conteúdo incorporado (vídeos, imagens, artigos). Conteúdos incorporados de outros sites se comportam exatamente como se o visitante estivesse visitando o outro site, e podem coletar dados, usar cookies e monitorar sua interação com esse conteúdo.',
          ],
        },
        {
          title: 'Com quem partilhamos seus dados',
          body: [
            'Não vendemos nem cedemos seus dados de contato a terceiros. As mensagens enviadas pelos formulários ficam com a equipe da Coral e com o provedor de e-mail que usamos para recebê-las.',
            'Se você autorizar os cookies de medição, o Google (Analytics e Ads) e a Meta recebem dados de navegação — páginas vistas, origem da visita e identificador do clique de anúncio — para medir o desempenho das campanhas. Esse tratamento envolve transferência internacional, já que os servidores dessas empresas ficam fora do Brasil. Recusar não limita nada do que o site oferece, e você pode mudar a escolha a qualquer momento pelo link "Preferências de cookies" no rodapé.',
          ],
        },
        {
          title: 'Quais os seus direitos sobre seus dados',
          body: [
            'Você pode solicitar um arquivo com os dados pessoais que mantemos sobre você, bem como solicitar que removamos qualquer dado pessoal que mantemos. Isto não inclui dados que somos obrigados a manter para propósitos administrativos, legais ou de segurança.',
            'Para solicitar alteração, remoção ou cópia dos seus dados pessoais, entre em contato pelos nossos canais de atendimento. Retornaremos em até 28 dias.',
          ],
        },
        {
          title: 'Como protegemos seus dados',
          body: [
            'O site possui certificado SSL para que você navegue, processe e envie informações com segurança.',
          ],
        },
      ],
      disclaimer:
        'Nos reservamos o direito de atualizar estes termos e condições de uso sem aviso prévio.',
    },

    en: {
      eyebrow: 'Company',
      title: 'Privacy policy',
      lede: 'How we handle the personal data collected through this website.',
      sections: [
        {
          title: 'Who we are',
          body: ['Our website address is: https://lanchascoral.com.br'],
        },
        {
          title: 'Forms',
          body: [
            'Through our forms we collect and retain the following information: first name, surname, e-mail, phone number, type of service, boat model and CV, in order to provide customer support.',
          ],
        },
        {
          title: 'Cookies',
          body: [
            'We use cookies, small text files that websites store in your browser to save preferences and settings. When you return to the site, your browser sends this file back and your preferences are applied automatically.',
            'Essential: these maintain user sessions and help prevent security threats. They neither collect nor store personal information.',
            'Statistics: these store information such as the number of visitors, pages visited and where the visit came from, so we can analyse how the site performs.',
            'Marketing: these are used to tailor the adverts displayed and to measure how effective our campaigns are.',
            'Functional: these support non-essential features, such as embedded video and social media sharing.',
          ],
        },
        {
          title: 'Embedded content from other websites',
          body: [
            'Pages on this site may include embedded content (videos, images, articles). Embedded content from other websites behaves exactly as though the visitor were on that other website, and may collect data, use cookies and monitor your interaction with that content.',
          ],
        },
        {
          title: 'Who we share your data with',
          body: [
            'We neither sell nor transfer your contact details to third parties. Messages sent through the forms stay with the Coral team and the e-mail provider we use to receive them.',
            'If you allow measurement cookies, Google (Analytics and Ads) and Meta receive browsing data — pages viewed, visit source and ad click identifier — to measure campaign performance. This involves an international transfer, as those servers sit outside Brazil. Declining limits nothing the site offers, and you can change your choice at any time through the "Cookie preferences" link in the footer.',
          ],
        },
        {
          title: 'What rights you have over your data',
          body: [
            'You may request a file containing the personal data we hold about you, and you may also request that we erase any personal data we hold. This does not include data we are obliged to keep for administrative, legal or security purposes.',
            'To request the amendment, erasure or a copy of your personal data, please get in touch through any of our support channels. We will respond within 28 days.',
          ],
        },
        {
          title: 'How we protect your data',
          body: [
            'This site holds an SSL certificate so that you can browse, process and submit information securely.',
          ],
        },
      ],
      disclaimer:
        'We reserve the right to update these terms and conditions of use without prior notice.',
    },
  }[locale]

  return (
    <PageShell locale={locale} eyebrow={COPY.eyebrow} title={COPY.title} lede={COPY.lede}>
      <div className="flex flex-col gap-10">
        {COPY.sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-xl font-medium tracking-[var(--tracking-display)] text-[var(--text-strong)]">
              {s.title}
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              {s.body.map((p, i) => (
                <p key={i} className="text-[16px] leading-[1.7] text-[var(--color-text-body)]">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-[var(--border-subtle)] pt-6 text-[14px] italic text-[var(--text-muted)]">
        {COPY.disclaimer}
      </p>
    </PageShell>
  )
}
