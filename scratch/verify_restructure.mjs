import fs from "fs";

const html = fs.readFileSync("portal.html", "utf8");

// Check critical data-* bindings still present
const bindings = [
    "data-student-name",
    "data-student-number",
    "data-student-status",
    "data-student-program",
    "data-student-curriculum",
    "data-student-year",
    "data-student-email",
    "data-current-term",
    "data-enrollment-status",
    "data-registered-load",
    "data-registered-units",
    "data-clearance-status",
    "data-clearance-progress",
    "data-account-balance",
    "data-application-status",
    "data-application-feedback",
    "data-enrollment-form-status",
    "data-enrollment-form-summary",
    "data-open-enrollment-application",
    "data-application-feedback-list",
    "data-clearance-form-status",
    "data-clearance-form-list",
    "data-schedule-count",
    "data-schedule-list",
    "data-grade-count",
    "data-grade-list",
    "data-payment-obligation-count",
    "data-payment-obligation-list",
    "data-financial-status",
    "data-payment-list",
    "data-payment-count",
    "data-request-count",
    "data-request-list",
    "data-open-new-request",
    "data-student-my-clubs-body",
    "data-student-active-clubs-count",
    "data-refresh-student-clubs",
    // Admin
    "data-refresh-users",
    "data-users-body",
    "data-user-count",
    "data-refresh-system-logs",
    "data-system-logs-body",
    "data-monitoring-health-status",
    "data-monitoring-database",
    // Registrar
    "data-refresh-registrar",
    "data-registrar-period-status",
    "data-registrar-term-select",
    "data-open-registrar-enrollment",
    "data-close-registrar-enrollment",
    "data-registrar-application-list",
    // Program Head
    "data-refresh-program-head",
    "data-program-head-applications",
    "data-program-head-curriculum-view",
    "data-program-head-curriculum-structure",
    "data-program-head-students",
    "data-program-head-offerings",
    "data-program-head-evaluations",
];

let allOk = true;
for (const b of bindings) {
    if (!html.includes(b)) {
        console.error(`MISSING: ${b}`);
        allOk = false;
    }
}
if (allOk) console.log("✅ All critical data-* bindings present");

// Check nav/view symmetry
const navAttrs = ["data-student-nav", "data-admin-nav", "data-registrar-nav", "data-ph-nav", "data-club-nav"];
for (const nav of navAttrs) {
    const view = nav.replace("-nav", "-view");
    const navVals = [...html.matchAll(new RegExp(`${nav}="([^"]+)"`, "g"))].map(m => m[1]);
    const viewVals = [...html.matchAll(new RegExp(`${view}="([^"]+)"`, "g"))].map(m => m[1]);
    const navSet = new Set(navVals);
    const viewSet = new Set(viewVals);
    const navOnly = [...navSet].filter(v => !viewSet.has(v));
    const viewOnly = [...viewSet].filter(v => !navSet.has(v));
    if (navOnly.length || viewOnly.length) {
        console.error(`MISMATCH ${nav}: nav-only=${navOnly}, view-only=${viewOnly}`);
    } else {
        console.log(`✓ ${nav} <-> ${view} symmetric: [${[...navSet].join(", ")}]`);
    }
}

// Check CRLF
console.log("✓ CRLF endings:", html.includes("\r\n"));
console.log("  File size:", fs.statSync("portal.html").size, "bytes");
