import fs from "fs";

let content = fs.readFileSync("prisma/schema.prisma", "utf8");

// 1. User relations
const userAnchor = "  systemLogs                     SystemLog[]                         @relation(\"SystemLogUser\")";
const userAddition = `  systemLogs                     SystemLog[]                         @relation("SystemLogUser")
  clubsCreated                   Club[]                              @relation("ClubCreatedBy")
  clubAccount                    Club?                               @relation("ClubAccountUser")
  clubOfficersAssigned           ClubOfficer[]                       @relation("ClubOfficerAssignedBy")
  clubAnnouncementsPosted        ClubAnnouncement[]                  @relation("ClubAnnouncementPostedBy")
  clubDocumentsUploaded          ClubDocument[]                      @relation("ClubDocumentUploadedBy")
  clubClearancesActed            ClubClearance[]                     @relation("ClubClearanceActedBy")
  clubClearanceAudits            ClubClearanceAudit[]                @relation("ClubClearanceAuditedBy")`;

if (!content.includes("clubsCreated")) {
  content = content.replace(userAnchor, userAddition);
}

// 2. College relations
const collegeAnchor = "  departments Department[]";
const collegeAddition = `  departments Department[]
  clubs       Club[]`;

if (!content.includes("clubs       Club[]")) {
  content = content.replace(collegeAnchor, collegeAddition);
}

// 3. Department relations
const departmentAnchor = "  clearanceRequirements ClearanceRequirement[]";
const departmentAddition = `  clearanceRequirements ClearanceRequirement[]
  clubs                 Club[]`;

if (!content.includes("clubs                 Club[]")) {
  content = content.replace(departmentAnchor, departmentAddition);
}

// 4. Student relations
const studentAnchor = "  requests               StudentRequest[]";
const studentAddition = `  requests               StudentRequest[]
  clubMemberships        ClubMember[]
  clubOfficerRoles       ClubOfficer[]
  clubClearances         ClubClearance[]
  clubClearanceAudits    ClubClearanceAudit[]`;

if (!content.includes("clubMemberships")) {
  content = content.replace(studentAnchor, studentAddition);
}

