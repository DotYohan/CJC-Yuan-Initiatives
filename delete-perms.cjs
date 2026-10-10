var { PrismaClient } = require('@prisma/client');
var { PrismaPg } = require('@prisma/adapter-pg');

var p = new PrismaClient({ adapter: new PrismaPg({ connectionString: 'postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms' }) });

p.$connect().then(() => {
  return p.permission.deleteMany({});
}).then(() => {
  console.log('Deleted all permissions');
  return p.$disconnect();
}).catch(e => {
  console.error('Error:', e.message);
  return p.$disconnect();
});