import fs from "fs";

const portalHtmlPath = "portal.html";
let html = fs.readFileSync(portalHtmlPath, "utf8");
const isCrlf = html.includes("\r\n");
const eol = isCrlf ? "\r\n" : "\n";

// Helper to normalize snippet to match the file's eol
function toFileEol(text) {
    return text.replace(/\r?\n/g, eol);
}

// 1. Insert Clubs Tab in Student Tabs Nav
const rawStudentNavTarget = `<button class="workspace-tab" type="button" role="tab" aria-selected="false"
                            data-student-nav="finance">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                <line x1="1" y1="10" x2="23" y2="10"></line>
                            </svg>
                            <span>Finance &amp; Requests</span>
                        </button>`;

const rawStudentNavAddition = `${rawStudentNavTarget}
                        <button class="workspace-tab" type="button" role="tab" aria-selected="false"
                            data-student-nav="clubs">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>Clubs &amp; Orgs</span>
                        </button>`;

const studentNavTarget = toFileEol(rawStudentNavTarget);
const studentNavAddition = toFileEol(rawStudentNavAddition);

if (!html.includes('data-student-nav="clubs"')) {
    html = html.replace(studentNavTarget, studentNavAddition);
    console.log("Added Clubs tab button to Student nav.");
} else {
    console.log("Clubs tab button already present.");
}

// 2. Insert Student Clubs View inside Student Dashboard (after finance view)
const rawStudentFinanceViewEnd = `                            <section class="panel dashboard-module" aria-labelledby="requests-title">
                                <div class="dashboard-module__heading">
                                    <div>
                                        <p class="eyebrow">Transactions</p>
                                        <h3 id="requests-title">Recent requests</h3>
                                    </div>
                                    <div class="flex-center">
                                        <button class="button button--primary button--compact" type="button"
                                            data-open-new-request>+ Submit request</button>
                                        <span data-request-count></span>
                                    </div>
                                </div>
                                <div class="dashboard-list" data-request-list></div>
                            </section>
                        </div>`;

const rawStudentClubsViewHtml = `
                        <!-- TAB 6: Clubs & Organizations -->
                        <div data-student-view="clubs" hidden>
                            <section class="panel" style="margin-bottom: 1.5rem;">
                                <div class="panel__heading">
                                    <div>
                                        <p class="eyebrow">Campus Life &amp; Organizations</p>
                                        <h3 id="student-clubs-title">Student Club Environment</h3>
                                        <p>Participate in recognized clubs, review official communications, and fulfill organizational clearance obligations.</p>
                                    </div>
                                    <div class="club-stats-badge" data-student-club-limit-badge style="display: flex; align-items: center; gap: 0.5rem; background: var(--cream); padding: 0.5rem 1rem; border-radius: 999px; border: 1px solid var(--line);">
                                        <span style="font-size: 0.88rem; color: var(--muted);">Active Memberships:</span>
                                        <strong data-student-active-clubs-count style="color: var(--red-900); font-size: 1.1rem;">0</strong> / 3
                                    </div>
                                </div>
                            </section>

                            <!-- My Joined Clubs -->
                            <section class="panel" style="margin-bottom: 1.5rem;">
                                <div class="panel__heading">
                                    <div>
                                        <p class="eyebrow">My Organizations</p>
                                        <h4>My Club Memberships</h4>
                                    </div>
                                    <button class="button button--quiet" type="button" data-refresh-student-clubs>Refresh clubs</button>
                                </div>
                                <div class="table-container">
                                    <table class="table" data-student-my-clubs-table>
                                        <thead>
                                            <tr>
                                                <th scope="col">Code</th>
                                                <th scope="col">Club Name</th>
                                                <th scope="col">Category</th>
                                                <th scope="col">My Role / Position</th>
                                                <th scope="col">Clearance Status</th>
                                                <th scope="col">Club Status</th>
                                                <th scope="col">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody data-student-my-clubs-body>
                                            <tr><td colspan="7" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">You have not joined any clubs yet.</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <!-- Available Clubs to Join -->
                            <section class="panel">
                                <div class="panel__heading">
                                    <div>
                                        <p class="eyebrow">Discovery</p>
                                        <h4>Available Student Clubs</h4>
                                        <p>Clubs currently accepting student membership within their active effectivity window (Max 3 clubs per student).</p>
                                    </div>
                                </div>
                                <div class="available-clubs-grid" data-student-available-clubs-grid style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; margin-top: 1rem;">
                                    <div class="empty-cell" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--muted);">Loading available clubs…</div>
                                </div>
                            </section>
                        </div>`;