// 5. Append Enums and Models
const clubSchemaAdditions = `

enum ClubCategory {
  ACADEMIC
  NON_ACADEMIC

  @@map("club_category")
}

enum ClubStatus {
  ACTIVE
  INACTIVE
  EXPIRED

  @@map("club_status")
}

enum ClubDocumentCategory {
  RESOLUTION
  MEMORANDUM
  CONSTITUTION_BYLAWS
  FINANCIAL_REPORT
  ACTIVITY_PROPOSAL
  OTHER

  @@map("club_document_category")
}

enum ClubClearanceStatus {
  PENDING
  CLEARED
  NOT_CLEARED

  @@map("club_clearance_status")
}

model Club {
  id                   String        @id @default(uuid()) @db.Uuid
  code                 String        @unique @db.VarChar(50)
  name                 String        @unique @db.VarChar(150)
  description          String?       @db.Text
  category             ClubCategory  @default(ACADEMIC)
  adviser              String        @db.VarChar(150)
  collegeId            String?       @map("college_id") @db.Uuid
  departmentId         String?       @map("department_id") @db.Uuid
  userId               String?       @unique @map("user_id") @db.Uuid
  effectivityStartDate DateTime      @map("effectivity_start_date") @db.Timestamptz(3)
  effectivityEndDate   DateTime      @map("effectivity_end_date") @db.Timestamptz(3)
  status               ClubStatus    @default(ACTIVE)
  createdByUserId      String?       @map("created_by_user_id") @db.Uuid
  createdAt            DateTime      @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt            DateTime      @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)

  college         College?             @relation(fields: [collegeId], references: [id], onDelete: SetNull)
  department      Department?          @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  user            User?                @relation("ClubAccountUser", fields: [userId], references: [id], onDelete: SetNull)
  createdBy       User?                @relation("ClubCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  members         ClubMember[]
  officers        ClubOfficer[]
  announcements   ClubAnnouncement[]
  documents       ClubDocument[]
  clearances      ClubClearance[]
  clearanceAudits ClubClearanceAudit[]

  @@index([status, effectivityStartDate, effectivityEndDate])
  @@index([collegeId])
  @@index([departmentId])
  @@map("clubs")
}

model ClubMember {
  id        String   @id @default(uuid()) @db.Uuid
  clubId    String   @map("club_id") @db.Uuid
  studentId String   @map("student_id") @db.Uuid
  status    String   @default("ACTIVE") @db.VarChar(20)
  joinedAt  DateTime @default(now()) @map("joined_at") @db.Timestamptz(3)

  club    Club    @relation(fields: [clubId], references: [id], onDelete: Cascade)
  student Student @relation(fields: [studentId], references: [id], onDelete: Restrict)

  @@unique([clubId, studentId])
  @@index([studentId, status])
  @@map("club_members")
}

model ClubOfficer {
  id                String   @id @default(uuid()) @db.Uuid
  clubId            String   @map("club_id") @db.Uuid
  studentId         String   @map("student_id") @db.Uuid
  position          String   @db.VarChar(100)
  canClearClearance Boolean  @default(false) @map("can_clear_clearance")
  assignedByUserId  String?  @map("assigned_by_user_id") @db.Uuid
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt         DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)

  club       Club    @relation(fields: [clubId], references: [id], onDelete: Cascade)
  student    Student @relation(fields: [studentId], references: [id], onDelete: Restrict)
  assignedBy User?   @relation("ClubOfficerAssignedBy", fields: [assignedByUserId], references: [id], onDelete: SetNull)

  @@unique([clubId, studentId])
  @@index([studentId])
  @@map("club_officers")
}

model ClubAnnouncement {
  id             String   @id @default(uuid()) @db.Uuid
  clubId         String   @map("club_id") @db.Uuid
  title          String   @db.VarChar(200)
  content        String   @db.Text
  postedByUserId String?  @map("posted_by_user_id") @db.Uuid
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt      DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)

  club     Club  @relation(fields: [clubId], references: [id], onDelete: Cascade)
  postedBy User? @relation("ClubAnnouncementPostedBy", fields: [postedByUserId], references: [id], onDelete: SetNull)

  @@index([clubId, createdAt])
  @@map("club_announcements")
}

model ClubDocument {
  id               String               @id @default(uuid()) @db.Uuid
  clubId           String               @map("club_id") @db.Uuid
  title            String               @db.VarChar(200)
  category         ClubDocumentCategory @default(OTHER)
  description      String?              @db.Text
  fileUrl          String?              @map("file_url") @db.VarChar(500)
  fileName         String?              @map("file_name") @db.VarChar(255)
  uploadedByUserId String?              @map("uploaded_by_user_id") @db.Uuid
  createdAt        DateTime             @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt        DateTime             @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)

  club       Club  @relation(fields: [clubId], references: [id], onDelete: Cascade)
  uploadedBy User? @relation("ClubDocumentUploadedBy", fields: [uploadedByUserId], references: [id], onDelete: SetNull)

  @@index([clubId, category])
  @@map("club_documents")
}

model ClubClearance {
  id              String              @id @default(uuid()) @db.Uuid
  clubId          String              @map("club_id") @db.Uuid
  studentId       String              @map("student_id") @db.Uuid
  status          ClubClearanceStatus @default(PENDING)
  remarks         String?             @db.Text
  clearedByUserId String?             @map("cleared_by_user_id") @db.Uuid
  clearedAt       DateTime?           @map("cleared_at") @db.Timestamptz(3)
  createdAt       DateTime            @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt       DateTime            @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)

  club      Club    @relation(fields: [clubId], references: [id], onDelete: Cascade)
  student   Student @relation(fields: [studentId], references: [id], onDelete: Restrict)
  clearedBy User?   @relation("ClubClearanceActedBy", fields: [clearedByUserId], references: [id], onDelete: SetNull)

  @@unique([clubId, studentId])
  @@index([studentId, status])
  @@map("club_clearances")
}

model ClubClearanceAudit {
  id                String              @id @default(uuid()) @db.Uuid
  clubId            String              @map("club_id") @db.Uuid
  studentId         String              @map("student_id") @db.Uuid
  action            ClubClearanceStatus
  remarks           String?             @db.Text
  performedByUserId String?             @map("performed_by_user_id") @db.Uuid
  createdAt         DateTime            @default(now()) @map("created_at") @db.Timestamptz(3)

  club        Club    @relation(fields: [clubId], references: [id], onDelete: Cascade)
  student     Student @relation(fields: [studentId], references: [id], onDelete: Restrict)
  performedBy User?   @relation("ClubClearanceAuditedBy", fields: [performedByUserId], references: [id], onDelete: SetNull)

  @@index([clubId, studentId, createdAt])
  @@map("club_clearance_audits")
}
`;

if (!content.includes("model Club {")) {
  content += clubSchemaAdditions;
}

fs.writeFileSync("prisma/schema.prisma", content, "utf8");
console.log("Schema updated successfully.");
