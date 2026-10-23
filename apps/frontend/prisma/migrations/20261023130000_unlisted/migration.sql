-- Campo "não listado": acessível por link, invisível nas listagens e buscas
ALTER TABLE "Boat" ADD COLUMN "unlisted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN "unlisted" BOOLEAN NOT NULL DEFAULT false;
