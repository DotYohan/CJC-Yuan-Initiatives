/**
 * Restructures portal.html navigation tabs.
 * The file uses CRLF line endings throughout.
 */
import fs from "fs";

let raw = fs.readFileSync("portal.html", "utf8");
// Normalise to LF for processing, then convert back to CRLF at the end
let html = raw.replace(/\r\n/g, "\n");

// ─────────────────────────────────────────────────────────────────────────────
// SVG Icons
// ─────────────────────────────────────────────────────────────────────────────
const I = {
    person:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    doc:      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    cal:      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    star:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    check:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    card:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    users:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    clip:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
    user:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    monitor:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    review:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    curric:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
};

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 1: Student dashboard header
// ─────────────────────────────────────────────────────────────────────────────
let before, after;

before = `                    <header class="student-dashboard__heading">
                        <div>
                            <p class="eyebrow">Student services</p>
                            <h2 id="student-dashboard-title">Student dashboard</h2>
                            <p>Your academic and service information from the centralized portal database.</p>
                        </div>
                        <button class="button button--quiet" type="button" data-refresh-student>Refresh dashboard</button>
                    </header>`;

after = `                    <header class="student-dashboard__heading">
                        <div>
                            <p class="eyebrow">Student Services</p>
                            <h2 id="student-dashboard-title">Student Academic Portal</h2>
                            <p>Access your student profile, enrollment applications, class schedule, clearance, and financial records.</p>
                        </div>
                        <button class="button button--quiet" type="button" data-refresh-student>Refresh dashboard</button>
                    </header>`;

