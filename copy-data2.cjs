var { Pool } = require("pg");

var pool = new Pool({
  host: "127.0.0.1",
  user: "cjc_app",
  password: "your_secure_password",
  database: "alpha_cor_jesu_sms"
});

var tables = [
  "Session",
  "LoginAttempt",
  "PasswordResetToken",
  "AuditLog",
  "UserRole",
  "Student",
  "Faculty",
  "StudentDocument",
  "DocumentVerificationHistory",
  "AdmissionApplication",
  "EnrollmentStatusHistory",
  "GradeHistory",
  "ClearanceItem",
  "Assessment",
  "Invoice",
  "PaymentHistory",
  "FinancialEntry",
  "PaymentLogEvent",
  "CurriculumSubject",
  "SubjectRequirement",
  "EnrollmentApplication",
  "EnrollmentPeriod",
  "GradingPeriod",
  "ClearanceCycle",
  "StudentStatusHistory",
  "SystemLog",
  "UserCollegeAssignment",
  "UserDepartmentAssignment",
  "UserProgramAssignment",
  "ClubClearance",
  "ClubClearanceAudit",
  "ClubAnnouncement",
  "ClubOfficer",
  "ClubDocument"
];

var truncateSQL = "TRUNCATE " + tables.join(", ") + " CASCADE";

pool.query(truncateSQL, function(err, res) {
  if (err) {
    console.error("Error truncating:", err);
  } else {
    console.log("Tables truncated successfully, rows: " + res.rowCount);
  }
  
  // Now copy master data
  
  // 1. Copy DocumentTypes
  pool.query("INSERT INTO \"DocumentType\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"DocumentType\"", function(err, res) {
    if (err) console.error("Error copying DocumentTypes:", err);
    else console.log("DocumentTypes copied: " + res.rowCount);
    
    // 2. Copy RequestTypes
    pool.query("INSERT INTO \"RequestType\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"RequestType\"", function(err, res) {
      if (err) console.error("Error copying RequestTypes:", err);
      else console.log("RequestTypes copied: " + res.rowCount);
      
      // 3. Copy Roles (system roles only)
      pool.query("INSERT INTO \"Role\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"Role\" WHERE \"isSystem\" = true", function(err, res) {
        if (err) console.error("Error copying Roles:", err);
        else console.log("Roles copied: " + res.rowCount);
        
        // 4. Copy Permissions (system permissions)
        pool.query("INSERT INTO \"Permission\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"Permission\" WHERE \"isSystem\" = true", function(err, res) {
          if (err) console.error("Error copying Permissions:", err);
          else console.log("Permissions copied: " + res.rowCount);
          
          // 5. Copy College (COE)
          pool.query("INSERT INTO \"College\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"College\" WHERE \"code\" = 'COE'", function(err, res) {
            if (err) console.error("Error copying College:", err);
            else console.log("College copied: " + res.rowCount);
            
            // 6. Copy COE Department
            pool.query("INSERT INTO \"Department\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"Department\" WHERE \"code\" = 'COE'", function(err, res) {
              if (err) console.error("Error copying Department:", err);
              else console.log("Department copied: " + res.rowCount);
              
              // 7. Copy 3 real programs
              pool.query("INSERT INTO \"Program\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"Program\" WHERE \"code\" IN ('BSCE', 'BSCOE', 'BSECE')", function(err, res) {
                if (err) console.error("Error copying Programs:", err);
                else console.log("Programs copied: " + res.rowCount);
                
                // 8. Copy Curricula under the 3 real programs
                pool.query("INSERT INTO \"Curriculum\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"Curriculum\" WHERE \"programId\" IN (SELECT \"id\" FROM \"cor_jesu_sms\".\"public\".\"Program\" WHERE \"code\" IN ('BSCE', 'BSCOE', 'BSECE'))", function(err, res) {
                  if (err) console.error("Error copying Curricula:", err);
                  else console.log("Curricula copied: " + res.rowCount);
                  
                  // 9. Copy Subjects under COE department
                  pool.query("INSERT INTO \"Subject\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"Subject\" WHERE \"departmentId\" = (SELECT \"id\" FROM \"cor_jesu_sms\".\"public\".\"Department\" WHERE \"code\" = 'COE')", function(err, res) {
                    if (err) console.error("Error copying Subjects:", err);
                    else console.log("Subjects copied: " + res.rowCount);
                    
                    // 10. Copy AcademicYear AY-2026-2027
                    pool.query("INSERT INTO \"AcademicYear\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"AcademicYear\" WHERE \"code\" = 'AY-2026-2027'", function(err, res) {
                      if (err) console.error("Error copying AcademicYear:", err);
                      else console.log("AcademicYear copied: " + res.rowCount);
                      
                      // 11. Copy AcademicTerms
                      pool.query("INSERT INTO \"AcademicTerm\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"AcademicTerm\" WHERE \"academicYearId\" = (SELECT \"id\" FROM \"cor_jesu_sms\".\"public\".\"AcademicYear\" WHERE \"code\" = 'AY-2026-2027')", function(err, res) {
                        if (err) console.error("Error copying AcademicTerms:", err);
                        else console.log("AcademicTerms copied: " + res.rowCount);
                        
                        // 12. Copy Naldrelle + administrator role
                        pool.query("INSERT INTO \"UserRole\" SELECT * FROM \"cor_jesu_sms\".\"public\".\"UserRole\" WHERE \"userId\" = '2c51f900-0973-4176-b7fa-712dc297587c'", function(err, res) {
                          if (err) console.error("Error copying UserRole:", err);
                          else console.log("UserRole copied: " + res.rowCount);
                          
                          console.log("\\n=== MASTER DATA COPY COMPLETE ===");
                          pool.end();
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});