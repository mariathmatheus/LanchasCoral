# Desempenho da home — o que foi medido, e o que não vale mexer

Placar em 10 de outubro de 2026, Lighthouse 13.5 com throttling simulado:

| | Celular | Computador |
|---|---|---|
| Desempenho | 95 | 99 |
| Acessibilidade | 100 | 100 |
| Práticas recomendadas | 100 | 100 |
| SEO | 100 | 100 |

Outras páginas no celular: `/modelos` 96, `/broker` 97, `/contato` 98.

O ponto de partida era 93 no celular, com um LCP que o Lighthouse nem
conseguia medir (`NO_LCP`).

---

## As quatro correções que trouxeram o ganho

**O banner de cookies era o elemento de LCP.** Ele só pode pintar depois da
hidratação, então é sempre o último bloco grande — e o texto dele é maior que
o do hero. Medido: LCP de 3880ms com o banner, 1700ms simulando quem já
decidiu. Corrigido pintando primeiro com `opacity: 0`; o Chrome ignora
pinturas transparentes para LCP desde a versão 86. Ver `Consentimento.tsx`.

**O carrossel matava a medição.** O `px-1` do trilho fazia o primeiro cartão
começar a 4px da borda de rolagem, e o `snap-mandatory` corrigia para
`scrollLeft: 4`. Esse ajuste gera um evento de scroll, que o Chrome conta como
interação do usuário — e a primeira interação ENCERRA a medição de LCP. Era a
causa do `NO_LCP`. Corrigido com `scroll-pl-1`. Ver `Carousel.tsx`.

**As duas fotos do hero eram baixadas em todo aparelho.** O `priority` injeta
um `<link rel="preload">`, que é processado antes do layout e ignora CSS —
`sm:hidden` não o alcança. Corrigido com `<picture>` e preloads com `media`.
Ver `HeroImage.tsx`.

**A fonte monoespacada disputava banda com o hero.** 31KB em preload de alta
prioridade para desenhar "m", "hp" e "01".."04". Corrigido com
`preload: false` e `display: 'optional'`. Atenção: `display` sozinho NÃO
remove o preload — quem o controla é a opção `preload`. Ver `_shell.tsx`.

---

## O que foi investigado e NÃO vale corrigir

**Os 27 KiB de "JavaScript não usado" são o react-dom.** Um único arquivo, com
os caminhos que a home não exercita (Suspense, error boundaries). Não é
código do projeto e não há como tree-shakear.

**Os 13 KiB de "JavaScript legado" são polyfills do próprio Next.** Vêm de um
`require` incondicional em `next/dist/client/app-globals.js`, que não passa
por browserslist. Declarar um browserslist moderno não remove. O arquivo real
tem 1.380 bytes; os "13 KiB" são estimativa heurística do Lighthouse.

**O CSS que bloqueia renderização tem economia estimada ZERO.** O próprio
Lighthouse informa `metricSavings: {FCP: 0, LCP: 0}`, e `unused-css-rules`
aponta 0 bytes desperdiçados. Inlinear CSS crítico aqui troca nada por risco
de FOUC e HTML não-cacheável.

**Comprimir mais a foto do hero rende pouco.** O custo medido é de 11,6ms por
KB no throttling simulado. Cortar o arquivo pela metade (48KB → 25KB) baixaria
o LCP em ~270ms — não sai dos 2,6s — ao custo de qualidade visível na
fotografia que é o cartão de visitas do estaleiro.

---

## O que ainda pode render

**O GTM não está configurado.** `NEXT_PUBLIC_GTM_ID` está ausente no `.env` e
nos build args do compose, então nenhuma tag é carregada. Todas as medições
acima são anteriores ao GTM. Quando ele entrar, o TBT sobe e vale medir de
novo antes de otimizar qualquer outra coisa — um contêiner do GTM costuma
custar 60-100KB e executar na linha principal.

**O dicionário bilíngue inteiro vai para o cliente** — cerca de 9KB no fio.
`DICT` é um objeto único com `pt` e `en`, e 15 componentes `'use client'`
importam `getDict`, então o bundler não consegue dividir. A saída seria passar
as strings já resolvidas como props dos Server Components. É a refatoração
mais invasiva da lista e mexe em componentes cobertos pelos testes.

**O comparador entra no bundle inicial pelos cartões** — cerca de 7KB. O
`BoatCard` importa `BotaoComparar` diretamente, e a home renderiza 6 cartões.
Carregar com `next/dynamic` resolveria, mas o botão é visível no cartão (não
só no hover), então haveria um flash.

---

## Como medir

```bash
# Nota completa, celular
CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())") \
  npx lighthouse "https://lanchascoral.com.br/?x=$(date +%s)" \
  --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate \
  --quiet --output=json --output-path=/tmp/lh.json \
  --chrome-flags="--headless=new --no-sandbox"
```

Sempre com parâmetro variável na URL: a Cloudflare e o cache do Next servem a
mesma resposta e mascaram a mudança. E meça três vezes — a variação entre
execuções é de um a dois pontos, então uma rodada isolada não distingue ganho
de ruído.
