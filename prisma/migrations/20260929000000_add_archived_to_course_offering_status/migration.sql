-- Add ARCHIVED to course_offering_status enum
ALTER TYPE "course_offering_status" ADD VALUE IF NOT EXISTS 'ARCHIVED';
