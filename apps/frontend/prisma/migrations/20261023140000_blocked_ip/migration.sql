CREATE TABLE "BlockedIp" (
  "id"        TEXT NOT NULL,
  "ip"        TEXT NOT NULL,
  "reason"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlockedIp_ip_key" ON "BlockedIp"("ip");
CREATE INDEX "BlockedIp_ip_idx" ON "BlockedIp"("ip");