const studentFinanceViewEnd = toFileEol(rawStudentFinanceViewEnd);
const studentClubsViewHtml = toFileEol(rawStudentClubsViewHtml);

if (!html.includes('data-student-view="clubs"')) {
    html = html.replace(studentFinanceViewEnd, `${studentFinanceViewEnd}${studentClubsViewHtml}`);
    console.log("Added Clubs view to Student Dashboard.");
} else {
    console.log("Student Clubs view already present.");
}

// 3. Insert SSC Panel and Club Panel after admin-panel
const rawAdminPanelEnd = `                                    </thead>
                                    <tbody data-system-logs-body></tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            </section>`;

const rawSscAndClubPanelsHtml = `
            <!-- ========================================== -->
            <!-- STUDENT SERVICES CENTER (SSC) WORKSPACE    -->
            <!-- ========================================== -->
            <section class="shell ssc-panel" aria-labelledby="ssc-title" data-ssc-panel hidden>
                <div class="admin-panel__heading">
                    <div>
                        <p class="eyebrow">Institutional Student Services</p>
                        <h2 id="ssc-title">Student Services Center (SSC) Console</h2>
                        <p>Charter and oversee campus student clubs, define effectivity dates, manage active/inactive status, and issue club accounts.</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button class="button button--quiet" type="button" data-refresh-ssc>Refresh clubs</button>
                        <button class="button button--primary" type="button" data-open-create-club>+ Create Club Account</button>
                    </div>
                </div>

                <!-- SSC Metrics Bar -->
                <div class="ssc-metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="panel metric-card" style="padding: 1.25rem; border-left: 4px solid var(--red-900);">
                        <span class="eyebrow" style="font-size: 0.8rem; text-transform: uppercase;">Total Clubs</span>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--ink); margin-top: 0.25rem;" data-ssc-total-clubs>0</div>
                    </div>
                    <div class="panel metric-card" style="padding: 1.25rem; border-left: 4px solid var(--success);">
                        <span class="eyebrow" style="font-size: 0.8rem; text-transform: uppercase;">Active Clubs</span>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--success); margin-top: 0.25rem;" data-ssc-active-clubs>0</div>
                    </div>
                    <div class="panel metric-card" style="padding: 1.25rem; border-left: 4px solid var(--muted);">
                        <span class="eyebrow" style="font-size: 0.8rem; text-transform: uppercase;">Inactive Clubs</span>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--muted); margin-top: 0.25rem;" data-ssc-inactive-clubs>0</div>
                    </div>
                    <div class="panel metric-card" style="padding: 1.25rem; border-left: 4px solid var(--danger);">
                        <span class="eyebrow" style="font-size: 0.8rem; text-transform: uppercase;">Expired Clubs</span>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--danger); margin-top: 0.25rem;" data-ssc-expired-clubs>0</div>
                    </div>
                </div>

                <!-- Clubs Directory & Status Filters -->
                <section class="panel">
                    <div class="panel__heading" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <p class="eyebrow">Governance &amp; Oversight</p>
                            <h3>Chartered Clubs Directory</h3>
                        </div>
                        <div class="filter-group" data-ssc-filter-group style="display: flex; gap: 0.5rem;">
                            <button class="button button--quiet ssc-filter-btn is-active" type="button" data-ssc-filter="ALL">All Clubs</button>
                            <button class="button button--quiet ssc-filter-btn" type="button" data-ssc-filter="ACTIVE">Active</button>
                            <button class="button button--quiet ssc-filter-btn" type="button" data-ssc-filter="INACTIVE">Inactive</button>
                            <button class="button button--quiet ssc-filter-btn" type="button" data-ssc-filter="EXPIRED">Expired</button>
                        </div>
                    </div>
                    <div class="table-container">
                        <table class="table" data-ssc-clubs-table>
                            <thead>
                                <tr>
                                    <th scope="col">Code</th>
                                    <th scope="col">Club Name</th>
                                    <th scope="col">Category</th>
                                    <th scope="col">Account Username</th>
                                    <th scope="col">Effectivity Start</th>
                                    <th scope="col">Expiration Date</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Actions</th>
                                </tr>
                            </thead>
                            <tbody data-ssc-clubs-body>
                                <tr><td colspan="8" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">Loading clubs…</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </section>

            <!-- ========================================== -->
            <!-- CLUB ACCOUNT MANAGEMENT WORKSPACE          -->
            <!-- ========================================== -->
            <section class="shell club-panel" aria-labelledby="club-title" data-club-panel hidden>
                <div class="admin-panel__heading">
                    <div>
                        <p class="eyebrow" data-club-header-category>Recognized Student Organization</p>
                        <h2 id="club-title" data-club-header-name>Club Management Console</h2>
                        <p data-club-header-lead>Manage club officers, member rolls, categorised announcements, and classified official documents.</p>
                    </div>
                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                        <span class="status-pill status-pill--active" data-club-header-status>Active</span>
                        <button class="button button--quiet" type="button" data-refresh-club>Refresh</button>
                    </div>
                </div>

                <!-- Club Workspace Navigation Tabs -->
                <nav class="workspace-tabs" role="tablist" aria-label="Club Navigation" data-club-tabs>
                    <button class="workspace-tab active" type="button" role="tab" aria-selected="true" data-club-nav="officers">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span>Officers</span>
                    </button>
                    <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-club-nav="members">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
                        <span>Members &amp; Clearance</span>
                    </button>
                    <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-club-nav="announcements">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        <span>Announcements</span>
                    </button>
                    <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-club-nav="documents">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        <span>Classified Documents</span>
                    </button>
                </nav>

                <!-- TAB 1: Officers -->
                <div data-club-view="officers">
                    <section class="panel" style="margin-bottom: 1.5rem;">
                        <div class="panel__heading">
                            <div>
                                <p class="eyebrow">Officer Appointment</p>
                                <h3>Appoint Student Officer</h3>
                                <p>Lookup student by exact Student ID to assign leadership positions and optionally delegate club clearance signing authority.</p>
                            </div>
                        </div>
                        <form class="admin-form" data-assign-officer-form novalidate>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
                                <div class="field">
                                    <label for="officer-student-id">Student ID (Exact Lookup)</label>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <input id="officer-student-id" name="studentIdNumber" placeholder="e.g. 2026-0001" required />
                                        <button class="button button--outline" type="button" data-verify-officer-btn>Verify</button>
                                    </div>
                                    <small data-officer-verify-result style="display: block; margin-top: 0.35rem; font-weight: 500;"></small>
                                </div>
                                <div class="field">
                                    <label for="officer-position">Position Title</label>
                                    <input id="officer-position" name="position" placeholder="e.g. President, Vice President, Clearance Head" required />
                                </div>
                            </div>
                            <div class="field" style="margin-top: 0.75rem;">
                                <label class="checkbox">
                                    <input type="checkbox" name="canClearClearance" id="officer-clearance-auth" />
                                    <span><strong>Grant Club Clearance Authority:</strong> Authorizes this officer to evaluate, clear, or sign off clearance obligations for club members.</span>
                                </label>
                            </div>
                            <p class="form-message form-message--error" role="alert" data-officer-error hidden></p>
                            <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
                                <button class="button button--primary" type="submit" data-submit-officer-btn>Appoint Officer</button>
                            </div>
                        </form>
                    </section>

                    <section class="panel">
                        <div class="panel__heading">
                            <div>
                                <p class="eyebrow">Roster</p>
                                <h3>Current Club Officers</h3>
                            </div>
                        </div>
                        <div class="table-container">
                            <table class="table" data-club-officers-table>
                                <thead>
                                    <tr>
                                        <th scope="col">Student ID</th>
                                        <th scope="col">Full Name</th>
                                        <th scope="col">Position Title</th>
                                        <th scope="col">Clearance Authority</th>
                                        <th scope="col">Actions</th>
                                    </tr>
                                </thead>
                                <tbody data-club-officers-body>
                                    <tr><td colspan="5" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No officers appointed yet.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <!-- TAB 2: Members & Clearance -->
                <div data-club-view="members" hidden>
                    <section class="panel">
                        <div class="panel__heading" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                            <div>
                                <p class="eyebrow">Membership &amp; Compliance</p>
                                <h3>Club Members &amp; Clearance Obligations</h3>
                            </div>
                            <div class="club-stats-badge" style="background: var(--cream); padding: 0.5rem 1rem; border-radius: 999px; border: 1px solid var(--line);">
                                <span>Clearance Progress:</span>
                                <strong data-club-cleared-count style="color: var(--success);">0</strong> / <strong data-club-total-members-count>0</strong> Cleared
                            </div>
                        </div>
                        <div class="table-container">
                            <table class="table" data-club-members-table>
                                <thead>
                                    <tr>
                                        <th scope="col">Student ID</th>
                                        <th scope="col">Full Name</th>
                                        <th scope="col">Program / Year</th>
                                        <th scope="col">Role</th>
                                        <th scope="col">Clearance Status</th>
                                        <th scope="col">Cleared At</th>
                                        <th scope="col">Evaluated By</th>
                                        <th scope="col">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody data-club-members-body>
                                    <tr><td colspan="8" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No members enrolled in this club.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <!-- TAB 3: Announcements -->
                <div data-club-view="announcements" hidden>
                    <section class="panel" style="margin-bottom: 1.5rem;">
                        <div class="panel__heading">
                            <div>
                                <p class="eyebrow">Communications</p>
                                <h3>Publish Categorised Announcement</h3>
                            </div>
                        </div>
                        <form class="admin-form" data-create-announcement-form novalidate>
                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                                <div class="field">
                                    <label for="announcement-title">Title</label>
                                    <input id="announcement-title" name="title" required maxlength="200" placeholder="e.g. General Assembly &amp; Clearance Notice" />
                                </div>
                                <div class="field">
                                    <label for="announcement-category">Category</label>
                                    <select id="announcement-category" name="category" required>
                                        <option value="GENERAL">General</option>
                                        <option value="MEETING">Meeting</option>
                                        <option value="EVENT">Event</option>
                                        <option value="ACTIVITY">Activity</option>
                                        <option value="URGENT">Urgent</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div class="field">
                                <label for="announcement-content">Content</label>
                                <textarea id="announcement-content" name="content" rows="4" required placeholder="Announcement details, date, agenda, venue…"></textarea>
                            </div>
                            <label class="checkbox">
                                <input type="checkbox" name="isPriority" id="announcement-priority" />
                                <span>Mark as High Priority / Urgent Notice</span>
                            </label>
                            <p class="form-message form-message--error" role="alert" data-announcement-error hidden></p>
                            <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
                                <button class="button button--primary" type="submit">Publish Announcement</button>
                            </div>
                        </form>
                    </section>

                    <section class="panel">
                        <div class="panel__heading">
                            <div>
                                <p class="eyebrow">Feed</p>
                                <h3>Published Club Announcements</h3>
                            </div>
                        </div>
                        <div class="announcements-feed" data-club-announcements-list style="display: flex; flex-direction: column; gap: 1rem;">
                            <div class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No announcements published yet.</div>
                        </div>
                    </section>
                </div>

                <!-- TAB 4: Classified Documents -->
                <div data-club-view="documents" hidden>
                    <section class="panel" style="margin-bottom: 1.5rem;">
                        <div class="panel__heading">
                            <div>
                                <p class="eyebrow">Repository</p>
                                <h3>Archive Classified Document</h3>
                                <p>Record official resolutions, memorandums, constitutions, financial reports, or activity proposals.</p>
                            </div>
                        </div>
                        <form class="admin-form" data-create-document-form novalidate>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                                <div class="field">
                                    <label for="doc-title">Document Title</label>
                                    <input id="doc-title" name="title" required maxlength="200" placeholder="e.g. Club Constitution &amp; By-Laws 2026" />
                                </div>
                                <div class="field">
                                    <label for="doc-category">Document Classification</label>
                                    <select id="doc-category" name="category" required>
                                        <option value="RESOLUTION">Resolution</option>
                                        <option value="MEMORANDUM">Memorandum</option>
                                        <option value="CONSTITUTION_BYLAWS">Constitution &amp; Bylaws</option>
                                        <option value="FINANCIAL_REPORT">Financial Report</option>
                                        <option value="ACTIVITY_PROPOSAL">Activity Proposal</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div class="field">
                                    <label for="doc-ref">Reference No. (Optional)</label>
                                    <input id="doc-ref" name="referenceNo" placeholder="e.g. RES-2026-001" />
                                </div>
                                <div class="field">
                                    <label for="doc-url">Document URL / File Path</label>
                                    <input id="doc-url" name="fileUrl" required placeholder="e.g. /docs/clubs/jpcs-constitution.pdf" />
                                </div>
                            </div>
                            <p class="form-message form-message--error" role="alert" data-document-error hidden></p>
                            <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
                                <button class="button button--primary" type="submit">Archive Document</button>
                            </div>
                        </form>
                    </section>

                    <section class="panel">
                        <div class="panel__heading">
                            <div>
                                <p class="eyebrow">Archive</p>
                                <h3>Official Club Documents</h3>
                            </div>
                        </div>
                        <div class="table-container">
                            <table class="table" data-club-documents-table>
                                <thead>
                                    <tr>
                                        <th scope="col">Classification</th>
                                        <th scope="col">Title</th>
                                        <th scope="col">Reference No.</th>
                                        <th scope="col">Uploaded By</th>
                                        <th scope="col">Date Archived</th>
                                        <th scope="col">Actions</th>
                                    </tr>
                                </thead>
                                <tbody data-club-documents-body>
                                    <tr><td colspan="6" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No documents archived yet.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </section>`;

