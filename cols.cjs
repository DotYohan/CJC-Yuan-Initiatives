var { Pool } = require('pg');
var p = new Pool({
  host: '127.0.0.1',
  user: 'cjc_app',
  password: 'your_secure_password',
  database: 'alpha_cor_jesu_sms'
});

// Check key tables' column names
var tables = ['document_types', 'request_types', 'roles', 'permissions', 'colleges', 'departments', 'programs', 'curricula', 'subjects', 'academic_years', 'academic_terms', 'users', 'user_roles', 'subject_requirements', 'curriculum_subjects'];

tables.forEach(function(t) {
  p.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}' ORDER BY ordinal_position`, function(e, r) {
    console.log(t + ':', r.rows.map(function(x) { return x.column_name; }).join(', '));
  });
});