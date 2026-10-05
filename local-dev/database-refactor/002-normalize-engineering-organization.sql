\set ON_ERROR_STOP on

-- REVIEW-ONLY: DO NOT RUN until a fresh custom-format PostgreSQL backup has
-- been created and verified and the owner separately authorizes execution.
-- This is an environment-specific, explicit-UUID, one-time data cutover. It is
-- intentionally not a replayable Prisma schema migration.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

SELECT pg_advisory_xact_lock(hashtext('cjc-academic-organization-refactor-v1'));

LOCK TABLE
  colleges, departments, programs, program_history, program_head_assignments,
  user_program_assignments, students, admission_applications,
  student_program_history, curricula, curriculum_subjects,
  student_curriculum_assignments, faculty, faculty_department_assignments,
  faculty_specializations, faculty_employment, subjects, subject_requirements,
  enrollments, enrollment_applications, enrollment_status_history,
  class_sections, course_offerings, faculty_course_assignments,
  class_schedules, enrollment_items, grades, grade_history, rooms,
  clearance_requirements
IN SHARE ROW EXCLUSIVE MODE;

DO $preflight$
DECLARE
  fixture_program_ids uuid[] := ARRAY[
    '0a3825d9-3118-48dc-818c-8fdb6404062c'::uuid,
    '0af9fcd4-9ef3-4c8e-b9b1-761183dd1afd'::uuid,
    'afa137b4-a746-414f-93dc-bf4454770996'::uuid,
    '5c416679-fd16-441c-b173-f2ccc570ba6b'::uuid
  ];
  fixture_department_ids uuid[] := ARRAY[
    'a37ca68f-f8d6-4988-8041-a046499f3f47'::uuid,
    '7d254f90-ff68-4ed4-9d07-a57ccdf79bdd'::uuid,
    '024b3567-4201-4779-91d6-6cf262e90577'::uuid,
    '5eb5b940-e030-4b44-a6c1-9d0d7ac1462f'::uuid
  ];
  fixture_college_ids uuid[] := ARRAY[
    'ea284b3b-0af3-4a63-b072-c93e4197b441'::uuid,
    '69b759f3-4d24-417a-ad08-0d395369973d'::uuid,
    '3df70a78-268b-4c68-95a4-1063f7f4b47d'::uuid,
    '2bd69a79-aa6c-493c-a255-24c66699422b'::uuid
  ];
  fixture_user_ids uuid[] := ARRAY[
    '1efe3b43-fcd2-49fb-8b72-87523e8f994f'::uuid,
    '3ae16de1-bb16-48fa-a977-8e4048737af9'::uuid,
    'f405823e-854b-4553-bb5f-8b06e9e97b2f'::uuid,
    '557447ad-15c4-4a25-8beb-60e7d52203c6'::uuid
  ];
  actual bigint;
  mismatch jsonb;
