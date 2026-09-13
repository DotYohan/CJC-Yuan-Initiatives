CREATE TABLE "student_number_sequences" (
    "admission_year" SMALLINT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_number_sequences_pkey" PRIMARY KEY ("admission_year"),
    CONSTRAINT "student_number_sequences_positive_year" CHECK ("admission_year" > 0),
    CONSTRAINT "student_number_sequences_positive_next_number" CHECK ("next_number" > 0)
);