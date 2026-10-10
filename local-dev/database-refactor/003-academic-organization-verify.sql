\set ON_ERROR_STOP on

-- READ-ONLY post-cutover verification.
BEGIN TRANSACTION READ ONLY;

SELECT current_user, current_database(), inet_server_addr()::text, inet_server_port();

SELECT id, code, code_normalized, name, short_name, is_active
FROM colleges ORDER BY code_normalized;

SELECT id, college_id, code, name, is_active
FROM departments ORDER BY code;

SELECT id, department_id, code, code_normalized, name, credential,
       duration_years, terms_per_year, is_active
FROM programs ORDER BY code_normalized;

SELECT p.code,
       (SELECT count(*) FROM students x WHERE x.program_id = p.id)::bigint AS students,
       (SELECT count(*) FROM admission_applications x WHERE x.intended_program_id = p.id)::bigint AS admission_applications,
       (SELECT count(*) FROM curricula x WHERE x.program_id = p.id)::bigint AS curricula,
       (SELECT count(*) FROM program_head_assignments x WHERE x.program_id = p.id)::bigint AS program_head_assignments,
       (SELECT count(*) FROM user_program_assignments x WHERE x.program_id = p.id)::bigint AS user_program_assignments,
       (SELECT count(*) FROM enrollments x WHERE x.program_id = p.id)::bigint AS enrollments,
       (SELECT count(*) FROM enrollment_applications x WHERE x.program_id = p.id)::bigint AS enrollment_applications,
       (SELECT count(*) FROM class_sections x WHERE x.program_id = p.id)::bigint AS class_sections
FROM programs p ORDER BY p.code_normalized;

SELECT * FROM (
  VALUES
    ('colleges', (SELECT count(*) FROM colleges)),
    ('departments', (SELECT count(*) FROM departments)),
    ('programs', (SELECT count(*) FROM programs)),
    ('students', (SELECT count(*) FROM students)),
    ('admission_applications', (SELECT count(*) FROM admission_applications)),
    ('enrollment_applications', (SELECT count(*) FROM enrollment_applications)),
    ('curricula', (SELECT count(*) FROM curricula)),
    ('subjects', (SELECT count(*) FROM subjects)),
    ('curriculum_subjects', (SELECT count(*) FROM curriculum_subjects)),
    ('subject_requirements', (SELECT count(*) FROM subject_requirements)),
    ('user_program_assignments', (SELECT count(*) FROM user_program_assignments))
) AS preserved_counts(table_name, row_count)
ORDER BY table_name;

-- All must be zero.
SELECT * FROM (
  VALUES
    ('departments_without_college', (SELECT count(*) FROM departments d LEFT JOIN colleges c ON c.id=d.college_id WHERE c.id IS NULL)),
    ('programs_without_department', (SELECT count(*) FROM programs p LEFT JOIN departments d ON d.id=p.department_id WHERE d.id IS NULL)),
    ('students_without_program', (SELECT count(*) FROM students s LEFT JOIN programs p ON p.id=s.program_id WHERE s.program_id IS NOT NULL AND p.id IS NULL)),
    ('curricula_without_program', (SELECT count(*) FROM curricula c LEFT JOIN programs p ON p.id=c.program_id WHERE p.id IS NULL)),
    ('program_heads_without_program', (SELECT count(*) FROM program_head_assignments h LEFT JOIN programs p ON p.id=h.program_id WHERE p.id IS NULL)),
    ('user_assignments_without_program', (SELECT count(*) FROM user_program_assignments a LEFT JOIN programs p ON p.id=a.program_id WHERE p.id IS NULL)),
    ('subjects_without_department', (SELECT count(*) FROM subjects s LEFT JOIN departments d ON d.id=s.department_id WHERE d.id IS NULL))
) AS orphan_checks(check_name, orphan_count)
ORDER BY check_name;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'departments_college_id_code_canonical_key';

-- All fixture IDs must be absent.
SELECT 'fixture_colleges' AS entity, count(*)::bigint AS remaining
FROM colleges WHERE id IN (
  'ea284b3b-0af3-4a63-b072-c93e4197b441'::uuid,
  '69b759f3-4d24-417a-ad08-0d395369973d'::uuid,
  '3df70a78-268b-4c68-95a4-1063f7f4b47d'::uuid,
  '2bd69a79-aa6c-493c-a255-24c66699422b'::uuid
)
UNION ALL
SELECT 'fixture_departments', count(*)::bigint FROM departments WHERE id IN (
  'a37ca68f-f8d6-4988-8041-a046499f3f47'::uuid,
  '7d254f90-ff68-4ed4-9d07-a57ccdf79bdd'::uuid,
  '024b3567-4201-4779-91d6-6cf262e90577'::uuid,
  '5eb5b940-e030-4b44-a6c1-9d0d7ac1462f'::uuid
)
UNION ALL
SELECT 'fixture_programs', count(*)::bigint FROM programs WHERE id IN (
  '0a3825d9-3118-48dc-818c-8fdb6404062c'::uuid,
  '0af9fcd4-9ef3-4c8e-b9b1-761183dd1afd'::uuid,
  'afa137b4-a746-414f-93dc-bf4454770996'::uuid,
  '5c416679-fd16-441c-b173-f2ccc570ba6b'::uuid
);

-- Authentication and direct assignment records must remain.
SELECT u.id, u.username, u.status,
       upa.program_id, p.code AS assigned_program,
       (SELECT count(*) FROM user_roles ur WHERE ur.user_id=u.id)::bigint AS role_count,
       (SELECT count(*) FROM login_attempts la WHERE la.user_id=u.id)::bigint AS login_attempt_count,
       (SELECT count(*) FROM audit_logs a WHERE a.actor_user_id=u.id OR a.target_user_id=u.id)::bigint AS audit_event_count
FROM users u
LEFT JOIN user_program_assignments upa ON upa.user_id=u.id
LEFT JOIN programs p ON p.id=upa.program_id
WHERE u.id IN (
  '1efe3b43-fcd2-49fb-8b72-87523e8f994f'::uuid,
  '3ae16de1-bb16-48fa-a977-8e4048737af9'::uuid,
  'f405823e-854b-4553-bb5f-8b06e9e97b2f'::uuid,
  '557447ad-15c4-4a25-8beb-60e7d52203c6'::uuid
)
ORDER BY u.username;

ROLLBACK;
