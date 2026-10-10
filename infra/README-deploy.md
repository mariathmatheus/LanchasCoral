# Publicação automática (GitHub Actions → servidor)

Todo push na `main` passa por typecheck, lint e os 179 testes. Se tudo passa, o
runner conecta por SSH no servidor, atualiza o código, aplica as migrações
pendentes e reconstrói a imagem. Depois confere, de fora, se o site respondeu e
se os cabeçalhos de segurança continuam de pé.

O arquivo é [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

## Por que o build acontece no servidor, e não no runner

Seis rotas pré-renderizam conteúdo do banco (`generateStaticParams`), então
`next build` precisa falar com o Postgres. Esse banco vive no servidor e não é
exposto à internet — e dar ao runner uma cópia dele seria espalhar dados de
clientes por uma máquina efêmera de terceiro.

A divisão fica: o runner roda tudo que é puro, o servidor constrói contra o
banco real. Verificação falhou, nada chega ao servidor.

---

## Preparar o servidor (uma vez)

Rocky Linux, como `root` ou com `sudo`.

### 1. Docker

```bash
dnf -y install dnf-plugins-core
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
dnf -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin git
systemctl enable --now docker
```

### 2. Node 24

O passo de migração roda o Prisma a partir do código-fonte, porque a imagem
standalone carrega o schema mas não o CLI.

```bash
curl -fsSL https://rpm.nodesource.com/setup_24.x | bash -
dnf -y install nodejs
node -v   # precisa dizer v24
```

### 3. Usuário de publicação

Não use `root`: a chave que vai para o GitHub só precisa publicar este site.

```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy      # para rodar docker sem sudo
```

### 4. Clonar e configurar

```bash
su - deploy
git clone https://github.com/nerdresolve/coral.git ~/coral
cd ~/coral
```

Agora os arquivos que **não** estão no repositório — e não devem estar.
Copie do seu computador (`scp`) ou escreva à mão:

| Arquivo | O que leva |
|---|---|
| `.env` | `POSTGRES_PASSWORD`, SMTP, `CORAL_SECRET_KEY`, Cloudflare |
| `infra/.env.tunnel` | `TUNNEL_TOKEN` |
| `apps/frontend/.env` | `DATABASE_URL` apontando para `127.0.0.1:5433` |

```bash
# Do seu computador:
scp .env deploy@216.128.171.143:~/coral/.env
scp infra/.env.tunnel deploy@216.128.171.143:~/coral/infra/.env.tunnel
scp apps/frontend/.env deploy@216.128.171.143:~/coral/apps/frontend/.env
```

As 627 fotografias também não estão no git (126 MB). Duas saídas: copiar
`apps/frontend/public/fotos/` por `scp -r`, ou rodar
`node --env-file=.env audit/migrar-imagens.mjs`, que rebaixa o que ainda existe
nas origens antigas — hoje, só parte delas.

### 5. Dependências e primeira subida

```bash
cd ~/coral/apps/frontend && npm ci && npx prisma generate
cd ~/coral && docker compose --env-file .env -f infra/docker-compose.yml up -d --build --allow=network.host
```

O `--allow=network.host` é exigência do Docker 29 em diante: o build precisa
alcançar o Postgres em `127.0.0.1:5433`, porque seis rotas pré-renderizam
conteúdo do banco, e versões novas pedem que esse acesso seja autorizado de
forma explícita em vez de herdado do compose. Sem a flag o build para com
`additional privileges requested`. Em Docker 28 ou anterior a flag não existe
e nem é necessária.

Restaure o banco a partir do backup (`infra/backup.mjs --listar` mostra as
cópias) antes de considerar o site pronto: subir do zero dá estrutura com banco
vazio.

---

## Chave de publicação

No **servidor**, como `deploy`:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh
cat ~/.ssh/github_deploy        # a PRIVADA: vai para o GitHub
```

No GitHub, em **Settings → Environments → New environment → `producao`**,
crie os segredos:

| Segredo | Valor |
|---|---|
| `SSH_HOST` | `216.128.171.143` |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | conteúdo inteiro de `~/.ssh/github_deploy`, com as linhas `BEGIN`/`END` |
| `SSH_PORT` | a porta, se não for 22 |
| `DEPLOY_PATH` | `/home/deploy/coral` |

O Environment, em vez de segredos de repositório, existe por dois motivos: só
o job de publicação enxerga a chave, e dá para exigir aprovação manual depois
marcando *Required reviewers* — sem tocar no workflow.

---

## Entrada pública: Caddy nas portas 80 e 443

O site é servido pelo `coral-proxy` (Caddy), que termina o TLS de
`lanchascoral.com.br` e repassa para a aplicação pela rede interna do compose.
A aplicação segue sem publicar porta no host.

Caddy em vez de Nginx por um motivo só: emite e renova o certificado sozinho,
sem cron nem passo manual. Num servidor que ninguém vai administrar no dia a
dia, certificado expirado é o site fora do ar — e é o modo de falha mais
provável de um Nginx configurado à mão.

São **dois** arquivos de configuração, e a razão importa:

| Arquivo | Serve | Quando |
|---|---|---|
| [`Caddyfile`](Caddyfile) | o IP, em HTTP, sem certificado | hoje |
| [`Caddyfile.dominio`](Caddyfile.dominio) | `lanchascoral.com.br`, com TLS | depois da virada de DNS |

O ativo não declara domínio de propósito. O Caddy pede o certificado assim que
sobe, e o Let's Encrypt valida indo buscar um arquivo em
`http://<domínio>/.well-known/`. Enquanto o domínio apontar para a Cloudflare
(onde o WordPress ainda está), a validação volta **403** — e cada falha conta
contra o teto de 5 por hora da conta. Medido: a primeira subida com o domínio
declarado queimou algumas tentativas exatamente assim.

O emissor está fixado no Let's Encrypt (`acme_ca`). Sem isso o Caddy cai no
ZeroSSL sozinho quando o Let's Encrypt falha — e o site passaria a depender de
um emissor que ninguém escolheu nem acompanha.

Para conferir qualquer um dos dois antes de subir:

```bash
docker run --rm -v "$PWD/infra:/w" caddy:2-alpine caddy validate --config /w/Caddyfile
```

### Abrir as portas no firewalld

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
firewall-cmd --list-services     # precisa listar http e https
```

A 80 **não** é opcional, nem depois da primeira emissão: o Let's Encrypt valida
o domínio por HTTP e a renovação, a cada 60 dias, usa o mesmo caminho. Fechá-la
faria o certificado expirar em silêncio dois meses depois.

### Tirar o OpenLiteSpeed do caminho

A imagem do VPS vem com OpenLiteSpeed (`lshttpd`) instalado e habilitado no
boot. Ele não serve nada deste projeto — o site roda em Docker — mas deixava o
painel administrativo aberto na porta 7080, **rodando PHP 5.6.40**, sem
correção de segurança desde dezembro de 2018. A 8088 era o site de exemplo.

Além do risco, é um servidor web que disputaria as portas 80/443 com o Caddy se
fosse reconfigurado ou atualizado.

```bash
systemctl disable --now lshttpd
ss -tlnp | grep -E '7080|8088'     # não deve devolver nada
```

### Ordem da virada de domínio

O certificado só é emitido depois que o DNS já aponta para cá — o Let's
Encrypt precisa alcançar a porta 80 neste IP para validar. Então:

1. Caddy no ar com as portas abertas: `curl -I http://216.128.171.143`
   devolvendo 200.
2. Registro A de `lanchascoral.com.br` e `www` → `216.128.171.143`, **sem**
   proxy da Cloudflare (nuvem cinza). Com a nuvem laranja, a Cloudflare
   intercepta o desafio e a emissão falha.
3. Esperar o DNS propagar: `dig +short lanchascoral.com.br` devolvendo o IP.
4. Trocar a configuração e publicar:
   ```bash
   cp infra/Caddyfile.dominio infra/Caddyfile
   git commit -am "Serve o dominio oficial com TLS" && git push
   ```
5. O primeiro acesso HTTPS dispara a emissão; leva poucos segundos.
   `docker logs coral-proxy` mostra o resultado.
6. Trocar `vars.SITE_URL` no GitHub para `https://lanchascoral.com.br`, para o
   job de conferência passar a medir o endereço definitivo.

O túnel Cloudflare continua de pé pelo endereço de teste
(`coral.nerdresolve.com`) durante a virada: se o DNS ou o certificado der
problema, ainda há um endereço funcionando para conferir se o site em si está
de pé. Ele vive na conta da agência, não na da Coral, então não é o caminho
definitivo — sai de cena quando o domínio oficial estiver servindo sozinho.

---

## Firewall (SSH)

O runner da GitHub tem IP variável. Três caminhos, do mais simples ao mais
fechado:

**a) Porta 22 aberta, só por chave.** Aceitável porque senha fica desligada:

