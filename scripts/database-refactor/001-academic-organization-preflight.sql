\set ON_ERROR_STOP on

-- READ-ONLY. Run immediately before the reviewed cutover and compare the
-- result with docs/database-refactor-progress.md. This file performs no writes.
BEGIN TRANSACTION READ ONLY;

SELECT
  current_user AS current_user,
  current_database() AS current_database,
  inet_server_addr()::text AS server_address,
  inet_server_port() AS server_port;

-- Complete Program UUID decision map. Fixture Programs are semantically mapped
-- to BSECE for reporting, but their proven test-only children are purged rather
-- than copied into the canonical curriculum catalog.
WITH program_map(old_program_id, old_code, canonical_program_id, canonical_code, action) AS (
  VALUES
    ('736c0502-8016-4c26-9d64-1049afab4158'::uuid, 'BSECE',        '736c0502-8016-4c26-9d64-1049afab4158'::uuid, 'BSECE', 'KEEP UUID; rename Program title and move to canonical Department'),
    ('9a095737-5105-4f6c-8636-e32dfa1f7650'::uuid, 'BSCpE',        '9a095737-5105-4f6c-8636-e32dfa1f7650'::uuid, 'BSCOE', 'KEEP UUID; rename code and move to canonical Department'),
    ('8863df7a-34c1-4b34-8346-99a4f09a09db'::uuid, 'BSCE',         '8863df7a-34c1-4b34-8346-99a4f09a09db'::uuid, 'BSCE',  'KEEP UUID; move to canonical Department'),
    ('0a3825d9-3118-48dc-818c-8fdb6404062c'::uuid, 'BSECE1a82da3c','736c0502-8016-4c26-9d64-1049afab4158'::uuid, 'BSECE', 'CONFIRMED TEST FIXTURE; purge fixture-only dependency graph'),
    ('0af9fcd4-9ef3-4c8e-b9b1-761183dd1afd'::uuid, 'BSECE5a8535de','736c0502-8016-4c26-9d64-1049afab4158'::uuid, 'BSECE', 'CONFIRMED TEST FIXTURE; purge fixture-only dependency graph'),
    ('afa137b4-a746-414f-93dc-bf4454770996'::uuid, 'BSECE94c89afc','736c0502-8016-4c26-9d64-1049afab4158'::uuid, 'BSECE', 'CONFIRMED TEST FIXTURE; purge fixture-only dependency graph'),
    ('5c416679-fd16-441c-b173-f2ccc570ba6b'::uuid, 'BSECEebd6617d','736c0502-8016-4c26-9d64-1049afab4158'::uuid, 'BSECE', 'CONFIRMED TEST FIXTURE; purge fixture-only dependency graph')
)
SELECT * FROM program_map ORDER BY old_code;

SELECT c.id, c.code, c.code_normalized, c.name, c.is_active,
       count(d.id)::bigint AS department_count
FROM colleges c
LEFT JOIN departments d ON d.college_id = c.id
GROUP BY c.id
ORDER BY c.code_normalized;

SELECT d.id, d.college_id, d.code, d.name, d.is_active,
       count(DISTINCT p.id)::bigint AS program_count,
       count(DISTINCT f.id)::bigint AS faculty_count,
       count(DISTINCT s.id)::bigint AS subject_count
FROM departments d
LEFT JOIN programs p ON p.department_id = d.id
LEFT JOIN faculty f ON f.department_id = d.id
LEFT JOIN subjects s ON s.department_id = d.id
GROUP BY d.id
ORDER BY d.code;

SELECT p.id, p.department_id, p.code, p.code_normalized, p.name, p.is_active,
       (SELECT count(*) FROM students x WHERE x.program_id = p.id)::bigint AS students,
       (SELECT count(*) FROM admission_applications x WHERE x.intended_program_id = p.id)::bigint AS admission_applications,
       (SELECT count(*) FROM curricula x WHERE x.program_id = p.id)::bigint AS curricula,
       (SELECT count(*) FROM program_head_assignments x WHERE x.program_id = p.id)::bigint AS program_head_assignments,
       (SELECT count(*) FROM user_program_assignments x WHERE x.program_id = p.id)::bigint AS user_program_assignments,
       (SELECT count(*) FROM enrollments x WHERE x.program_id = p.id)::bigint AS enrollments,
       (SELECT count(*) FROM enrollment_applications x WHERE x.program_id = p.id)::bigint AS enrollment_applications,
       (SELECT count(*) FROM class_sections x WHERE x.program_id = p.id)::bigint AS class_sections
FROM programs p
ORDER BY p.code_normalized;

