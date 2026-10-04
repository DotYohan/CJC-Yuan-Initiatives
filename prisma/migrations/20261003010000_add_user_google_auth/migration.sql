-- CreateTable
CREATE TABLE "user_google_auth" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "google_sub" VARCHAR(255) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "email_normalized" VARCHAR(254) NOT NULL,
    "avatar_url" TEXT,
    "linked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(3),

    CONSTRAINT "user_google_auth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_google_auth_user_id_key" ON "user_google_auth"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_google_auth_google_sub_key" ON "user_google_auth"("google_sub");

-- CreateIndex
CREATE INDEX "user_google_auth_email_normalized_idx" ON "user_google_auth"("email_normalized");

-- AddForeignKey
ALTER TABLE "user_google_auth" ADD CONSTRAINT "user_google_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
