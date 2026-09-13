export const ROLE_SEEDS = Object.freeze([
  {
    slug: "student",
    name: "Student",
    description: "Student portal account.",
    landingPath: "/portal/student"
  },
  {
    slug: "faculty",
    name: "Faculty",
    description: "Faculty portal account.",
    landingPath: "/portal/faculty"
  },
  {
    slug: "program_head",
    name: "Program Head",
    description: "Program Head portal account.",
    landingPath: "/portal/program-head"
  },
  { slug: "dean", name: "Dean", description: "Dean portal account.", landingPath: "/portal/dean" },
  {
    slug: "administrator",
    name: "Administrator",
    description: "Portal administration account.",
    landingPath: "/portal/administrator"
  },
  {
    slug: "student_assistant",
    name: "Student Assistant",
    description: "Student Assistant portal account.",
    landingPath: "/portal/student-assistant"
  },
  {
    slug: "registrar",
    name: "Registrar",
    description: "Registrar portal account.",
    landingPath: "/portal/registrar"
  },
  {
    slug: "cashier",
    name: "Cashier",
    description: "Cashier portal account.",
    landingPath: "/portal/cashier"
  },
  { slug: "ssc", name: "SSC", description: "SSC portal account.", landingPath: "/portal/ssc" },
  {
    slug: "lirc_director",
    name: "LiRC Director",
    description: "LiRC Director portal account.",
    landingPath: "/portal/lirc-director"
  },
  {
    slug: "laboratory_in_charge",
    name: "Laboratory In-charge",
    description: "Laboratory In-charge portal account.",
    landingPath: "/portal/laboratory-in-charge"
  },
  {
    slug: "yearbook_coordinator",
    name: "Yearbook Coordinator",
    description: "Yearbook Coordinator portal account.",
    landingPath: "/portal/yearbook-coordinator"
  },
  {
    slug: "proctor",
    name: "Proctor",
    description: "Proctor portal account.",
    landingPath: "/portal/proctor"
  }
]);

export const PERMISSION_SEEDS = Object.freeze([
  ...ROLE_SEEDS.map((role) => ({
    slug: `portal.access.${role.slug}`,
    description: `Access the ${role.name} portal.`
  })),
  {
    slug: "users.manage",
    description: "View and manage portal accounts and role assignments."
  },
  {
    slug: "audit.read",
    description: "Read authentication and account audit events."
  },
  { slug: "VIEW_ENROLLMENT_PERIOD", description: "View enrollment period status." },
  { slug: "CREATE_ENROLLMENT_PERIOD", description: "Create an enrollment period." },
  { slug: "UPDATE_ENROLLMENT_PERIOD", description: "Update an enrollment period." },
  { slug: "MANAGE_ENROLLMENT_PERIODS", description: "Manage academic terms and enrollment periods." },
  { slug: "OPEN_ENROLLMENT", description: "Open an enrollment period." },
  { slug: "CLOSE_ENROLLMENT", description: "Close an enrollment period." },
  { slug: "VIEW_STUDENT_APPLICATION", description: "View student applications." },
  { slug: "APPROVE_STUDENT_APPLICATION", description: "Approve student applications." },
  { slug: "REJECT_STUDENT_APPLICATION", description: "Reject student applications." },
  { slug: "VIEW_DOCUMENTS", description: "View student documents." },
  { slug: "VERIFY_DOCUMENTS", description: "Verify student documents." },
  { slug: "UPLOAD_DOCUMENTS", description: "Upload student documents." },
  { slug: "MANAGE_OWN_DOCUMENTS", description: "Manage own uploaded documents." },
  { slug: "VIEW_ENROLLMENT", description: "View enrollment records." },
  { slug: "APPROVE_ENROLLMENT", description: "Approve enrollment records." },
  { slug: "financial.payment_types.view", description: "View payment types." },
  { slug: "financial.payment_types.manage", description: "Create, update, and deactivate payment types." },
  { slug: "financial.obligations.view", description: "View student obligations." },
  { slug: "financial.obligations.manage", description: "Create, update, and manage student obligations." },
  { slug: "financial.summary.view", description: "View student financial summary." },
  { slug: "financial.payments.initiate", description: "Initiate payment for own obligations." },
  { slug: "financial.payments.process", description: "Process payment through gateway." },
  { slug: "financial.payments.view", description: "View own payment transactions." },
  { slug: "financial.payments.view_all", description: "View all payment transactions (cashier/admin)." },
  { slug: "financial.payments.verify", description: "Verify and approve payments (cashier)." },
  { slug: "financial.payments.view_failed", description: "View failed payment transactions (cashier)." },
  { slug: "financial.receipts.view", description: "View and download receipts." }
]);

export const ROLE_PERMISSION_SEEDS = Object.freeze([
  ...ROLE_SEEDS.map((role) => ({ roleSlug: role.slug, permissionSlug: `portal.access.${role.slug}` })),
  { roleSlug: "administrator", permissionSlug: "users.manage" },
  { roleSlug: "administrator", permissionSlug: "audit.read" },
  ...[
    "VIEW_ENROLLMENT_PERIOD", "CREATE_ENROLLMENT_PERIOD", "UPDATE_ENROLLMENT_PERIOD",
    "MANAGE_ENROLLMENT_PERIODS", "OPEN_ENROLLMENT", "CLOSE_ENROLLMENT",
    "VIEW_STUDENT_APPLICATION", "APPROVE_STUDENT_APPLICATION", "REJECT_STUDENT_APPLICATION",
    "VIEW_DOCUMENTS", "VERIFY_DOCUMENTS", "VIEW_ENROLLMENT", "APPROVE_ENROLLMENT"
  ].map((permissionSlug) => ({ roleSlug: "registrar", permissionSlug })),
  ...[
    "MANAGE_ENROLLMENT_PERIODS"
  ].map((permissionSlug) => ({ roleSlug: "administrator", permissionSlug })),
  ...[
    "UPLOAD_DOCUMENTS", "MANAGE_OWN_DOCUMENTS"
  ].map((permissionSlug) => ({ roleSlug: "student", permissionSlug })),
  ...[
    "financial.payment_types.view",
    "financial.payment_types.manage",
    "financial.obligations.view",
    "financial.obligations.manage",
    "financial.summary.view",
    "financial.payments.initiate",
    "financial.payments.process",
    "financial.payments.view",
    "financial.payments.view_all",
    "financial.payments.verify",
    "financial.payments.view_failed",
    "financial.receipts.view"
  ].map((permissionSlug) => ({ roleSlug: "administrator", permissionSlug })),
  ...[
    "financial.payment_types.view",
    "financial.obligations.view",
    "financial.obligations.manage",
    "financial.summary.view",
    "financial.payments.view_all",
    "financial.payments.verify",
    "financial.payments.view_failed",
    "financial.receipts.view"
  ].map((permissionSlug) => ({ roleSlug: "cashier", permissionSlug })),
  ...[
    "financial.obligations.view",
    "financial.summary.view",
    "financial.payments.initiate",
    "financial.payments.process",
    "financial.payments.view",
    "financial.receipts.view"
  ].map((permissionSlug) => ({ roleSlug: "student", permissionSlug })),
  ...[
    "financial.payment_types.view",
    "financial.obligations.view",
    "financial.summary.view",
    "financial.payments.view",
    "financial.receipts.view"
  ].map((permissionSlug) => ({ roleSlug: "registrar", permissionSlug }))
]);