```bash
# /etc/ssh/sshd_config
PasswordAuthentication no
PermitRootLogin no
```
```bash
systemctl reload sshd
dnf -y install fail2ban && systemctl enable --now fail2ban
```

**b) Só os IPs do GitHub.** A lista vem de `https://api.github.com/meta`
(campo `actions`) e **muda**; exige um cron que atualize o firewall, senão o
deploy para um dia sozinho.

**c) Runner self-hosted.** O servidor é quem conecta para fora e a porta 22
fica fechada para a internet. Mais seguro, mas é um serviço a mais para manter.

Começamos pela (a). Se o acesso ao servidor passar a ser restrito, a (c) é o
caminho.

---

## O que o deploy faz, em ordem

1. `git fetch` + `git reset --hard origin/main` — a árvore do servidor é um
   espelho da `main`, não um lugar onde se edita. `reset` e não `pull` porque um
   arquivo mexido à mão ali faria o pull parar com conflito no meio do deploy.
   Os arquivos ignorados (`.env`, fotos) **não são tocados**: só `git clean` os
   removeria, e ele não é usado.
2. **Backup do banco** — `pg_dump` para `~/backups/coral-<data>.sql`, antes de
   qualquer migração. O arquivo é conferido pelo marcador de fim do pg_dump: um
   dump truncado aborta o deploy, porque dá falsa segurança. Guarda os 10
   últimos e apaga os mais velhos — backup acumulado enche o disco e derruba o
   deploy seguinte. Custo: segundos (o banco tem ~9 MB, o dump sai em ~294 KB).