BEGIN
  IF current_database() <> 'cor_jesu_sms' THEN
    RAISE EXCEPTION 'Unexpected database: %, expected cor_jesu_sms', current_database();
  END IF;
  IF current_user <> 'cjc_app' THEN
    RAISE EXCEPTION 'Unexpected database user: %, expected cjc_app', current_user;
  END IF;
  IF to_regclass('public.departments_college_id_code_canonical_key') IS NOT NULL THEN
    RAISE EXCEPTION 'Canonical Department-code index already exists; migration state is unexpected';
  END IF;

  SELECT count(*) INTO actual FROM colleges;
  IF actual <> 5 THEN RAISE EXCEPTION 'Expected 5 source colleges, found %', actual; END IF;
  SELECT count(*) INTO actual FROM departments;
  IF actual <> 7 THEN RAISE EXCEPTION 'Expected 7 source departments, found %', actual; END IF;
  SELECT count(*) INTO actual FROM programs;
  IF actual <> 7 THEN RAISE EXCEPTION 'Expected 7 source programs, found %', actual; END IF;

  SELECT count(*) INTO actual FROM colleges
  WHERE id = 'e822d5e3-91a4-4350-9b5a-ca1c38c17bb3'::uuid
    AND code = 'COE' AND code_normalized = 'coe' AND name = 'College of Engineering';
  IF actual <> 1 THEN RAISE EXCEPTION 'Canonical COE College precondition failed'; END IF;

  SELECT count(*) INTO actual FROM departments
  WHERE id = 'e9e8b9ee-caa0-413e-86a6-b77c19ef7b67'::uuid
    AND college_id = 'e822d5e3-91a4-4350-9b5a-ca1c38c17bb3'::uuid
    AND code = 'DECE' AND name = 'Department of Electronics Engineering';
  IF actual <> 1 THEN RAISE EXCEPTION 'Canonical Department survivor precondition failed'; END IF;

  SELECT count(*) INTO actual
  FROM (VALUES
    ('736c0502-8016-4c26-9d64-1049afab4158'::uuid, 'BSECE', 'e9e8b9ee-caa0-413e-86a6-b77c19ef7b67'::uuid),
    ('9a095737-5105-4f6c-8636-e32dfa1f7650'::uuid, 'BSCpE', '0bab1931-2c2e-4343-9b45-a7a24e36509f'::uuid),
    ('8863df7a-34c1-4b34-8346-99a4f09a09db'::uuid, 'BSCE',  'cab1994e-ccd9-4626-98c1-74f4df90bd2c'::uuid)
  ) AS expected(id, code, department_id)
  JOIN programs p ON p.id = expected.id AND p.code = expected.code AND p.department_id = expected.department_id;
  IF actual <> 3 THEN RAISE EXCEPTION 'Canonical Program UUID/code/Department precondition failed'; END IF;

  SELECT count(*) INTO actual FROM programs
  WHERE code_normalized = 'bscoe' AND id <> '9a095737-5105-4f6c-8636-e32dfa1f7650'::uuid;
  IF actual <> 0 THEN RAISE EXCEPTION 'A conflicting BSCOE Program already exists'; END IF;

  SELECT count(*) INTO actual
  FROM (VALUES
    ('0a3825d9-3118-48dc-818c-8fdb6404062c'::uuid, 'BSECE1a82da3c', 'a37ca68f-f8d6-4988-8041-a046499f3f47'::uuid, 'ea284b3b-0af3-4a63-b072-c93e4197b441'::uuid),
    ('0af9fcd4-9ef3-4c8e-b9b1-761183dd1afd'::uuid, 'BSECE5a8535de', '7d254f90-ff68-4ed4-9d07-a57ccdf79bdd'::uuid, '69b759f3-4d24-417a-ad08-0d395369973d'::uuid),
    ('afa137b4-a746-414f-93dc-bf4454770996'::uuid, 'BSECE94c89afc', '024b3567-4201-4779-91d6-6cf262e90577'::uuid, '3df70a78-268b-4c68-95a4-1063f7f4b47d'::uuid),
    ('5c416679-fd16-441c-b173-f2ccc570ba6b'::uuid, 'BSECEebd6617d', '5eb5b940-e030-4b44-a6c1-9d0d7ac1462f'::uuid, '2bd69a79-aa6c-493c-a255-24c66699422b'::uuid)
  ) AS expected(program_id, program_code, department_id, college_id)
  JOIN programs p ON p.id = expected.program_id AND p.code = expected.program_code AND p.department_id = expected.department_id
  JOIN departments d ON d.id = expected.department_id AND d.college_id = expected.college_id
  JOIN colleges c ON c.id = expected.college_id;
  IF actual <> 4 THEN RAISE EXCEPTION 'Fixture Program/Department/College UUID mapping changed'; END IF;

  WITH fixture_curricula AS (SELECT id FROM curricula WHERE program_id = ANY(fixture_program_ids)),
       fixture_subjects AS (SELECT id FROM subjects WHERE department_id = ANY(fixture_department_ids)),
       fixture_faculty AS (SELECT id FROM faculty WHERE department_id = ANY(fixture_department_ids)),
       fixture_sections AS (SELECT id FROM class_sections WHERE program_id = ANY(fixture_program_ids)),
       fixture_offerings AS (
         SELECT id FROM course_offerings
         WHERE subject_id IN (SELECT id FROM fixture_subjects)
            OR class_section_id IN (SELECT id FROM fixture_sections)
       ), fixture_enrollments AS (SELECT id FROM enrollments WHERE program_id = ANY(fixture_program_ids)),
       fixture_items AS (
         SELECT id FROM enrollment_items
         WHERE enrollment_id IN (SELECT id FROM fixture_enrollments)
            OR course_offering_id IN (SELECT id FROM fixture_offerings)
       ), fixture_grades AS (SELECT id FROM grades WHERE enrollment_item_id IN (SELECT id FROM fixture_items)),
       checks(label, actual_count, expected_count) AS (
         VALUES
           ('fixture colleges', (SELECT count(*) FROM colleges WHERE id = ANY(fixture_college_ids)), 4::bigint),
           ('fixture departments', (SELECT count(*) FROM departments WHERE id = ANY(fixture_department_ids)), 4::bigint),
           ('fixture programs', (SELECT count(*) FROM programs WHERE id = ANY(fixture_program_ids)), 4::bigint),
           ('fixture curricula', (SELECT count(*) FROM fixture_curricula), 4::bigint),
           ('fixture curriculum subjects', (SELECT count(*) FROM curriculum_subjects WHERE curriculum_id IN (SELECT id FROM fixture_curricula)), 4::bigint),
           ('fixture subjects', (SELECT count(*) FROM fixture_subjects), 4::bigint),
           ('fixture faculty', (SELECT count(*) FROM fixture_faculty), 4::bigint),
           ('fixture program heads', (SELECT count(*) FROM program_head_assignments WHERE program_id = ANY(fixture_program_ids)), 4::bigint),
           ('program history', (SELECT count(*) FROM program_history WHERE program_id = ANY(fixture_program_ids) OR department_id = ANY(fixture_department_ids)), 0::bigint),
           ('user program assignments', (SELECT count(*) FROM user_program_assignments WHERE program_id = ANY(fixture_program_ids)), 0::bigint),
           ('students', (SELECT count(*) FROM students WHERE program_id = ANY(fixture_program_ids)), 0::bigint),
           ('admission applications', (SELECT count(*) FROM admission_applications WHERE intended_program_id = ANY(fixture_program_ids)), 0::bigint),
           ('student program history', (SELECT count(*) FROM student_program_history WHERE program_id = ANY(fixture_program_ids)), 0::bigint),
           ('student curriculum assignments', (SELECT count(*) FROM student_curriculum_assignments WHERE curriculum_id IN (SELECT id FROM fixture_curricula)), 0::bigint),
           ('subject requirements', (SELECT count(*) FROM subject_requirements WHERE subject_id IN (SELECT id FROM fixture_subjects) OR required_subject_id IN (SELECT id FROM fixture_subjects)), 0::bigint),
           ('faculty department assignments', (SELECT count(*) FROM faculty_department_assignments WHERE department_id = ANY(fixture_department_ids) OR faculty_id IN (SELECT id FROM fixture_faculty)), 0::bigint),
           ('faculty specializations', (SELECT count(*) FROM faculty_specializations WHERE faculty_id IN (SELECT id FROM fixture_faculty)), 0::bigint),
           ('faculty employment', (SELECT count(*) FROM faculty_employment WHERE faculty_id IN (SELECT id FROM fixture_faculty)), 0::bigint),
           ('enrollments', (SELECT count(*) FROM fixture_enrollments), 0::bigint),
           ('enrollment applications', (SELECT count(*) FROM enrollment_applications WHERE program_id = ANY(fixture_program_ids) OR curriculum_id IN (SELECT id FROM fixture_curricula)), 0::bigint),
           ('class sections', (SELECT count(*) FROM fixture_sections), 0::bigint),
           ('course offerings', (SELECT count(*) FROM fixture_offerings), 0::bigint),
           ('faculty course assignments', (SELECT count(*) FROM faculty_course_assignments WHERE faculty_id IN (SELECT id FROM fixture_faculty) OR course_offering_id IN (SELECT id FROM fixture_offerings)), 0::bigint),
           ('class schedules', (SELECT count(*) FROM class_schedules WHERE course_offering_id IN (SELECT id FROM fixture_offerings)), 0::bigint),
           ('enrollment items', (SELECT count(*) FROM fixture_items), 0::bigint),
           ('grades', (SELECT count(*) FROM fixture_grades), 0::bigint),
           ('grade history', (SELECT count(*) FROM grade_history WHERE grade_id IN (SELECT id FROM fixture_grades)), 0::bigint),
           ('rooms', (SELECT count(*) FROM rooms WHERE department_id = ANY(fixture_department_ids)), 0::bigint),
           ('clearance requirements', (SELECT count(*) FROM clearance_requirements WHERE department_id = ANY(fixture_department_ids)), 0::bigint)
       )
  SELECT jsonb_object_agg(label, jsonb_build_object('actual', actual_count, 'expected', expected_count))
    INTO mismatch FROM checks WHERE actual_count <> expected_count;
  IF mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'Fixture dependency preflight failed: %', mismatch;
  END IF;

  SELECT count(*) INTO actual FROM curricula
  WHERE program_id = ANY(fixture_program_ids) AND status <> 'DRAFT'::curriculum_status;
  IF actual <> 0 THEN RAISE EXCEPTION 'A fixture Curriculum is not DRAFT'; END IF;

  SELECT count(*) INTO actual FROM faculty f
  JOIN users u ON u.id = f.user_id
  WHERE f.department_id = ANY(fixture_department_ids) AND u.id = ANY(fixture_user_ids);
  IF actual <> 4 THEN RAISE EXCEPTION 'Fixture Faculty-to-User preservation mapping changed'; END IF;

  SELECT count(*) INTO actual FROM user_program_assignments
  WHERE user_id = ANY(fixture_user_ids)
    AND program_id = '8863df7a-34c1-4b34-8346-99a4f09a09db'::uuid;
  IF actual <> 4 THEN RAISE EXCEPTION 'Preserved integration-test User assignments changed'; END IF;

  WITH checks(label, actual_count, expected_count) AS (
    VALUES
      ('BSECE curricula', (SELECT count(*) FROM curricula WHERE program_id = '736c0502-8016-4c26-9d64-1049afab4158'::uuid), 4::bigint),
      ('BSECE subjects', (SELECT count(*) FROM subjects WHERE department_id = 'e9e8b9ee-caa0-413e-86a6-b77c19ef7b67'::uuid), 68::bigint),
      ('BSECE user assignments', (SELECT count(*) FROM user_program_assignments WHERE program_id = '736c0502-8016-4c26-9d64-1049afab4158'::uuid), 3::bigint),
      ('BSCpE students', (SELECT count(*) FROM students WHERE program_id = '9a095737-5105-4f6c-8636-e32dfa1f7650'::uuid), 1::bigint),
      ('BSCpE applications', (SELECT count(*) FROM admission_applications WHERE intended_program_id = '9a095737-5105-4f6c-8636-e32dfa1f7650'::uuid), 1::bigint),
      ('BSCpE enrollment applications', (SELECT count(*) FROM enrollment_applications WHERE program_id = '9a095737-5105-4f6c-8636-e32dfa1f7650'::uuid), 1::bigint),
      ('BSCE students', (SELECT count(*) FROM students WHERE program_id = '8863df7a-34c1-4b34-8346-99a4f09a09db'::uuid), 1::bigint),
      ('BSCE applications', (SELECT count(*) FROM admission_applications WHERE intended_program_id = '8863df7a-34c1-4b34-8346-99a4f09a09db'::uuid), 1::bigint),
      ('BSCE user assignments', (SELECT count(*) FROM user_program_assignments WHERE program_id = '8863df7a-34c1-4b34-8346-99a4f09a09db'::uuid), 4::bigint)
  )
  SELECT jsonb_object_agg(label, jsonb_build_object('actual', actual_count, 'expected', expected_count))
    INTO mismatch FROM checks WHERE actual_count <> expected_count;
  IF mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'Valid academic dependency preflight failed: %', mismatch;
  END IF;
