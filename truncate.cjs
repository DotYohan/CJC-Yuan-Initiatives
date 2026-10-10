var { Pool } = require('pg');
var p = new Pool({
  host: '127.0.0.1',
  user: 'cjc_app',
  password: 'your_secure_password',
  database: 'alpha_cor_jesu_sms'
});
p.query('TRUNCATE \"document_types\",\"request_types\",\"roles\",\"permissions\",\"colleges\",\"departments\",\"programs\",\"curricula\",\"subjects\",\"academic_years\",\"academic_terms\",\"users\",\"user_roles\",\"subject_requirements\",\"curriculum_subjects\" CASCADE', function(e, r) {
  if (e) console.error('Error truncating:', e.message);
  else console.log('Truncated, rows:', r.rowCount);
  p.end();
});