if (!html.includes(before)) { console.error("FAIL: Student header not found"); process.exit(1); }
html = html.replace(before, after);
console.log("✓ Student header updated");

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 2: Replace student nav + entire overview view with 7-tab structure
// ─────────────────────────────────────────────────────────────────────────────
before = `                        <!-- Student Workspace Sub-Navigation Tabs -->
                        <nav class="workspace-tabs" role="tablist" aria-label="Student Navigation">
                            <button class="workspace-tab active" type="button" role="tab" aria-selected="true" data-student-nav="overview">Dashboard Overview</button>
                            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-student-nav="clubs">Campus Organizations &amp; Clubs</button>
                        </nav>

                        <!-- Student Tab 1: Dashboard Overview -->
                        <div data-student-view="overview">
                            <section class="panel student-identity" aria-labelledby="student-profile-title">
                                <div class="panel__heading">
                                    <div>
                                        <p class="eyebrow">Student profile</p>
                                        <h3 id="student-profile-title" data-student-name>Student</h3>
                                        <p class="student-identity__number" data-student-number>Student number</p>
                                    </div>
                                    <div class="flex-center">
                                        <span class="status-pill" data-student-status>Active</span>
                                        <button class="button button--quiet button--compact" type="button" data-open-edit-profile>Edit contact info</button>
                                    </div>
                                </div>
                                <dl class="student-profile-grid">
                                    <div><dt>Program</dt><dd data-student-program>&mdash;</dd></div>
                                    <div><dt>Curriculum</dt><dd data-student-curriculum>&mdash;</dd></div>
                                    <div><dt>Year level</dt><dd data-student-year>&mdash;</dd></div>
                                    <div><dt>Institutional email</dt><dd data-student-email>&mdash;</dd></div>
                                </dl>
                            </section>

                            <div class="dashboard-metrics" aria-label="Student dashboard summary">
                                <article class="metric-card"><span>Current term</span><strong data-current-term>No enrollment</strong><small data-enrollment-status>Not enrolled</small></article>
                                <article class="metric-card"><span>Registered load</span><strong data-registered-load>0 subjects</strong><small data-registered-units>0 units</small></article>
                                <article class="metric-card"><span>Clearance</span><strong data-clearance-status>No cycle</strong><small data-clearance-progress>No requirements</small></article>
                                <article class="metric-card"><span>Account balance</span><strong data-account-balance>PHP 0.00</strong><small>Derived from the transaction ledger</small></article>
                                <article class="metric-card"><span>Application status</span><strong data-application-status></strong><small data-application-feedback></small></article>
                            </div>

                            <div class="student-forms-grid">
                                <section class="panel dashboard-module" aria-labelledby="enrollment-form-title">
                                    <div class="dashboard-module__heading">
                                        <div><p class="eyebrow">Enrollment</p><h3 id="enrollment-form-title">Enrollment form</h3></div>
                                        <span data-enrollment-form-status>Draft</span>
                                    </div>
                                    <p class="form-intro">Review your current enrollment record and registered subjects. Subject selection and submission will be enabled when offerings are published.</p>
                                    <div class="enrollment-form-summary" data-enrollment-form-summary></div>
                                    <button class="button button--primary" type="button" data-open-enrollment-application>Complete enrollment form</button>
                                    <div data-application-feedback-list></div>
                                </section>

                                <section class="panel dashboard-module" aria-labelledby="clearance-form-title">
                                    <div class="dashboard-module__heading">
                                        <div><p class="eyebrow">Clearance</p><h3 id="clearance-form-title">Clearance form</h3></div>
                                        <span data-clearance-form-status>Not started</span>
                                    </div>
                                    <p class="form-intro">Track each office requirement and see the latest processing remark.</p>
                                    <div class="clearance-form-list" data-clearance-form-list></div>
                                </section>
                            </div>

                            <div class="student-dashboard-grid">
                                <section class="panel dashboard-module" aria-labelledby="schedule-title">
                                    <div class="dashboard-module__heading"><div><p class="eyebrow">Classes</p><h3 id="schedule-title">Weekly schedule</h3></div><span data-schedule-count></span></div>
                                    <div class="dashboard-list" data-schedule-list></div>
                                </section>

                                <section class="panel dashboard-module" aria-labelledby="grades-title">
                                    <div class="dashboard-module__heading"><div><p class="eyebrow">Academic record</p><h3 id="grades-title">Posted final grades</h3></div><span data-grade-count></span></div>
                                    <div class="dashboard-list" data-grade-list></div>
                                </section>

                                <section class="panel dashboard-module" aria-labelledby="requests-title">
                                    <div class="dashboard-module__heading">
                                        <div><p class="eyebrow">Transactions</p><h3 id="requests-title">Recent requests</h3></div>
                                        <div class="flex-center">
                                            <button class="button button--primary button--compact" type="button" data-open-new-request>+ Submit request</button>
                                            <span data-request-count></span>
                                        </div>
                                    </div>
                                    <div class="dashboard-list" data-request-list></div>
                                </section>

                                <section class="panel dashboard-module" aria-labelledby="payments-title">
                                    <div class="dashboard-module__heading"><div><p class="eyebrow">Finance</p><h3 id="payments-title">Payment obligations</h3></div><span data-payment-obligation-count></span></div>
                                    <p class="form-intro">Payments are processed and verified securely by the server. Enrollment unlocks after the entrance fee is verified.</p>
                                    <div class="dashboard-list" data-payment-obligation-list></div>
                                    <p class="form-status" role="status" aria-live="polite" data-financial-status></p>
                                    <h4 class="dashboard-module__subheading">Recent verified payments</h4>
                                    <div class="dashboard-list" data-payment-list></div>
                                    <span data-payment-count hidden></span>
                                </section>
                            </div>
                        </div>

                        <!-- Student Tab 2: Campus Organizations & Clubs -->`;

