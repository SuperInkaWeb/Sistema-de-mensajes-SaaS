-- CreateTable
CREATE TABLE IF NOT EXISTS "daily_reports" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_date" TIMESTAMP(3) NOT NULL,
    "zone" TEXT,
    "business_type" TEXT,
    "companies_visited" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "contact_role" TEXT,
    "contacts_made" INTEGER,
    "meetings_held" INTEGER,
    "proposals_sent" INTEGER,
    "main_objection" TEXT,
    "what_worked" TEXT,
    "what_to_improve" TEXT,
    "status" TEXT DEFAULT 'pendiente',
    "plan_purchased" TEXT,
    "next_step" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'daily_reports_company_id_fkey'
  ) THEN
    ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'daily_reports_user_id_fkey'
  ) THEN
    ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