END
$preflight$;

DO $cutover$
DECLARE
  affected bigint;
  fixture_program_ids uuid[] := ARRAY[
    '0a3825d9-3118-48dc-818c-8fdb6404062c'::uuid,
    '0af9fcd4-9ef3-4c8e-b9b1-761183dd1afd'::uuid,
    'afa137b4-a746-414f-93dc-bf4454770996'::uuid,
    '5c416679-fd16-441c-b173-f2ccc570ba6b'::uuid
  ];
  fixture_department_ids uuid[] := ARRAY[
    'a37ca68f-f8d6-4988-8041-a046499f3f47'::uuid,
    '7d254f90-ff68-4ed4-9d07-a57ccdf79bdd'::uuid,
    '024b3567-4201-4779-91d6-6cf262e90577'::uuid,
    '5eb5b940-e030-4b44-a6c1-9d0d7ac1462f'::uuid
  ];
  fixture_college_ids uuid[] := ARRAY[
    'ea284b3b-0af3-4a63-b072-c93e4197b441'::uuid,
    '69b759f3-4d24-417a-ad08-0d395369973d'::uuid,
    '3df70a78-268b-4c68-95a4-1063f7f4b47d'::uuid,
    '2bd69a79-aa6c-493c-a255-24c66699422b'::uuid
  ];