3. `prisma migrate deploy` — antes da imagem nova subir, porque código novo
   contra schema velho quebra, e o contrário costuma sobreviver. Nunca gera nem
   reseta migração.
4. Build e subida da imagem.
5. Espera o healthcheck do contêiner virar `healthy`, até 5 minutos. O compose
   devolve o controle quando o contêiner inicia, não quando o site responde.
6. Remove imagens órfãs com mais de 7 dias — num servidor pequeno, elas enchem
   o disco e derrubam o deploy seguinte por falta de espaço.
7. Confere de fora: cinco rotas em 200, quatro cabeçalhos de segurança, e o
   painel ainda redirecionando para o login.

## Se algo der errado

O passo que falhou aparece no log do Actions. No servidor:

```bash
docker logs --tail 100 coral-app
docker compose --env-file .env -f infra/docker-compose.yml ps
```

Para voltar à versão anterior:

```bash
cd ~/coral
git log --oneline -5
git reset --hard <commit-bom>
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

Migração já aplicada **não volta sozinha** com o reset do código. Se o problema
for de schema, restaure o backup que o próprio deploy tirou antes de migrar:

```bash
ls -lt ~/backups/coral-*.sql | head -5          # o mais recente é o de antes da migração
docker exec -i coral-db psql -U coral -d coral < ~/backups/coral-<data>.sql
```

Há também uma cópia na máquina de desenvolvimento, em `infra/backups/`, fora do
git — o `.gitignore` exclui a pasta porque o dump carrega nome, e-mail e
telefone de clientes.
