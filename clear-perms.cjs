var { Pool } = require('pg');
var p = new Pool({
  host: '127.0.0.1',
  user: 'cjc_app',
  password: 'your_secure_password',
  database: 'alpha_cor_jesu_sms'
});
p.query('DELETE FROM "permissions"', function(e, r) {
  console.log('Deleted permissions: ' + (r ? r.rowCount : 0) + ' rows');
  p.end();
});