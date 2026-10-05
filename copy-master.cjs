var { Pool } = require('pg');

// Source DB (current) and Target DB (alpha)
var srcPool = new Pool({
  host: '127.0.0.1',
  user: 'cjc_app',
  password: 'your_secure_password',
  database: 'cor_jesu_sms'
});

var alphaPool = new Pool({
  host: '127.0.0.1',
  user: 'cjc_app',
  password: 'your_secure_password',
  database: 'alpha_cor_jesu_sms'
});

console.log('Connecting to both databases...');

srcPool.connect(function(err, srcClient, done) {
  if (err) { console.error('Src connect error:', err); alphaPool.end(); return; }
  
  alphaPool.connect(function(err, alphaClient, done) {
    if (err) { console.error('Alpha connect error:', err); srcClient.release(); srcPool.end(); return; }
    
    console.log('Both databases connected. Starting master data copy...\n');
    
    // Collect all the data to copy
    var copies = [];
    
    // 1. DocumentTypes
    srcClient.query('SELECT * FROM "document_types"', function(err, result) {
      if (err) { console.error('DocTypes error:', err); finish(); return; }
      copies.docTypes = result.rows;
      // Now copy to alpha
      alphaClient.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."document_types" SELECT * FROM "cor_jesu_sms"."public"."document_types"`, function(err, r) {
        if (err) console.error('DocTypes copy error:', err.message);
        else console.log('DocumentTypes copied: ' + r.rowCount);
        copy2b();
      });
    });
  });
});

function copy2b() {
  // 2. RequestTypes
  srcPool.query('SELECT * FROM "request_types"', function(err, result) {
    if (err) { console.error('ReqTypes error:', err); finish(); return; }
    copies.reqTypes = result.rows;
    alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."request_types" SELECT * FROM "cor_jesu_sms"."public"."request_types"`, function(err, r) {
      if (err) console.error('ReqTypes copy error:', err.message);
      else console.log('RequestTypes copied: ' + r.rowCount);
      copy2c();
    });
  });
}

function copy2c() {
  // 3. Roles (system roles only)
  srcPool.query('SELECT * FROM "roles" WHERE "is_system" = true', function(err, result) {
    if (err) { console.error('Roles error:', err); finish(); return; }
    copies.roles = result.rows;
    alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."roles" SELECT * FROM "cor_jesu_sms"."public"."roles" WHERE "is_system" = true`, function(err, r) {
      if (err) console.error('Roles copy error:', err.message);
      else console.log('Roles copied: ' + r.rowCount);
      copy2d();
    });
  });
}

function copy2d() {
  // 4. Permissions (system permissions)
  srcPool.query('SELECT * FROM "permissions" WHERE "is_system" = true', function(err, result) {
    if (err) { console.error('Perms error:', err); finish(); return; }
    copies.perms = result.rows;
    alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."permissions" SELECT * FROM "cor_jesu_sms"."public"."permissions" WHERE "is_system" = true`, function(err, r) {
      if (err) console.error('Perms copy error:', err.message);
      else console.log('Permissions copied: ' + r.rowCount);
      copy2e();
    });
  });
}

function copy2e() {
  // 5. College (COE)
  srcPool.query(`SELECT * FROM "colleges" WHERE "code" = 'COE'`, function(err, result) {
    if (err) { console.error('College error:', err); finish(); return; }
    copies.college = result.rows;
    alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."colleges" SELECT * FROM "cor_jesu_sms"."public"."colleges" WHERE "code" = 'COE'`, function(err, r) {
      if (err) console.error('College copy error:', err.message);
      else console.log('College copied: ' + r.rowCount);
      copy2f();
    });
  });
}

function copy2f() {
  // 6. Department (COE)
  srcPool.query(`SELECT * FROM "departments" WHERE "code" = 'COE'`, function(err, result) {
    if (err) { console.error('Dept error:', err); finish(); return; }
    copies.dept = result.rows;
    alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."departments" SELECT * FROM "cor_jesu_sms"."public"."departments" WHERE "code" = 'COE'`, function(err, r) {
      if (err) console.error('Dept copy error:', err.message);
      else console.log('Department copied: ' + r.rowCount);
      copy2g();
    });
  });
}

function copy2g() {
  // 7. Programs (BSCE, BSCOE, BSECE)
  srcPool.query(`SELECT * FROM "programs" WHERE "code" IN ('BSCE', 'BSCOE', 'BSECE')`, function(err, result) {
    if (err) { console.error('Progs error:', err); finish(); return; }
    copies.progs = result.rows;
    alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."programs" SELECT * FROM "cor_jesu_sms"."public"."programs" WHERE "code" IN ('BSCE', 'BSCOE', 'BSECE')`, function(err, r) {
      if (err) console.error('Progs copy error:', err.message);
      else console.log('Programs copied: ' + r.rowCount);
      copy2h();
    });
  });
}

function copy2h() {
  // 8. Curricula under the 3 real programs (using program_id)
  srcPool.query(`SELECT * FROM "curricula" WHERE "program_id" IN (SELECT "id" FROM "cor_jesu_sms"."public"."programs" WHERE "code" IN ('BSCE', 'BSCOE', 'BSECE'))`, function(err, result) {
    if (err) { console.error('Curricula error:', err); finish(); return; }
    copies.curricula = result.rows;
    alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."curricula" SELECT * FROM "cor_jesu_sms"."public"."curricula" WHERE "program_id" IN (SELECT "id" FROM "cor_jesu_sms"."public"."programs" WHERE "code" IN ('BSCE', 'BSCOE', 'BSECE'))`, function(err, r) {
      if (err) console.error('Curricula copy error:', err.message);
      else console.log('Curricula copied: ' + r.rowCount);
      copy2i();
    });
  });
}