WITH fixture_programs AS (
  SELECT unnest(ARRAY[
    '0a3825d9-3118-48dc-818c-8fdb6404062c',
    '0af9fcd4-9ef3-4c8e-b9b1-761183dd1afd',
    'afa137b4-a746-414f-93dc-bf4454770996',
    '5c416679-fd16-441c-b173-f2ccc570ba6b'
  ]::uuid[]) AS id
), fixture_departments AS (
  SELECT unnest(ARRAY[
    'a37ca68f-f8d6-4988-8041-a046499f3f47',
    '7d254f90-ff68-4ed4-9d07-a57ccdf79bdd',
    '024b3567-4201-4779-91d6-6cf262e90577',
    '5eb5b940-e030-4b44-a6c1-9d0d7ac1462f'
  ]::uuid[]) AS id
), fixture_colleges AS (
  SELECT unnest(ARRAY[
    'ea284b3b-0af3-4a63-b072-c93e4197b441',
    '69b759f3-4d24-417a-ad08-0d395369973d',
    '3df70a78-268b-4c68-95a4-1063f7f4b47d',
    '2bd69a79-aa6c-493c-a255-24c66699422b'
  ]::uuid[]) AS id
), fixture_curricula AS (
  SELECT id FROM curricula WHERE program_id IN (SELECT id FROM fixture_programs)
), fixture_subjects AS (
  SELECT id FROM subjects WHERE department_id IN (SELECT id FROM fixture_departments)
), fixture_faculty AS (
  SELECT id FROM faculty WHERE department_id IN (SELECT id FROM fixture_departments)
), fixture_sections AS (
  SELECT id FROM class_sections WHERE program_id IN (SELECT id FROM fixture_programs)
), fixture_offerings AS (
  SELECT co.id FROM course_offerings co
  WHERE co.subject_id IN (SELECT id FROM fixture_subjects)
     OR co.class_section_id IN (SELECT id FROM fixture_sections)
), fixture_enrollments AS (
  SELECT id FROM enrollments WHERE program_id IN (SELECT id FROM fixture_programs)
), fixture_items AS (
  SELECT ei.id FROM enrollment_items ei
  WHERE ei.enrollment_id IN (SELECT id FROM fixture_enrollments)
     OR ei.course_offering_id IN (SELECT id FROM fixture_offerings)
), fixture_grades AS (
  SELECT id FROM grades WHERE enrollment_item_id IN (SELECT id FROM fixture_items)
)
SELECT * FROM (
  VALUES
    ('colleges', (SELECT count(*) FROM colleges WHERE id IN (SELECT id FROM fixture_colleges))),
    ('departments', (SELECT count(*) FROM departments WHERE id IN (SELECT id FROM fixture_departments))),
    ('programs', (SELECT count(*) FROM programs WHERE id IN (SELECT id FROM fixture_programs))),
    ('program_history', (SELECT count(*) FROM program_history WHERE program_id IN (SELECT id FROM fixture_programs) OR department_id IN (SELECT id FROM fixture_departments))),
    ('program_head_assignments', (SELECT count(*) FROM program_head_assignments WHERE program_id IN (SELECT id FROM fixture_programs))),
    ('user_program_assignments', (SELECT count(*) FROM user_program_assignments WHERE program_id IN (SELECT id FROM fixture_programs))),
    ('students', (SELECT count(*) FROM students WHERE program_id IN (SELECT id FROM fixture_programs))),
    ('admission_applications', (SELECT count(*) FROM admission_applications WHERE intended_program_id IN (SELECT id FROM fixture_programs))),
    ('student_program_history', (SELECT count(*) FROM student_program_history WHERE program_id IN (SELECT id FROM fixture_programs))),
    ('curricula', (SELECT count(*) FROM fixture_curricula)),
    ('curriculum_subjects', (SELECT count(*) FROM curriculum_subjects WHERE curriculum_id IN (SELECT id FROM fixture_curricula))),
    ('student_curriculum_assignments', (SELECT count(*) FROM student_curriculum_assignments WHERE curriculum_id IN (SELECT id FROM fixture_curricula))),
    ('faculty', (SELECT count(*) FROM fixture_faculty)),
    ('faculty_department_assignments', (SELECT count(*) FROM faculty_department_assignments WHERE department_id IN (SELECT id FROM fixture_departments) OR faculty_id IN (SELECT id FROM fixture_faculty))),
    ('faculty_specializations', (SELECT count(*) FROM faculty_specializations WHERE faculty_id IN (SELECT id FROM fixture_faculty))),
    ('faculty_employment', (SELECT count(*) FROM faculty_employment WHERE faculty_id IN (SELECT id FROM fixture_faculty))),
    ('subjects', (SELECT count(*) FROM fixture_subjects)),
    ('subject_requirements', (SELECT count(*) FROM subject_requirements WHERE subject_id IN (SELECT id FROM fixture_subjects) OR required_subject_id IN (SELECT id FROM fixture_subjects))),
    ('enrollments', (SELECT count(*) FROM fixture_enrollments)),
    ('enrollment_applications', (SELECT count(*) FROM enrollment_applications WHERE program_id IN (SELECT id FROM fixture_programs) OR curriculum_id IN (SELECT id FROM fixture_curricula))),
    ('class_sections', (SELECT count(*) FROM fixture_sections)),
    ('course_offerings', (SELECT count(*) FROM fixture_offerings)),
    ('faculty_course_assignments', (SELECT count(*) FROM faculty_course_assignments WHERE faculty_id IN (SELECT id FROM fixture_faculty) OR course_offering_id IN (SELECT id FROM fixture_offerings))),
    ('class_schedules', (SELECT count(*) FROM class_schedules WHERE course_offering_id IN (SELECT id FROM fixture_offerings))),
    ('enrollment_items', (SELECT count(*) FROM fixture_items)),
    ('grades', (SELECT count(*) FROM fixture_grades)),
    ('grade_history', (SELECT count(*) FROM grade_history WHERE grade_id IN (SELECT id FROM fixture_grades))),
    ('rooms', (SELECT count(*) FROM rooms WHERE department_id IN (SELECT id FROM fixture_departments))),
    ('clearance_requirements', (SELECT count(*) FROM clearance_requirements WHERE department_id IN (SELECT id FROM fixture_departments)))
) AS dependency_counts(table_name, row_count)
ORDER BY table_name;

-- Must return no rows before the canonical Department constraint is added.
SELECT college_id, "canonical_school_identifier"(code) AS canonical_code, count(*)::bigint AS duplicate_count
FROM departments
GROUP BY college_id, "canonical_school_identifier"(code)
HAVING count(*) > 1;

ROLLBACK;