after = `                        <!-- Student Workspace Sub-Navigation Tabs -->
                        <nav class="workspace-tabs" role="tablist" aria-label="Student Navigation">
                            <button class="workspace-tab active" type="button" role="tab" aria-selected="true" data-student-nav="overview">
                                ${I.person}
                                Overview &amp; Profile
                            </button>
                            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-student-nav="enrollment">
                                ${I.doc}
                                Enrollment
                            </button>
                            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-student-nav="schedule">
                                ${I.cal}
                                Class Schedule
                            </button>
                            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-student-nav="grades">
                                ${I.star}
                                Grades &amp; Records
                            </button>
                            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-student-nav="clearance">
                                ${I.check}
                                Clearance
                            </button>
                            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-student-nav="finance">
                                ${I.card}
                                Finance &amp; Requests
                            </button>
                            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-student-nav="clubs">
                                ${I.users}
                                Campus Clubs
                            </button>
                        </nav>

                        <!-- Student Tab: Overview & Profile -->
                        <div data-student-view="overview">
                            <section class="panel student-identity" aria-labelledby="student-profile-title">
                                <div class="panel__heading">
                                    <div>
                                        <p class="eyebrow">Student profile</p>
                                        <h3 id="student-profile-title" data-student-name>Student</h3>
                                        <p class="student-identity__number" data-student-number>Student number</p>
                                    </div>
                                    <div class="flex-center">
                                        <span class="status-pill" data-student-status>Active</span>
                                        <button class="button button--quiet button--compact" type="button" data-open-edit-profile>Edit contact info</button>
                                    </div>
                                </div>
                                <dl class="student-profile-grid">
                                    <div><dt>Program</dt><dd data-student-program>&mdash;</dd></div>
                                    <div><dt>Curriculum</dt><dd data-student-curriculum>&mdash;</dd></div>
                                    <div><dt>Year level</dt><dd data-student-year>&mdash;</dd></div>
                                    <div><dt>Institutional email</dt><dd data-student-email>&mdash;</dd></div>
                                </dl>
                            </section>

                            <div class="dashboard-metrics" aria-label="Student dashboard summary">
                                <article class="metric-card"><span>Current term</span><strong data-current-term>No enrollment</strong><small data-enrollment-status>Not enrolled</small></article>
                                <article class="metric-card"><span>Registered load</span><strong data-registered-load>0 subjects</strong><small data-registered-units>0 units</small></article>
                                <article class="metric-card"><span>Clearance</span><strong data-clearance-status>No cycle</strong><small data-clearance-progress>No requirements</small></article>
                                <article class="metric-card"><span>Account balance</span><strong data-account-balance>PHP 0.00</strong><small>Derived from the transaction ledger</small></article>
                                <article class="metric-card"><span>Application status</span><strong data-application-status></strong><small data-application-feedback></small></article>
                            </div>
                        </div>

                        <!-- Student Tab: Enrollment -->
                        <div data-student-view="enrollment" hidden>
                            <section class="panel dashboard-module" aria-labelledby="enrollment-form-title">
                                <div class="dashboard-module__heading">
                                    <div><p class="eyebrow">Enrollment</p><h3 id="enrollment-form-title">Enrollment form</h3></div>
                                    <span data-enrollment-form-status>Draft</span>
                                </div>
                                <p class="form-intro">Review your current enrollment record and registered subjects. Subject selection and submission will be enabled when offerings are published.</p>
                                <div class="enrollment-form-summary" data-enrollment-form-summary></div>
                                <button class="button button--primary" type="button" data-open-enrollment-application>Complete enrollment form</button>
                                <div data-application-feedback-list></div>
                            </section>
                        </div>

                        <!-- Student Tab: Class Schedule -->
                        <div data-student-view="schedule" hidden>
                            <section class="panel dashboard-module" aria-labelledby="schedule-title">
                                <div class="dashboard-module__heading"><div><p class="eyebrow">Classes</p><h3 id="schedule-title">Weekly schedule</h3></div><span data-schedule-count></span></div>
                                <div class="dashboard-list" data-schedule-list></div>
                            </section>
                        </div>

                        <!-- Student Tab: Grades & Records -->
                        <div data-student-view="grades" hidden>
                            <section class="panel dashboard-module" aria-labelledby="grades-title">
                                <div class="dashboard-module__heading"><div><p class="eyebrow">Academic record</p><h3 id="grades-title">Posted final grades</h3></div><span data-grade-count></span></div>
                                <div class="dashboard-list" data-grade-list></div>
                            </section>
                        </div>

                        <!-- Student Tab: Clearance -->
                        <div data-student-view="clearance" hidden>
                            <section class="panel dashboard-module" aria-labelledby="clearance-form-title">
                                <div class="dashboard-module__heading">
                                    <div><p class="eyebrow">Clearance</p><h3 id="clearance-form-title">Clearance form</h3></div>
                                    <span data-clearance-form-status>Not started</span>
                                </div>
                                <p class="form-intro">Track each office requirement and see the latest processing remark.</p>
                                <div class="clearance-form-list" data-clearance-form-list></div>
                            </section>
                        </div>

                        <!-- Student Tab: Finance & Requests -->
                        <div data-student-view="finance" hidden>
                            <section class="panel dashboard-module" aria-labelledby="payments-title">
                                <div class="dashboard-module__heading"><div><p class="eyebrow">Finance</p><h3 id="payments-title">Payment obligations</h3></div><span data-payment-obligation-count></span></div>
                                <p class="form-intro">Payments are processed and verified securely by the server. Enrollment unlocks after the entrance fee is verified.</p>
                                <div class="dashboard-list" data-payment-obligation-list></div>
                                <p class="form-status" role="status" aria-live="polite" data-financial-status></p>
                                <h4 class="dashboard-module__subheading">Recent verified payments</h4>
                                <div class="dashboard-list" data-payment-list></div>
                                <span data-payment-count hidden></span>
                            </section>
                            <section class="panel dashboard-module" aria-labelledby="requests-title" style="margin-top: 1.25rem;">
                                <div class="dashboard-module__heading">
                                    <div><p class="eyebrow">Transactions</p><h3 id="requests-title">Recent requests</h3></div>
                                    <div class="flex-center">
                                        <button class="button button--primary button--compact" type="button" data-open-new-request>+ Submit request</button>
                                        <span data-request-count></span>
                                    </div>
                                </div>
                                <div class="dashboard-list" data-request-list></div>
                            </section>
                        </div>

                        <!-- Student Tab: Campus Clubs -->`;