function copy2i() {
  // 9. Subjects under COE department
  srcPool.query(`SELECT * FROM "subjects" WHERE "departmentId" = (SELECT "id" FROM "cor_jesu_sms"."public"."departments" WHERE "code" = 'COE')`, function(err, result) {
    if (err) { console.error('Subjects error:', err); finish(); return; }
    copies.subjects = result.rows;
    alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."subjects" SELECT * FROM "cor_jesu_sms"."public"."subjects" WHERE "departmentId" = (SELECT "id" FROM "cor_jesu_sms"."public"."departments" WHERE "code" = 'COE')`, function(err, r) {
      if (err) console.error('Subjects copy error:', err.message);
      else console.log('Subjects copied: ' + r.rowCount);
      copy2j();
    });
  });
}

function copy2j() {
  // 10. AcademicYear AY-2026-2027
  srcPool.query(`SELECT * FROM "academic_years" WHERE "code" = 'AY-2026-2027'`, function(err, result) {
    if (err) { console.error('AY error:', err); finish(); return; }
    copies.ay = result.rows;
    alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."academic_years" SELECT * FROM "cor_jesu_sms"."public"."academic_years" WHERE "code" = 'AY-2026-2027'`, function(err, r) {
      if (err) console.error('AY copy error:', err.message);
      else console.log('AcademicYear copied: ' + r.rowCount);
      copy2k();
    });
  });
}

function copy2k() {
  // 11. AcademicTerms
  srcPool.query(`SELECT * FROM "academic_terms" WHERE "academicYearId" = (SELECT "id" FROM "cor_jesu_sms"."public"."academic_years" WHERE "code" = 'AY-2026-2027')`, function(err, result) {
    if (err) { console.error('Terms error:', err); finish(); return; }
    copies.terms = result.rows;
    alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."academic_terms" SELECT * FROM "cor_jesu_sms"."public"."academic_terms" WHERE "academicYearId" = (SELECT "id" FROM "cor_jesu_sms"."public"."academic_years" WHERE "code" = 'AY-2026-2027')`, function(err, r) {
      if (err) console.error('Terms copy error:', err.message);
      else console.log('AcademicTerms copied: ' + r.rowCount);
      copy2l();
    });
  });
}

function copy2l() {
  // 12. Naldrelle + administrator role
  srcPool.query(`SELECT * FROM "users" WHERE "id" = '2c51f900-0973-4176-b7fa-712dc297587c'`, function(err, result) {
    if (err) { console.error('Naldrelle error:', err); finish(); return; }
    copies.naldrelle = result.rows[0];
    
    if (copies.naldrelle) {
      // Insert Naldrelle into alpha DB
      alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."users" SELECT * FROM "cor_jesu_sms"."public"."users" WHERE "id" = '2c51f900-0973-4176-b7fa-712dc297587c'`, function(err, r) {
        if (err) console.error('Naldrelle user copy error:', err.message);
        else console.log('Naldrelle user copied: ' + r.rowCount);
        
        // Get administrator role from alpha DB
        alphaPool.query(`SELECT * FROM "roles" WHERE "slug" = 'administrator'`, function(err, result) {
          if (err) { console.error('Admin role error:', err); finish(); return; }
          var adminRole = result.rows[0];
          
          if (adminRole) {
            // Assign administrator role to Naldrelle
            alphaPool.query(`INSERT INTO "alpha_cor_jesu_sms"."public"."user_roles" ("userId", "roleId", "isPrimary", "assignedAt") VALUES ('2c51f900-0973-4176-b7fa-712dc297587c', '${adminRole.id}', true, now())`, function(err, r) {
              if (err) console.error('UserRole copy error:', err.message);
              else console.log('Naldrelle administrator role assigned: ' + r.rowCount);
              console.log('\n=== MASTER DATA COPY COMPLETE ===');
              console.log('Current DB (cor_jesu_sms) remains unchanged as backup');
              srcPool.end();
              alphaPool.end();
            });
          } else {
            console.log('Administrator role not found in alpha DB');
            srcPool.end();
            alphaPool.end();
          }
        });
      });
    } else {
      console.log('Naldrelle not found in source DB');
      srcPool.end();
      alphaPool.end();
    }
  });
}

function finish() {
  console.log('Copy process completed');
  srcPool.end();
  alphaPool.end();
}