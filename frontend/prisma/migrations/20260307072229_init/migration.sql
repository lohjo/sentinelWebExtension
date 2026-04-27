-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "source_url" TEXT NOT NULL,
    "normalized_url" VARCHAR(2048) NOT NULL,
    "headline" VARCHAR(500),
    "thumbnail_url" TEXT,
    "scraped_content" TEXT,
    "ai_summary" TEXT,
    "ai_credibility_score" DOUBLE PRECISION,
    "ai_credibility_label" VARCHAR(50),
    "ai_transparency_notes" TEXT,
    "scrape_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_categories" (
    "post_id" UUID NOT NULL,
    "category_id" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_categories_pkey" PRIMARY KEY ("post_id","category_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "headline" VARCHAR(500) NOT NULL,
    "category_id" INTEGER,
    "platform" VARCHAR(50) NOT NULL,
    "report_description" TEXT NOT NULL,
    "supporting_evidence" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID,
    "content" TEXT NOT NULL,
    "parent_comment_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_votes" (
    "user_id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "vote_value" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_votes_pkey" PRIMARY KEY ("user_id","report_id")
);

-- CreateTable
CREATE TABLE "comment_votes" (
    "user_id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "vote_value" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_votes_pkey" PRIMARY KEY ("user_id","comment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "posts_normalized_url_key" ON "posts"("normalized_url");

-- CreateIndex
CREATE INDEX "idx_posts_report_count" ON "posts"("report_count" DESC);

-- CreateIndex
CREATE INDEX "idx_posts_created_at" ON "posts"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "idx_post_categories_category_id" ON "post_categories"("category_id");

-- CreateIndex
CREATE INDEX "idx_reports_post_id" ON "reports"("post_id");

-- CreateIndex
CREATE INDEX "idx_reports_user_id" ON "reports"("user_id");

-- CreateIndex
CREATE INDEX "idx_reports_created_at" ON "reports"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reports_post_id_user_id_key" ON "reports"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_comments_post_created" ON "comments"("post_id", "created_at");

-- AddForeignKey
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_votes" ADD CONSTRAINT "report_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_votes" ADD CONSTRAINT "report_votes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
