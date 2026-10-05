var { PrismaClient } = require('@prisma/client');
var { PrismaPg } = require('@prisma/adapter-pg');

var alphaPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: 'postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms' }) });

alphaPrisma.$connect().then(() => {
  // Try deleteMany without where clause
  return alphaPrisma.documentType.deleteMany({});
}).then(() => {
  console.log('Deleted all document types');
  return alphaPrisma.$disconnect();
}).catch(e => {
  console.error('Error:', e.message);
  return alphaPrisma.$disconnect();
});