if (!html.includes(before)) { console.error("FAIL: Student nav/overview block not found"); process.exit(1); }
html = html.replace(before, after);
console.log("✓ Student 7-tab structure complete");

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 3: Program Head — add tabs after metrics section
// ─────────────────────────────────────────────────────────────────────────────
before = `                <p class="form-status" role="status" aria-live="polite" data-program-head-status></p>

                <section class="panel" aria-labelledby="program-head-applications-title">
                    <div class="panel__heading"><div><p class="eyebrow">Student submissions</p><h3 id="program-head-applications-title">Pending Enrollment Reviews</h3></div></div>
                    <p class="field-hint">Evaluate selected subjects before forwarding the application to Registrar verification.</p>
                    <div class="dashboard-list program-head-scroll-list" data-program-head-applications></div>
                </section>`;

after = `                <p class="form-status" role="status" aria-live="polite" data-program-head-status></p>

                <!-- Program Head Workspace Tabs -->
                <nav class="workspace-tabs" role="tablist" aria-label="Program Head Navigation">
                    <button class="workspace-tab active" type="button" role="tab" aria-selected="true" data-ph-nav="reviews">
                        ${I.review}
                        Enrollment Reviews
                    </button>
                    <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-ph-nav="curriculum">
                        ${I.curric}
                        Curriculum &amp; Offerings
                    </button>
                </nav>

                <!-- Program Head Tab: Enrollment Reviews -->
                <div data-ph-view="reviews">
                    <section class="panel" aria-labelledby="program-head-applications-title">
                        <div class="panel__heading"><div><p class="eyebrow">Student submissions</p><h3 id="program-head-applications-title">Pending Enrollment Reviews</h3></div></div>
                        <p class="field-hint">Evaluate selected subjects before forwarding the application to Registrar verification.</p>
                        <div class="dashboard-list program-head-scroll-list" data-program-head-applications></div>
                    </section>`;