const adminPanelEnd = toFileEol(rawAdminPanelEnd);
const sscAndClubPanelsHtml = toFileEol(rawSscAndClubPanelsHtml);

if (!html.includes('data-ssc-panel')) {
    html = html.replace(adminPanelEnd, `${adminPanelEnd}${sscAndClubPanelsHtml}`);
    console.log("Added SSC and Club management panels.");
} else {
    console.log("SSC panel already present.");
}

// 4. Insert Dialogs before end of body
const rawDialogTarget = `    <script src="/auth-client.js" defer></script>`;

const rawDialogsHtml = `
    <!-- DIALOG: SSC Create Club Account -->
    <dialog class="portal-dialog dialog--wide" aria-labelledby="ssc-create-club-title" data-ssc-create-club-dialog>
        <button class="dialog-close" type="button" aria-label="Close dialog" data-close-ssc-create>×</button>
        <div class="dialog__heading">
            <p class="eyebrow">Charter Organization</p>
            <h2 id="ssc-create-club-title">Create Club Account</h2>
            <p>Charter a recognized student organization, configure its operational effectivity window, and provision its dedicated club management credentials.</p>
        </div>
        <form class="admin-form" data-ssc-create-club-form novalidate>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1rem;">
                <div class="field">
                    <label for="create-club-code">Club Code</label>
                    <input id="create-club-code" name="code" required minlength="2" maxlength="30" placeholder="e.g. JPCS" />
                </div>
                <div class="field">
                    <label for="create-club-name">Club Name</label>
                    <input id="create-club-name" name="name" required minlength="2" maxlength="150" placeholder="e.g. Junior Philippine Computer Society" />
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="field">
                    <label for="create-club-category">Category</label>
                    <select id="create-club-category" name="category" required>
                        <option value="ACADEMIC">Academic</option>
                        <option value="NON_ACADEMIC">Non-Academic</option>
                        <option value="SOCIO_CIVIC">Socio-Civic</option>
                        <option value="RELIGIOUS">Religious</option>
                        <option value="SPORTS">Sports</option>
                        <option value="CULTURAL">Cultural</option>
                        <option value="SPECIAL_INTEREST">Special Interest</option>
                    </select>
                </div>
                <div class="field">
                    <label for="create-club-description">Description (Optional)</label>
                    <input id="create-club-description" name="description" placeholder="Brief mission or club purpose" />
                </div>
            </div>
            <fieldset style="border: 1px solid var(--line); border-radius: 8px; padding: 1rem; margin-top: 0.75rem;">
                <legend style="padding: 0 0.5rem; font-weight: 600; color: var(--red-900);">Club Dedicated Login Credentials</legend>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="field">
                        <label for="create-club-username">Username</label>
                        <input id="create-club-username" name="accountUsername" required pattern="[A-Za-z0-9._-]{3,64}" placeholder="e.g. jpcs.club" />
                    </div>
                    <div class="field">
                        <label for="create-club-password">Initial Password</label>
                        <input id="create-club-password" name="accountPassword" type="password" required minlength="8" placeholder="Initial club password" />
                    </div>
                </div>
            </fieldset>
            <fieldset style="border: 1px solid var(--line); border-radius: 8px; padding: 1rem; margin-top: 0.75rem;">
                <legend style="padding: 0 0.5rem; font-weight: 600; color: var(--red-900);">Operational Effectivity Dates</legend>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="field">
                        <label for="create-club-start-date">Effectivity Start Date</label>
                        <input id="create-club-start-date" name="effectiveStartDate" type="date" required />
                    </div>
                    <div class="field">
                        <label for="create-club-end-date">Effectivity Expiration Date</label>
                        <input id="create-club-end-date" name="effectiveEndDate" type="date" required />
                    </div>
                </div>
            </fieldset>
            <p class="form-message form-message--error" role="alert" data-ssc-create-error hidden></p>
            <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button class="button button--quiet" type="button" data-close-ssc-create>Cancel</button>
                <button class="button button--primary" type="submit" data-ssc-submit-create>Create Club &amp; Issue Account</button>
            </div>
        </form>
    </dialog>

    <!-- DIALOG: SSC Edit Effectivity Dates -->
    <dialog class="portal-dialog" aria-labelledby="ssc-edit-dates-title" data-ssc-edit-dates-dialog>
        <button class="dialog-close" type="button" aria-label="Close dialog" data-close-ssc-dates>×</button>
        <div class="dialog__heading">
            <p class="eyebrow">Effectivity Governance</p>
            <h2 id="ssc-edit-dates-title">Update Club Effectivity</h2>
            <p>Modify the active operational window for this student organization.</p>
        </div>
        <form class="admin-form" data-ssc-edit-dates-form novalidate>
            <input type="hidden" name="clubId" id="edit-dates-club-id" />
            <div class="field">
                <label for="edit-dates-start">Effectivity Start Date</label>
                <input id="edit-dates-start" name="effectiveStartDate" type="date" required />
            </div>
            <div class="field">
                <label for="edit-dates-end">Expiration Date</label>
                <input id="edit-dates-end" name="effectiveEndDate" type="date" required />
            </div>
            <p class="form-message form-message--error" role="alert" data-ssc-dates-error hidden></p>
            <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button class="button button--quiet" type="button" data-close-ssc-dates>Cancel</button>
                <button class="button button--primary" type="submit">Update Dates</button>
            </div>
        </form>
    </dialog>

    <!-- DIALOG: Student Dynamic Club Portal -->
    <dialog class="portal-dialog dialog--wide" aria-labelledby="student-club-portal-title" data-student-club-portal-dialog>
        <button class="dialog-close" type="button" aria-label="Close dialog" data-close-student-portal>×</button>
        <div class="dialog__heading" style="border-bottom: 1px solid var(--line); padding-bottom: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                    <p class="eyebrow" data-portal-category-label>Club Organization</p>
                    <h2 id="student-club-portal-title" data-portal-club-name>Club Portal</h2>
                    <p data-portal-club-lead style="margin: 0.25rem 0 0; color: var(--muted);"></p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="status-pill" data-portal-club-status>Active</span>
                    <span class="status-pill status-pill--quiet" data-portal-role-pill>Member</span>
                </div>
            </div>
            <!-- Expiration warning if club is expired -->
            <div class="form-message form-message--warning" data-portal-expired-banner style="margin-top: 0.75rem;" hidden>
                <strong>Club Term Expired:</strong> This organization's effectivity term has concluded. Existing clearance obligations remain viewable until settled.
            </div>
        </div>

        <!-- Dynamic Portal Sub-Tabs -->
        <nav class="workspace-tabs" role="tablist" aria-label="Student Club Portal Navigation" data-student-portal-tabs>
            <button class="workspace-tab active" type="button" role="tab" aria-selected="true" data-portal-nav="feed">
                <span>Announcements</span>
            </button>
            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-portal-nav="docs">
                <span>Classified Documents</span>
            </button>
            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-portal-nav="officers">
                <span>Officers Directory</span>
            </button>
            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-portal-nav="my-clearance">
                <span>My Clearance</span>
            </button>
            <!-- Rendered only for Type 1: Officer with clearance authority -->
            <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-portal-nav="clearance-eval" data-portal-eval-tab hidden>
                <span>Clearance Evaluation</span>
            </button>
        </nav>

        <!-- Sub-View 1: Announcements Feed -->
        <div data-portal-view="feed" style="margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <h4 style="margin: 0;">Club Announcements</h4>
                <select data-portal-announcement-filter style="max-width: 160px; font-size: 0.88rem;">
                    <option value="ALL">All Categories</option>
                    <option value="GENERAL">General</option>
                    <option value="MEETING">Meeting</option>
                    <option value="EVENT">Event</option>
                    <option value="ACTIVITY">Activity</option>
                    <option value="URGENT">Urgent</option>
                    <option value="OTHER">Other</option>
                </select>
            </div>
            <div class="announcements-feed" data-portal-announcements-feed style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 420px; overflow-y: auto;">
                <div class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No announcements published.</div>
            </div>
        </div>

        <!-- Sub-View 2: Classified Documents -->
        <div data-portal-view="docs" style="margin-top: 1rem;" hidden>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <h4 style="margin: 0;">Official Documents &amp; Publications</h4>
                <select data-portal-doc-filter style="max-width: 180px; font-size: 0.88rem;">
                    <option value="ALL">All Classifications</option>
                    <option value="RESOLUTION">Resolutions</option>
                    <option value="MEMORANDUM">Memorandums</option>
                    <option value="CONSTITUTION_BYLAWS">Constitution &amp; Bylaws</option>
                    <option value="FINANCIAL_REPORT">Financial Reports</option>
                    <option value="ACTIVITY_PROPOSAL">Activity Proposals</option>
                    <option value="OTHER">Other</option>
                </select>
            </div>
            <div class="table-container" style="max-height: 420px; overflow-y: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th scope="col">Classification</th>
                            <th scope="col">Title</th>
                            <th scope="col">Reference</th>
                            <th scope="col">Date</th>
                            <th scope="col">Action</th>
                        </tr>
                    </thead>
                    <tbody data-portal-docs-body>
                        <tr><td colspan="5" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No documents available.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Sub-View 3: Officers Directory -->
        <div data-portal-view="officers" style="margin-top: 1rem;" hidden>
            <h4 style="margin-bottom: 0.75rem;">Club Executive Board &amp; Officers</h4>
            <div class="table-container" style="max-height: 420px; overflow-y: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th scope="col">Position</th>
                            <th scope="col">Officer Name</th>
                            <th scope="col">Clearance Role</th>
                        </tr>
                    </thead>
                    <tbody data-portal-officers-body>
                        <tr><td colspan="3" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No officers listed.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Sub-View 4: My Clearance Status -->
        <div data-portal-view="my-clearance" style="margin-top: 1rem;" hidden>
            <div class="panel" style="background: var(--cream); border: 1px solid var(--line); padding: 1.5rem; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <span class="eyebrow">Obligation Record</span>
                        <h3 style="margin: 0.25rem 0;">My Club Clearance</h3>
                    </div>
                    <span class="status-pill" data-portal-my-clearance-pill style="font-size: 1rem; padding: 0.4rem 1rem;">PENDING</span>
                </div>
                <dl class="account-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0;">
                    <div>
                        <dt style="font-size: 0.85rem; color: var(--muted);">Evaluation Date</dt>
                        <dd data-portal-my-clearance-date style="font-weight: 600; margin: 0.25rem 0 0;">—</dd>
                    </div>
                    <div>
                        <dt style="font-size: 0.85rem; color: var(--muted);">Evaluated By</dt>
                        <dd data-portal-my-clearance-by style="font-weight: 600; margin: 0.25rem 0 0;">—</dd>
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <dt style="font-size: 0.85rem; color: var(--muted);">Officer Remarks</dt>
                        <dd data-portal-my-clearance-remarks style="font-weight: 500; margin: 0.25rem 0 0; color: var(--ink);">No remarks entered.</dd>
                    </div>
                </dl>
            </div>
        </div>

        <!-- Sub-View 5: Clearance Evaluation Panel (TYPE 1 ONLY) -->
        <div data-portal-view="clearance-eval" style="margin-top: 1rem;" hidden>
            <div class="form-message form-message--info" style="margin-bottom: 1rem;">
                <strong>Clearance Authority Granted:</strong> You hold official clearance authority for this club. You can evaluate and update the clearance status of club members and officers. All decisions are immutably logged in the audit trail.
            </div>
            <div class="table-container" style="max-height: 420px; overflow-y: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th scope="col">Student ID</th>
                            <th scope="col">Member Name</th>
                            <th scope="col">Club Role</th>
                            <th scope="col">Clearance Status</th>
                            <th scope="col">Evaluated By</th>
                            <th scope="col">Remarks</th>
                            <th scope="col">Action</th>
                        </tr>
                    </thead>
                    <tbody data-portal-eval-body>
                        <tr><td colspan="7" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">Loading member clearances…</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </dialog>

    <!-- DIALOG: Member Clearance Evaluation Action -->
    <dialog class="portal-dialog" aria-labelledby="eval-modal-title" data-eval-action-dialog>
        <button class="dialog-close" type="button" aria-label="Close dialog" data-close-eval-action>×</button>
        <div class="dialog__heading">
            <p class="eyebrow">Clearance Assessment</p>
            <h2 id="eval-modal-title">Evaluate Member Clearance</h2>
            <p>Update the club clearance obligation and enter official evaluative remarks.</p>
        </div>
        <form class="admin-form" data-eval-action-form novalidate>
            <input type="hidden" name="clubId" id="eval-form-club-id" />
            <input type="hidden" name="targetStudentId" id="eval-form-target-id" />
            <div class="field">
                <label>Member Being Evaluated</label>
                <div id="eval-form-target-name" style="font-weight: 600; padding: 0.5rem 0; color: var(--ink);">—</div>
            </div>
            <div class="field">
                <label for="eval-form-status">Clearance Decision</label>
                <select id="eval-form-status" name="status" required>
                    <option value="CLEARED">CLEARED (Requirements &amp; Dues Fulfilled)</option>
                    <option value="PENDING">PENDING (Obligations Unfulfilled)</option>
                </select>
            </div>
            <div class="field">
                <label for="eval-form-remarks">Officer Remarks / Basis</label>
                <textarea id="eval-form-remarks" name="remarks" rows="3" placeholder="e.g. Attended general assembly and settled 1st semester activity fee."></textarea>
            </div>
            <div class="form-message form-message--info" style="font-size: 0.85rem; margin-top: 0.5rem;">
                Stamps your Student ID and account name in the Club Clearance Audit Trail.
            </div>
            <p class="form-message form-message--error" role="alert" data-eval-action-error hidden></p>
            <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button class="button button--quiet" type="button" data-close-eval-action>Cancel</button>
                <button class="button button--primary" type="submit">Submit Evaluation</button>
            </div>
        </form>
    </dialog>
`;

const dialogTarget = toFileEol(rawDialogTarget);
const dialogsHtml = toFileEol(rawDialogsHtml);

if (!html.includes('data-ssc-create-club-dialog')) {
    html = html.replace(dialogTarget, `${dialogsHtml}${eol}${dialogTarget}`);
    console.log("Added dialogs to portal.html.");
} else {
    console.log("Dialogs already present in portal.html.");
}

fs.writeFileSync(portalHtmlPath, html, "utf8");
console.log("portal.html updated successfully with proper EOL!");
