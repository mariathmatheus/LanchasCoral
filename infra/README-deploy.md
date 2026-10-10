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

## Firewall

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
2. `prisma migrate deploy` — antes da imagem nova subir, porque código novo
   contra schema velho quebra, e o contrário costuma sobreviver. Nunca gera nem
   reseta migração.
3. `docker compose up -d --build`.
4. Espera o healthcheck do contêiner virar `healthy`, até 5 minutos. O compose
   devolve o controle quando o contêiner inicia, não quando o site responde.
5. Remove imagens órfãs com mais de 7 dias — num servidor pequeno, elas enchem
   o disco e derrubam o deploy seguinte por falta de espaço.
6. Confere de fora: cinco rotas em 200, quatro cabeçalhos de segurança, e o
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
for de schema, restaure o backup do banco.
