-- Origem do lead: de onde veio quem preencheu o formulario.
--
-- Colunas tipadas, e nao um JSON, para que o painel agrupe e ordene por origem
-- sem precisar ler cada linha. Todas opcionais: lead organico nao tem UTM, e
-- formulario enviado antes desta migracao fica com NULL em vez de valor falso.
ALTER TABLE "Inquiry"
  ADD COLUMN "utmSource"   TEXT,
  ADD COLUMN "utmMedium"   TEXT,
  ADD COLUMN "utmCampaign" TEXT,
  ADD COLUMN "utmTerm"     TEXT,
  ADD COLUMN "utmContent"  TEXT,
  ADD COLUMN "gclid"       TEXT,
  ADD COLUMN "fbclid"      TEXT,
  ADD COLUMN "referrer"    TEXT,
  ADD COLUMN "landingPath" TEXT;

-- Responde "quantos leads cada origem trouxe neste mes" sem varrer a tabela.
CREATE INDEX "Inquiry_utmSource_createdAt_idx" ON "Inquiry" ("utmSource", "createdAt");