BEGIN
  UPDATE departments
  SET code = 'COE', name = 'College of Engineering', is_active = true, updated_at = CURRENT_TIMESTAMP
  WHERE id = 'e9e8b9ee-caa0-413e-86a6-b77c19ef7b67'::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Canonical Department update affected % rows', affected; END IF;

  UPDATE programs
  SET department_id = 'e9e8b9ee-caa0-413e-86a6-b77c19ef7b67'::uuid,
      name = 'Bachelor of Science in Electronics and Communication Engineering',
      is_active = true, updated_at = CURRENT_TIMESTAMP
  WHERE id = '736c0502-8016-4c26-9d64-1049afab4158'::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'BSECE update affected % rows', affected; END IF;

  UPDATE programs
  SET department_id = 'e9e8b9ee-caa0-413e-86a6-b77c19ef7b67'::uuid,
      code = 'BSCOE',
      name = 'Bachelor of Science in Computer Engineering',
      is_active = true, updated_at = CURRENT_TIMESTAMP
  WHERE id = '9a095737-5105-4f6c-8636-e32dfa1f7650'::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'BSCOE rename affected % rows', affected; END IF;

  UPDATE programs
  SET department_id = 'e9e8b9ee-caa0-413e-86a6-b77c19ef7b67'::uuid,
      is_active = true, updated_at = CURRENT_TIMESTAMP
  WHERE id = '8863df7a-34c1-4b34-8346-99a4f09a09db'::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'BSCE update affected % rows', affected; END IF;

  DELETE FROM departments
  WHERE id IN (
    '0bab1931-2c2e-4343-9b45-a7a24e36509f'::uuid,
    'cab1994e-ccd9-4626-98c1-74f4df90bd2c'::uuid
  );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN RAISE EXCEPTION 'Legacy Department cleanup affected % rows', affected; END IF;

  DELETE FROM curriculum_subjects
  WHERE curriculum_id IN (SELECT id FROM curricula WHERE program_id = ANY(fixture_program_ids));
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN RAISE EXCEPTION 'Fixture CurriculumSubject cleanup affected % rows', affected; END IF;

  DELETE FROM curricula WHERE program_id = ANY(fixture_program_ids);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN RAISE EXCEPTION 'Fixture Curriculum cleanup affected % rows', affected; END IF;

  DELETE FROM subjects WHERE department_id = ANY(fixture_department_ids);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN RAISE EXCEPTION 'Fixture Subject cleanup affected % rows', affected; END IF;

  DELETE FROM program_head_assignments WHERE program_id = ANY(fixture_program_ids);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN RAISE EXCEPTION 'Fixture ProgramHeadAssignment cleanup affected % rows', affected; END IF;

  DELETE FROM faculty WHERE department_id = ANY(fixture_department_ids);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN RAISE EXCEPTION 'Fixture Faculty cleanup affected % rows', affected; END IF;

  DELETE FROM programs WHERE id = ANY(fixture_program_ids);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN RAISE EXCEPTION 'Fixture Program cleanup affected % rows', affected; END IF;

  DELETE FROM departments WHERE id = ANY(fixture_department_ids);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN RAISE EXCEPTION 'Fixture Department cleanup affected % rows', affected; END IF;

  DELETE FROM colleges WHERE id = ANY(fixture_college_ids);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN RAISE EXCEPTION 'Fixture College cleanup affected % rows', affected; END IF;