if (!html.includes(before)) { console.error("FAIL: Program Head status/applications block not found"); process.exit(1); }
html = html.replace(before, after);
console.log("✓ Program Head reviews tab added");

// Close reviews tab + open curriculum tab before the dialog
before = `                <dialog class="portal-dialog program-head-dialog" data-program-head-application-dialog>`;
after = `                </div><!-- /data-ph-view="reviews" -->

                <!-- Program Head Tab: Curriculum & Offerings -->
                <div data-ph-view="curriculum" hidden>
                <dialog class="portal-dialog program-head-dialog" data-program-head-application-dialog>`;

if (!html.includes(before)) { console.error("FAIL: Program Head application dialog not found"); process.exit(1); }
html = html.replace(before, after);
console.log("✓ Program Head curriculum tab opened");

// Close curriculum tab + close panel before registrar section
before = `                </dialog>
            </section>

            <section class="shell registrar-panel"`;
after = `                </dialog>
                </div><!-- /data-ph-view="curriculum" -->
            </section>

            <section class="shell registrar-panel"`;
if (!html.includes(before)) { console.error("FAIL: Program head end/registrar start not found"); process.exit(1); }
html = html.replace(before, after);
console.log("✓ Program Head curriculum tab closed");

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 4: Registrar — add tabs
// ─────────────────────────────────────────────────────────────────────────────
before = `            <section class="shell registrar-panel" aria-labelledby="registrar-title" data-registrar-panel hidden>
                <div class="admin-panel__heading">
                    <div><p class="eyebrow">Registrar tools</p><h2 id="registrar-title">Enrollment lifecycle</h2><p>Control enrollment periods and monitor student applications.</p></div>
                    <button class="button button--quiet" type="button" data-refresh-registrar>Refresh dashboard</button>
                </div>
                <div class="registrar-grid">`;

after = `            <section class="shell registrar-panel" aria-labelledby="registrar-title" data-registrar-panel hidden>
                <div class="admin-panel__heading">
                    <div><p class="eyebrow">Registrar tools</p><h2 id="registrar-title">Enrollment lifecycle</h2><p>Control enrollment periods and monitor student applications.</p></div>
                    <button class="button button--quiet" type="button" data-refresh-registrar>Refresh dashboard</button>
                </div>

                <!-- Registrar Workspace Tabs -->
                <nav class="workspace-tabs" role="tablist" aria-label="Registrar Navigation">
                    <button class="workspace-tab active" type="button" role="tab" aria-selected="true" data-registrar-nav="applications">
                        ${I.clip}
                        Applications &amp; Enrollment
                    </button>
                    <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-registrar-nav="terms">
                        ${I.cal}
                        Terms &amp; Academic Years
                    </button>
                </nav>

                <!-- Registrar Tab: Applications & Enrollment Control -->
                <div data-registrar-view="applications">
                <div class="registrar-grid">`;

if (!html.includes(before)) { console.error("FAIL: Registrar panel header+grid not found"); process.exit(1); }
html = html.replace(before, after);
console.log("✓ Registrar applications tab added");

// Close registrar grid/applications tab + open terms tab
// The registrar panel currently has the term creators hidden inside the period-control section
// In the terms tab, we'll extract them. For now: close applications tab, add terms tab.
// Find: end of registrar-grid div, which is </div>\n            </section>\n\n            <section class="shell admin-panel"
before = `                </div>
            </section>

            <section class="shell admin-panel" aria-labelledby="admin-title" data-admin-panel hidden>`;
