CREATE TYPE "public"."accommodation_arrangement" AS ENUM('provided_free', 'provided_deducted', 'optional', 'not_provided', 'not_disclosed');--> statement-breakpoint
CREATE TYPE "public"."application_method" AS ENUM('external_link', 'email', 'platform_message');--> statement-breakpoint
CREATE TYPE "public"."company_type" AS ENUM('direct_employer', 'recruitment_agency', 'subcontractor', 'intermediary');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('permanent', 'fixed_term', 'temporary_agency', 'subcontract', 'freelance');--> statement-breakpoint
CREATE TYPE "public"."enquiry_status" AS ENUM('sent', 'viewed', 'responded', 'closed');--> statement-breakpoint
CREATE TYPE "public"."loading_duty" AS ENUM('none', 'occasional', 'full');--> statement-breakpoint
CREATE TYPE "public"."moderation_decision" AS ENUM('approved', 'rejected', 'needs_information');--> statement-breakpoint
CREATE TYPE "public"."pay_period" AS ENUM('month', 'week', 'hour');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'investigating', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('review', 'vacancy', 'company', 'message');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'published', 'under_review', 'rejected', 'removed');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('basic', 'vacancy', 'business', 'multi_vacancy');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'cancelled', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."transport_category" AS ENUM('reefer', 'adr_tanker', 'adr_tank_container', 'container', 'box_general', 'regional', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('driver', 'employer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vacancy_status" AS ENUM('draft', 'published_unverified', 'published_verified', 'confirmed', 'reconfirmation_required', 'expired', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'submitted', 'identity_checked', 'direct_employer_checked', 'verified', 'suspended');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"vehicle_count" integer,
	"trailer_types" text[] DEFAULT '{}' NOT NULL,
	"transport_categories" text[] DEFAULT '{}' NOT NULL,
	"adr_capability" boolean DEFAULT false NOT NULL,
	"coverage_countries" text[] DEFAULT '{}' NOT NULL,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"insurance_info" text,
	"availability" text,
	"preferred_arrangements" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"opportunity_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"origin_country" text,
	"destination_country" text,
	"vehicle_requirements" text,
	"cargo_type" text,
	"required_licences" text[] DEFAULT '{}' NOT NULL,
	"start_date" date,
	"duration" text,
	"payment_terms" text,
	"contracting_party" text,
	"contact_method" text,
	"last_confirmed_at" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid,
	"slug" text NOT NULL,
	"legal_name" text NOT NULL,
	"trading_name" text,
	"country" text NOT NULL,
	"registration_number" text,
	"registered_address" text,
	"website" text,
	"business_email" text,
	"phone" text,
	"contact_person" text,
	"sectors" text[] DEFAULT '{}' NOT NULL,
	"fleet_size" integer,
	"operates_own_fleet" boolean DEFAULT false NOT NULL,
	"recruits_directly" boolean DEFAULT false NOT NULL,
	"company_type" "company_type" NOT NULL,
	"contracting_entity" text,
	"description" text,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"verification_notes" text,
	"is_demo_seed" boolean DEFAULT false NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'basic' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"submitted_by_user_id" uuid,
	"submitted_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_notes" text,
	"status" "verification_status" DEFAULT 'submitted' NOT NULL,
	"decision" "moderation_decision",
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"decision_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" uuid,
	"target_type" "report_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"handled_by_user_id" uuid,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text,
	"country_of_residence" text,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"licence_categories" text[] DEFAULT '{}' NOT NULL,
	"code_95" boolean DEFAULT false NOT NULL,
	"adr_qualified" boolean DEFAULT false NOT NULL,
	"adr_classes" text[] DEFAULT '{}' NOT NULL,
	"years_experience" integer,
	"transport_experience" text,
	"preferred_categories" text[] DEFAULT '{}' NOT NULL,
	"preferred_countries" text[] DEFAULT '{}' NOT NULL,
	"preferred_rotation" text,
	"availability" text,
	"cv_object_key" text,
	"cv_file_name" text,
	"phone" text,
	"contact_email" text,
	"profile_visibility" text DEFAULT 'private' NOT NULL,
	"is_searchable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"driver_user_id" uuid NOT NULL,
	"job_title" text,
	"employment_start" date,
	"employment_end" date,
	"overall_rating" integer NOT NULL,
	"payment_reliability" integer,
	"advert_accuracy" integer,
	"dispatch_management" integer,
	"equipment" integer,
	"home_time" integer,
	"accommodation" integer,
	"deductions" integer,
	"working_conditions" integer,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"eligibility_attested" boolean DEFAULT false NOT NULL,
	"moderation_notes" text,
	"moderated_by_user_id" uuid,
	"moderated_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vacancy_id" uuid,
	"company_id" uuid NOT NULL,
	"driver_user_id" uuid NOT NULL,
	"method" "application_method" DEFAULT 'platform_message' NOT NULL,
	"message" text NOT NULL,
	"shared_email" text,
	"shared_phone" text,
	"status" "enquiry_status" DEFAULT 'sent' NOT NULL,
	"employer_viewed_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"author_user_id" uuid,
	"body" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_vacancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vacancy_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"service_type" text NOT NULL,
	"description" text,
	"location_country" text,
	"location_city" text,
	"contact_method" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'driver' NOT NULL,
	"display_name" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"suspended_reason" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vacancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"country" text NOT NULL,
	"city" text,
	"contracting_entity" text NOT NULL,
	"transport_category" "transport_category" NOT NULL,
	"licence_requirements" text[] DEFAULT '{}' NOT NULL,
	"experience_requirements" text,
	"contract_type" "contract_type" DEFAULT 'permanent' NOT NULL,
	"gross_pay_min" integer,
	"gross_pay_max" integer,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"pay_period" "pay_period" DEFAULT 'month' NOT NULL,
	"pay_structure" text,
	"allowances" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"working_pattern" text,
	"rotation" text,
	"home_time" text,
	"loading_unloading" "loading_duty" DEFAULT 'none' NOT NULL,
	"accommodation" "accommodation_arrangement" DEFAULT 'not_disclosed' NOT NULL,
	"accommodation_details" text,
	"weekly_rest" text,
	"vehicle_type" text,
	"equipment" text,
	"operating_countries" text[] DEFAULT '{}' NOT NULL,
	"languages_required" text[] DEFAULT '{}' NOT NULL,
	"training_provided" text,
	"benefits" text,
	"application_method" "application_method" DEFAULT 'platform_message' NOT NULL,
	"application_url" text,
	"application_email" text,
	"contact_name" text,
	"status" "vacancy_status" DEFAULT 'draft' NOT NULL,
	"info_score" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"last_confirmed_at" timestamp with time zone,
	"reconfirm_due_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"moderation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vacancy_reconfirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vacancy_id" uuid NOT NULL,
	"confirmed_by_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_opportunities" ADD CONSTRAINT "commercial_opportunities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_verifications" ADD CONSTRAINT "company_verifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_verifications" ADD CONSTRAINT "company_verifications_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_verifications" ADD CONSTRAINT "company_verifications_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_handled_by_user_id_users_id_fk" FOREIGN KEY ("handled_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_reviews" ADD CONSTRAINT "driver_reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_reviews" ADD CONSTRAINT "driver_reviews_driver_user_id_users_id_fk" FOREIGN KEY ("driver_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_reviews" ADD CONSTRAINT "driver_reviews_moderated_by_user_id_users_id_fk" FOREIGN KEY ("moderated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_driver_user_id_users_id_fk" FOREIGN KEY ("driver_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_review_id_driver_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."driver_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_companies" ADD CONSTRAINT "saved_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_companies" ADD CONSTRAINT "saved_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_vacancies" ADD CONSTRAINT "saved_vacancies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_vacancies" ADD CONSTRAINT "saved_vacancies_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_listings" ADD CONSTRAINT "service_listings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancy_reconfirmations" ADD CONSTRAINT "vacancy_reconfirmations_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancy_reconfirmations" ADD CONSTRAINT "vacancy_reconfirmations_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_unique" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "companies_country_idx" ON "companies" USING btree ("country");--> statement-breakpoint
CREATE INDEX "companies_verification_idx" ON "companies" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "company_subscriptions_company_idx" ON "company_subscriptions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_verifications_company_idx" ON "company_verifications" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "content_reports_status_idx" ON "content_reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_profiles_user_unique" ON "driver_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_reviews_one_per_experience" ON "driver_reviews" USING btree ("company_id","driver_user_id","employment_start");--> statement-breakpoint
CREATE INDEX "driver_reviews_company_idx" ON "driver_reviews" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "driver_reviews_status_idx" ON "driver_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enquiries_driver_idx" ON "enquiries" USING btree ("driver_user_id");--> statement-breakpoint
CREATE INDEX "enquiries_company_idx" ON "enquiries" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "review_responses_review_idx" ON "review_responses" USING btree ("review_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_companies_unique" ON "saved_companies" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_vacancies_unique" ON "saved_vacancies" USING btree ("user_id","vacancy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "vacancies_slug_unique" ON "vacancies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "vacancies_company_idx" ON "vacancies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "vacancies_status_idx" ON "vacancies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vacancies_country_idx" ON "vacancies" USING btree ("country");--> statement-breakpoint
CREATE INDEX "vacancies_category_idx" ON "vacancies" USING btree ("transport_category");--> statement-breakpoint
CREATE INDEX "vacancy_reconfirmations_vacancy_idx" ON "vacancy_reconfirmations" USING btree ("vacancy_id");