END
$cutover$;

-- Validate the migrated rows before adding the approved canonical uniqueness
-- constraint. Any failure rolls back every update and delete above.
DO $post_data_validation$
DECLARE
  actual bigint;
BEGIN
  SELECT count(*) INTO actual FROM colleges;
  IF actual <> 1 THEN RAISE EXCEPTION 'Post-cutover College count is %, expected 1', actual; END IF;
  SELECT count(*) INTO actual FROM departments;
  IF actual <> 1 THEN RAISE EXCEPTION 'Post-cutover Department count is %, expected 1', actual; END IF;
  SELECT count(*) INTO actual FROM programs;
  IF actual <> 3 THEN RAISE EXCEPTION 'Post-cutover Program count is %, expected 3', actual; END IF;

  SELECT count(*) INTO actual FROM programs
  WHERE department_id = 'e9e8b9ee-caa0-413e-86a6-b77c19ef7b67'::uuid
    AND code IN ('BSECE', 'BSCOE', 'BSCE') AND is_active = true;
  IF actual <> 3 THEN RAISE EXCEPTION 'Not all canonical Programs reference COE'; END IF;

  SELECT count(*) INTO actual FROM programs
  WHERE id = '9a095737-5105-4f6c-8636-e32dfa1f7650'::uuid
    AND code = 'BSCOE' AND code_normalized = 'bscoe';
  IF actual <> 1 THEN RAISE EXCEPTION 'BSCOE UUID/code normalization validation failed'; END IF;

  SELECT count(*) INTO actual FROM program_head_assignments
  WHERE program_id = '9a095737-5105-4f6c-8636-e32dfa1f7650'::uuid;
  IF actual <> 0 THEN RAISE EXCEPTION 'BSCOE must remain without a Program Head'; END IF;

  SELECT count(*) INTO actual FROM users WHERE id IN (
    '1efe3b43-fcd2-49fb-8b72-87523e8f994f'::uuid,
    '3ae16de1-bb16-48fa-a977-8e4048737af9'::uuid,
    'f405823e-854b-4553-bb5f-8b06e9e97b2f'::uuid,
    '557447ad-15c4-4a25-8beb-60e7d52203c6'::uuid
  );
  IF actual <> 4 THEN RAISE EXCEPTION 'Authentication User preservation validation failed'; END IF;

  SELECT count(*) INTO actual FROM user_program_assignments;
  IF actual <> 7 THEN RAISE EXCEPTION 'UserProgramAssignment preservation failed: found %', actual; END IF;
  SELECT count(*) INTO actual FROM curricula;
  IF actual <> 4 THEN RAISE EXCEPTION 'Valid Curriculum preservation failed: found %', actual; END IF;
  SELECT count(*) INTO actual FROM subjects;
  IF actual <> 68 THEN RAISE EXCEPTION 'Valid Subject preservation failed: found %', actual; END IF;
  SELECT count(*) INTO actual FROM curriculum_subjects;
  IF actual <> 68 THEN RAISE EXCEPTION 'Valid CurriculumSubject preservation failed: found %', actual; END IF;
  SELECT count(*) INTO actual FROM subject_requirements;
  IF actual <> 30 THEN RAISE EXCEPTION 'SubjectRequirement preservation failed: found %', actual; END IF;
  SELECT count(*) INTO actual FROM students;
  IF actual <> 2 THEN RAISE EXCEPTION 'Student preservation failed: found %', actual; END IF;
  SELECT count(*) INTO actual FROM admission_applications;
  IF actual <> 2 THEN RAISE EXCEPTION 'AdmissionApplication preservation failed: found %', actual; END IF;
  SELECT count(*) INTO actual FROM enrollment_applications;
  IF actual <> 1 THEN RAISE EXCEPTION 'EnrollmentApplication preservation failed: found %', actual; END IF;
END
$post_data_validation$;

CREATE UNIQUE INDEX departments_college_id_code_canonical_key
ON departments (college_id, "canonical_school_identifier"(code));

DO $final_constraint_validation$
DECLARE
  valid_index boolean;
BEGIN
  SELECT i.indisvalid AND i.indisready INTO valid_index
  FROM pg_index i
  WHERE i.indexrelid = 'departments_college_id_code_canonical_key'::regclass;
  IF valid_index IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Canonical Department-code unique index is not valid and ready';
  END IF;
END
$final_constraint_validation$;

COMMIT;
