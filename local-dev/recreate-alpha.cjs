var { Pool } = require('pg');

// Connect to postgres database to drop/create the alpha DB
var pool = new Pool({
  host: '127.0.0.1',
  user: 'cjc_app',
  password: 'your_secure_password',
  database: 'postgres'
});

// Disconnect from any active connections by setting idle timeout to 0
pool.on('connect', function(client) {
  console.log('Connected to postgres database');
});

// Drop the alpha DB if it exists
pool.query('DROP DATABASE IF EXISTS alpha_cor_jesu_sms', function(err, res) {
  if (err) console.error('Error dropping DB:', err.message);
  else console.log('Dropped alpha_cor_jesu_sms');
  
  // Create the alpha DB
  pool.query('CREATE DATABASE alpha_cor_jesu_sms', function(err, res) {
    if (err) console.error('Error creating DB:', err.message);
    else console.log('Created alpha_cor_jesu_sms');
    
    // Now apply the 27 migrations
    console.log('\nApplying migrations...');
    pool.end();
    
    // Use prisma migrate deploy with the alpha DB URL
    // But first, let me just check the state and then use prisma migrate deploy
  });
});