after = `                </div><!-- /registrar-grid -->
                </div><!-- /data-registrar-view="applications" -->

                <!-- Registrar Tab: Terms & Academic Years -->
                <div data-registrar-view="terms" hidden>
                    <section class="panel" aria-labelledby="registrar-terms-manage-title">
                        <div class="panel__heading"><div><p class="eyebrow">Academic calendar</p><h3 id="registrar-terms-manage-title">Manage Academic Years &amp; Terms</h3></div></div>
                        <p class="field-hint">Create academic year entries and semesters that enrollment periods are linked to. Once a term is created, use <strong>Enrollment Control</strong> in the Applications tab to open or close enrollment.</p>
                        <div class="registrar-grid" style="margin-top: 1rem;">
                            <section class="panel" aria-labelledby="registrar-year-create-info-title">
                                <div class="panel__heading"><div><p class="eyebrow">Step 1</p><h3 id="registrar-year-create-info-title">Create academic year</h3></div></div>
                                <form class="admin-form registrar-year-form" data-create-registrar-year-b novalidate>
                                    <div class="registrar-term-fields">
                                        <div class="field"><label for="reg-year-code-b">Academic year code</label><input id="reg-year-code-b" name="code" maxlength="32" placeholder="2026-2027" required></div>
                                        <div class="field"><label for="reg-year-name-b">Academic year name</label><input id="reg-year-name-b" name="name" maxlength="100" placeholder="School Year 2026-2027" required></div>
                                        <div class="field"><label for="reg-year-start-b">Starts on</label><input id="reg-year-start-b" name="startsOn" type="date" required></div>
                                        <div class="field"><label for="reg-year-end-b">Ends on</label><input id="reg-year-end-b" name="endsOn" type="date" required></div>
                                    </div>
                                    <p class="field-hint" style="color: var(--muted); font-size: 0.8rem;">Note: Use the period control in the Applications tab for existing terms.</p>
                                    <button class="button button--quiet" type="submit">Create academic year</button>
                                </form>
                            </section>
                            <section class="panel" aria-labelledby="registrar-term-create-info-title">
                                <div class="panel__heading"><div><p class="eyebrow">Step 2</p><h3 id="registrar-term-create-info-title">Create semester or term</h3></div></div>
                                <form class="admin-form registrar-term-form" data-create-registrar-term-b novalidate>
                                    <div class="field"><label for="reg-academic-year-b">Academic year</label><select id="reg-academic-year-b" name="academicYearId" required><option value="">Select an academic year</option></select></div>
                                    <div class="registrar-term-fields">
                                        <div class="field"><label for="reg-term-code-b">Term code</label><input id="reg-term-code-b" name="code" maxlength="32" placeholder="2026-SUMMER" required></div>
                                        <div class="field"><label for="reg-term-name-b">Term name</label><input id="reg-term-name-b" name="name" maxlength="100" placeholder="Summer" required></div>
                                        <div class="field"><label for="reg-term-number-b">Sequence</label><input id="reg-term-number-b" name="termNumber" type="number" min="1" max="32767" required></div>
                                        <div class="field"><label for="reg-term-start-b">Term starts</label><input id="reg-term-start-b" name="startsOn" type="date" required></div>
                                        <div class="field"><label for="reg-term-end-b">Term ends</label><input id="reg-term-end-b" name="endsOn" type="date" required></div>
                                        <div class="field"><label for="reg-enrollment-start-b">Enrollment opens</label><input id="reg-enrollment-start-b" name="enrollmentStarts" type="datetime-local" required></div>
                                        <div class="field"><label for="reg-enrollment-end-b">Enrollment closes</label><input id="reg-enrollment-end-b" name="enrollmentEnds" type="datetime-local" required></div>
                                    </div>
                                    <button class="button button--quiet" type="submit">Create planned term</button>
                                </form>
                            </section>
                        </div>
                    </section>
                </div><!-- /data-registrar-view="terms" -->
            </section>

            <section class="shell admin-panel" aria-labelledby="admin-title" data-admin-panel hidden>`;

