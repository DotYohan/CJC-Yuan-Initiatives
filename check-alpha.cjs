var { Pool } = require('pg');
var p = new Pool({
  host: '127.0.0.1',
  user: 'cjc_app',
  password: 'your_secure_password',
  database: 'alpha_cor_jesu_sms'
});
p.query("SELECT t.table_name, COALESCE(c.cnt, 0) as cnt FROM information_schema.tables t LEFT JOIN (SELECT table_name, count(*) as cnt FROM information_schema.columns GROUP BY table_name) c ON t.table_name = c.table_name WHERE t.table_schema = 'public'", function(e, r) {
  if (e) { console.error(e.message); p.end(); return; }
  console.log('Tables with row counts:');
  r.rows.forEach(function(row) {
    console.log('  ' + row.table_name + ': ' + row.cnt + ' rows');
  });
  p.end();
});