ALTER TABLE "companies" ADD COLUMN "verification_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vacancies" ADD COLUMN "suspended_from_status" "vacancy_status";