if (!html.includes(before)) { console.error("FAIL: Registrar panel end / admin panel start not found"); process.exit(1); }
html = html.replace(before, after);
console.log("✓ Registrar terms tab added");

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE 5: Admin Panel — add tabs
// ─────────────────────────────────────────────────────────────────────────────
before = `            <section class="shell admin-panel" aria-labelledby="admin-title" data-admin-panel hidden>
                <div class="admin-panel__heading">
                    <div>
                        <p class="eyebrow">Administrator tools</p>
                        <h2 id="admin-title">Project account management</h2>
                        <p>Create accounts, change active/disabled status, or delete accounts. Deleted accounts lose access and are retained only as anonymized audit references.</p>
                    </div>
                    <button class="button button--quiet" type="button" data-refresh-users>Refresh accounts</button>
                </div>

                <div class="admin-grid">`;

after = `            <section class="shell admin-panel" aria-labelledby="admin-title" data-admin-panel hidden>
                <div class="admin-panel__heading">
                    <div>
                        <p class="eyebrow">Administrator tools</p>
                        <h2 id="admin-title">Project account management</h2>
                        <p>Create accounts, change active/disabled status, or delete accounts. Deleted accounts lose access and are retained only as anonymized audit references.</p>
                    </div>
                    <button class="button button--quiet" type="button" data-refresh-users>Refresh accounts</button>
                </div>

                <!-- Admin Workspace Tabs -->
                <nav class="workspace-tabs" role="tablist" aria-label="Admin Navigation">
                    <button class="workspace-tab active" type="button" role="tab" aria-selected="true" data-admin-nav="users">
                        ${I.user}
                        Account Management
                    </button>
                    <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-admin-nav="monitoring">
                        ${I.monitor}
                        System &amp; Security Monitoring
                    </button>
                </nav>

                <!-- Admin Tab: Account Management -->
                <div data-admin-view="users">
                <div class="admin-grid">`;

if (!html.includes(before)) { console.error("FAIL: Admin panel heading+grid not found"); process.exit(1); }
html = html.replace(before, after);
console.log("✓ Admin account management tab added");

// Close admin users tab and open monitoring tab
// Admin section ends at </section> and then there's the separate monitoring-panel section
before = `                </div>
            </section>

                            <section class="shell admin-panel monitoring-panel" aria-labelledby="monitoring-title" data-monitoring-panel hidden>`;
after = `                </div><!-- /admin-grid -->
                </div><!-- /data-admin-view="users" -->

                <!-- Admin Tab: System & Security Monitoring -->
                <div data-admin-view="monitoring" hidden>
                <section class="monitoring-panel" aria-labelledby="monitoring-title" data-monitoring-panel>`;

if (!html.includes(before)) {
    console.error("FAIL: Admin end / monitoring start not found - checking alternate...");
    // Check what's actually around monitoring-panel
    const mi = html.indexOf('data-monitoring-panel hidden');
    if (mi !== -1) {
        console.error("Found at:", mi);
        console.error("Context:", JSON.stringify(html.substring(mi - 150, mi + 50)));
    }
    process.exit(1);
}
html = html.replace(before, after);
console.log("✓ Admin monitoring tab opened");

// Close monitoring content + monitoring tab + admin panel
before = `            </section>

            <!-- ==========================================================
                 STUDENT SERVICES CENTER (SSC) WORKSPACE
                 ========================================================== -->`;
after = `            </section><!-- /monitoring-panel section -->
                </div><!-- /data-admin-view="monitoring" -->
            </section><!-- /admin-panel -->

            <!-- ==========================================================
                 STUDENT SERVICES CENTER (SSC) WORKSPACE
                 ========================================================== -->`;

if (!html.includes(before)) { console.error("FAIL: Monitoring end / SSC start not found"); process.exit(1); }
html = html.replace(before, after);
console.log("✓ Admin monitoring tab closed");

// ─────────────────────────────────────────────────────────────────────────────
// Write back with CRLF
// ─────────────────────────────────────────────────────────────────────────────
const output = html.replace(/\n/g, "\r\n");
fs.writeFileSync("portal.html", output, "utf8");
console.log("\n✅ portal.html successfully restructured!");
console.log("   Total size:", fs.statSync("portal.html").size, "bytes");
