const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  user: 'cjc_app',
  password: 'your_secure_password',
  database: 'postgres'
});

pool.query('CREATE DATABASE alpha_cor_jesu_sms', (err) => {
  if (err) {
    console.error('Error creating database:', err);
  } else {
    console.log('Database alpha_cor_jesu_sms created successfully');
  }
  pool.end();
});