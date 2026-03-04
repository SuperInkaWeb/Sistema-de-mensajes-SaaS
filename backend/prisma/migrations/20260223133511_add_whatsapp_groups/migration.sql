-- CreateTable
CREATE TABLE "whatsapp_groups" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "group_jid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "invite_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "whatsapp_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_group_members_group_id_phone_key" ON "whatsapp_group_members"("group_id", "phone");

-- AddForeignKey
ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_group_members" ADD CONSTRAINT "whatsapp_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "whatsapp_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
