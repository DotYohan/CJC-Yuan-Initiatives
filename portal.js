(() => {
    "use strict";

    const auth = window.CJCAuth;
    const select = (selector, scope = document) => scope.querySelector(selector);
    const selectAll = (selector, scope = document) => [...scope.querySelectorAll(selector)];
    const bootState = select("[data-boot-state]");
    const bootMessage = select("[data-boot-message]");
    const portalApp = select("[data-portal-app]");
    const passwordDialog = select("[data-password-dialog]");
    const passwordForm = select("[data-password-form]");
    const passwordError = select("[data-password-error]");
    const passwordStatus = select("[data-password-status]");
    const adminPanel = select("[data-admin-panel]");
    const monitoringPanel = select("[data-monitoring-panel]");
    const registrarPanel = select("[data-registrar-panel]");
    const programHeadPanel = select("[data-program-head-panel]");
    const programHeadCurriculumForm = select("[data-create-program-head-curriculum]");
    const programHeadSubjectForm = select("[data-add-program-head-subject]");
    const programHeadCurriculumSelect = select("#program-head-subject-curriculum");
    const programHeadCurriculumView = select("[data-program-head-curriculum-view]");
    const programHeadSubjectSearchForm = select("[data-program-head-subject-search]");
    const programHeadSubjectSelect = select("#program-head-subject-id");
    const programHeadOfferingForm = select("[data-create-program-head-offering]");
    const programHeadOfferingCurriculum = select("#program-head-offering-curriculum");
    const programHeadOfferingSubject = select("#program-head-offering-subject");
    const programHeadOfferingSearch = select("[data-program-head-offering-search]");
    const programHeadOfferingStatusFilter = select("[data-program-head-offering-status-filter]");
    const programHeadOfferingSort = select("[data-program-head-offering-sort]");
    const refreshProgramHeadOfferingsBtn = select("[data-refresh-program-head-offerings]");
    const programHeadOfferingEditDialog = select("[data-program-head-offering-edit-dialog]");
    const programHeadOfferingEditForm = select("[data-edit-program-head-offering-form]");
    const programHeadOfferingEditStatus = select("[data-ph-edit-status]");
    const programHeadStudentDialog = select("[data-program-head-student-dialog]");
    const programHeadEvaluationDialog = select("[data-program-head-evaluation-dialog]");
    const programHeadEvaluationForm = select("[data-approve-program-head-evaluation]");
    const programHeadApplicationDialog = select("[data-program-head-application-dialog]");
    const programHeadApplicationDecision = select("[data-program-head-application-decision]");
    let programHeadApplicationReview = null;
    const programHeadStatus = select("[data-program-head-status]");
    const registrarTermSelect = select("[data-registrar-term-select]");
    const registrarTermForm = select("[data-create-registrar-term]");
    const registrarAcademicYearForm = select("[data-create-registrar-year]");
    const registrarAcademicYearSelect = select("#registrar-academic-year");
    const registrarError = select("[data-registrar-error]");
    const registrarStatus = select("[data-registrar-status]");
    const registrarApplicationsDialog = select("[data-registrar-applications-dialog]");
    const registrarOfferingForm = select("[data-create-registrar-offering]");
    const registrarOfferingTerm = select("#registrar-offering-term");
    const registrarOfferingProgram = select("#registrar-offering-program");
    const registrarOfferingCurriculum = select("#registrar-offering-curriculum");
    const registrarOfferingSubject = select("#registrar-offering-subject");
    const registrarOfferingFaculty = select("#registrar-offering-faculty");
    const registrarOfferingRoom = select("#registrar-offering-room");
    const registrarOfferingsList = select("[data-registrar-offerings-list]");
    const registrarSubjectsTbody = select("[data-registrar-subjects-tbody]");
    const registrarOfferingSearch = select("[data-registrar-offering-search]");
    const registrarOfferingProgramFilter = select("[data-registrar-offering-program-filter]");
    const registrarOfferingStatusFilter = select("[data-registrar-offering-status-filter]");
    const registrarOfferingSort = select("[data-registrar-offering-sort]");
    const refreshRegistrarOfferingsBtn = select("[data-refresh-registrar-offerings]");
    const registrarOfferingEditDialog = select("[data-registrar-offering-edit-dialog]");
    const registrarOfferingEditForm = select("[data-edit-registrar-offering-form]");
    const registrarOfferingEditStatus = select("[data-reg-edit-status-msg]");
    const refreshRegistrarSubjectsBtn = select("[data-refresh-registrar-subjects]");
    const registrarSubjectSearch = select("[data-registrar-subject-search]");
    const registrarSubjectProgramFilter = select("[data-registrar-subject-program-filter]");
    const registrarOfferingStatus = select("[data-registrar-offering-form-status]");
    const registrarDocumentsDialog = select("[data-registrar-documents-dialog]");
    const registrarApplicationList = select("[data-registrar-application-list]");
    const registrarApplicationsStatus = select("[data-registrar-applications-status]");
    const registrarReviewStatus = select("[data-registrar-review-status]");
    const applicationReviewSection = select("[data-application-review-section]");
    const documentSelector = select("[data-document-selector]");
    const documentPreview = select("[data-document-preview]");
    const documentInvalidReason = select("[data-document-invalid-reason]");
    const documentInvalidRemark = select("[data-document-invalid-remark]");
    const documentDetailType = select("[data-document-detail-type]");
    const documentDetailName = select("[data-document-detail-name]");
    const documentDetailDate = select("[data-document-detail-date]");
    const documentDetailStatus = select("[data-document-detail-status]");
    const reviewHistory = select("[data-review-history]");
    const decisionRemarks = select("#feedback-message");
    const createForm = select("[data-create-user]");
    const createError = select("[data-create-error]");
    const createStatus = select("[data-create-status]");
    const roleSelect = select("#create-role");
    const programAssignment = select("[data-program-assignment]");
    const programSelect = select("#create-program");
    const departmentAssignment = select("[data-department-assignment]");
    const departmentSelect = select("#create-department");
    const collegeAssignment = select("[data-college-assignment]");
    const collegeSelect = select("#create-college");

    const studentAssistantPanel = select("[data-student-assistant-panel]");
    const saDepartmentContext = select("[data-sa-department-context]");
    const saPendingCount = select("[data-sa-pending-count]");
    const saEncodedCount = select("[data-sa-encoded-count]");
    const saProgramsCount = select("[data-sa-programs-count]");
    const saFilterPendingCount = select("[data-sa-filter-pending-count]");
    const saFilterEncodedCount = select("[data-sa-filter-encoded-count]");
    const saStatus = select("[data-sa-status]");
    const saApplicationsList = select("[data-sa-applications-list]");
    const saEmptyState = select("[data-sa-empty-state]");
    const saDetailContainer = select("[data-sa-detail-container]");
    const saStudentName = select("[data-sa-student-name]");
    const saStudentDetails = select("[data-sa-student-details]");
    const saStudentStatus = select("[data-sa-student-status]");
    const saFootprintBanner = select("[data-sa-footprint-banner]");
    const saEncodedByText = select("[data-sa-encoded-by-text]");
    const saEncodedAtText = select("[data-sa-encoded-at-text]");
    const saEncodeForm = select("[data-sa-encode-form]");
    const saSubjectsBody = select("[data-sa-subjects-body]");
    const saEncodeError = select("[data-sa-encode-error]");
    const saSubmitEncode = select("[data-sa-submit-encode]");
    const refreshStudentAssistantBtn = select("[data-refresh-student-assistant]");

    // Dean DOM Elements
    const deanPanel = select("[data-dean-panel]");
    const deanCollegeContext = select("[data-dean-college-context]");
    const deanRefreshBtn = select("[data-refresh-dean]");
    const deanStudentsCount = select("[data-dean-students-count]");
    const deanFacultyCount = select("[data-dean-faculty-count]");
    const deanProgramsCount = select("[data-dean-programs-count]");
    const deanGradesPendingCount = select("[data-dean-grades-pending-count]");

    // Dean Grade Review
    const deanGradesTbody = select("[data-dean-grades-tbody]");
    const deanGradesSearch = select("[data-dean-grades-search]");
    const deanGradesSort = select("[data-dean-grades-sort]");
    const refreshDeanGradesBtn = select("[data-refresh-dean-grades]");
    const deanGradeDialog = select("[data-dean-grade-dialog]");
    const deanGradeDialogTitle = select("[data-dean-grade-dialog-title]");
    const deanGradeDialogMeta = select("[data-dean-grade-dialog-meta]");
    const deanGradeSheetTbody = select("[data-dean-grade-sheet-tbody]");
    const deanGradeRemarks = select("#dean-grade-remarks");
    const deanGradeError = select("[data-dean-grade-error]");
    const deanApproveGradesBtn = select("[data-dean-approve-grades]");
    const deanReturnGradesBtn = select("[data-dean-return-grades]");
    const closeDeanGradeDialogBtns = selectAll("[data-close-dean-grade-dialog]");

    // Dean Students
    const deanStudentsTbody = select("[data-dean-students-tbody]");
    const deanStudentSearch = select("[data-dean-student-search]");
    const deanStudentSort = select("[data-dean-student-sort]");

    // Dean Faculty
    const deanFacultyTbody = select("[data-dean-faculty-tbody]");
    const deanFacultySearch = select("[data-dean-faculty-search]");
    const deanFacultySort = select("[data-dean-faculty-sort]");

    // Dean Evaluation
    const deanEvaluationsTbody = select("[data-dean-evaluations-tbody]");
    const deanEvalSearch = select("[data-dean-eval-search]");
    const deanEvalSort = select("[data-dean-eval-sort]");
    const refreshDeanEvaluationsBtn = select("[data-refresh-dean-evaluations]");
    const deanEvaluationDialog = select("[data-dean-evaluation-dialog]");
    const deanEvalTitle = select("[data-dean-eval-title]");
    const deanEvalMeta = select("[data-dean-eval-meta]");
    const deanEvalIssuesContainer = select("[data-dean-eval-issues-container]");
    const deanEvalSubjectsTbody = select("[data-dean-eval-subjects-tbody]");
    const deanEvalOverrideReasonField = select("[data-dean-eval-override-reason-field]");
    const deanEvalOverrideReason = select("#dean-eval-override-reason");
    const deanEvalRemarks = select("#dean-eval-remarks");
    const deanEvalError = select("[data-dean-eval-error]");
    const deanSubmitEvaluationBtn = select("[data-dean-submit-evaluation]");
    const closeDeanEvalDialogBtns = selectAll("[data-close-dean-eval-dialog], [data-close-dean-evaluation-dialog]");

    // Dean Class Schedules
    const deanSchedulesTbody = select("[data-dean-schedules-tbody]");
    const deanSchedulesSearch = select("[data-dean-schedules-search]");
    const deanSchedulesSort = select("[data-dean-schedules-sort]");

    // SSC DOM Elements
    const sscPanel = select("[data-ssc-panel]");
    const sscTotalClubs = select("[data-ssc-total-clubs]");
    const sscActiveClubs = select("[data-ssc-active-clubs]");
    const sscInactiveClubs = select("[data-ssc-inactive-clubs]");
    const sscExpiredClubs = select("[data-ssc-expired-clubs]");
    const sscClubsTable = select("[data-ssc-clubs-table]");
    const sscClubsBody = select("[data-ssc-clubs-body]");
    const sscStatus = select("[data-ssc-status]");
    const sscSearch = select("[data-ssc-search]");
    const clearSscSearchBtn = select("[data-clear-ssc-search]");
    const sscCreateClubDialog = select("[data-ssc-create-club-dialog]");
    const sscCreateClubForm = select("[data-ssc-create-club-form]");
    const sscCreateError = select("[data-ssc-create-error]");
    const sscEditDatesDialog = select("[data-ssc-edit-dates-dialog]");
    const sscEditDatesForm = select("[data-ssc-edit-dates-form]");
    const sscDatesError = select("[data-ssc-dates-error]");
    const refreshSscBtn = select("[data-refresh-ssc]");
    const openCreateClubBtn = select("[data-open-create-club]");

    // Club Management DOM Elements
    const clubPanel = select("[data-club-panel]");
    const clubHeaderName = select("[data-club-header-name]");
    const clubHeaderCategory = select("[data-club-header-category]");
    const clubHeaderLead = select("[data-club-header-lead]");
    const clubHeaderStatus = select("[data-club-header-status]");
    const refreshClubBtn = select("[data-refresh-club]");
    const assignOfficerForm = select("[data-assign-officer-form]");
    const verifyOfficerBtn = select("[data-verify-officer-btn]");
    const officerVerifyResult = select("[data-officer-verify-result]");
    const officerError = select("[data-officer-error]");
    const clubOfficersBody = select("[data-club-officers-body]");
    const clubMembersBody = select("[data-club-members-body]");
    const clubClearedCount = select("[data-club-cleared-count]");
    const clubTotalMembersCount = select("[data-club-total-members-count]");
    const createAnnouncementForm = select("[data-create-announcement-form]");
    const announcementError = select("[data-announcement-error]");
    const clubAnnouncementsList = select("[data-club-announcements-list]");
    const createDocumentForm = select("[data-create-document-form]");
    const documentError = select("[data-document-error]");
    const clubDocumentsBody = select("[data-club-documents-body]");
    const clubOfficerSearchInput = select("[data-club-officer-search]");
    const clubMemberSearchInput = select("[data-club-member-search]");
    const clubMemberFilterGroup = select("[data-club-member-filter-group]");
    const clubAnnouncementSearchInput = select("[data-club-announcement-search]");
    const clubDocSearchInput = select("[data-club-doc-search]");
    const clubDocFilterSelect = select("[data-club-doc-filter-select]");

    // Student Clubs DOM Elements
    const studentActiveClubsCount = select("[data-student-active-clubs-count]");
    const refreshStudentClubsBtn = select("[data-refresh-student-clubs]");
    const studentMyClubsBody = select("[data-student-my-clubs-body]");
    const studentAvailableClubsGrid = select("[data-student-available-clubs-grid]");
    const studentClubsStatus = select("[data-student-clubs-status]");
    const studentClubPortalDialog = select("[data-student-club-portal-dialog]");
    const portalClubName = select("[data-portal-club-name]");
    const portalCategoryLabel = select("[data-portal-category-label]");
    const portalClubLead = select("[data-portal-club-lead]");
    const portalClubStatus = select("[data-portal-club-status]");
    const portalRolePill = select("[data-portal-role-pill]");
    const portalExpiredBanner = select("[data-portal-expired-banner]");
    const portalAnnouncementsFeed = select("[data-portal-announcements-feed]");
    const portalAnnouncementSearchInput = select("[data-portal-announcement-search]");
    const portalDocsBody = select("[data-portal-docs-body]");
    const portalDocFilter = select("[data-portal-doc-filter]");
    const portalDocSearchInput = select("[data-portal-doc-search]");
    const portalOfficersBody = select("[data-portal-officers-body]");
    const portalOfficerSearchInput = select("[data-portal-officer-search]");
    const portalMyClearancePill = select("[data-portal-my-clearance-pill]");
    const portalMyClearanceDate = select("[data-portal-my-clearance-date]");
    const portalMyClearanceBy = select("[data-portal-my-clearance-by]");
    const portalMyClearanceRemarks = select("[data-portal-my-clearance-remarks]");
    const portalEvalTab = select("[data-portal-eval-tab]");
    const portalEvalBody = select("[data-portal-eval-body]");
    const portalEvalSearchInput = select("[data-portal-eval-search]");
    const portalEvalFilterGroup = select("[data-portal-eval-filter-group]");
    const portalEvalCountAll = select("[data-portal-eval-count-all]");
    const portalEvalCountPending = select("[data-portal-eval-count-pending]");
    const portalEvalCountCleared = select("[data-portal-eval-count-cleared]");
    const evalActionDialog = select("[data-eval-action-dialog]");
    const evalActionForm = select("[data-eval-action-form]");
    const evalActionError = select("[data-eval-action-error]");
    const evalFormTargetName = select("#eval-form-target-name");
    const evalFormClubId = select("#eval-form-club-id");
    const evalFormTargetId = select("#eval-form-target-id");
    const evalFormStatus = select("#eval-form-status");
    const evalFormRemarks = select("#eval-form-remarks");
    const usersStatus = select("[data-users-status]");
    const usersTable = select("[data-users-table]");
    const usersBody = select("[data-users-body]");
    const userSearchInput = select("[data-user-search]");
    const retryUsers = select("[data-retry-users]");
    const globalError = select("[data-global-error]");
    const roleDialog = select("[data-role-dialog]");
    const roleForm = select("[data-role-form]");
    const roleOptions = select("[data-role-options]");
    const primaryRoleSelect = select("#primary-role");
    const roleError = select("[data-role-error]");
    const roleStatus = select("[data-role-status]");
    const studentDashboard = select("[data-student-dashboard]");
    const studentLoading = select("[data-student-loading]");
    const studentError = select("[data-student-error]");
    const studentUnlinked = select("[data-student-unlinked]");
    const studentContent = select("[data-student-content]");

    const facultyPanel = select("[data-faculty-panel]");
    const registrarGradesPanel = select("[data-registrar-grades-panel]");
    const adminFacultySection = select("[data-admin-faculty-section]");
    const facultyClassesGrid = select("[data-faculty-classes-grid]");
    const facultyRosterDialog = select("[data-faculty-roster-dialog]");
    const facultyRosterTitle = select("[data-roster-dialog-title]");
    const facultyRosterInfo = select("[data-roster-info]");
    const facultyRosterTbody = select("[data-roster-tbody]");
    const saveDraftGradesBtn = select("[data-save-draft-grades]");
    const submitGradesBtn = select("[data-submit-grades]");
    const closeRosterDialogBtn = select("[data-close-roster-dialog]");
    const refreshFacultyBtn = select("[data-refresh-faculty]");

    const adminFacultyTbody = select("[data-admin-faculty-tbody]");
    const showFacultyFormBtn = select("[data-show-faculty-form]");
    const refreshAdminFacultyBtn = select("[data-refresh-admin-faculty]");
    const facultyCreateDialog = select("[data-faculty-create-dialog]");
    const facultyCreateForm = select("[data-faculty-create-form]");
    const facultyCreateError = select("[data-faculty-create-error]");
    const facultyCollegeSelect = select("#faculty-college");
    const closeFacultyCreateDialogBtn = select("[data-close-faculty-create-dialog]");

    const gradeSubmissionsTbody = select("[data-grade-submissions-tbody]");
    const refreshGradeSubmissionsBtn = select("[data-refresh-grade-submissions]");
    const gradeSheetDialog = select("[data-grade-sheet-dialog]");
    const gradeSheetTitle = select("[data-grade-sheet-title]");
    const gradeSheetTbody = select("[data-grade-sheet-tbody]");
    const closeGradeSheetDialogBtns = selectAll("[data-close-grade-sheet-dialog]");
    const approveGradesBtn = select("[data-approve-grades-btn]");
    const returnGradesBtn = select("[data-return-grades-btn]");

    const state = {
        user: null,
        roles: [],
        roleCatalog: [],
        users: [],
        adminLoaded: false,
        editingUser: null,
        studentDashboard: null,
        studentLoaded: false,
        studentLoading: false,
        registrarLoaded: false,
        registrarDashboard: null,
        programHeadLoaded: false,
        programHeadDashboard: null,
        programHeadSubjects: [],
        programHeadEvaluation: null,
        registrarFilter: "",
        registrarApplications: [],
        currentReview: null,
        selectedDocumentId: null,
        monitoringHealth: null,
        registrarOfferingOptions: null,
        registrarOfferings: [],
        registrarSubjects: [],
        facultyLoaded: false,
        facultyClasses: [],
        activeOfferingRoster: null,
        adminFaculty: [],
        adminColleges: [],
        gradeSubmissions: [],
        activeRegistrarGradeSheet: null,
        studentAssistantLoaded: false,
        studentAssistantDashboard: null,
        studentAssistantApplications: [],
        studentAssistantFilter: "PENDING",
        selectedSaApplicationId: null,
        currentSaDetail: null,
        sscLoaded: false,
        sscClubs: [],
        sscCurrentFilter: "ALL",
        clubLoaded: false,
        clubDashboard: null,
        clubOfficerSearch: "",
        clubMemberSearch: "",
        clubMemberFilter: "ALL",
        clubAnnouncementSearch: "",
        clubDocSearch: "",
        clubDocCategory: "ALL",
        studentClubsLoaded: false,
        studentAvailableClubs: [],
        studentMyClubs: [],
        studentActiveClubPortal: null,
        deanLoaded: false,
        deanOverview: null,
        deanGrades: [],
        activeDeanGradeSheet: null,
        deanStudents: [],
        deanFaculty: [],
        deanEvaluations: [],
        activeDeanEvaluation: null,
        deanSchedules: [],
        studentImportRequests: [],
        registrarImportRequests: [],
        activeRegistrarImport: null,
        activeRegistrarImportPreview: null,
        academicPrograms: [],
    };
    let mandatoryPrompted = false;
    let roleDialogReturnFocus = null;
    let studentAutoRefreshTimer = null;
    let programHeadCurriculumSubmitLocked = false;

    const roleNames = {
        student: "Student",
        faculty: "Faculty",
        program_head: "Program Head",
        dean: "Dean",
        administrator: "Administrator",
        student_assistant: "Student Assistant",
        club: "Club Account",
        registrar: "Registrar",
        cashier: "Cashier",
        ssc: "SSC",
        lirc_director: "LiRC Director",
        laboratory_in_charge: "Laboratory In-charge",
        yearbook_coordinator: "Yearbook Coordinator",
        proctor: "Proctor",
    };
    const accountCreationRoleSlugs = new Set(["administrator", "registrar", "program_head", "dean", "cashier", "student", "student_assistant", "ssc"]);
    const humanize = (value) => String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const escapeHtml = (unsafe) => String(unsafe ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    const safeExternalUrl = (value) => {
        try {
            const url = new URL(String(value || ""), window.location.origin);
            return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
        } catch {
            return "";
        }
    };
    const roleName = (slug) => {
        const catalogRole = state.roleCatalog.find((role) => role.slug === slug);
        return catalogRole?.name || roleNames[slug] || humanize(slug) || "Project user";
    };
    const normalizeRoles = (roles) => Array.isArray(roles)
        ? roles.map((role) => typeof role === "string" ? role : role?.slug).filter(Boolean)
        : [];
    const displayName = (user) => String(
        user?.displayName || user?.name || user?.username || user?.email || "Project account",
    );
    const passwordLength = (value) => Array.from(value).length;
    const isAdministrator = () => state.roles.includes("administrator");
    const isRegistrar = () => state.roles.includes("registrar");
    const isProgramHead = () => state.roles.includes("program_head");
    const isFaculty = () => state.roles.includes("faculty");
    const isStudentAssistant = () => state.roles.includes("student_assistant");
    const isSsc = () => state.roles.includes("ssc");
    const isClub = () => state.roles.includes("club");
    const isDean = () => state.roles.includes("dean");
    const isStudentWorkspace = () => location.pathname === "/portal/student"
        || (location.pathname === "/portal.html" && (state.user?.primaryRole === "student" || state.roles.includes("student")));
    const needsPasswordChange = () => Boolean(state.user?.mustChangePassword);
    const redirectToSignIn = () => {
        const returnTo = `${location.pathname}${location.search}`;
        location.replace(`/index.html?signin=1&returnTo=${encodeURIComponent(returnTo)}`);
    };

    const setText = (selector, value) => {
        selectAll(selector).forEach((element) => {
            element.textContent = value;
        });
    };
    const setBusy = (container, busy) => {
        if (!container) return;
        container.setAttribute("aria-busy", String(busy));
        selectAll("input, select, button", container).forEach((control) => {
            control.disabled = busy;
        });
        select("[type='submit']", container)?.classList.toggle("is-busy", busy);
    };
    const clearMessage = (element) => {
        if (!element) return;
        element.textContent = "";
        element.hidden = true;
    };
    const showError = (element, message) => {
        if (!element) return;
        element.textContent = message;
        element.hidden = false;
    };
    const handleExpiredSession = (error) => {
        if (error?.status !== 401) return false;
        auth?.clearCsrf();
        redirectToSignIn();
        return true;
    };

    const formatDate = (value) => {
        if (!value) return "Date not available";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Date not available";
        return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(date);
    };
    const formatMoney = (value, currency = "PHP") => {
        const amount = Number(value);
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: /^[A-Z]{3}$/.test(currency) ? currency : "PHP",
            minimumFractionDigits: 2,
        }).format(Number.isFinite(amount) ? amount : 0);
    };
    const plural = (count, singular, pluralValue = `${singular}s`) =>
        `${count} ${count === 1 ? singular : pluralValue}`;
    const clearDashboardList = (selector, message) => {
        const container = select(selector);
        if (!container) return null;
        container.replaceChildren();
        const empty = document.createElement("p");
        empty.className = "dashboard-list__empty";
        empty.textContent = message;
        container.append(empty);
        return container;
    };
    const dashboardListItem = (title, details, trailing) => {
        const item = document.createElement("article");
        item.className = "dashboard-list__item";
        const copy = document.createElement("div");
        const heading = document.createElement("strong");
        const meta = document.createElement("small");
        heading.textContent = title;
        meta.textContent = details;
        copy.append(heading, meta);
        item.append(copy);
        if (trailing) {
            const value = document.createElement("span");
            value.className = "dashboard-list__value";
            value.textContent = trailing;
            item.append(value);
        }
        return item;
    };

    const enrollmentWorkflowStatus = (enrollment, appData) => {
        if (appData?.application?.status) return String(appData.application.status).toUpperCase();
        const enrollmentStatus = String(enrollment?.status || "").toUpperCase();
        if (enrollmentStatus) return enrollmentStatus;
        const admissionStatus = String(appData?.admission?.status || "").toUpperCase();
        if (admissionStatus) return admissionStatus;
        return String(appData?.application?.status || "").toUpperCase();
    };

    const canOpenEnrollmentForm = (status) => ![
        "PENDING",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "ENROLLED",
        "COMPLETED"
    ].includes(String(status || "").toUpperCase());

    const loadStudentFinancialObligations = async (academicTermId = null) => {
        const list = clearDashboardList("[data-payment-obligation-list]", "No payment obligations are assigned.");
        const status = select("[data-financial-status]");
        try {
            const data = await auth.getFinancialObligations(academicTermId);
            const obligations = Array.isArray(data.obligations) ? data.obligations : [];
            setText("[data-payment-obligation-count]", plural(obligations.length, "obligation"));
            if (obligations.length) {
                list.replaceChildren(...obligations.map((obligation) => {
                    const item = dashboardListItem(
                        obligation.paymentType?.name || "Payment obligation",
                        `${formatMoney(obligation.amountDue, "PHP")} · ${humanize(obligation.status)}`,
                        ""
                    );
                    if (!["PAID", "WAIVED", "CANCELLED"].includes(obligation.status)) {
                        const button = document.createElement("button");
                        button.type = "button";
                        button.className = "button button--primary button--compact";
                        button.dataset.payObligation = obligation.id;
                        button.setAttribute("aria-label", `Pay ${obligation.paymentType?.name || "obligation"}`);
                        button.title = "Process this payment through the simulated development gateway.";
                        button.textContent = "Pay now";
                        item.append(button);
                    } else if (obligation.status === "PAID") {
                        const paid = document.createElement("span");
                        paid.className = "status-pill status-verified";
                        paid.textContent = "Verified";
                        item.append(paid);
                    }
                    return item;
                }));
            }
            const entranceFee = obligations.find((entry) => entry.paymentType?.name === "Entrance Fee");
            const enrollmentButton = select("[data-open-enrollment-application]");
            if (enrollmentButton && academicTermId) {
                if (enrollmentButton.dataset.lockedByStatus !== "true") {
                    const unlocked = entranceFee && ["PAID", "WAIVED"].includes(entranceFee.status);
                    enrollmentButton.disabled = !unlocked;
                    enrollmentButton.title = unlocked
                        ? ""
                        : entranceFee
                            ? "Pay and verify the entrance fee for this semester before enrolling."
                            : "No enrollment fee has been assigned for this semester. Contact the Registrar.";
                }
            }
            if (status) status.textContent = "";
        } catch (error) {
            if (status) status.textContent = error.message || "Payment obligations could not be loaded.";
        }
    };

    const renderStudentDashboard = async (dashboard) => {
        state.studentDashboard = dashboard;
        studentLoading.hidden = true;
        studentError.hidden = true;
        studentUnlinked.hidden = Boolean(dashboard?.linked);
        studentContent.hidden = !dashboard?.linked;
        if (!dashboard?.linked || !dashboard.student) return;

        const student = dashboard.student;
        const enrollment = dashboard.currentEnrollment;
        const clearance = dashboard.clearance;
        setText("[data-student-name]", student.name || displayName(state.user));
        setText("[data-student-number]", student.studentNumber || "Student number not assigned");
        setText("[data-student-status]", humanize(student.status || "unknown"));
        setText("[data-student-program]", student.program
            ? `${student.program.code} — ${student.program.name}`
            : "Program not assigned");
        setText("[data-student-curriculum]", student.curriculum
            ? `${student.curriculum.code} (Version ${student.curriculum.version})`
            : "Curriculum not assigned");
        setText("[data-student-year]", student.currentYearLevel
            ? `Year ${student.currentYearLevel}`
            : "Not assigned");
        setText("[data-student-email]", student.institutionalEmail || "Not provided");

        setText("[data-current-term]", enrollment?.academicTerm?.name || "No enrollment");
        setText("[data-enrollment-status]", enrollment
            ? humanize(enrollment.status)
            : "No current enrollment record");
        setText("[data-registered-load]", plural(enrollment?.subjectCount || 0, "subject"));
        setText("[data-registered-units]", plural(Number(enrollment?.registeredUnits || 0), "unit"));
        setText("[data-clearance-status]", clearance ? humanize(clearance.status) : "No cycle");
        setText("[data-clearance-progress]", clearance
            ? `${clearance.counts.cleared} of ${clearance.counts.total} requirements cleared`
            : "No clearance requirements");
        setText("[data-account-balance]", formatMoney(dashboard.finance?.balance, "PHP"));

        let appData = null;
        let enrollmentOptionsData = null;

        // Application status
        const applicationStatus = select("[data-application-status]");
        if (dashboard?.linked && dashboard.student) {
            try {
                appData = await auth.getEnrollmentApplication();
                const status = appData.application?.status || appData.admission?.status;
                const feedback = appData.feedback;
                if (status) {
                    const statusMap = {
                        PENDING: "🟡 Pending review",
                        SUBMITTED: "Awaiting Program Head review",
                        UNDER_REVIEW: "Awaiting Registrar verification",
                        APPROVED: "🟢 Approved",
                        REJECTED: "🔴 Rejected",
                        RETURNED_FOR_CORRECTION: "🔴 Needs Correction"
                    };
                    applicationStatus.textContent = statusMap[status] || status;
                    applicationStatus.hidden = false;
                }
                if (feedback && feedback.length) {
                    const feedbackList = select("[data-application-feedback-list]");
                    if (feedbackList) {
                        feedbackList.replaceChildren();
                        feedback.forEach((fb) => {
                            const item = document.createElement("div");
                            item.className = "application-feedback-item";
                            const date = new Date(fb.createdAt);
                            const heading = document.createElement("p");
                            const title = document.createElement("strong");
                            const message = document.createElement("p");
                            title.textContent = humanize(fb.actionType);
                            heading.append(title, ` - ${date.toLocaleDateString()}`);
                            message.textContent = fb.comment || "No remarks";
                            item.append(heading, message);
                            feedbackList.append(item);
                        });
                    }
                    applicationStatus.textContent += " - Has registrar feedback";
                }
            } catch {
                // Application data not available yet
            }
            try {
                enrollmentOptionsData = await auth.getEnrollmentOptions();
            } catch {
                enrollmentOptionsData = null;
            }
        }

        const enrollmentSummary = select("[data-enrollment-form-summary]");
        const enrollmentAction = select("[data-open-enrollment-application]");
        enrollmentSummary?.replaceChildren();
        const workflowStatus = enrollmentWorkflowStatus(enrollment, appData);
        const openTerm = (enrollmentOptionsData?.terms || []).find((term) => term?.enrollmentOpen);
        const needsEnrollmentForOpenTerm = Boolean(
            openTerm && (!enrollment || enrollment.academicTerm?.id !== openTerm.id)
        );
        setText("[data-enrollment-form-status]", workflowStatus ? humanize(workflowStatus) : "Not started");
        if (enrollmentAction) {
            const editable = needsEnrollmentForOpenTerm || canOpenEnrollmentForm(workflowStatus);
            enrollmentAction.hidden = !editable;
            enrollmentAction.disabled = !editable;
            enrollmentAction.dataset.lockedByStatus = editable ? "false" : "true";
            enrollmentAction.textContent = needsEnrollmentForOpenTerm
                ? "Start enrollment for current term"
                : ["DRAFT", "REJECTED", "RETURNED_FOR_CORRECTION"].includes(workflowStatus)
                    ? "Continue enrollment form"
                    : "Complete enrollment form";
            if (!editable) {
                enrollmentAction.title = "Enrollment form updates are not available in the current status.";
            } else {
                enrollmentAction.title = needsEnrollmentForOpenTerm
                    ? "Enrollment is open for the current term."
                    : "";
            }
        }
        if (enrollmentSummary) {
            if (!enrollment) {
                const empty = document.createElement("p");
                empty.className = "dashboard-list__empty";
                empty.textContent = "No enrollment record is available for the current term.";
                enrollmentSummary.append(empty);
            } else {
                const term = document.createElement("strong");
                term.textContent = enrollment.academicTerm?.name || "Current term";
                const details = document.createElement("p");
                details.className = "form-summary__meta";
                details.textContent = `${plural(enrollment.subjectCount || 0, "subject")} · ${plural(Number(enrollment.registeredUnits || 0), "unit")} · ${humanize(enrollment.status)}`;
                enrollmentSummary.append(term, details);
                (enrollment.items || []).forEach((item) => {
                    enrollmentSummary.append(dashboardListItem(
                        `${item.subjectCode} — ${item.subjectTitle}`,
                        item.section || "Registered subject",
                        `${item.creditUnits || 0} units`
                    ));
                });
            }
        }

        const clearanceList = select("[data-clearance-form-list]");
        clearanceList?.replaceChildren();
        const clearanceStatusEl = select("[data-clearance-form-status]");
        if (clearanceStatusEl) {
            const stat = clearance?.status || "NOT_STARTED";
            clearanceStatusEl.textContent = clearance ? humanize(clearance.status) : "Not started";
            clearanceStatusEl.className = `status-pill ${stat === "CLEARED" || stat === "APPROVED"
                ? "status-pill--active"
                : stat === "BLOCKED" || stat === "NOT_CLEARED"
                    ? "status-pill--expired"
                    : "status-pill--pending"
                }`;
        }
        if (clearanceList) {
            const items = Array.isArray(clearance?.items) ? clearance.items : [];
            if (!items.length) {
                const empty = document.createElement("p");
                empty.className = "dashboard-list__empty";
                empty.textContent = "No clearance form has been issued for this student yet.";
                clearanceList.append(empty);
            } else {
                items.forEach((item) => {
                    const details = [
                        item.remarks || "No remarks",
                        item.processedAt ? `Processed ${formatDate(item.processedAt)}` : "Not processed"
                    ].join(" · ");
                    const trailing = item.status === "APPROVED" || item.status === "CLEARED" ? "Cleared" : humanize(item.status);
                    clearanceList.append(dashboardListItem(item.office || humanize(item.officeType), details, trailing));
                });
            }
        }

        const schedule = Array.isArray(dashboard.schedule) ? dashboard.schedule : [];
        const scheduleList = clearDashboardList("[data-schedule-list]", "No class schedule is available for the current enrollment.");
        setText("[data-schedule-count]", plural(schedule.length, "meeting"));
        if (schedule.length) {
            scheduleList.replaceChildren(...schedule.map((meeting) => {
                const room = meeting.room
                    ? [meeting.room.building, meeting.room.code].filter(Boolean).join(" · ")
                    : "Room to be announced";
                const timeText = meeting.weekday
                    ? `${humanize(meeting.weekday)} · ${meeting.startsAt || "TBA"}–${meeting.endsAt || "TBA"}`
                    : "Schedule TBA";
                return dashboardListItem(
                    `${meeting.subjectCode} — ${meeting.subjectTitle}`,
                    `${timeText} · ${room}`,
                    meeting.section || ""
                );
            }));
        }

        const grades = Array.isArray(dashboard.finalGrades) ? dashboard.finalGrades : [];
        const gradeList = clearDashboardList("[data-grade-list]", "No posted final grades are available for the current enrollment.");
        setText("[data-grade-count]", plural(grades.length, "grade"));
        const gradesBadge = select("[data-student-grades-badge]");
        if (gradesBadge) {
            gradesBadge.textContent = String(grades.length);
            gradesBadge.hidden = grades.length === 0;
        }
        if (grades.length) {
            gradeList.replaceChildren(...grades.map((grade) => dashboardListItem(
                `${grade.subjectCode} — ${grade.subjectTitle}`,
                `${grade.period}${grade.remarks ? ` · ${grade.remarks}` : ""}`,
                grade.letterGrade || grade.numericGrade || "Posted"
            )));
        }

        const academicHistory = Array.isArray(dashboard.academicHistory) ? dashboard.academicHistory : [];
        const historyList = clearDashboardList("[data-academic-history-list]", "No historical or credited academic records found.");
        setText("[data-history-term-count]", plural(academicHistory.length, "term"));
        const historyBadge = select("[data-student-history-badge]");
        if (historyBadge) {
            historyBadge.textContent = String(academicHistory.length);
            historyBadge.hidden = academicHistory.length === 0;
        }
        if (academicHistory.length) {
            historyList.replaceChildren(...academicHistory.flatMap((termEntry) => {
                const termHeader = document.createElement("div");
                termHeader.className = "dashboard-list-item dashboard-list-item--header";
                termHeader.style.fontWeight = "600";
                termHeader.style.padding = "0.5rem 0.75rem";
                termHeader.style.borderRadius = "var(--radius-sm, 4px)";
                termHeader.style.background = "var(--surface-muted, rgba(0,0,0,0.04))";
                termHeader.innerHTML = `<strong>${escapeHtml(termEntry.academicYear ? `${termEntry.academicYear} · ` : "")}${escapeHtml(termEntry.termName || termEntry.termCode)}</strong> <small style="margin-left:auto;">${plural(termEntry.grades.length, "subject")} · ${termEntry.totalUnits} units</small>`;

                const subjectRows = termEntry.grades.map((grade) => dashboardListItem(
                    `${grade.subjectCode} — ${grade.subjectTitle}`,
                    `${grade.creditUnits} units · ${grade.period}${grade.remarks ? ` · ${grade.remarks}` : ""}`,
                    grade.letterGrade || grade.numericGrade || (grade.isPassing ? "Passed" : "Posted")
                ));
                return [termHeader, ...subjectRows];
            }));
        }

        const requests = Array.isArray(dashboard.requests) ? dashboard.requests : [];
        const requestList = clearDashboardList("[data-request-list]", "You have no recent student-service requests.");
        setText("[data-request-count]", plural(requests.length, "request"));
        if (requests.length) {
            requestList.replaceChildren(...requests.map((request) => dashboardListItem(
                request.requestType?.name || "Student request",
                `${request.requestNumber} · ${formatDate(request.submittedAt)}`,
                humanize(request.status)
            )));
        }

        const payments = Array.isArray(dashboard.finance?.payments) ? dashboard.finance.payments : [];
        const paymentList = clearDashboardList("[data-payment-list]", "No payment records are available.");
        setText("[data-payment-count]", plural(payments.length, "payment"));
        if (payments.length) {
            paymentList.replaceChildren(...payments.map((payment) => dashboardListItem(
                payment.receiptNumber,
                `${formatDate(payment.receivedAt)} · ${humanize(payment.method)}`,
                formatMoney(payment.amount, payment.currency)
            )));
        }
        const academicTermId = openTerm?.id || dashboard.currentEnrollment?.academicTerm?.id || null;
        await loadStudentFinancialObligations(academicTermId);
    };

    const loadStudentDashboard = async () => {
        if (!isStudentWorkspace() || needsPasswordChange() || state.studentLoading) return;
        state.studentLoading = true;
        studentLoading.hidden = false;
        studentError.hidden = true;
        studentUnlinked.hidden = true;
        studentContent.hidden = true;
        try {
            const data = await auth.getStudentDashboard();
            state.studentLoaded = true;
            await renderStudentDashboard(data.dashboard);
            await loadStudentClubs();
            await loadStudentImportRequests();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            state.studentLoaded = false;
            studentLoading.hidden = true;
            studentError.hidden = false;
            setText("[data-student-error-message]", error.status === 403
                ? "Your account no longer has access to the Student workspace."
                : "The student dashboard is temporarily unavailable. Try again.");
        } finally {
            state.studentLoading = false;
        }
    };

    const startStudentAutoRefresh = () => {
        if (studentAutoRefreshTimer) return;
        studentAutoRefreshTimer = window.setInterval(() => {
            if (document.hidden || state.studentLoading || !isStudentWorkspace() || needsPasswordChange()) return;
            void loadStudentDashboard();
        }, 30000);
    };

    const stopStudentAutoRefresh = () => {
        if (!studentAutoRefreshTimer) return;
        window.clearInterval(studentAutoRefreshTimer);
        studentAutoRefreshTimer = null;
    };

    const renderPortal = () => {
        const user = state.user;
        state.roles = normalizeRoles(user?.roles);
        const primaryRole = user?.primaryRole && state.roles.includes(user.primaryRole)
            ? user.primaryRole
            : (state.roles[0] || "");
        const primaryLabel = roleName(primaryRole);
        const name = displayName(user);
        const required = needsPasswordChange();
        const studentWorkspace = isStudentWorkspace();
        document.body.classList.toggle("student-mode", studentWorkspace && !required);

        setText("[data-role-label]", `${primaryLabel} account`);
        setText("[data-workspace-title]", `${primaryLabel} workspace`);
        setText("[data-workspace-lead]", studentWorkspace
            ? "Review your current academic, clearance, request, and finance information in one secure workspace."
            : "Authentication and account tools are active. Operational dashboards will be added role by role.");
        setText("[data-user-chip-name]", name);
        setText("[data-user-chip-role]", primaryLabel);
        setText("[data-user-initial]", name.trim().charAt(0).toUpperCase() || "C");
        setText("[data-account-username]", user?.username || "Not provided");
        setText("[data-account-email]", user?.email || "Not provided");
        setText("[data-account-primary-role]", primaryLabel);
        setText("[data-account-roles]", state.roles.length ? state.roles.map(roleName).join(", ") : "No assigned role");
        setText("[data-account-status]", humanize(user?.status || "active"));
        const accountStatus = select("[data-account-status]");
        accountStatus?.classList.toggle("is-disabled", user?.status === "disabled");

        select("[data-password-required]").hidden = !required;
        const canManageAccounts = isAdministrator() && !required;
        const canManageRegistrar = isRegistrar() && !required;
        const canManageProgramHead = isProgramHead() && !required;
        const canManageFaculty = isFaculty() && !required;
        const canManageStudentAssistant = isStudentAssistant() && !required;
        const canManageSsc = isSsc() && !required;
        const canManageClub = isClub() && !required;
        const canManageDean = isDean() && !required;
        adminPanel.hidden = !canManageAccounts;
        if (sscPanel) sscPanel.hidden = !canManageSsc;
        if (clubPanel) clubPanel.hidden = !canManageClub;
        if (monitoringPanel) monitoringPanel.hidden = !canManageAccounts;
        registrarPanel.hidden = !canManageRegistrar;
        programHeadPanel.hidden = !canManageProgramHead;
        if (facultyPanel) facultyPanel.hidden = !canManageFaculty;
        if (studentAssistantPanel) studentAssistantPanel.hidden = !canManageStudentAssistant;
        if (deanPanel) deanPanel.hidden = !canManageDean;
        if (registrarGradesPanel) registrarGradesPanel.hidden = !canManageRegistrar;
        if (adminFacultySection) adminFacultySection.hidden = !canManageAccounts;
        const accountSection = select("[data-account-section]");
        if (accountSection) accountSection.hidden = !studentWorkspace || required;
        studentDashboard.hidden = !studentWorkspace || required;

        if (required && !mandatoryPrompted) {
            mandatoryPrompted = true;
            window.setTimeout(() => openPasswordDialog(true), 0);
        }
        if (canManageAccounts && !state.adminLoaded) {
            state.adminLoaded = true;
            void loadAdminData();
        }
        if (canManageAccounts && !state.adminFacultyLoaded) {
            state.adminFacultyLoaded = true;
            void loadAdminFaculty();
        }
        if (canManageRegistrar && !state.registrarLoaded) {
            state.registrarLoaded = true;
            void loadRegistrarData();
        }
        if (canManageRegistrar && !state.registrarGradesLoaded) {
            state.registrarGradesLoaded = true;
            void loadRegistrarGradeSubmissions();
        }
        if (canManageProgramHead && !state.programHeadLoaded) {
            state.programHeadLoaded = true;
            void loadProgramHeadData();
        }
        if (canManageFaculty && !state.facultyLoaded) {
            state.facultyLoaded = true;
            void loadFacultyClasses();
        }
        if (canManageStudentAssistant && !state.studentAssistantLoaded) {
            state.studentAssistantLoaded = true;
            void loadStudentAssistantData();
        }
        if (canManageDean && !state.deanLoaded) {
            state.deanLoaded = true;
            void loadDeanData();
        }
        if (canManageSsc && !state.sscLoaded) {
            state.sscLoaded = true;
            void loadSscData();
        }
        if (canManageClub && !state.clubLoaded) {
            state.clubLoaded = true;
            void loadClubData();
        }
        if (studentWorkspace && !required && !state.studentLoaded && !state.studentLoading) {
            void loadStudentDashboard();
        }
        if (studentWorkspace && !required) startStudentAutoRefresh();
        else stopStudentAutoRefresh();
    };

    const showBootError = (message) => {
        if (!bootState) return;
        bootState.classList.add("is-error");
        select(".spinner", bootState)?.remove();
        const heading = select("h1", bootState);
        if (heading) heading.textContent = "We could not open your workspace";
        if (bootMessage) bootMessage.textContent = message;
        if (!select(".boot-actions", bootState)) {
            const actions = document.createElement("div");
            actions.className = "boot-actions";
            const retry = document.createElement("button");
            retry.className = "button button--primary";
            retry.type = "button";
            retry.textContent = "Try again";
            retry.addEventListener("click", () => location.reload());
            const home = document.createElement("a");
            home.className = "button button--quiet";
            home.href = "/index.html";
            home.textContent = "Return home";
            actions.append(retry, home);
            bootState.append(actions);
        }
    };

    const bootstrap = async () => {
        if (!auth) {
            showBootError("The secure account client did not load. Refresh the page to try again.");
            return;
        }
        try {
            const session = await auth.getSession();
            if (!session.authenticated || !session.user) {
                redirectToSignIn();
                return;
            }
            state.user = session.user;
            state.roles = normalizeRoles(session.user.roles);
            bootState.hidden = true;
            portalApp.hidden = false;
            select("[data-session-actions]").hidden = false;
            renderPortal();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            showBootError(error?.code === "NETWORK_ERROR"
                ? error.message
                : "The project portal is temporarily unavailable. Please try again.");
        }
    };

    const resetPasswordForm = () => {
        passwordForm?.reset();
        clearMessage(passwordError);
        if (passwordStatus) passwordStatus.textContent = "";
        selectAll("[data-password-toggle]", passwordDialog || document).forEach((toggle) => {
            const input = document.getElementById(toggle.dataset.passwordTarget || "");
            if (input) input.type = "password";
            const label = document.querySelector(`label[for='${toggle.dataset.passwordTarget}']`)?.textContent || "password";
            toggle.textContent = "Show";
            toggle.setAttribute("aria-label", `Show ${label.toLowerCase()}`);
            toggle.setAttribute("aria-pressed", "false");
        });
        setBusy(passwordForm, false);
    };
    const openPasswordDialog = (required = needsPasswordChange()) => {
        if (!passwordDialog) return;
        resetPasswordForm();
        const intro = select("[data-password-intro]");
        if (intro) {
            intro.textContent = required
                ? "You must replace the temporary password before using account services."
                : "Choose a password used only for this independent project.";
        }
        if (typeof passwordDialog.showModal === "function") {
            if (!passwordDialog.open) passwordDialog.showModal();
        } else {
            passwordDialog.setAttribute("open", "");
        }
        window.setTimeout(() => select("#current-password")?.focus(), 60);
    };
    const closePasswordDialog = () => {
        if (!passwordDialog) return;
        if (typeof passwordDialog.close === "function" && passwordDialog.open) passwordDialog.close();
        else passwordDialog.removeAttribute("open");
        resetPasswordForm();
    };

    selectAll("[data-open-password]").forEach((button) => {
        button.addEventListener("click", () => openPasswordDialog());
    });
    select("[data-close-password]")?.addEventListener("click", closePasswordDialog);
    passwordDialog?.addEventListener("cancel", () => {
        window.setTimeout(resetPasswordForm, 0);
    });
    passwordDialog?.addEventListener("click", (event) => {
        if (event.target === passwordDialog) closePasswordDialog();
    });

    selectAll("[data-password-toggle]").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const input = document.getElementById(toggle.dataset.passwordTarget || "");
            if (!input) return;
            const showing = input.type === "password";
            input.type = showing ? "text" : "password";
            const label = document.querySelector(`label[for='${toggle.dataset.passwordTarget}']`)?.textContent || "password";
            toggle.textContent = showing ? "Hide" : "Show";
            toggle.setAttribute("aria-label", `${showing ? "Hide" : "Show"} ${label.toLowerCase()}`);
            toggle.setAttribute("aria-pressed", String(showing));
            input.focus();
        });
    });

    passwordForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (passwordForm.getAttribute("aria-busy") === "true") return;
        clearMessage(passwordError);
        if (passwordStatus) passwordStatus.textContent = "";
        const currentPassword = passwordForm.elements.currentPassword.value;
        const newPassword = passwordForm.elements.newPassword.value;
        const confirmation = passwordForm.elements.confirmPassword.value;
        let message = "";
        let focusTarget = null;
        if (!currentPassword) {
            message = "Enter your current password.";
            focusTarget = passwordForm.elements.currentPassword;
        } else if (passwordLength(newPassword) < 12 || passwordLength(newPassword) > 128) {
            message = "Your new password must contain 12–128 characters.";
            focusTarget = passwordForm.elements.newPassword;
        } else if (newPassword === currentPassword) {
            message = "Choose a new password that differs from your current password.";
            focusTarget = passwordForm.elements.newPassword;
        } else if (confirmation !== newPassword) {
            message = "The new passwords do not match.";
            focusTarget = passwordForm.elements.confirmPassword;
        }
        if (message) {
            showError(passwordError, message);
            focusTarget?.focus();
            return;
        }

        setBusy(passwordForm, true);
        if (passwordStatus) passwordStatus.textContent = "Updating password…";
        try {
            await auth.changePassword(currentPassword, newPassword);
            state.user = { ...state.user, mustChangePassword: false };
            try {
                const session = await auth.getSession();
                if (session.authenticated && session.user) state.user = session.user;
            } catch {
                // The mutation succeeded; the next protected request remains server-authorized.
            }
            passwordForm.reset();
            if (passwordStatus) passwordStatus.textContent = "Password updated successfully.";
            renderPortal();
            window.setTimeout(closePasswordDialog, 900);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (String(error.code).includes("CSRF")) {
                auth.clearCsrf();
                showError(passwordError, "Your secure session expired. Submit the form again.");
            } else if (error.status === 429) {
                showError(passwordError, "Too many attempts. Wait a few minutes, then try again.");
            } else if (error.code === "NETWORK_ERROR") {
                showError(passwordError, error.message);
            } else {
                showError(passwordError, "The current password is incorrect or the new password was not accepted.");
            }
            if (passwordStatus) passwordStatus.textContent = "";
            passwordForm.elements.currentPassword.value = "";
            passwordForm.elements.currentPassword.focus();
        } finally {
            setBusy(passwordForm, false);
        }
    });

    const logout = async () => {
        const buttons = selectAll("[data-logout], [data-dialog-logout]");
        buttons.forEach((button) => {
            button.disabled = true;
            button.setAttribute("aria-busy", "true");
        });
        clearMessage(globalError);
        try {
            await auth.logout();
        } catch (error) {
            console.warn("Logout request completed with notice:", error);
        }
        auth.clearCsrf();
        location.replace("/index.html");
    };
    selectAll("[data-logout], [data-dialog-logout]").forEach((button) => {
        button.addEventListener("click", logout);
    });

    const renderRoleOptions = () => {
        if (!roleSelect) return;
        roleSelect.replaceChildren();
        const accountRoles = state.roleCatalog.filter((role) => accountCreationRoleSlugs.has(role.slug));
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = accountRoles.length ? "Choose a role" : "No roles available";
        roleSelect.append(placeholder);
        accountRoles.forEach((role) => {
            const option = document.createElement("option");
            option.value = role.slug;
            option.textContent = role.name || roleName(role.slug);
            roleSelect.append(option);
        });
        roleSelect.disabled = !accountRoles.length;
        syncRoleAssignments();
    };

    const renderProgramOptions = (programs = []) => {
        if (!programSelect) return;
        programSelect.replaceChildren(new Option(programs.length ? "Choose a program" : "No programs available", ""));
        programs.forEach((program) => programSelect.append(new Option(`${program.code} · ${program.name}`, program.id)));
        programSelect.disabled = !programs.length || roleSelect?.value !== "program_head";
    };

    const renderDepartmentOptions = (departments = []) => {
        if (!departmentSelect) return;
        departmentSelect.replaceChildren(new Option(departments.length ? "Choose a department / college" : "No departments available", ""));
        departments.forEach((dept) => {
            const collegeCode = dept.college?.code ? ` [${dept.college.code}]` : "";
            departmentSelect.append(new Option(`${dept.code} · ${dept.name}${collegeCode}`, dept.id));
        });
        departmentSelect.disabled = !departments.length || roleSelect?.value !== "student_assistant";
    };

    const renderCollegeOptions = (colleges = []) => {
        if (!collegeSelect) return;
        collegeSelect.replaceChildren(new Option(colleges.length ? "Choose an assigned college" : "No colleges available", ""));
        colleges.forEach((c) => {
            collegeSelect.append(new Option(`${c.code} · ${c.name}`, c.id));
        });
        collegeSelect.disabled = !colleges.length || roleSelect?.value !== "dean";
    };

    const syncRoleAssignments = () => {
        const isPH = roleSelect?.value === "program_head";
        const isSA = roleSelect?.value === "student_assistant";
        const isDeanRole = roleSelect?.value === "dean";
        if (programAssignment) programAssignment.hidden = !isPH;
        if (programSelect) {
            programSelect.required = isPH;
            programSelect.disabled = !isPH || programSelect.options.length <= 1;
            if (!isPH) programSelect.value = "";
        }
        if (departmentAssignment) departmentAssignment.hidden = !isSA;
        if (departmentSelect) {
            departmentSelect.required = isSA;
            departmentSelect.disabled = !isSA || departmentSelect.options.length <= 1;
            if (!isSA) departmentSelect.value = "";
        }
        if (collegeAssignment) collegeAssignment.hidden = !isDeanRole;
        if (collegeSelect) {
            collegeSelect.required = isDeanRole;
            collegeSelect.disabled = !isDeanRole || collegeSelect.options.length <= 1;
            if (!isDeanRole) collegeSelect.value = "";
        }
    };
    roleSelect?.addEventListener("change", syncRoleAssignments);

    const selectedEditorRoles = () => selectAll("input[name='roles']:checked", roleForm || document)
        .map((input) => input.value)
        .filter((slug) => state.roleCatalog.some((role) => role.slug === slug));

    const syncPrimaryRoleOptions = (preferredRole = primaryRoleSelect?.value || "") => {
        if (!primaryRoleSelect) return;
        const assigned = selectedEditorRoles();
        primaryRoleSelect.replaceChildren();
        if (!assigned.length) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Select at least one assigned role";
            primaryRoleSelect.append(option);
            primaryRoleSelect.disabled = true;
            return;
        }
        assigned.forEach((slug) => {
            const option = document.createElement("option");
            option.value = slug;
            option.textContent = roleName(slug);
            primaryRoleSelect.append(option);
        });
        primaryRoleSelect.value = assigned.includes(preferredRole) ? preferredRole : assigned[0];
        primaryRoleSelect.disabled = false;
    };

    const resetRoleEditor = () => {
        roleForm?.reset();
        roleOptions?.replaceChildren();
        clearMessage(roleError);
        if (roleStatus) roleStatus.textContent = "";
        if (primaryRoleSelect) {
            primaryRoleSelect.replaceChildren();
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Select at least one assigned role";
            primaryRoleSelect.append(option);
        }
        setBusy(roleForm, false);
        if (primaryRoleSelect) primaryRoleSelect.disabled = true;
    };

    const finishRoleDialogClose = () => {
        const editedAccountName = state.editingUser ? displayName(state.editingUser) : "";
        const fallbackTarget = editedAccountName
            ? selectAll("button[aria-label^='Edit roles for']")
                .find((button) => button.getAttribute("aria-label") === `Edit roles for ${editedAccountName}`)
            : null;
        const focusTarget = roleDialogReturnFocus?.isConnected ? roleDialogReturnFocus : fallbackTarget;
        roleDialogReturnFocus = null;
        state.editingUser = null;
        resetRoleEditor();
        window.setTimeout(() => focusTarget?.focus(), 0);
    };

    const closeRoleDialog = () => {
        if (!roleDialog || roleForm?.getAttribute("aria-busy") === "true") return;
        if (typeof roleDialog.close === "function" && roleDialog.open) {
            roleDialog.close();
            return;
        }
        roleDialog.removeAttribute("open");
        finishRoleDialogClose();
    };

    const openRoleDialog = (user, returnFocus = document.activeElement) => {
        if (!roleDialog || !roleOptions || !isAdministrator() || needsPasswordChange()) return;
        if (String(user?.id) === String(state.user?.id) || !state.roleCatalog.length) return;
        state.editingUser = user;
        roleDialogReturnFocus = returnFocus instanceof HTMLElement ? returnFocus : null;
        resetRoleEditor();
        setText("[data-role-account-name]", displayName(user));
        const assigned = normalizeRoles(user.roles);
        state.roleCatalog.forEach((role, index) => {
            const label = document.createElement("label");
            label.className = "role-option";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.name = "roles";
            input.value = role.slug;
            input.id = `edit-role-${index}`;
            input.checked = assigned.includes(role.slug);
            input.addEventListener("change", () => syncPrimaryRoleOptions());
            const copy = document.createElement("span");
            copy.textContent = role.name || roleName(role.slug);
            label.append(input, copy);
            roleOptions.append(label);
        });
        syncPrimaryRoleOptions(user.primaryRole);
        if (typeof roleDialog.showModal === "function") {
            if (!roleDialog.open) roleDialog.showModal();
        } else {
            roleDialog.setAttribute("open", "");
        }
        window.setTimeout(() => select("input[name='roles']", roleForm)?.focus(), 60);
    };

    select("[data-close-role-dialog]")?.addEventListener("click", closeRoleDialog);
    roleDialog?.addEventListener("cancel", (event) => {
        if (roleForm?.getAttribute("aria-busy") === "true") {
            event.preventDefault();
        }
    });
    roleDialog?.addEventListener("close", finishRoleDialogClose);
    roleDialog?.addEventListener("click", (event) => {
        if (event.target === roleDialog) closeRoleDialog();
    });

    roleForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (roleForm.getAttribute("aria-busy") === "true") return;
        const target = state.editingUser;
        if (!target || String(target.id) === String(state.user?.id)
            || !isAdministrator() || needsPasswordChange()) {
            closeRoleDialog();
            return;
        }
        clearMessage(roleError);
        if (roleStatus) roleStatus.textContent = "";
        const assigned = selectedEditorRoles();
        const primaryRole = primaryRoleSelect?.value || "";
        if (!assigned.length) {
            showError(roleError, "Assign at least one role.");
            select("input[name='roles']", roleForm)?.focus();
            return;
        }
        if (!assigned.includes(primaryRole)) {
            showError(roleError, "Choose a primary role from the assigned roles.");
            primaryRoleSelect?.focus();
            return;
        }

        setBusy(roleForm, true);
        const closeButton = select("[data-close-role-dialog]");
        if (closeButton) closeButton.disabled = true;
        if (roleStatus) roleStatus.textContent = "Saving role assignments…";
        try {
            await auth.updateUserRoles(target.id, assigned, primaryRole);
            await loadUsers();
            if (roleStatus) roleStatus.textContent = "Role assignments updated successfully.";
            window.setTimeout(closeRoleDialog, 700);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (error.status === 422 || error.status === 409) {
                showError(roleError, error.message || "The role assignment was not accepted.");
            } else if (error.code === "NETWORK_ERROR") {
                showError(roleError, error.message);
            } else {
                showError(roleError, "Role assignments could not be updated. Try again.");
            }
            if (roleStatus) roleStatus.textContent = "";
        } finally {
            setBusy(roleForm, false);
            if (closeButton) closeButton.disabled = false;
        }
    });

    const loadRoles = async () => {
        try {
            const data = await auth.getRoles();
            state.roleCatalog = Array.isArray(data.roles) ? data.roles.filter((role) => role?.slug) : [];
            renderRoleOptions();
            if (state.users.length) renderUsers();
            renderPortal();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            state.roleCatalog = [];
            renderRoleOptions();
            showError(createError, error.status === 403
                ? "Administrator access is no longer available."
                : "Roles could not be loaded. Refresh the page to try again.");
        }
    };

    const appendCell = (row, label, content) => {
        const cell = document.createElement("td");
        cell.dataset.label = label;
        if (content instanceof Node) cell.append(content);
        else cell.textContent = String(content ?? "—");
        row.append(cell);
        return cell;
    };

    const renderUsers = () => {
        usersBody?.replaceChildren();

        const query = (userSearchInput?.value || "").trim().toLowerCase();
        let list = state.users || [];

        if (query) {
            list = list.filter((user) => {
                const name = displayName(user).toLowerCase();
                const username = (user.username || "").toLowerCase();
                const email = (user.email || "").toLowerCase();
                const roles = normalizeRoles(user.roles).map(roleName).join(" ").toLowerCase();
                const status = (user.status || "").toLowerCase();
                return name.includes(query) || username.includes(query) || email.includes(query) || roles.includes(query) || status.includes(query);
            });
        }

        const countText = query
            ? `${list.length} of ${state.users.length} account${state.users.length === 1 ? "" : "s"}`
            : `${state.users.length} account${state.users.length === 1 ? "" : "s"}`;
        setText("[data-user-count]", countText);

        if (!list.length) {
            if (usersStatus) usersStatus.textContent = query ? "No accounts match your search." : "No project accounts were returned.";
            usersTable.hidden = true;
            return;
        }

        list.forEach((user) => {
            const row = document.createElement("tr");
            const identity = document.createElement("span");
            const name = document.createElement("strong");
            const details = document.createElement("small");
            name.textContent = displayName(user);
            details.textContent = [user.username, user.email].filter(Boolean).join(" · ") || "No account details";
            identity.append(name, details);
            appendCell(row, "Account", identity);
            const roles = normalizeRoles(user.roles);
            appendCell(row, "Role", roles.length ? roles.map(roleName).join(", ") : "No role");
            appendCell(row, "Status", humanize(user.status || "unknown"));

            const isCurrentUser = String(user.id) === String(state.user?.id);
            const actions = document.createElement("div");
            actions.className = "account-actions";
            const action = document.createElement("button");
            action.type = "button";
            action.className = "button button--quiet status-control";
            const nextStatus = user.status === "active" ? "disabled" : "active";
            action.textContent = isCurrentUser ? "Current account" : `${nextStatus === "active" ? "Activate" : "Disable"}`;
            action.disabled = isCurrentUser;
            action.setAttribute("aria-label", isCurrentUser
                ? "This is your current account"
                : `${nextStatus === "active" ? "Activate" : "Disable"} ${displayName(user)}`);
            if (!isCurrentUser) {
                action.addEventListener("click", () => updateUserStatus(user, nextStatus, action));
            }
            actions.append(action);
            if (!isCurrentUser) {
                const editRoles = document.createElement("button");
                editRoles.type = "button";
                editRoles.className = "button button--quiet status-control";
                editRoles.textContent = "Edit roles";
                editRoles.disabled = !state.roleCatalog.length;
                editRoles.setAttribute("aria-label", `Edit roles for ${displayName(user)}`);
                if (!state.roleCatalog.length) editRoles.title = "Roles are still loading";
                editRoles.addEventListener("click", () => openRoleDialog(user, editRoles));
                actions.append(editRoles);

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.className = "button button--quiet status-control account-delete-control";
                deleteButton.textContent = "Delete";
                deleteButton.setAttribute("aria-label", `Delete ${displayName(user)}`);
                deleteButton.addEventListener("click", () => deleteUser(user, deleteButton));
                actions.append(deleteButton);
            }
            appendCell(row, "Actions", actions);
            usersBody?.append(row);
        });
        if (usersStatus) usersStatus.textContent = "";
        retryUsers.hidden = true;
        usersTable.hidden = false;
    };

    userSearchInput?.addEventListener("input", renderUsers);

    let loadUsers = async () => {
        if (!isAdministrator() || needsPasswordChange()) return;
        if (usersStatus) usersStatus.textContent = "Loading accounts…";
        usersTable.hidden = true;
        retryUsers.hidden = true;
        try {
            const data = await auth.getUsers();
            state.users = Array.isArray(data.users) ? data.users : [];
            renderUsers();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            state.users = [];
            if (usersStatus) {
                usersStatus.textContent = error.status === 403
                    ? "Administrator access is no longer available."
                    : "Accounts could not be loaded.";
            }
            retryUsers.hidden = false;
        }
    };

    const loadAdminData = async () => {
        if (!isAdministrator() || needsPasswordChange()) return;
        await Promise.allSettled([
            loadRoles(),
            loadUsers(),
            auth.getAdminPrograms().then((data) => renderProgramOptions(data.programs || [])),
            auth.getAdminDepartments().then((data) => renderDepartmentOptions(data.departments || [])),
            auth.getAdminColleges().then((data) => renderCollegeOptions(data.colleges || [])),
            renderAdminReports()
        ]);
    };

    const renderRegistrarDashboard = (dashboard) => {
        state.registrarDashboard = dashboard;
        const period = dashboard?.period;
        setText("[data-registrar-period-status]", period?.status || "Not configured");
        setText("[data-registrar-year]", period?.academicYear?.name || "—");
        setText("[data-registrar-term]", period?.academicTerm?.name || "—");
        setText("[data-registrar-opened]", period?.openedAt ? formatDate(period.openedAt) : "—");
        setText("[data-registrar-closed]", period?.closedAt ? formatDate(period.closedAt) : "—");
        setText("[data-registrar-pending]", dashboard?.applicationCounts?.pending || 0);
        setText("[data-registrar-approved]", dashboard?.applicationCounts?.approved || 0);
        setText("[data-registrar-rejected]", dashboard?.applicationCounts?.rejected || 0);
        setText("[data-registrar-returned]", dashboard?.applicationCounts?.returnedForCorrection || 0);
        registrarTermSelect?.replaceChildren(new Option("Select an academic term", ""));
        (dashboard?.terms || []).forEach((term) => {
            const option = new Option(`${term.academicYear?.code || ""} · ${term.name}`, term.id);
            registrarTermSelect?.append(option);
        });
        if (period?.academicTerm?.id) registrarTermSelect.value = period.academicTerm.id;
        const selectedAcademicYear = registrarAcademicYearSelect?.value;
        registrarAcademicYearSelect?.replaceChildren(new Option("Select an academic year", ""));
        (dashboard?.academicYears || []).forEach((year) => {
            registrarAcademicYearSelect?.append(new Option(`${year.code} · ${year.name}`, year.id));
        });
        if (selectedAcademicYear && dashboard?.academicYears?.some((year) => year.id === selectedAcademicYear)) {
            registrarAcademicYearSelect.value = selectedAcademicYear;
        }
        const isOpen = period?.status === "OPEN";
        const openButton = select("[data-open-registrar-enrollment]");
        const closeButton = select("[data-close-registrar-enrollment]");
        if (openButton) openButton.disabled = isOpen;
        if (closeButton) closeButton.disabled = !isOpen;
    };

    const initWorkspaceTabs = (navAttr, viewAttr, onSwitch) => {
        const switchTab = (targetView) => {
            const navs = selectAll(`[${navAttr}]`);
            const views = selectAll(`[${viewAttr}]`);
            navs.forEach((tab) => {
                const isMatch = tab.getAttribute(navAttr) === targetView;
                tab.classList.toggle("active", isMatch);
                tab.setAttribute("aria-selected", isMatch ? "true" : "false");
            });
            views.forEach((view) => {
                const isMatch = view.getAttribute(viewAttr) === targetView;
                view.hidden = !isMatch;
            });
            if (typeof onSwitch === "function") onSwitch(targetView);
        };
        const navs = selectAll(`[${navAttr}]`);
        navs.forEach((tab) => {
            tab.addEventListener("click", () => {
                const view = tab.getAttribute(navAttr);
                if (view) switchTab(view);
            });
        });
        return switchTab;
    };

    const switchRegistrarTab = initWorkspaceTabs("data-registrar-nav", "data-registrar-view", (view) => {
        if (view === "academic-imports") void loadRegistrarImportRequests();
    });
    const switchStudentTab = initWorkspaceTabs("data-student-nav", "data-student-view", (view) => {
        if (view === "clubs") void loadStudentClubs();
        if (view === "clearance") void loadStudentDashboard();
        if (view === "grades") void loadStudentImportRequests();
    });
    const switchStudentGradesTab = initWorkspaceTabs("data-student-grades-nav", "data-student-grades-view", (view) => {
        if (view === "requests") void loadStudentImportRequests();
    });
    const switchClubTab = initWorkspaceTabs("data-club-nav", "data-club-view");
    const switchStudentPortalTab = initWorkspaceTabs("data-portal-nav", "data-portal-view");
    const switchProgramHeadTab = initWorkspaceTabs("data-ph-nav", "data-ph-view");
    const switchFacultyTab = initWorkspaceTabs("data-faculty-nav", "data-faculty-view");
    const switchAdminTab = initWorkspaceTabs("data-admin-nav", "data-admin-view", (view) => {
        if (view === "reports") {
            void renderAdminReports();
        } else if (view === "monitoring") {
            if (typeof loadMonitoringHealth === "function") void loadMonitoringHealth();
            if (typeof loadSystemLogs === "function") void loadSystemLogs();
        } else if (view === "users") {
            if (typeof loadUsers === "function") void loadUsers();
        }
    });
    const switchDeanTab = initWorkspaceTabs("data-dean-nav", "data-dean-view");


    const loadRegistrarData = async () => {
        if (!isRegistrar() || needsPasswordChange()) return;
        try {
            const dashboard = await auth.getRegistrarDashboard();
            renderRegistrarDashboard(dashboard);
            await loadRegistrarApplications();
            await Promise.all([
                loadRegistrarOfferingOptions(),
                loadRegistrarOfferings(),
                loadRegistrarSubjects(),
                loadRegistrarGradeSubmissions(),
                loadRegistrarImportRequests()
            ]);
            if (registrarStatus) registrarStatus.textContent = "";
        } catch (error) {
            if (handleExpiredSession(error)) return;
            showError(registrarError, error.status === 403
                ? "Registrar access is not available for this account."
                : "Registrar data could not be loaded.");
        }
    };

    const programHeadEmpty = (message) => {
        const paragraph = document.createElement("p");
        paragraph.className = "dashboard-list__empty";
        paragraph.textContent = message;
        return paragraph;
    };

    const updateRegistrarOfferingSubjects = () => {
        const curriculumId = registrarOfferingCurriculum?.value;
        const curriculum = (state.registrarOfferingOptions?.curricula || []).find((c) => c.id === curriculumId);
        registrarOfferingSubject?.replaceChildren(new Option("Select a subject", ""));
        for (const s of curriculum?.subjects || []) {
            registrarOfferingSubject?.append(
                new Option(`Y${s.yearLevel} T${s.termNumber} · ${s.subjectCode} — ${s.subjectTitle} (${s.creditUnits}u)`, s.subjectId)
            );
        }
    };

    const updateRegistrarOfferingCurricula = () => {
        const programId = registrarOfferingProgram?.value;
        const curricula = (state.registrarOfferingOptions?.curricula || []).filter(
            (c) => !programId || c.programId === programId
        );
        registrarOfferingCurriculum?.replaceChildren(new Option("Select a curriculum", ""));
        for (const curr of curricula) {
            registrarOfferingCurriculum?.append(new Option(`${curr.code} (${curr.name})`, curr.id));
        }
        updateRegistrarOfferingSubjects();
    };

    const loadRegistrarOfferingOptions = async () => {
        try {
            const data = await auth.getRegistrarOfferingOptions();
            state.registrarOfferingOptions = data;

            registrarOfferingTerm?.replaceChildren(new Option("Select a term", ""));
            for (const term of data.academicTerms || []) {
                const label = `${term.academicYear?.code || ""} ${term.name} (${term.code})`;
                registrarOfferingTerm?.append(new Option(label, term.id));
            }

            registrarOfferingProgram?.replaceChildren(new Option("Select a program", ""));
            registrarOfferingProgramFilter?.replaceChildren(new Option("All programs", ""));
            registrarSubjectProgramFilter?.replaceChildren(new Option("All programs", ""));
            for (const prog of data.programs || []) {
                registrarOfferingProgram?.append(new Option(`${prog.code} — ${prog.name}`, prog.id));
                registrarOfferingProgramFilter?.append(new Option(prog.code, prog.id));
                registrarSubjectProgramFilter?.append(new Option(prog.code, prog.id));
            }

            registrarOfferingFaculty?.replaceChildren(new Option("To be assigned", ""));
            for (const f of data.faculty || []) {
                registrarOfferingFaculty?.append(new Option(f.name, f.id));
            }

            registrarOfferingRoom?.replaceChildren(new Option("TBA", ""));
            for (const r of data.rooms || []) {
                registrarOfferingRoom?.append(new Option(`${r.building} ${r.code}`, r.id));
            }

            updateRegistrarOfferingCurricula();
        } catch (error) {
            console.error("Failed to load registrar offering options", error);
            if (registrarOfferingStatus) {
                registrarOfferingStatus.textContent = "Unable to load offering options. Please click Refresh to try again.";
            }
        }
    };

    const formatTimeInput = (timeVal) => {
        if (!timeVal) return "";
        if (typeof timeVal === "string") {
            if (/^\d{2}:\d{2}$/.test(timeVal)) return timeVal;
            if (/^\d{2}:\d{2}:\d{2}/.test(timeVal)) return timeVal.slice(0, 5);
            if (timeVal.includes("T")) {
                const timePart = timeVal.split("T")[1];
                return timePart ? timePart.slice(0, 5) : "";
            }
        }
        if (timeVal instanceof Date) {
            return timeVal.toISOString().slice(11, 16);
        }
        return "";
    };

    const openRegistrarOfferingEdit = (offering) => {
        if (!registrarOfferingEditDialog) return;
        const idInput = select("[data-reg-edit-id]");
        if (idInput) idInput.value = offering.id;
        const offeringIdInput = registrarOfferingEditForm?.querySelector('input[name="offeringId"]');
        if (offeringIdInput) offeringIdInput.value = offering.id;

        const overrideWrap = select("[data-reg-edit-override-wrap]");
        const overrideInput = select("#reg-edit-override-reason");
        if (overrideWrap) overrideWrap.style.display = "none";
        if (overrideInput) overrideInput.value = "";

        setText("[data-reg-edit-program-display]", offering.classSection?.program?.name || offering.classSection?.program?.code || "—");
        setText("[data-reg-edit-term-display]", offering.academicTerm?.name || offering.academicTerm?.code || "—");
        setText("[data-reg-edit-subject-display]", `${offering.subject?.code} — ${offering.subject?.title}`);

        const codeInput = select("#reg-edit-code");
        if (codeInput) codeInput.value = offering.offeringCode;

        const statusSelect = select("#reg-edit-status");
        if (statusSelect) statusSelect.value = offering.status;

        const sectionInput = select("#reg-edit-section");
        if (sectionInput) sectionInput.value = offering.classSection?.code || "";

        const capacityInput = select("#reg-edit-capacity");
        if (capacityInput) capacityInput.value = offering.capacity ?? "";

        const facultySelect = select("#reg-edit-faculty");
        if (facultySelect) {
            facultySelect.replaceChildren(new Option("To be assigned", ""));
            for (const f of state.registrarOfferingOptions?.faculty || []) {
                facultySelect.append(new Option(f.name, f.id));
            }
            const currentFacultyId = offering.faculty?.[0]?.faculty?.id || offering.faculty?.[0]?.facultyId || "";
            facultySelect.value = currentFacultyId;
        }

        const schedule = offering.schedules?.[0];
        const daySelect = select("#reg-edit-day");
        if (daySelect) daySelect.value = schedule?.weekday || "";

        const startInput = select("#reg-edit-start");
        if (startInput) startInput.value = formatTimeInput(schedule?.startsAt);

        const endInput = select("#reg-edit-end");
        if (endInput) endInput.value = formatTimeInput(schedule?.endsAt);

        const roomSelect = select("#reg-edit-room");
        if (roomSelect) {
            roomSelect.replaceChildren(new Option("TBA", ""));
            for (const r of state.registrarOfferingOptions?.rooms || []) {
                roomSelect.append(new Option(`${r.building} ${r.code}`, r.id));
            }
            roomSelect.value = schedule?.room?.id || schedule?.roomId || "";
        }

        if (registrarOfferingEditStatus) registrarOfferingEditStatus.textContent = "";
        if (typeof registrarOfferingEditDialog?.showModal === "function") {
            if (!registrarOfferingEditDialog.open) registrarOfferingEditDialog.showModal();
        } else {
            registrarOfferingEditDialog?.setAttribute("open", "");
        }
    };

    const renderRegistrarOfferings = () => {
        if (!registrarOfferingsList) return;
        registrarOfferingsList.replaceChildren();
        const query = (registrarOfferingSearch?.value || "").toLowerCase().trim();
        const programFilter = registrarOfferingProgramFilter?.value || "";
        const statusFilter = registrarOfferingStatusFilter?.value || "ACTIVE";
        const sortBy = registrarOfferingSort?.value || "code_asc";

        let filtered = (state.registrarOfferings || []).filter((offering) => {
            if (programFilter && offering.classSection?.programId !== programFilter) return false;
            if (statusFilter === "ACTIVE") {
                if (offering.status === "ARCHIVED") return false;
            } else if (statusFilter !== "ALL") {
                if (offering.status !== statusFilter) return false;
            }
            if (query) {
                const matchCode = offering.offeringCode?.toLowerCase().includes(query);
                const matchSub = offering.subject?.code?.toLowerCase().includes(query) || offering.subject?.title?.toLowerCase().includes(query);
                const matchSec = offering.classSection?.code?.toLowerCase().includes(query);
                const matchFac = offering.faculty?.[0]?.name?.toLowerCase().includes(query) ||
                    offering.faculty?.[0]?.faculty?.lastName?.toLowerCase().includes(query) ||
                    offering.faculty?.[0]?.faculty?.firstName?.toLowerCase().includes(query);
                if (!matchCode && !matchSub && !matchSec && !matchFac) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            if (sortBy === "code_asc") return (a.subject?.code || "").localeCompare(b.subject?.code || "");
            if (sortBy === "code_desc") return (b.subject?.code || "").localeCompare(a.subject?.code || "");
            if (sortBy === "offering_asc") return (a.offeringCode || "").localeCompare(b.offeringCode || "");
            if (sortBy === "section_asc") return (a.classSection?.code || "").localeCompare(b.classSection?.code || "");
            if (sortBy === "capacity_desc") return (b.capacity || 0) - (a.capacity || 0);
            if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
            return 0;
        });

        if (!filtered.length) {
            registrarOfferingsList.append(programHeadEmpty("No class offerings match the filter criteria."));
            return;
        }

        for (const offering of filtered) {
            const item = document.createElement("div");
            item.className = `offering-card ${offering.status === "ARCHIVED" ? "is-archived" : ""}`;

            const main = document.createElement("div");
            main.className = "offering-card__main";

            const header = document.createElement("div");
            header.className = "offering-card__header";

            const codeBadge = document.createElement("span");
            codeBadge.className = "offering-card__code";
            codeBadge.textContent = offering.offeringCode;

            const title = document.createElement("h4");
            title.className = "offering-card__title";
            title.textContent = `${offering.subject.code} — ${offering.subject.title}`;

            const statusPill = document.createElement("span");
            statusPill.className = `status-pill status-${offering.status.toLowerCase()}`;
            statusPill.textContent = offering.status;

            header.append(codeBadge, title, statusPill);

            const details = document.createElement("div");
            details.className = "offering-card__details";

            const progText = offering.classSection?.program?.code || "Program";
            const secText = offering.classSection?.code || "No section";
            const termText = offering.academicTerm?.name || "Term TBA";
            const schedule = offering.schedules?.[0];
            const scheduleText = schedule ? `${humanize(schedule.weekday)} ${schedule.startsAt}–${schedule.endsAt} (${schedule.room?.building || ""} ${schedule.room?.code || ""})` : "Schedule TBA";
            const facultyText = offering.faculty?.[0]?.name || (offering.faculty?.[0]?.faculty ? `${offering.faculty[0].faculty.firstName} ${offering.faculty[0].faculty.lastName}` : "Instructor TBA");
            const capText = `Cap: ${offering.capacity ?? "∞"} (Enrolled: ${offering.enrolledCount ?? 0})`;

            const progChip = document.createElement("span");
            progChip.className = "offering-card__chip";
            progChip.innerHTML = `<strong>Program:</strong> ${escapeHtml(progText)}`;

            const secChip = document.createElement("span");
            secChip.className = "offering-card__chip";
            secChip.innerHTML = `<strong>Section:</strong> ${escapeHtml(secText)}`;

            const termChip = document.createElement("span");
            termChip.className = "offering-card__chip";
            termChip.textContent = termText;

            const facultyChip = document.createElement("span");
            facultyChip.className = "offering-card__chip";
            facultyChip.innerHTML = `<strong>Instructor:</strong> ${escapeHtml(facultyText)}`;

            const schedChip = document.createElement("span");
            schedChip.className = "offering-card__chip";
            schedChip.innerHTML = `<strong>Time:</strong> ${escapeHtml(scheduleText)}`;

            const capChip = document.createElement("span");
            capChip.className = "offering-card__chip";
            capChip.textContent = capText;

            details.append(progChip, secChip, termChip, facultyChip, schedChip, capChip);
            main.append(header, details);

            const actions = document.createElement("div");
            actions.className = "offering-card__actions";

            // Edit button (Registrar Centralized Authority)
            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "button button--small button--quiet";
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => openRegistrarOfferingEdit(offering));
            actions.append(editBtn);

            // Close / Reopen button
            if (offering.status === "OPEN") {
                const closeBtn = document.createElement("button");
                closeBtn.type = "button";
                closeBtn.className = "button button--small button--quiet";
                closeBtn.textContent = "Close";
                closeBtn.addEventListener("click", async () => {
                    if (!confirm(`Close offering ${offering.offeringCode}? Students will no longer be assigned to it.`)) return;
                    try {
                        await auth.closeRegistrarOffering(offering.id);
                        await loadRegistrarOfferings();
                    } catch (err) {
                        alert(err.message || "Failed to close offering.");
                    }
                });
                actions.append(closeBtn);
            } else if (offering.status === "CLOSED") {
                const reopenBtn = document.createElement("button");
                reopenBtn.type = "button";
                reopenBtn.className = "button button--small button--quiet";
                reopenBtn.textContent = "Reopen";
                reopenBtn.addEventListener("click", async () => {
                    try {
                        await auth.updateRegistrarOffering(offering.id, { status: "OPEN" });
                        await loadRegistrarOfferings();
                    } catch (err) {
                        alert(err.message || "Failed to reopen offering.");
                    }
                });
                actions.append(reopenBtn);
            }

            // Archive / Restore button
            if (offering.status !== "ARCHIVED") {
                const archiveBtn = document.createElement("button");
                archiveBtn.type = "button";
                archiveBtn.className = "button button--small button--quiet";
                archiveBtn.textContent = "Archive";
                archiveBtn.title = "Archive this offering to keep your list clean";
                archiveBtn.addEventListener("click", async () => {
                    if (!confirm(`Archive offering ${offering.offeringCode}? It will be hidden from the active view.`)) return;
                    try {
                        await auth.archiveRegistrarOffering(offering.id);
                        await loadRegistrarOfferings();
                    } catch (err) {
                        alert(err.message || "Failed to archive offering.");
                    }
                });
                actions.append(archiveBtn);
            } else {
                const restoreBtn = document.createElement("button");
                restoreBtn.type = "button";
                restoreBtn.className = "button button--small button--quiet";
                restoreBtn.textContent = "Restore";
                restoreBtn.title = "Restore this offering from archive";
                restoreBtn.addEventListener("click", async () => {
                    try {
                        await auth.unarchiveRegistrarOffering(offering.id);
                        await loadRegistrarOfferings();
                    } catch (err) {
                        alert(err.message || "Failed to restore offering.");
                    }
                });
                actions.append(restoreBtn);
            }

            item.append(main, actions);
            registrarOfferingsList.append(item);
        }
    };

    const loadRegistrarOfferings = async () => {
        try {
            const data = await auth.getRegistrarOfferings({ status: "ALL" });
            state.registrarOfferings = data.offerings || [];
            renderRegistrarOfferings();
        } catch (error) {
            console.error("Failed to load registrar offerings", error);
            if (registrarOfferingsList) {
                registrarOfferingsList.replaceChildren(programHeadEmpty("Could not load active offerings. Click Refresh to try again."));
            }
        }
    };

    const renderRegistrarSubjects = () => {
        if (!registrarSubjectsTbody) return;
        registrarSubjectsTbody.replaceChildren();
        const query = (registrarSubjectSearch?.value || "").toLowerCase().trim();
        const programFilter = registrarSubjectProgramFilter?.value || "";

        const filtered = (state.registrarSubjects || []).filter((sub) => {
            if (programFilter && sub.programId !== programFilter) return false;
            if (query) {
                const matchCode = sub.subjectCode?.toLowerCase().includes(query);
                const matchTitle = sub.subjectTitle?.toLowerCase().includes(query);
                const matchProg = sub.programCode?.toLowerCase().includes(query);
                if (!matchCode && !matchTitle && !matchProg) return false;
            }
            return true;
        });

        if (!filtered.length) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 8;
            td.className = "text-center";
            td.style.padding = "16px";
            td.textContent = "No subjects match the search or program criteria.";
            tr.append(td);
            registrarSubjectsTbody.append(tr);
            return;
        }

        for (const sub of filtered) {
            const tr = document.createElement("tr");

            const tdCode = document.createElement("td");
            tdCode.innerHTML = `<strong>${escapeHtml(sub.subjectCode)}</strong>`;
            const tdDesc = document.createElement("td");
            tdDesc.textContent = sub.subjectTitle;
            const tdUnits = document.createElement("td");
            tdUnits.style.textAlign = "center";
            tdUnits.textContent = sub.creditUnits;
            const tdProg = document.createElement("td");
            tdProg.textContent = `${sub.programCode} (${sub.programName})`;
            const tdCurr = document.createElement("td");
            tdCurr.textContent = `${sub.curriculumCode} v${sub.curriculumVersion}`;
            const tdYear = document.createElement("td");
            tdYear.style.textAlign = "center";
            tdYear.textContent = `Year ${sub.yearLevel}`;
            const tdSem = document.createElement("td");
            tdSem.style.textAlign = "center";
            tdSem.textContent = `Semester ${sub.termNumber}`;

            const tdAction = document.createElement("td");
            tdAction.style.textAlign = "center";
            const offerBtn = document.createElement("button");
            offerBtn.type = "button";
            offerBtn.className = "button button--small button--primary";
            offerBtn.textContent = "Offer class";
            offerBtn.addEventListener("click", () => {
                switchRegistrarTab("offerings");
                if (registrarOfferingProgram) {
                    registrarOfferingProgram.value = sub.programId;
                    updateRegistrarOfferingCurricula();
                }
                if (registrarOfferingCurriculum) {
                    registrarOfferingCurriculum.value = sub.curriculumId;
                    updateRegistrarOfferingSubjects();
                }
                if (registrarOfferingSubject) {
                    registrarOfferingSubject.value = sub.subjectId;
                }
                registrarOfferingForm?.scrollIntoView({ behavior: "smooth" });
            });
            tdAction.append(offerBtn);

            tr.append(tdCode, tdDesc, tdUnits, tdProg, tdCurr, tdYear, tdSem, tdAction);
            registrarSubjectsTbody.append(tr);
        }
    };

    const loadRegistrarSubjects = async () => {
        try {
            const data = await auth.getRegistrarSubjects();
            state.registrarSubjects = data.subjects || [];
            renderRegistrarSubjects();
        } catch (error) {
            console.error("Failed to load registrar subjects", error);
            if (registrarSubjectsTbody) {
                const tr = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = 8;
                td.style.padding = "16px";
                td.style.textAlign = "center";
                td.style.color = "var(--color-danger, #c0392b)";
                td.textContent = "Could not load subjects catalog. Click Refresh to try again.";
                tr.append(td);
                registrarSubjectsTbody.replaceChildren(tr);
            }
        }
    };

    registrarOfferingProgram?.addEventListener("change", updateRegistrarOfferingCurricula);
    registrarOfferingCurriculum?.addEventListener("change", updateRegistrarOfferingSubjects);
    registrarOfferingSearch?.addEventListener("input", renderRegistrarOfferings);
    registrarOfferingProgramFilter?.addEventListener("change", renderRegistrarOfferings);
    registrarOfferingStatusFilter?.addEventListener("change", renderRegistrarOfferings);
    registrarOfferingSort?.addEventListener("change", renderRegistrarOfferings);
    registrarSubjectSearch?.addEventListener("input", renderRegistrarSubjects);
    registrarSubjectProgramFilter?.addEventListener("change", renderRegistrarSubjects);
    refreshRegistrarOfferingsBtn?.addEventListener("click", () => {
        void loadRegistrarOfferingOptions();
        void loadRegistrarOfferings();
    });
    refreshRegistrarSubjectsBtn?.addEventListener("click", () => void loadRegistrarSubjects());

    registrarOfferingForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = new FormData(registrarOfferingForm);
        setBusy(registrarOfferingForm, true);
        if (registrarOfferingStatus) registrarOfferingStatus.textContent = "";

        const payload = {
            academicTermId: String(values.get("academicTermId") || "").trim(),
            programId: String(values.get("programId") || "").trim(),
            curriculumId: String(values.get("curriculumId") || "").trim(),
            subjectId: String(values.get("subjectId") || "").trim(),
            sectionCode: String(values.get("sectionCode") || "").trim(),
            offeringCode: String(values.get("offeringCode") || "").trim(),
            capacity: values.get("capacity") ? Number(values.get("capacity")) : null,
            facultyId: String(values.get("facultyId") || "").trim() || null,
            weekday: String(values.get("weekday") || "").trim() || null,
            startsAt: String(values.get("startsAt") || "").trim() || null,
            endsAt: String(values.get("endsAt") || "").trim() || null,
            roomId: String(values.get("roomId") || "").trim() || null,
            status: "OPEN"
        };

        try {
            await auth.createRegistrarOffering(payload);
            registrarOfferingForm.reset();
            if (registrarOfferingStatus) registrarOfferingStatus.textContent = `Offering ${payload.offeringCode} opened successfully!`;
            await loadRegistrarOfferings();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            const errMap = {
                OFFERING_DUPLICATE: "An offering with this code already exists in the academic term.",
                SCHEDULE_CONFLICT: "Schedule conflict: the selected faculty or room is already booked at that time.",
                SECTION_CONFLICT: "Section conflict: section code already exists for a different curriculum or year level.",
                OFFERING_INVALID: "Invalid offering data. Check section code and capacity."
            };
            if (registrarOfferingStatus) {
                registrarOfferingStatus.textContent = errMap[error.message] || error.message || "Failed to create class offering.";
            }
        } finally {
            setBusy(registrarOfferingForm, false);
        }
    });

    registrarOfferingEditForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = new FormData(registrarOfferingEditForm);
        const offeringId = String(values.get("id") || values.get("offeringId") || select("[data-reg-edit-id]")?.value || "");
        if (!offeringId) {
            console.error("Missing offering ID in registrar offering edit form");
            if (registrarOfferingEditStatus) registrarOfferingEditStatus.textContent = "Error: Offering ID is missing.";
            return;
        }

        setBusy(registrarOfferingEditForm, true);
        if (registrarOfferingEditStatus) registrarOfferingEditStatus.textContent = "";

        const weekday = String(values.get("weekday") || "").trim() || null;
        const startsAt = String(values.get("startsAt") || "").trim() || null;
        const endsAt = String(values.get("endsAt") || "").trim() || null;

        // Schedule validation
        if ((weekday && (!startsAt || !endsAt)) || (!weekday && (startsAt || endsAt))) {
            if (registrarOfferingEditStatus) {
                registrarOfferingEditStatus.textContent = "To set a schedule, Day, Start time, and End time must all be specified together. Or set Day to TBA and clear times.";
            }
            setBusy(registrarOfferingEditForm, false);
            return;
        }
        if (startsAt && endsAt && startsAt >= endsAt) {
            if (registrarOfferingEditStatus) {
                registrarOfferingEditStatus.textContent = "Schedule start time must be earlier than end time.";
            }
            setBusy(registrarOfferingEditForm, false);
            return;
        }

        const payload = {
            offeringCode: String(values.get("offeringCode") || "").trim(),
            status: String(values.get("status") || "OPEN"),
            sectionCode: String(values.get("sectionCode") || "").trim(),
            capacity: values.get("capacity") ? Number(values.get("capacity")) : null,
            facultyId: String(values.get("facultyId") || "").trim() || null,
            weekday,
            startsAt,
            endsAt,
            roomId: String(values.get("roomId") || "").trim() || null,
            overrideReason: String(values.get("overrideReason") || "").trim() || undefined
        };

        try {
            await auth.updateRegistrarOffering(offeringId, payload);
            registrarOfferingEditDialog?.close();
            await loadRegistrarOfferings();
            if (registrarOfferingStatus) registrarOfferingStatus.textContent = `Offering ${payload.offeringCode} updated successfully.`;
        } catch (error) {
            if (handleExpiredSession(error)) return;
            const errMap = {
                OFFERING_DUPLICATE: "An offering with this code already exists in the academic term.",
                SCHEDULE_CONFLICT: "Schedule conflict: the selected faculty or room is already booked at that time.",
                SECTION_CONFLICT: "Section conflict: section code already exists for a different curriculum or year level.",
                OFFERING_INVALID: "Invalid offering data. Check section code and capacity.",
                CROSS_COLLEGE_OVERRIDE_REQUIRED: "Faculty member belongs to a different College. Please provide an override reason below to proceed.",
                CROSS_COLLEGE_FACULTY_FORBIDDEN: "Faculty member belongs to a different College. Cross-college assignment requires Registrar or Administrator override.",
                SCHEDULE_INVALID: "Invalid schedule times or weekday.",
                OFFERING_CODE_INVALID: "Offering code format is invalid.",
                SECTION_CODE_INVALID: "Section code format is invalid.",
                FACULTY_INVALID: "Selected faculty member is not found or inactive.",
                ROOM_INVALID: "Selected room is not found or inactive."
            };
            if (error.message === "CROSS_COLLEGE_OVERRIDE_REQUIRED" || error.code === "CROSS_COLLEGE_OVERRIDE_REQUIRED") {
                const overrideWrap = select("[data-reg-edit-override-wrap]");
                if (overrideWrap) overrideWrap.style.display = "block";
                select("#reg-edit-override-reason")?.focus();
            }
            if (registrarOfferingEditStatus) {
                registrarOfferingEditStatus.textContent = errMap[error.message] || errMap[error.code] || error.message || "Failed to update class offering.";
            }
        } finally {
            setBusy(registrarOfferingEditForm, false);
        }
    });

    selectAll("[data-close-registrar-offering-edit]").forEach((btn) => btn.addEventListener("click", () => registrarOfferingEditDialog?.close()));

    const renderProgramHeadCurriculum = () => {
        const curricula = state.programHeadDashboard?.curricula || [];
        const curriculum = curricula.find((item) => item.id === programHeadCurriculumView?.value) || curricula[0] || null;
        const summary = select("[data-program-head-curriculum-summary]");
        const structure = select("[data-program-head-curriculum-structure]");
        summary?.replaceChildren();
        structure?.replaceChildren();
        if (!summary || !structure) return;
        if (!curriculum) {
            structure.append(programHeadEmpty("No curriculum version exists for the assigned program."));
            return;
        }
        if (programHeadCurriculumView) programHeadCurriculumView.value = curriculum.id;
        const heading = document.createElement("strong");
        heading.textContent = `${curriculum.code} · ${curriculum.name}`;
        const meta = document.createElement("span");
        meta.textContent = `Version ${curriculum.version} · ${humanize(curriculum.status)} · Effective ${curriculum.effectiveFromYear} · ${curriculum.totalUnits || 0} units`;
        summary.append(heading, meta);
        const grouped = new Map();
        for (const item of curriculum.subjects || []) {
            const key = `${item.yearLevel}-${item.termNumber}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(item);
        }
        if (!grouped.size) {
            structure.append(programHeadEmpty("This curriculum shell has no subjects yet. Add from the shared catalog below."));
            return;
        }
        for (const [key, subjects] of grouped) {
            const [yearLevel, termNumber] = key.split("-");
            const group = document.createElement("section");
            group.className = "curriculum-term-card";
            const title = document.createElement("h4");
            title.textContent = `Year ${yearLevel} · Term ${termNumber}`;
            const table = document.createElement("table");
            table.innerHTML = "<thead><tr><th>Code</th><th>Subject</th><th>Lec</th><th>Lab</th><th>Units</th><th>Requirements</th></tr></thead>";
            const body = document.createElement("tbody");
            for (const item of subjects) {
                const row = document.createElement("tr");
                const requirements = (item.subject.requirements || []).map((requirement) => `${requirement.type === "COREQUISITE" ? "Co" : "Pre"}: ${requirement.requiredSubject.code}`).join(", ");
                [item.subject.code, item.subject.title, item.lectureHours, item.laboratoryHours, item.creditUnits, requirements || "—"].forEach((value) => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.append(cell);
                });
                body.append(row);
            }
            table.append(body);
            group.append(title, table);
            structure.append(group);
        }
    };

    const renderProgramHeadSubjectCatalog = () => {
        const current = programHeadSubjectSelect?.value;
        programHeadSubjectSelect?.replaceChildren(new Option("Select a subject", ""));
        for (const subject of state.programHeadSubjects) {
            const source = subject.shared ? ` · Shared from ${subject.department.code}` : "";
            programHeadSubjectSelect?.append(new Option(`${subject.code} — ${subject.title}${source}`, subject.id));
        }
        if (current && state.programHeadSubjects.some((item) => item.id === current)) programHeadSubjectSelect.value = current;
    };

    const updateProgramHeadSubjectDefaults = () => {
        const subject = state.programHeadSubjects.find((item) => item.id === programHeadSubjectSelect?.value);
        const details = select("[data-program-head-subject-details]");
        if (!subject) {
            if (details) details.textContent = "Select a catalog subject to view its owning department and prerequisites.";
            return;
        }
        if (programHeadSubjectForm) {
            programHeadSubjectForm.elements.creditUnits.value = subject.defaultCreditUnits;
            programHeadSubjectForm.elements.lectureHours.value = subject.defaultLectureHours;
            programHeadSubjectForm.elements.laboratoryHours.value = subject.defaultLaboratoryHours;
        }
        const requirements = (subject.requirements || []).map((item) => `${humanize(item.type)}: ${item.requiredSubject.code}`).join(" · ");
        if (details) details.textContent = `${subject.department.code} · ${subject.department.name}${subject.shared ? " · Shared subject" : ""}${requirements ? ` · ${requirements}` : " · No catalog prerequisite"}`;
    };

    const updateProgramHeadOfferingSubjects = () => {
        const curriculum = state.programHeadDashboard?.curricula?.find((item) => item.id === programHeadOfferingCurriculum?.value);
        programHeadOfferingSubject?.replaceChildren(new Option("Select a subject", ""));
        for (const item of curriculum?.subjects || []) {
            programHeadOfferingSubject?.append(new Option(`Y${item.yearLevel} T${item.termNumber} · ${item.subject.code} — ${item.subject.title}`, item.subjectId));
        }
    };

    const renderProgramHeadDashboard = (dashboard) => {
        state.programHeadDashboard = dashboard;
        state.programHeadFaculty = dashboard?.faculty || [];
        state.programHeadRooms = dashboard?.rooms || [];
        state.programHeadOfferings = dashboard?.courseOfferings || [];
        const curricula = dashboard?.curricula || [];
        const officialStudents = dashboard?.officialStudents || [];
        const pending = (dashboard?.evaluations || []).filter((item) => item.status === "PENDING");
        setText("[data-program-head-program]", dashboard?.program ? `${dashboard.program.code} · ${dashboard.program.name}` : "Assigned program");
        setText("[data-program-head-program-context]", dashboard?.program?.department ? `${dashboard.program.department.college?.name || ""} · ${dashboard.program.department.name} · ${dashboard.program.durationYears} years` : "Access is limited to the assigned program.");
        setText("[data-program-head-curriculum-count]", curricula.length);
        setText("[data-program-head-subject-count]", curricula.reduce((sum, item) => sum + (item.subjects?.length || 0), 0));
        setText("[data-program-head-student-count]", officialStudents.length);
        setText("[data-program-head-evaluation-count]", pending.length + (dashboard?.enrollmentApplications?.length || 0));

        const previous = programHeadCurriculumView?.value;
        programHeadCurriculumView?.replaceChildren(new Option("Select a curriculum", ""));
        programHeadCurriculumSelect?.replaceChildren(new Option("Select a draft curriculum", ""));
        programHeadOfferingCurriculum?.replaceChildren(new Option("Select a curriculum", ""));
        for (const curriculum of curricula) {
            const label = `${curriculum.code} · v${curriculum.version} · ${humanize(curriculum.status)}`;
            programHeadCurriculumView?.append(new Option(label, curriculum.id));
            programHeadOfferingCurriculum?.append(new Option(label, curriculum.id));
            if (curriculum.status === "DRAFT") programHeadCurriculumSelect?.append(new Option(`${curriculum.code} · v${curriculum.version}`, curriculum.id));
        }
        if (previous && curricula.some((item) => item.id === previous)) programHeadCurriculumView.value = previous;
        else if (curricula[0] && programHeadCurriculumView) programHeadCurriculumView.value = curricula[0].id;
        renderProgramHeadCurriculum();
        updateProgramHeadOfferingSubjects();

        const termSelect = select("#program-head-offering-term");
        termSelect?.replaceChildren(new Option("Select a term", ""));
        for (const term of dashboard?.academicTerms || []) {
            if (!["CLOSED", "ARCHIVED"].includes(term.status)) termSelect?.append(new Option(`${term.academicYear.code} · ${term.name}`, term.id));
        }
        const facultySelect = select("#program-head-offering-faculty");
        facultySelect?.replaceChildren(new Option("To be assigned", ""));
        for (const faculty of dashboard?.faculty || []) facultySelect?.append(new Option(`${faculty.employeeNumber} · ${faculty.name}`, faculty.id));
        const roomSelect = select("#program-head-offering-room");
        roomSelect?.replaceChildren(new Option("TBA", ""));
        for (const room of dashboard?.rooms || []) roomSelect?.append(new Option(`${room.building ? `${room.building} · ` : ""}${room.code} · ${room.name}`, room.id));
        renderProgramHeadLists(dashboard, officialStudents);
    };

    const openProgramHeadStudent = async (studentId) => {
        try {
            const student = await auth.getProgramHeadStudent(studentId);
            setText("[data-program-head-student-name]", `${student.studentNumber} · ${student.name}`);
            const container = select("[data-program-head-student-detail]");
            container?.replaceChildren();
            const overview = document.createElement("div");
            overview.className = "program-head-record-summary";
            overview.textContent = `${student.curriculum ? `${student.curriculum.code} v${student.curriculum.version}` : "No curriculum assigned"} · Year ${student.currentYearLevel} · ${humanize(student.status)}`;
            container?.append(overview);
            for (const enrollment of student.enrollments || []) {
                const section = document.createElement("section");
                section.className = "program-head-record-term";
                const title = document.createElement("h3");
                title.textContent = `${enrollment.academicTerm.name} · ${humanize(enrollment.status)}`;
                const list = document.createElement("div");
                list.className = "dashboard-list";
                for (const item of enrollment.items || []) {
                    const grade = item.grades?.find((entry) => entry.gradingPeriod?.isFinal || entry.gradingPeriod?.type === "COMPLETION");
                    const row = document.createElement("div");
                    row.className = "dashboard-list__item";
                    const label = document.createElement("strong");
                    label.textContent = `${item.courseOffering.subject.code} — ${item.courseOffering.subject.title}`;
                    const detail = document.createElement("small");
                    detail.textContent = `${item.courseOffering.creditUnits} units · ${item.courseOffering.classSection?.code || "No section"} · Grade: ${grade?.letterGrade || grade?.numericGrade || "Not posted"}${item.overrideReason ? ` · Override: ${item.overrideReason}` : ""}`;
                    row.append(label, detail);
                    list.append(row);
                }
                if (!enrollment.items?.length) list.append(programHeadEmpty("No subjects recorded for this enrollment."));
                section.append(title, list);
                container?.append(section);
            }
            if (!student.enrollments?.length) container?.append(programHeadEmpty("No enrollment or grade history is available."));
            if (typeof programHeadStudentDialog?.showModal === "function") {
                if (!programHeadStudentDialog.open) programHeadStudentDialog.showModal();
            } else {
                programHeadStudentDialog?.setAttribute("open", "");
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (programHeadStatus) programHeadStatus.textContent = error.message || "The student record could not be loaded.";
        }
    };

    const renderProgramHeadEvaluation = (evaluation) => {
        state.programHeadEvaluation = evaluation;
        setText("[data-program-head-evaluation-name]", `${evaluation.enrollment.student.studentNumber} · ${evaluation.enrollment.student.name}`);
        const container = select("[data-program-head-evaluation-detail]");
        container?.replaceChildren();
        const summary = document.createElement("div");
        summary.className = `program-head-evaluation-summary ${evaluation.canApprove ? "is-clear" : "has-blockers"}`;
        summary.textContent = `${evaluation.enrollment.academicTerm.name} · ${evaluation.totalUnits} of ${evaluation.maximumUnits} units · ${evaluation.blockingIssues.length} blocking issue(s)`;
        container?.append(summary);
        for (const item of evaluation.items) {
            const row = document.createElement("div");
            row.className = "program-head-evaluation-item";
            const title = document.createElement("strong");
            title.textContent = `${item.subject.code} — ${item.subject.title} (${item.creditUnits} units)`;
            row.append(title);
            for (const issue of item.issues) {
                const line = document.createElement("label");
                line.className = issue.blocking ? "evaluation-issue is-blocking" : "evaluation-issue";
                if (issue.code === "MISSING_PREREQUISITE" && issue.blocking) {
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.name = "overrideItemIds";
                    checkbox.value = item.id;
                    line.append(checkbox);
                }
                line.append(document.createTextNode(issue.message));
                row.append(line);
            }
            if (!item.issues.length) {
                const clear = document.createElement("span");
                clear.className = "evaluation-issue";
                clear.textContent = "Academic checks passed.";
                row.append(clear);
            }
            container?.append(row);
        }
        for (const issue of evaluation.issues.filter((item) => !item.enrollmentItemId)) {
            const line = document.createElement("p");
            line.className = "evaluation-issue is-blocking";
            line.textContent = issue.message;
            container?.append(line);
        }
        if (programHeadEvaluationForm?.elements?.enrollmentId) {
            programHeadEvaluationForm.elements.enrollmentId.value = evaluation.enrollment.id;
        }
    };

    const openProgramHeadEvaluation = async (enrollmentId) => {
        try {
            state.programHeadEvaluationEnrollmentId = enrollmentId;
            const evaluation = await auth.getProgramHeadEnrollmentEvaluation(enrollmentId);
            renderProgramHeadEvaluation(evaluation);
            if (programHeadEvaluationForm?.elements?.enrollmentId) {
                programHeadEvaluationForm.elements.enrollmentId.value = enrollmentId;
            }
            if (typeof programHeadEvaluationDialog?.showModal === "function") {
                if (!programHeadEvaluationDialog.open) programHeadEvaluationDialog.showModal();
            } else {
                programHeadEvaluationDialog?.setAttribute("open", "");
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (programHeadStatus) programHeadStatus.textContent = error.message || "The enrollment evaluation could not be loaded.";
        }
    };

    const openProgramHeadOfferingEdit = (offering) => {
        if (!programHeadOfferingEditDialog) return;
        const idInput = select("[data-ph-edit-id]");
        if (idInput) idInput.value = offering.id;
        const offeringIdInput = programHeadOfferingEditForm?.querySelector('input[name="offeringId"]');
        if (offeringIdInput) offeringIdInput.value = offering.id;

        setText("[data-ph-edit-code-display]", offering.offeringCode);
        setText("[data-ph-edit-term-display]", offering.academicTerm?.name || offering.academicTerm?.code || "—");
        setText("[data-ph-edit-subject-display]", `${offering.subject?.code} — ${offering.subject?.title}`);
        setText("[data-ph-edit-status-display]", offering.status);

        const sectionInput = select("#ph-edit-section");
        if (sectionInput) sectionInput.value = offering.classSection?.code || "";

        const capacityInput = select("#ph-edit-capacity");
        if (capacityInput) capacityInput.value = offering.capacity ?? "";

        const facultySelect = select("#ph-edit-faculty");
        if (facultySelect) {
            facultySelect.replaceChildren(new Option("To be assigned", ""));
            for (const f of state.programHeadFaculty || []) {
                facultySelect.append(new Option(`${f.employeeNumber ? `${f.employeeNumber} · ` : ""}${f.name || `${f.firstName} ${f.lastName}`}`, f.id));
            }
            const currentFacultyId = offering.faculty?.[0]?.faculty?.id || offering.faculty?.[0]?.facultyId || "";
            facultySelect.value = currentFacultyId;
        }

        const schedule = offering.schedules?.[0];
        const daySelect = select("#ph-edit-day");
        if (daySelect) daySelect.value = schedule?.weekday || "";

        const startInput = select("#ph-edit-start");
        if (startInput) startInput.value = formatTimeInput(schedule?.startsAt);

        const endInput = select("#ph-edit-end");
        if (endInput) endInput.value = formatTimeInput(schedule?.endsAt);

        const roomSelect = select("#ph-edit-room");
        if (roomSelect) {
            roomSelect.replaceChildren(new Option("TBA", ""));
            for (const r of state.programHeadRooms || []) {
                roomSelect.append(new Option(`${r.building ? `${r.building} · ` : ""}${r.code} · ${r.name}`, r.id));
            }
            roomSelect.value = schedule?.room?.id || schedule?.roomId || "";
        }

        if (programHeadOfferingEditStatus) programHeadOfferingEditStatus.textContent = "";
        if (typeof programHeadOfferingEditDialog?.showModal === "function") {
            if (!programHeadOfferingEditDialog.open) programHeadOfferingEditDialog.showModal();
        } else {
            programHeadOfferingEditDialog?.setAttribute("open", "");
        }
    };

    const renderProgramHeadOfferings = () => {
        const offeringList = select("[data-program-head-offerings]");
        if (!offeringList) return;
        offeringList.replaceChildren();

        const query = (programHeadOfferingSearch?.value || "").toLowerCase().trim();
        const statusFilter = programHeadOfferingStatusFilter?.value || "ACTIVE";
        const sortBy = programHeadOfferingSort?.value || "code_asc";

        let offerings = (state.programHeadOfferings || []).filter((offering) => {
            if (statusFilter === "ACTIVE") {
                if (offering.status === "ARCHIVED") return false;
            } else if (statusFilter !== "ALL") {
                if (offering.status !== statusFilter) return false;
            }
            if (query) {
                const matchCode = offering.offeringCode?.toLowerCase().includes(query);
                const matchSubCode = offering.subject?.code?.toLowerCase().includes(query);
                const matchSubTitle = offering.subject?.title?.toLowerCase().includes(query);
                const matchSec = offering.classSection?.code?.toLowerCase().includes(query);
                const matchFac = offering.faculty?.[0]?.faculty?.lastName?.toLowerCase().includes(query) ||
                    offering.faculty?.[0]?.faculty?.firstName?.toLowerCase().includes(query) ||
                    offering.faculty?.[0]?.name?.toLowerCase().includes(query);
                if (!matchCode && !matchSubCode && !matchSubTitle && !matchSec && !matchFac) return false;
            }
            return true;
        });

        offerings.sort((a, b) => {
            if (sortBy === "code_asc") return (a.subject?.code || "").localeCompare(b.subject?.code || "");
            if (sortBy === "code_desc") return (b.subject?.code || "").localeCompare(a.subject?.code || "");
            if (sortBy === "offering_asc") return (a.offeringCode || "").localeCompare(b.offeringCode || "");
            if (sortBy === "section_asc") return (a.classSection?.code || "").localeCompare(b.classSection?.code || "");
            if (sortBy === "capacity_desc") return (b.capacity || 0) - (a.capacity || 0);
            if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
            return 0;
        });

        if (!offerings.length) {
            offeringList.append(programHeadEmpty("No subject offerings match the filter criteria."));
            return;
        }

        for (const offering of offerings) {
            const item = document.createElement("div");
            item.className = `offering-card ${offering.status === "ARCHIVED" ? "is-archived" : ""}`;

            const main = document.createElement("div");
            main.className = "offering-card__main";

            const header = document.createElement("div");
            header.className = "offering-card__header";

            const codeBadge = document.createElement("span");
            codeBadge.className = "offering-card__code";
            codeBadge.textContent = offering.offeringCode;

            const title = document.createElement("h4");
            title.className = "offering-card__title";
            title.textContent = `${offering.subject.code} — ${offering.subject.title}`;

            const statusPill = document.createElement("span");
            statusPill.className = `status-pill status-${offering.status.toLowerCase()}`;
            statusPill.textContent = offering.status;

            header.append(codeBadge, title, statusPill);

            const details = document.createElement("div");
            details.className = "offering-card__details";

            const secText = offering.classSection?.code || "No section";
            const termText = offering.academicTerm?.name || "Term TBA";
            const schedule = offering.schedules?.[0];
            const scheduleText = schedule ? `${humanize(schedule.weekday)} ${schedule.startsAt}–${schedule.endsAt} (${schedule.room?.building || ""} ${schedule.room?.code || ""})` : "Schedule TBA";
            const facultyName = offering.faculty?.[0]?.faculty ? `${offering.faculty[0].faculty.firstName} ${offering.faculty[0].faculty.lastName}` : (offering.faculty?.[0]?.name || "Instructor TBA");
            const capText = `Cap: ${offering.capacity ?? "∞"}`;

            const secChip = document.createElement("span");
            secChip.className = "offering-card__chip";
            secChip.innerHTML = `<strong>Section:</strong> ${escapeHtml(secText)}`;

            const termChip = document.createElement("span");
            termChip.className = "offering-card__chip";
            termChip.textContent = termText;

            const facultyChip = document.createElement("span");
            facultyChip.className = "offering-card__chip";
            facultyChip.innerHTML = `<strong>Instructor:</strong> ${escapeHtml(facultyName)}`;

            const schedChip = document.createElement("span");
            schedChip.className = "offering-card__chip";
            schedChip.innerHTML = `<strong>Time:</strong> ${escapeHtml(scheduleText)}`;

            const capChip = document.createElement("span");
            capChip.className = "offering-card__chip";
            capChip.textContent = capText;

            details.append(secChip, termChip, facultyChip, schedChip, capChip);
            main.append(header, details);

            const actions = document.createElement("div");
            actions.className = "offering-card__actions";

            // Edit button (Program Head: Section, Capacity, Instructor, Room)
            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "button button--small button--quiet";
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => openProgramHeadOfferingEdit(offering));
            actions.append(editBtn);

            // Close / Reopen button
            if (offering.status === "OPEN") {
                const closeBtn = document.createElement("button");
                closeBtn.type = "button";
                closeBtn.className = "button button--small button--quiet";
                closeBtn.textContent = "Close";
                closeBtn.addEventListener("click", async () => {
                    if (!confirm(`Close offering ${offering.offeringCode}? Students will no longer be assigned to it.`)) return;
                    try {
                        await auth.closeProgramHeadOffering(offering.id);
                        await loadProgramHeadData();
                    } catch (err) {
                        alert(err.message || "Failed to close offering.");
                    }
                });
                actions.append(closeBtn);
            } else if (offering.status === "CLOSED") {
                const reopenBtn = document.createElement("button");
                reopenBtn.type = "button";
                reopenBtn.className = "button button--small button--quiet";
                reopenBtn.textContent = "Reopen";
                reopenBtn.addEventListener("click", async () => {
                    try {
                        await auth.updateProgramHeadOffering(offering.id, { status: "OPEN" });
                        await loadProgramHeadData();
                    } catch (err) {
                        alert(err.message || "Failed to reopen offering.");
                    }
                });
                actions.append(reopenBtn);
            }

            // Archive / Restore button
            if (offering.status !== "ARCHIVED") {
                const archiveBtn = document.createElement("button");
                archiveBtn.type = "button";
                archiveBtn.className = "button button--small button--quiet";
                archiveBtn.textContent = "Archive";
                archiveBtn.title = "Archive this offering to keep your list clean";
                archiveBtn.addEventListener("click", async () => {
                    if (!confirm(`Archive offering ${offering.offeringCode}? It will be hidden from the active view.`)) return;
                    try {
                        await auth.archiveProgramHeadOffering(offering.id);
                        await loadProgramHeadData();
                    } catch (err) {
                        alert(err.message || "Failed to archive offering.");
                    }
                });
                actions.append(archiveBtn);
            } else {
                const restoreBtn = document.createElement("button");
                restoreBtn.type = "button";
                restoreBtn.className = "button button--small button--quiet";
                restoreBtn.textContent = "Restore";
                restoreBtn.title = "Restore this offering from archive";
                restoreBtn.addEventListener("click", async () => {
                    try {
                        await auth.unarchiveProgramHeadOffering(offering.id);
                        await loadProgramHeadData();
                    } catch (err) {
                        alert(err.message || "Failed to restore offering.");
                    }
                });
                actions.append(restoreBtn);
            }

            item.append(main, actions);
            offeringList.append(item);
        }
    };

    const renderProgramHeadLists = (dashboard, officialStudents) => {
        const applicationList = select("[data-program-head-applications]");
        applicationList?.replaceChildren();
        for (const application of dashboard?.enrollmentApplications || []) {
            const row = document.createElement("div"); row.className = "dashboard-list__item program-head-action-row";
            const detail = document.createElement("div");
            const title = document.createElement("strong"); title.textContent = `${application.student.studentNumber} · ${application.student.name}`;
            const summary = document.createElement("small"); summary.textContent = `${application.program.code} · ${application.academicTerm.academicYear.code} · ${application.academicTerm.name} · Year ${application.yearLevel} · ${application.subjectCount} subjects`;
            detail.append(title, summary);
            const button = document.createElement("button"); button.type = "button"; button.className = "button button--primary button--small"; button.textContent = "Review subjects";
            button.addEventListener("click", () => openProgramHeadApplication(application.id));
            row.append(detail, button); applicationList?.append(row);
        }
        if (!dashboard?.enrollmentApplications?.length) applicationList?.append(programHeadEmpty("No submitted enrollment applications are awaiting your review."));
        const studentList = select("[data-program-head-students]");
        studentList?.replaceChildren();
        for (const student of officialStudents) {
            const item = document.createElement("div"); item.className = "dashboard-list__item program-head-action-row";
            const text = document.createElement("div");
            const title = document.createElement("strong"); title.textContent = `${student.studentNumber} · ${student.name}`;
            const details = document.createElement("small"); details.textContent = `Year ${student.currentYearLevel} · ${student.curriculum?.code || "No curriculum"} · ${student.latestEnrollment?.academicTerm?.name || "No current term"}`;
            text.append(title, details);
            const button = document.createElement("button"); button.type = "button"; button.className = "button button--quiet"; button.textContent = "View record";
            button.addEventListener("click", () => openProgramHeadStudent(student.id));
            item.append(text, button); studentList?.append(item);
        }
        if (!officialStudents.length) studentList?.append(programHeadEmpty("No officially enrolled students are linked to this program yet."));

        renderProgramHeadOfferings();

        const evaluationList = select("[data-program-head-evaluations]");
        evaluationList?.replaceChildren();
        for (const evaluation of dashboard?.evaluations || []) {
            const item = document.createElement("div"); item.className = "dashboard-list__item program-head-action-row";
            const text = document.createElement("div");
            const title = document.createElement("strong"); title.textContent = `${evaluation.student.studentNumber} · ${evaluation.student.name}`;
            const details = document.createElement("small"); details.textContent = `${evaluation.academicTerm.name} · ${evaluation.subjectCount} subjects · ${evaluation.totalUnits} units · ${humanize(evaluation.status)}`;
            text.append(title, details);
            const button = document.createElement("button"); button.type = "button"; button.className = "button button--quiet"; button.textContent = evaluation.status === "PENDING" ? "Evaluate" : "View";
            button.addEventListener("click", () => openProgramHeadEvaluation(evaluation.id));
            item.append(text, button); evaluationList?.append(item);
        }
        if (!dashboard?.evaluations?.length) evaluationList?.append(programHeadEmpty("No enrollment records are waiting for academic evaluation."));
    };

    const loadProgramHeadData = async () => {
        if (!isProgramHead() || needsPasswordChange()) return;
        try {
            const [dashboard, catalog] = await Promise.all([auth.getProgramHeadDashboard(), auth.getProgramHeadSubjects()]);
            state.programHeadSubjects = catalog.subjects || [];
            renderProgramHeadSubjectCatalog();
            renderProgramHeadDashboard(dashboard);
            if (programHeadStatus) programHeadStatus.textContent = "";
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (programHeadStatus) programHeadStatus.textContent = error.status === 403
                ? "Program Head access is not available for this account."
                : error.message || "Program Head workspace data could not be loaded.";
        }
    };

    programHeadCurriculumForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (programHeadCurriculumSubmitLocked) return;

        const values = new FormData(programHeadCurriculumForm);
        const code = String(values.get("code") || "").trim();
        const name = String(values.get("name") || "").trim();
        const version = Number(values.get("version"));
        const effectiveFromYear = Number(values.get("effectiveFromYear"));

        if (!code || !name || !Number.isFinite(version) || !Number.isFinite(effectiveFromYear)) {
            if (programHeadStatus) programHeadStatus.textContent = "Complete all curriculum fields before creating a draft.";
            return;
        }

        programHeadCurriculumSubmitLocked = true;
        setBusy(programHeadCurriculumForm, true);
        try {
            await auth.createProgramHeadCurriculum({
                code,
                name,
                version,
                effectiveFromYear,
                status: "DRAFT"
            });
            programHeadCurriculumForm.reset();
            await loadProgramHeadData();
            if (programHeadStatus) programHeadStatus.textContent = "Draft curriculum created.";
        } catch (error) {
            if (handleExpiredSession(error)) return;
            const message = error?.code === "CURRICULUM_DUPLICATE"
                ? "This curriculum already exists for this program. Use a different code or version."
                : (error.message || "The curriculum could not be created.");
            if (programHeadStatus) programHeadStatus.textContent = message;
        } finally {
            programHeadCurriculumSubmitLocked = false;
            setBusy(programHeadCurriculumForm, false);
        }
    });

    programHeadSubjectForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = new FormData(programHeadSubjectForm);
        const curriculumId = String(values.get("curriculumId") || "");
        if (!curriculumId) return;
        setBusy(programHeadSubjectForm, true);
        try {
            await auth.addProgramHeadCurriculumSubject(curriculumId, {
                subjectId: String(values.get("subjectId") || "").trim(),
                yearLevel: Number(values.get("yearLevel")),
                termNumber: Number(values.get("termNumber")),
                creditUnits: Number(values.get("creditUnits")),
                lectureHours: Number(values.get("lectureHours")),
                laboratoryHours: Number(values.get("laboratoryHours")),
                type: String(values.get("type") || "REQUIRED")
            });
            programHeadSubjectForm.reset();
            await loadProgramHeadData();
            if (programHeadStatus) programHeadStatus.textContent = "Subject assigned to curriculum.";
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (programHeadStatus) programHeadStatus.textContent = error.message || "The subject could not be assigned.";
        } finally {
            setBusy(programHeadSubjectForm, false);
        }
    });

    programHeadCurriculumView?.addEventListener("change", renderProgramHeadCurriculum);
    programHeadSubjectSelect?.addEventListener("change", updateProgramHeadSubjectDefaults);
    programHeadOfferingCurriculum?.addEventListener("change", updateProgramHeadOfferingSubjects);
    programHeadSubjectSearchForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const result = await auth.getProgramHeadSubjects(String(new FormData(programHeadSubjectSearchForm).get("query") || "").trim());
            state.programHeadSubjects = result.subjects || [];
            renderProgramHeadSubjectCatalog();
            updateProgramHeadSubjectDefaults();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (programHeadStatus) programHeadStatus.textContent = error.message || "Subject search failed.";
        }
    });

    programHeadOfferingSearch?.addEventListener("input", renderProgramHeadOfferings);
    programHeadOfferingStatusFilter?.addEventListener("change", renderProgramHeadOfferings);
    programHeadOfferingSort?.addEventListener("change", renderProgramHeadOfferings);
    refreshProgramHeadOfferingsBtn?.addEventListener("click", () => void loadProgramHeadData());

    programHeadOfferingForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = new FormData(programHeadOfferingForm);
        setBusy(programHeadOfferingForm, true);
        try {
            const payload = Object.fromEntries([...values].map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
            await auth.createProgramHeadOffering(payload);
            programHeadOfferingForm.reset();
            await loadProgramHeadData();
            if (programHeadStatus) programHeadStatus.textContent = "Subject offering opened for the assigned program.";
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (programHeadStatus) programHeadStatus.textContent = error.message || "The subject offering could not be opened.";
        } finally {
            setBusy(programHeadOfferingForm, false);
        }
    });

    programHeadOfferingEditForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = new FormData(programHeadOfferingEditForm);
        const offeringId = String(values.get("id") || values.get("offeringId") || select("[data-ph-edit-id]")?.value || "");
        if (!offeringId) {
            console.error("Missing offering ID in Program Head offering edit form");
            if (programHeadOfferingEditStatus) programHeadOfferingEditStatus.textContent = "Error: Offering ID is missing.";
            return;
        }

        setBusy(programHeadOfferingEditForm, true);
        if (programHeadOfferingEditStatus) programHeadOfferingEditStatus.textContent = "";

        const weekday = String(values.get("weekday") || "").trim() || null;
        const startsAt = String(values.get("startsAt") || "").trim() || null;
        const endsAt = String(values.get("endsAt") || "").trim() || null;

        if ((weekday && (!startsAt || !endsAt)) || (!weekday && (startsAt || endsAt))) {
            if (programHeadOfferingEditStatus) {
                programHeadOfferingEditStatus.textContent = "To set a schedule, Day, Start time, and End time must all be specified together. Or set Day to TBA and clear times.";
            }
            setBusy(programHeadOfferingEditForm, false);
            return;
        }
        if (startsAt && endsAt && startsAt >= endsAt) {
            if (programHeadOfferingEditStatus) {
                programHeadOfferingEditStatus.textContent = "Schedule start time must be earlier than end time.";
            }
            setBusy(programHeadOfferingEditForm, false);
            return;
        }

        const payload = {
            sectionCode: String(values.get("sectionCode") || "").trim(),
            capacity: values.get("capacity") ? Number(values.get("capacity")) : null,
            facultyId: String(values.get("facultyId") || "").trim() || null,
            weekday,
            startsAt,
            endsAt,
            roomId: String(values.get("roomId") || "").trim() || null
        };

        try {
            await auth.updateProgramHeadOffering(offeringId, payload);
            programHeadOfferingEditDialog?.close();
            await loadProgramHeadData();
            if (programHeadStatus) programHeadStatus.textContent = "Subject offering updated successfully.";
        } catch (error) {
            if (handleExpiredSession(error)) return;
            const errMap = {
                OFFERING_DUPLICATE: "An offering with this code already exists in the academic term.",
                SCHEDULE_CONFLICT: "Schedule conflict: the selected faculty or room is already booked at that time.",
                SECTION_CONFLICT: "Section conflict: section code already exists for a different curriculum or year level.",
                OFFERING_INVALID: "Invalid offering data. Check section code and capacity.",
                CROSS_COLLEGE_FACULTY_FORBIDDEN: "Faculty member belongs to a different College. Cross-college assignment requires Registrar or Administrator override.",
                SCHEDULE_INVALID: "Invalid schedule times or weekday.",
                SECTION_CODE_INVALID: "Section code format is invalid.",
                FACULTY_INVALID: "Selected faculty member is not found or inactive.",
                ROOM_INVALID: "Selected room is not found or inactive."
            };
            if (programHeadOfferingEditStatus) {
                programHeadOfferingEditStatus.textContent = errMap[error.message] || errMap[error.code] || error.message || "Failed to update subject offering.";
            }
        } finally {
            setBusy(programHeadOfferingEditForm, false);
        }
    });

    selectAll("[data-close-program-head-offering-edit]").forEach((btn) => btn.addEventListener("click", () => programHeadOfferingEditDialog?.close()));

    programHeadEvaluationForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = new FormData(programHeadEvaluationForm);
        const enrollmentId = String(values.get("enrollmentId") || state.programHeadEvaluationEnrollmentId || "");
        const checkedBoxes = selectAll('input[name="overrideItemIds"]:checked', programHeadEvaluationDialog || programHeadEvaluationForm);
        const overrideItemIds = checkedBoxes.length > 0
            ? checkedBoxes.map((cb) => cb.value).filter(Boolean)
            : values.getAll("overrideItemIds").map(String);
        setBusy(programHeadEvaluationForm, true);
        try {
            const result = await auth.approveProgramHeadEnrollmentEvaluation(enrollmentId, {
                overrideItemIds,
                overrideReason: String(values.get("overrideReason") || "").trim()
            });
            if (typeof programHeadEvaluationDialog?.close === "function" && programHeadEvaluationDialog.open) {
                programHeadEvaluationDialog.close();
            } else {
                programHeadEvaluationDialog?.removeAttribute("open");
            }
            renderProgramHeadEvaluation(result.evaluation);
            await loadProgramHeadData();
            if (programHeadStatus) programHeadStatus.textContent = "Academic evaluation approved. The enrollment is now assessed.";
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (error.details?.enrollment) renderProgramHeadEvaluation(error.details);
            if (programHeadStatus) programHeadStatus.textContent = error.message || "Academic evaluation could not be approved.";
        } finally {
            setBusy(programHeadEvaluationForm, false);
        }
    });

    select("[data-close-program-head-student]")?.addEventListener("click", () => programHeadStudentDialog?.close());

    const syncProgramHeadApplicationButtons = (review) => {
        if (!programHeadApplicationDecision) return;
        selectAll("button[type=submit]", programHeadApplicationDecision).forEach((button) => {
            const isSubmitted = review?.application?.status === "SUBMITTED";
            const isBlockedApproval = button.value === "APPROVED" && !review?.canApprove;
            button.disabled = !isSubmitted || isBlockedApproval;
            if (!isSubmitted) {
                button.title = `Application is already ${review?.application?.status || "processed"}`;
            } else if (isBlockedApproval) {
                button.title = "Prerequisite or academic limits block approval. Return for correction or reject.";
            } else {
                button.removeAttribute("title");
            }
        });
    };

    const openProgramHeadApplication = async (id) => {
        try {
            programHeadApplicationReview = await auth.getProgramHeadEnrollmentApplication(id);
            const review = programHeadApplicationReview;
            setText("[data-program-head-application-title]", `${review.application.student.studentNumber} · ${review.application.student.name}`);
            const container = select("[data-program-head-application-detail]");
            container?.replaceChildren();
            const summary = document.createElement("p");
            summary.className = `program-head-evaluation-summary ${review.canApprove ? "is-clear" : "has-blockers"}`;
            summary.textContent = `${review.application.program.code} · ${review.application.academicTerm.academicYear.code} · ${review.application.academicTerm.name} · Year ${review.application.yearLevel} · ${review.curriculum ? `${review.curriculum.code} v${review.curriculum.version}` : "Curriculum unresolved"} · ${review.totalUnits}/${review.maximumUnits} units`;
            container?.append(summary);
            for (const item of review.items || []) {
                const row = document.createElement("p"); row.className = "program-head-evaluation-item";
                row.textContent = `${item.subject.code} — ${item.subject.title} · ${item.creditUnits} units`;
                container?.append(row);
            }
            for (const issue of review.issues || []) {
                const message = document.createElement("p"); message.className = "form-error"; message.textContent = issue.message;
                container?.append(message);
            }
            programHeadApplicationDecision?.reset();
            setText("[data-program-head-application-status]", review.canApprove ? "Academic checks passed." : "Resolve the academic issues or return the application for correction.");
            syncProgramHeadApplicationButtons(review);
            if (typeof programHeadApplicationDialog?.showModal === "function") {
                if (!programHeadApplicationDialog.open) programHeadApplicationDialog.showModal();
            } else {
                programHeadApplicationDialog?.setAttribute("open", "");
            }
        } catch (error) {
            if (!handleExpiredSession(error) && programHeadStatus) programHeadStatus.textContent = error.message || "Application review could not be loaded.";
        }
    };

    let lastApplicationDecision = null;
    selectAll("button[type=submit]", programHeadApplicationDecision).forEach((button) => {
        button.addEventListener("click", () => {
            lastApplicationDecision = button.value;
        });
    });

    programHeadApplicationDecision?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = event.submitter?.value || lastApplicationDecision;
        const id = programHeadApplicationReview?.application?.id;
        if (!status || !id || programHeadApplicationDecision.getAttribute("aria-busy") === "true") return;
        const remarks = programHeadApplicationDecision.elements.remarks?.value?.trim() || "";
        if (status !== "APPROVED" && !remarks) {
            setText("[data-program-head-application-status]", "Enter feedback before returning or rejecting this application.");
            programHeadApplicationDecision.elements.remarks?.focus(); return;
        }
        setBusy(programHeadApplicationDecision, true);
        try {
            await auth.decideProgramHeadEnrollmentApplication(id, { status, remarks });
            if (typeof programHeadApplicationDialog?.close === "function" && programHeadApplicationDialog.open) {
                programHeadApplicationDialog.close();
            } else {
                programHeadApplicationDialog?.removeAttribute("open");
            }
            await loadProgramHeadData();
            if (programHeadStatus) programHeadStatus.textContent = status === "APPROVED" ? "Application forwarded to Registrar verification." : "Decision saved and feedback sent to the student.";
        } catch (error) {
            if (!handleExpiredSession(error)) setText("[data-program-head-application-status]", error.message || "The decision could not be saved.");
        } finally {
            setBusy(programHeadApplicationDecision, false);
            syncProgramHeadApplicationButtons(programHeadApplicationReview);
        }
    });
    select("[data-close-program-head-application]")?.addEventListener("click", () => programHeadApplicationDialog?.close());
    select("[data-close-program-head-evaluation]")?.addEventListener("click", () => programHeadEvaluationDialog?.close());

    select("[data-refresh-program-head]")?.addEventListener("click", () => loadProgramHeadData());

    const setReviewText = (selector, value) => {
        const element = select(selector, applicationReviewSection || document);
        if (element) element.textContent = value || "Not provided";
    };

    const closeRegistrarDialog = (dialog) => {
        if (!dialog) return;
        if (typeof dialog.close === "function" && dialog.open) dialog.close();
        else dialog.removeAttribute("open");
        if (dialog === registrarApplicationsDialog) state.currentReview = null;
    };

    const renderRegistrarApplications = (applications) => {
        registrarApplicationList?.replaceChildren();
        if (!applications.length) {
            const empty = document.createElement("p");
            empty.className = "dashboard-list__empty";
            empty.textContent = "No applications match your filter or search.";
            registrarApplicationList?.append(empty);
            return;
        }
        applications.forEach((application) => {
            const card = document.createElement("article");
            card.className = "registrar-application";
            const heading = document.createElement("div");
            const name = document.createElement("h4");
            const number = document.createElement("p");
            name.textContent = application.applicantName || "Unnamed applicant";
            number.textContent = application.applicationNumber;
            heading.append(name, number);
            const status = document.createElement("span");
            status.className = `status-pill status-${String(application.status).toLowerCase()}`;
            status.textContent = humanize(application.status);
            const details = document.createElement("p");
            details.className = "registrar-application__details";
            details.textContent = [
                application.intendedProgram?.code || "No program",
                application.studentNumber || "Student number pending",
                `Attempt ${application.attemptNumber || 1}`
            ].join(" · ");
            const actions = document.createElement("div");
            actions.className = "registrar-application__actions";
            if (application.tag === "RESUBMISSION") {
                const tag = document.createElement("span");
                tag.className = "application-tag";
                tag.textContent = "Resubmission";
                actions.append(tag);
            }
            const view = document.createElement("button");
            view.type = "button";
            view.className = "button button--primary button--small";
            view.dataset.viewApplication = application.id;
            view.textContent = "View application";
            view.setAttribute("aria-label", `View application ${application.applicationNumber}`);
            actions.append(view);
            card.append(heading, status, details, actions);
            registrarApplicationList?.append(card);
        });
    };

    const loadRegistrarApplications = async () => {
        if (!isRegistrar() || needsPasswordChange()) return;
        if (registrarApplicationsStatus) registrarApplicationsStatus.textContent = "Loading applications...";
        try {
            const data = await auth.getRegistrarApplications(state.registrarFilter);
            state.registrarApplications = Array.isArray(data.applications) ? data.applications : [];
            applyRegistrarApplicationSearch();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (registrarApplicationsStatus) registrarApplicationsStatus.textContent = error.message || "Applications could not be loaded.";
        }
    };

    // Client-side search over the already-loaded queue: every word must match
    // the applicant name, application number, student number, email or program.
    function applyRegistrarApplicationSearch() {
        const searchInput = select("[data-registrar-application-search]");
        const terms = String(searchInput?.value || "")
            .trim().slice(0, 100).toLowerCase().split(/\s+/).filter(Boolean);
        const all = state.registrarApplications || [];
        const matches = terms.length
            ? all.filter((application) => {
                const haystack = [
                    application.applicantName,
                    application.applicationNumber,
                    application.studentNumber,
                    application.email,
                    application.intendedProgram?.code,
                    application.intendedProgram?.name
                ].filter(Boolean).join(" ").toLowerCase();
                return terms.every((term) => haystack.includes(term));
            })
            : all;
        renderRegistrarApplications(matches);
        if (registrarApplicationsStatus) {
            registrarApplicationsStatus.textContent = terms.length
                ? `${matches.length} of ${plural(all.length, "application")}`
                : plural(all.length, "application");
        }
    }

    let registrarApplicationSearchTimer = null;
    select("[data-registrar-application-search]")?.addEventListener("input", () => {
        clearTimeout(registrarApplicationSearchTimer);
        registrarApplicationSearchTimer = setTimeout(applyRegistrarApplicationSearch, 200);
    });

    const documentNeedsReview = (documentRecord) => Boolean(
        documentRecord?.id && !["VERIFIED", "REJECTED"].includes(documentRecord.status)
    );

    const documentStatusLabel = (status) => status === "REJECTED" ? "Invalid" : humanize(status);

    const formatDocumentDate = (value) => {
        if (!value) return "Not available";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Not available";
        return new Intl.DateTimeFormat("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }).format(date);
    };

    const selectedReviewDocument = () => (state.currentReview?.documents || []).find(
        (documentRecord) => documentRecord.id === state.selectedDocumentId
    ) || null;

    const syncDocumentReviewControls = (documentRecord = selectedReviewDocument()) => {
        const submittedDocuments = (state.currentReview?.documents || []).filter(
            (entry) => entry.id && entry.viewUrl
        );
        if (documentSelector) documentSelector.disabled = submittedDocuments.length === 0;
        const applicationReviewable = ["PENDING", "UNDER_REVIEW"].includes(state.currentReview?.application?.status);
        const actionable = applicationReviewable && documentNeedsReview(documentRecord);
        selectAll("[data-selected-document-action]").forEach((button) => {
            button.disabled = !actionable;
        });
    };

    const renderDocumentPreview = (documentRecord) => {
        documentPreview?.replaceChildren();
        if (!documentRecord?.viewUrl) {
            const placeholder = document.createElement("div");
            placeholder.className = "document-preview__placeholder";
            const icon = document.createElement("span");
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = "\uD83D\uDCC4";
            const message = document.createElement("p");
            message.textContent = documentRecord ? "This document has not been submitted" : "Select a document to preview";
            placeholder.append(icon, message);
            documentPreview?.append(placeholder);
        } else if (String(documentRecord.mimeType || "").startsWith("image/")) {
            const image = document.createElement("img");
            image.className = "document-preview__image";
            image.src = documentRecord.viewUrl;
            image.alt = `${documentRecord.documentType} preview`;
            documentPreview?.append(image);
        } else {
            const frame = document.createElement("iframe");
            frame.className = "document-preview__frame";
            frame.src = documentRecord.viewUrl;
            frame.title = `${documentRecord.documentType} preview`;
            frame.loading = "eager";
            frame.referrerPolicy = "no-referrer";
            documentPreview?.append(frame);
        }

        if (documentDetailType) documentDetailType.textContent = documentRecord?.documentType || "-";
        if (documentDetailName) documentDetailName.textContent = documentRecord?.originalFileName || "-";
        if (documentDetailDate) documentDetailDate.textContent = formatDocumentDate(documentRecord?.uploadedAt);
        if (documentDetailStatus) {
            const status = documentRecord?.status || "NOT_SELECTED";
            documentDetailStatus.className = `status-pill status-${String(status).toLowerCase()}`;
            documentDetailStatus.textContent = documentRecord ? documentStatusLabel(status) : "Not selected";
        }

        syncDocumentReviewControls(documentRecord);
        if (documentInvalidReason) documentInvalidReason.hidden = true;
        if (documentInvalidRemark) documentInvalidRemark.value = "";
    };

    const renderDocumentSelector = (documents) => {
        if (!documentSelector) return;
        documentSelector.replaceChildren();
        const submitted = documents.filter((documentRecord) => documentRecord.id && documentRecord.viewUrl);
        if (!submitted.length) {
            documentSelector.append(new Option("No submitted documents", ""));
            documentSelector.disabled = true;
            state.selectedDocumentId = null;
            renderDocumentPreview(null);
            return;
        }

        documentSelector.disabled = false;
        submitted.forEach((documentRecord) => {
            const option = new Option(
                `${documentRecord.documentType} - ${documentStatusLabel(documentRecord.status)}`,
                documentRecord.id
            );
            documentSelector.append(option);
        });
        const selected = submitted.find((documentRecord) => documentRecord.id === state.selectedDocumentId)
            || submitted.find(documentNeedsReview)
            || submitted[0];
        state.selectedDocumentId = selected.id;
        documentSelector.value = selected.id;
        renderDocumentPreview(selected);
    };

    const nextUnverifiedDocumentId = (currentId) => {
        const documents = (state.currentReview?.documents || []).filter((documentRecord) => documentRecord.id);
        if (!documents.length) return null;
        const currentIndex = Math.max(0, documents.findIndex((documentRecord) => documentRecord.id === currentId));
        const ordered = [...documents.slice(currentIndex + 1), ...documents.slice(0, currentIndex)];
        return ordered.find(documentNeedsReview)?.id || null;
    };

    const renderApplicationReview = (review) => {
        const application = review.application;
        const form = application.formData || {};
        const personal = form.personal || {};
        const contact = form.contact || {};
        const family = form.family || {};
        const education = form.education || {};
        const father = family.father || {};
        const mother = family.mother || {};
        const guardian = family.guardian || form.emergency || {};
        const elementary = education.elementary || {};
        const juniorHigh = education.juniorHigh || {};
        const seniorHigh = education.seniorHigh || {};
        const academic = form.academic || {};
        const previousSchool = education.previousSchool || seniorHigh || {};

        state.currentReview = review;
        setText("[data-review-title]", `${application.applicantName} · ${application.applicationNumber}`);
        setText("[data-review-status]", humanize(application.status));
        setText("[data-review-attempt]", `Attempt ${application.attemptNumber || 1}`);
        const tag = select("[data-review-tag]");
        if (tag) tag.hidden = application.tag !== "RESUBMISSION";
        setReviewText("[data-student-fullname]", personal.fullName || application.applicantName);
        setReviewText("[data-student-birthdate]", personal.birthday || application.birthDate);
        setReviewText("[data-student-sex]", personal.sex);
        setReviewText("[data-student-nationality]", personal.nationality);
        setReviewText("[data-student-religion]", personal.religion);
        setReviewText("[data-student-birthplace]", personal.placeOfBirth);
        setReviewText("[data-student-civilstatus]", personal.civilStatus);
        setReviewText("[data-student-mobile]", contact.mobileNumber || application.phone);
        setReviewText("[data-student-phone]", contact.telephoneNumber);
        setReviewText("[data-student-email]", contact.personalEmail || application.email);
        setReviewText("[data-student-presentaddr]", contact.presentAddress);
        setReviewText("[data-student-permanentaddr]", contact.permanentAddress);
        setReviewText("[data-father-name]", father.name);
        setReviewText("[data-father-contact]", father.contactNumber);
        setReviewText("[data-father-occupation]", father.occupation);
        setReviewText("[data-father-email]", father.email);
        setReviewText("[data-father-ofw]", father.ofwStatus);
        setReviewText("[data-mother-name]", mother.name);
        setReviewText("[data-mother-contact]", mother.contactNumber);
        setReviewText("[data-mother-occupation]", mother.occupation);
        setReviewText("[data-mother-email]", mother.email);
        setReviewText("[data-mother-ofw]", mother.ofwStatus);
        setReviewText("[data-guardian-name]", guardian.name);
        setReviewText("[data-guardian-relationship]", guardian.relationship);
        setReviewText("[data-guardian-contact]", guardian.contactNumber);
        setReviewText("[data-elem-school]", elementary.school);
        setReviewText("[data-elem-address]", elementary.address);
        setReviewText("[data-elem-graduated]", elementary.yearGraduated);
        setReviewText("[data-elem-honors]", elementary.honors);
        setReviewText("[data-jhs-school]", juniorHigh.school);
        setReviewText("[data-jhs-address]", juniorHigh.address);
        setReviewText("[data-jhs-graduated]", juniorHigh.yearGraduated);
        setReviewText("[data-jhs-honors]", juniorHigh.honors);
        setReviewText("[data-shs-school]", seniorHigh.school);
        setReviewText("[data-shs-address]", seniorHigh.address);
        setReviewText("[data-shs-strand]", seniorHigh.strand);
        setReviewText("[data-shs-graduated]", seniorHigh.yearGraduated);
        setReviewText("[data-shs-honors]", seniorHigh.honors);
        setReviewText("[data-college-name]", application.intendedProgram?.department?.college?.name);
        setReviewText("[data-program-name]", application.intendedProgram?.name);
        setReviewText("[data-major-name]", academic.major || application.intendedProgram?.major);
        setReviewText("[data-year-level]", application.yearLevel ? `Year ${application.yearLevel}` : null);
        setReviewText("[data-previous-school]", previousSchool.school || previousSchool.name);
        setReviewText("[data-previous-school-address]", previousSchool.address);
        setReviewText("[data-previous-school-year]", previousSchool.yearGraduated);
        setReviewText("[data-academic-year]", application.academicTerm?.academicYear?.name);
        setReviewText("[data-semester]", application.academicTerm?.name);

        renderDocumentSelector(review.documents || []);
        const enrollmentReview = review.enrollmentReview;
        const sectionPanel = select("[data-enrollment-section-review]");
        if (sectionPanel) sectionPanel.hidden = !enrollmentReview;
        const sectionFields = select("[data-enrollment-section-assignments]"); sectionFields?.replaceChildren();
        if (enrollmentReview) {
            setText("[data-enrollment-section-summary]", `${enrollmentReview.curriculum?.code || "Curriculum unresolved"} · ${enrollmentReview.totalUnits} approved units`);
            const saEncoding = enrollmentReview.saEncoding;
            const saBanner = select("[data-sa-footprint-banner]", sectionPanel || document);
            if (saBanner) {
                saBanner.hidden = !saEncoding;
                if (saEncoding) {
                    setText("[data-sa-footprint-info]", `Encoded by Student Assistant ${saEncoding.encodedByDisplayName} (@${saEncoding.encodedByUsername || "sa"}) on ${formatDate(saEncoding.encodedAt)}`);
                }
            }
            for (const item of enrollmentReview.items) {
                const field = document.createElement("div"); field.className = "field";
                const label = document.createElement("label"); label.textContent = `${item.subject.code} — ${item.subject.title} (${item.creditUnits} units)`;
                const input = document.createElement("select"); input.id = `section-${item.id}`; label.htmlFor = input.id;
                input.dataset.curriculumSubjectId = item.id; input.required = true;
                input.append(new Option("Choose a class section", ""));
                const choices = enrollmentReview.offeringChoices.filter((choice) => choice.subjectId === item.subjectId);
                for (const choice of choices) {
                    const instructorName = choice.instructor?.name ? ` · ${choice.instructor.name}` : "";
                    const schedSummary = choice.schedule?.summary ? ` · ${choice.schedule.summary}` : "";
                    const option = new Option(`${choice.sectionCode} · ${choice.offeringCode}${instructorName}${schedSummary}${choice.availableSeats == null ? "" : ` · ${choice.availableSeats} seats available`}`, choice.id);
                    option.disabled = !choice.available; input.append(option);
                }
                const preAssignment = saEncoding?.assignments?.find((a) => a.curriculumSubjectId === item.id);
                if (preAssignment && choices.some((choice) => choice.id === preAssignment.courseOfferingId)) {
                    input.value = preAssignment.courseOfferingId;
                }
                input.disabled = !enrollmentReview.requiresSectionAssignments;
                field.append(label, input);
                if (!choices.some((choice) => choice.available) && enrollmentReview.requiresSectionAssignments) {
                    const hint = document.createElement("small"); hint.textContent = "No available section. Ask the Program Head to open a matching offering before approval."; field.append(hint);
                }
                sectionFields?.append(field);
            }
        }

        reviewHistory?.replaceChildren();
        (review.history || []).forEach((entry) => {
            const item = document.createElement("article");
            item.className = "review-history-item";
            const title = document.createElement("strong");
            const details = document.createElement("p");
            const remarks = document.createElement("p");
            title.textContent = humanize(entry.actionType || "STATUS_CHANGE");
            details.textContent = `${humanize(entry.fromStatus || "NEW")} → ${humanize(entry.toStatus)} · ${entry.performedBy} (${humanize(entry.changedByRole || "system")}) · ${formatDate(entry.changedAt)}`;
            remarks.textContent = entry.remarks || "No remarks";
            item.append(title, details, remarks);
            reviewHistory?.append(item);
        });

        const reviewable = ["PENDING", "UNDER_REVIEW"].includes(application.status);
        select("[data-review-actions]")?.toggleAttribute("hidden", !reviewable);
        if (decisionRemarks) {
            decisionRemarks.value = "";
            decisionRemarks.disabled = !reviewable;
        }
        if (applicationReviewSection) applicationReviewSection.hidden = false;
    };

    const openApplicationReview = async (applicationId) => {
        if (!applicationId) return;
        state.selectedDocumentId = null;
        if (registrarReviewStatus) registrarReviewStatus.textContent = "Loading application review...";
        if (applicationReviewSection) applicationReviewSection.hidden = true;
        if (typeof registrarApplicationsDialog?.showModal === "function") {
            if (!registrarApplicationsDialog.open) registrarApplicationsDialog.showModal();
        } else {
            registrarApplicationsDialog?.setAttribute("open", "");
        }
        try {
            const review = await auth.getRegistrarApplicationReview(applicationId);
            renderApplicationReview(review);
            if (registrarReviewStatus) registrarReviewStatus.textContent = "";
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (registrarReviewStatus) registrarReviewStatus.textContent = error.message || "The application could not be loaded.";
        }
    };

    const reviewSelectedDocument = async (status, remarks = "") => {
        const documentRecord = selectedReviewDocument();
        const applicationId = state.currentReview?.application?.id;
        if (!documentRecord?.id || !applicationId || !documentNeedsReview(documentRecord)) return;
        if (status === "VERIFIED" && !window.confirm(`Verify ${documentRecord.documentType}?`)) return;

        const nextDocumentId = nextUnverifiedDocumentId(documentRecord.id);
        setBusy(registrarApplicationsDialog, true);
        if (registrarReviewStatus) {
            registrarReviewStatus.textContent = status === "VERIFIED"
                ? `Verifying ${documentRecord.documentType}...`
                : `Marking ${documentRecord.documentType} invalid...`;
        }
        try {
            await auth.reviewRegistrarDocument(documentRecord.id, status, remarks);
            const review = await auth.getRegistrarApplicationReview(applicationId);
            state.selectedDocumentId = nextDocumentId;
            renderApplicationReview(review);
            const hasRemaining = (review.documents || []).some(documentNeedsReview);
            if (registrarReviewStatus) {
                registrarReviewStatus.textContent = hasRemaining
                    ? `${documentRecord.documentType} updated. The next unverified document is ready.`
                    : `${documentRecord.documentType} updated. All submitted documents have been reviewed.`;
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (registrarReviewStatus) registrarReviewStatus.textContent = error.message || "The document status could not be updated.";
        } finally {
            setBusy(registrarApplicationsDialog, false);
            syncDocumentReviewControls();
        }
    };

    const handleRegistrarAction = async (status) => {
        const application = state.currentReview?.application;
        if (!application) return;
        const sectionAssignments = selectAll("[data-curriculum-subject-id]").map((input) => ({ curriculumSubjectId: input.dataset.curriculumSubjectId, courseOfferingId: input.value }));
        if (status === "APPROVED" && state.currentReview.enrollmentReview?.requiresSectionAssignments && sectionAssignments.some((item) => !item.courseOfferingId)) {
            if (registrarReviewStatus) registrarReviewStatus.textContent = "Choose a class section for every approved subject before approving enrollment.";
            return;
        }
        const remarks = decisionRemarks?.value.trim() || "";
        if (["REJECTED", "RETURNED_FOR_CORRECTION"].includes(status) && !remarks) {
            if (registrarReviewStatus) registrarReviewStatus.textContent = "Enter feedback or a rejection reason before continuing.";
            decisionRemarks?.focus();
            return;
        }
        if (!window.confirm(`Confirm ${humanize(status).toLowerCase()} for ${application.applicationNumber}?`)) return;
        setBusy(registrarApplicationsDialog, true);
        try {
            await auth.reviewRegistrarApplication(application.id, status, remarks, { sectionAssignments });
            await loadRegistrarData();
            closeRegistrarDialog(registrarApplicationsDialog);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (registrarReviewStatus) registrarReviewStatus.textContent = error.message || "The decision could not be saved.";
        } finally {
            setBusy(registrarApplicationsDialog, false);
        }
    };

    registrarApplicationList?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-view-application]");
        if (button) void openApplicationReview(button.dataset.viewApplication);
    });
    selectAll("[data-application-filter]").forEach((button) => {
        button.addEventListener("click", () => {
            state.registrarFilter = button.dataset.applicationFilter || "";
            selectAll("[data-application-filter]").forEach((filterButton) => {
                const active = filterButton === button;
                filterButton.classList.toggle("active", active);
                filterButton.setAttribute("aria-selected", String(active));
            });
            void loadRegistrarApplications();
        });
    });
    select("[data-refresh-registrar-applications]")?.addEventListener("click", () => loadRegistrarApplications());
    selectAll("[data-registrar-action]").forEach((button) => {
        button.addEventListener("click", () => handleRegistrarAction(button.dataset.registrarAction));
    });
    documentSelector?.addEventListener("change", () => {
        state.selectedDocumentId = documentSelector.value || null;
        renderDocumentPreview(selectedReviewDocument());
    });
    selectAll("[data-selected-document-action]").forEach((button) => {
        button.addEventListener("click", () => {
            if (button.dataset.selectedDocumentAction === "REJECTED") {
                if (documentInvalidReason) documentInvalidReason.hidden = false;
                documentInvalidRemark?.focus();
                return;
            }
            void reviewSelectedDocument("VERIFIED", "Verified by Registrar");
        });
    });
    select("[data-confirm-document-invalid]")?.addEventListener("click", () => {
        void reviewSelectedDocument("REJECTED", documentInvalidRemark?.value.trim() || "Marked invalid by Registrar");
    });
    select("[data-cancel-document-invalid]")?.addEventListener("click", () => {
        if (documentInvalidReason) documentInvalidReason.hidden = true;
        if (documentInvalidRemark) documentInvalidRemark.value = "";
    });
    select("[data-close-registrar-dialog]")?.addEventListener("click", () => closeRegistrarDialog(registrarApplicationsDialog));
    registrarApplicationsDialog?.addEventListener("click", (event) => {
        if (event.target === registrarApplicationsDialog) closeRegistrarDialog(registrarApplicationsDialog);
    });


    const updateRegistrarPeriod = async (action) => {
        clearMessage(registrarError);
        const termId = registrarTermSelect?.value;
        const periodId = state.registrarDashboard?.period?.id;
        if (action === "open" && !termId) {
            showError(registrarError, "Select an academic term first.");
            registrarTermSelect?.focus();
            return;
        }
        if (action === "close" && !periodId) {
            showError(registrarError, "There is no open enrollment period to close.");
            return;
        }
        const button = select(action === "open" ? "[data-open-registrar-enrollment]" : "[data-close-registrar-enrollment]");
        setBusy(registrarPanel, true);
        registrarStatus.textContent = action === "open" ? "Opening enrollment..." : "Closing enrollment...";
        try {
            const result = action === "open"
                ? await auth.openRegistrarEnrollment(termId)
                : await auth.closeRegistrarEnrollment(periodId);
            renderRegistrarDashboard({ ...(state.registrarDashboard || {}), period: result.period });
            registrarStatus.textContent = action === "open" ? "Enrollment is now open." : "Enrollment is now closed.";
        } catch (error) {
            if (handleExpiredSession(error)) return;
            showError(registrarError, error.message || "The enrollment period could not be updated.");
            registrarStatus.textContent = "";
        } finally {
            setBusy(registrarPanel, false);
            if (state.registrarDashboard) renderRegistrarDashboard(state.registrarDashboard);
            button?.focus();
        }
    };

    select("[data-open-registrar-enrollment]")?.addEventListener("click", () => updateRegistrarPeriod("open"));
    select("[data-close-registrar-enrollment]")?.addEventListener("click", () => updateRegistrarPeriod("close"));
    registrarAcademicYearForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage(registrarError);
        if (!registrarAcademicYearForm.checkValidity()) {
            registrarAcademicYearForm.reportValidity();
            return;
        }
        const values = new FormData(registrarAcademicYearForm);
        const payload = {
            code: String(values.get("code") || "").trim(),
            name: String(values.get("name") || "").trim(),
            startsOn: String(values.get("startsOn") || ""),
            endsOn: String(values.get("endsOn") || ""),
        };
        setBusy(registrarAcademicYearForm, true);
        if (registrarStatus) registrarStatus.textContent = "Creating academic year...";
        try {
            const result = await auth.createRegistrarAcademicYear(payload);
            registrarAcademicYearForm.reset();
            const dashboard = await auth.getRegistrarDashboard();
            renderRegistrarDashboard(dashboard);
            const yearId = result?.year?.id || result?.id;
            if (yearId && registrarAcademicYearSelect) registrarAcademicYearSelect.value = yearId;
            if (registrarStatus) registrarStatus.textContent = `${result?.year?.name || result?.name || "Academic year"} was created successfully.`;
        } catch (error) {
            if (handleExpiredSession(error)) return;
            showError(registrarError, error.message || "The academic year could not be created.");
            if (registrarStatus) registrarStatus.textContent = "";
        } finally {
            setBusy(registrarAcademicYearForm, false);
        }
    });
    registrarTermForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage(registrarError);
        if (!registrarTermForm.checkValidity()) {
            registrarTermForm.reportValidity();
            return;
        }
        const values = new FormData(registrarTermForm);
        const enrollmentStarts = new Date(String(values.get("enrollmentStarts")));
        const enrollmentEnds = new Date(String(values.get("enrollmentEnds")));
        const payload = {
            academicYearId: String(values.get("academicYearId") || ""),
            code: String(values.get("code") || ""),
            name: String(values.get("name") || ""),
            termNumber: Number(values.get("termNumber")),
            startsOn: String(values.get("startsOn") || ""),
            endsOn: String(values.get("endsOn") || ""),
            enrollmentStarts: enrollmentStarts.toISOString(),
            enrollmentEnds: enrollmentEnds.toISOString(),
        };
        setBusy(registrarTermForm, true);
        if (registrarStatus) registrarStatus.textContent = "Creating academic term...";
        try {
            const result = await auth.createRegistrarAcademicTerm(payload);
            registrarTermForm.reset();
            const dashboard = await auth.getRegistrarDashboard();
            renderRegistrarDashboard(dashboard);
            if (registrarTermSelect) registrarTermSelect.value = result.term.id;
            if (registrarStatus) registrarStatus.textContent = `${result.term.name} was created as a planned term.`;
        } catch (error) {
            if (handleExpiredSession(error)) return;
            showError(registrarError, error.message || "The academic term could not be created.");
            if (registrarStatus) registrarStatus.textContent = "";
        } finally {
            setBusy(registrarTermForm, false);
        }
    });
    select("[data-refresh-registrar]")?.addEventListener("click", () => loadRegistrarData());
    const updateUserStatus = async (user, nextStatus, button) => {
        if (!isAdministrator() || needsPasswordChange()) return;
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        const priorLabel = button.textContent;
        button.textContent = nextStatus === "active" ? "Activating…" : "Disabling…";
        if (usersStatus) usersStatus.textContent = "Updating account status…";
        try {
            await auth.updateUserStatus(user.id, nextStatus);
            user.status = nextStatus;
            renderUsers();
            if (usersStatus) usersStatus.textContent = `Account ${nextStatus === "active" ? "activated" : "disabled"}.`;
        } catch (error) {
            if (handleExpiredSession(error)) return;
            button.disabled = false;
            button.setAttribute("aria-busy", "false");
            button.textContent = priorLabel;
            if (usersStatus) {
                usersStatus.textContent = error.status === 409
                    ? "That status change would leave the project without a required administrator."
                    : "The account status could not be changed.";
            }
        }
    };

    createForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!isAdministrator() || needsPasswordChange() || createForm.getAttribute("aria-busy") === "true") return;
        clearMessage(createError);
        if (createStatus) createStatus.textContent = "";
        const values = new FormData(createForm);
        const account = {
            displayName: String(values.get("displayName") || "").trim(),
            username: String(values.get("username") || "").trim(),
            email: String(values.get("email") || "").trim(),
            password: String(values.get("password") || ""),
            role: String(values.get("role") || ""),
            programId: String(values.get("role") || "") === "program_head"
                ? String(values.get("programId") || "")
                : null,
            departmentId: String(values.get("role") || "") === "student_assistant"
                ? String(values.get("departmentId") || "")
                : null,
            collegeId: String(values.get("role") || "") === "dean"
                ? String(values.get("collegeId") || "")
                : null,
            mustChangePassword: values.get("mustChangePassword") === "on",
        };
        let message = "";
        let focusTarget = null;
        if (passwordLength(account.displayName) < 2 || passwordLength(account.displayName) > 120) {
            message = "Enter a display name containing 2–120 characters.";
            focusTarget = createForm.elements.displayName;
        } else if (!/^[A-Za-z0-9._-]{3,64}$/.test(account.username)) {
            message = "Username must contain 3–64 letters, numbers, periods, underscores, or hyphens.";
            focusTarget = createForm.elements.username;
        } else if (account.email && createForm.elements.email.validity.typeMismatch) {
            message = "Enter a valid email address.";
            focusTarget = createForm.elements.email;
        } else if (passwordLength(account.password) < 12 || passwordLength(account.password) > 128) {
            message = "The temporary password must contain 12–128 characters.";
            focusTarget = createForm.elements.password;
        } else if (!state.roleCatalog.some((role) => role.slug === account.role)) {
            message = "Choose an available role.";
            focusTarget = createForm.elements.role;
        } else if (account.role === "program_head" && !account.programId) {
            message = "Choose the program assigned to this Program Head.";
            focusTarget = createForm.elements.programId;
        } else if (account.role === "student_assistant" && !account.departmentId) {
            message = "Choose the department/college assigned to this Student Assistant.";
            focusTarget = createForm.elements.departmentId;
        } else if (account.role === "dean" && !account.collegeId) {
            message = "Choose the college assigned to this Dean.";
            focusTarget = createForm.elements.collegeId;
        }
        if (message) {
            showError(createError, message);
            focusTarget?.focus();
            return;
        }

        setBusy(createForm, true);
        if (createStatus) createStatus.textContent = "Creating account…";
        try {
            await auth.createUser(account);
            createForm.reset();
            createForm.elements.password.value = "";
            syncRoleAssignments();
            if (createStatus) createStatus.textContent = "Project account created successfully.";
            await loadUsers();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (error.status === 409) {
                showError(createError, "That username or email is already assigned to a project account.");
            } else if (error.status === 422) {
                showError(createError, error.message || "Review the account details and try again.");
            } else if (error.code === "NETWORK_ERROR") {
                showError(createError, error.message);
            } else {
                showError(createError, "The account could not be created. Review the details and try again.");
            }
            if (createStatus) createStatus.textContent = "";
            createForm.elements.password.value = "";
        } finally {
            setBusy(createForm, false);
        }
    });

    retryUsers?.addEventListener("click", loadUsers);
    select("[data-refresh-users]")?.addEventListener("click", loadUsers);
    const refreshStudentDashboard = () => {
        state.studentLoaded = false;
        void loadStudentDashboard();
    };
    select("[data-refresh-student]")?.addEventListener("click", refreshStudentDashboard);
    select("[data-retry-student]")?.addEventListener("click", refreshStudentDashboard);

    select("[data-payment-obligation-list]")?.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-pay-obligation]");
        if (!button) return;

        const obligationId = button.dataset.payObligation;
        const status = select("[data-financial-status]");
        if (!obligationId) return;
        if (!window.confirm("Process this payment using the simulated development gateway?")) return;

        button.disabled = true;
        button.classList.add("is-busy");
        if (status) status.textContent = "Processing simulated payment...";

        try {
            const initiated = await auth.initiateFinancialPayment(obligationId, "ONLINE");
            const transactionId = initiated?.transaction?.id;
            if (!transactionId) throw new Error("The payment transaction was not created.");

            const processed = await auth.processFinancialPayment(transactionId);
            await loadStudentDashboard();
            const refreshedStatus = select("[data-financial-status]");
            if (refreshedStatus) {
                refreshedStatus.textContent = processed?.transaction?.status === "VERIFIED"
                    ? "Payment verified successfully."
                    : "The simulated gateway declined this payment. You may try again.";
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;

            // Handle existing payment attempt (409 Conflict)
            if (error.status === 409 && error.code === "PENDING_TRANSACTION_EXISTS") {
                try {
                    const payments = await auth.getObligationPayments(obligationId);
                    const existing = payments?.transactions?.[0];
                    if (existing) {
                        const statusText = getPaymentStatusMessage(existing);
                        if (status) status.textContent = statusText;

                        // Allow continuing with PENDING/CREATED transactions, or retry FAILED
                        if (existing.status === "VERIFIED" || existing.status === "PAID") {
                            // Payment already completed - keep button disabled
                            return;
                        }

                        if (existing.status === "PENDING" || existing.status === "CREATED") {
                            // Can continue with existing transaction - auto-process it
                            try {
                                const processed = await auth.processFinancialPayment(existing.id);
                                await loadStudentDashboard();
                                const refreshedStatus = select("[data-financial-status]");
                                if (refreshedStatus) {
                                    refreshedStatus.textContent = processed?.transaction?.status === "VERIFIED"
                                        ? "✓ Payment verified successfully."
                                        : "Payment declined. You may try again.";
                                }
                            } catch (processError) {
                                if (status) status.textContent = processError.message || "The payment could not be processed.";
                                button.disabled = false;
                                button.classList.remove("is-busy");
                            }
                        } else {
                            // For PROCESSING, FAILED, or other statuses - re-enable button
                            button.disabled = false;
                            button.classList.remove("is-busy");
                        }
                        return;
                    }
                } catch (fetchError) {
                    // Fall through to standard error handling if fetch fails
                }
            }

            if (status) status.textContent = error.message || "The payment could not be processed.";
            button.disabled = false;
            button.classList.remove("is-busy");
        }
    });

    // ── Edit Contact Information Dialog ──────────────────────────────────
    const profileDialog = select("[data-profile-dialog]");
    const profileForm = select("[data-profile-form]");
    const profileError = select("[data-profile-error]");
    const profileStatus = select("[data-profile-status]");

    const openProfileDialog = () => {
        if (!profileDialog) return;
        profileForm?.reset();
        clearMessage(profileError);
        if (profileStatus) profileStatus.textContent = "";
        setBusy(profileForm, false);
        // Pre-populate fields from current dashboard data
        const student = state.studentDashboard?.student;
        if (student) {
            const emailInput = profileForm?.elements?.institutionalEmail;
            const dateOfBirthInput = profileForm?.elements?.dateOfBirth;
            if (emailInput && student.institutionalEmail) emailInput.value = student.institutionalEmail;
            if (dateOfBirthInput && student.dateOfBirth) dateOfBirthInput.value = student.dateOfBirth;
        }
        if (typeof profileDialog.showModal === "function") {
            if (!profileDialog.open) profileDialog.showModal();
        } else {
            profileDialog.setAttribute("open", "");
        }
        window.setTimeout(() => select("#edit-institutional-email")?.focus(), 60);
    };

    const closeProfileDialog = () => {
        if (!profileDialog) return;
        if (typeof profileDialog.close === "function" && profileDialog.open) profileDialog.close();
        else profileDialog.removeAttribute("open");
        profileForm?.reset();
        clearMessage(profileError);
        if (profileStatus) profileStatus.textContent = "";
    };

    select("[data-open-edit-profile]")?.addEventListener("click", openProfileDialog);
    select("[data-close-profile-dialog]")?.addEventListener("click", closeProfileDialog);
    profileDialog?.addEventListener("click", (event) => {
        if (event.target === profileDialog) closeProfileDialog();
    });

    profileForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (profileForm.getAttribute("aria-busy") === "true") return;
        clearMessage(profileError);
        if (profileStatus) profileStatus.textContent = "";

        const emailValue = profileForm.elements.institutionalEmail?.value?.trim() || "";
        const dateOfBirthValue = profileForm.elements.dateOfBirth?.value || "";

        setBusy(profileForm, true);
        if (profileStatus) profileStatus.textContent = "Saving changes…";
        try {
            const payload = {};
            if (emailValue) payload.institutionalEmail = emailValue;
            if (dateOfBirthValue) payload.dateOfBirth = dateOfBirthValue;

            const response = await auth.updateStudentProfile(payload);
            const updatedProfile = response?.profile;

            if (updatedProfile && state.studentDashboard?.student) {
                state.studentDashboard.student = {
                    ...state.studentDashboard.student,
                    institutionalEmail: updatedProfile.institutionalEmail,
                    dateOfBirth: updatedProfile.dateOfBirth,
                    fullName: updatedProfile.fullName
                };
                setText("[data-student-email]", updatedProfile.institutionalEmail || "Not provided");
            }

            if (profileStatus) profileStatus.textContent = "Contact information updated.";
            window.setTimeout(closeProfileDialog, 900);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (error.status === 422) {
                showError(profileError, error.message || "Review the information and try again.");
            } else if (error.code === "NETWORK_ERROR") {
                showError(profileError, error.message);
            } else {
                showError(profileError, "Could not save changes. Try again.");
            }
            if (profileStatus) profileStatus.textContent = "";
        } finally {
            setBusy(profileForm, false);
        }
    });

    // ── Submit Student Request Dialog ─────────────────────────────────────
    const requestDialog = select("[data-request-dialog]");
    const requestForm = select("[data-request-form]");
    const requestError = select("[data-request-error]");
    const requestStatus = select("[data-request-status]");
    const requestTypeSelect = select("[data-request-form] #request-type");
    const requestTypeDesc = select("[data-request-type-desc]");
    const estimatedFee = select("[data-estimated-fee]");
    const serviceDays = select("[data-service-days]");
    const purposeRemaining = select("[data-purpose-remaining]");
    const purposeInput = select("#request-purpose");
    let requestTypeCatalog = [];

    const populateRequestTypes = async () => {
        if (!requestTypeSelect) return;
        try {
            const data = await auth.getRequestTypes();
            requestTypeCatalog = data?.requestTypes || [];
            requestTypeSelect.replaceChildren();
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = requestTypeCatalog.length ? "Select a request type…" : "No request types available";
            requestTypeSelect.append(placeholder);
            requestTypeCatalog.forEach((type) => {
                const option = document.createElement("option");
                option.value = type.code;
                option.textContent = type.name;
                option.dataset.desc = type.description || "";
                option.dataset.fee = type.defaultFeeAmount || "0.00";
                option.dataset.days = type.serviceDays || "–";
                requestTypeSelect.append(option);
            });
        } catch {
            // Silently handle — the form validation will block submission
        }
    };

    const updateRequestTypeInfo = () => {
        const selected = requestTypeSelect?.selectedOptions?.[0];
        if (requestTypeDesc) requestTypeDesc.textContent = selected?.dataset.desc || "";
        if (estimatedFee) estimatedFee.textContent = selected?.value
            ? formatMoney(selected.dataset.fee || 0)
            : "PHP 0.00";
        if (serviceDays) serviceDays.textContent = selected?.value
            ? `${selected.dataset.days} business day${Number(selected.dataset.days) === 1 ? "" : "s"}`
            : "–";
    };

    requestTypeSelect?.addEventListener("change", updateRequestTypeInfo);
    purposeInput?.addEventListener("input", () => {
        const remaining = 500 - (purposeInput.value?.length || 0);
        if (purposeRemaining) purposeRemaining.textContent = String(Math.max(0, remaining));
    });

    const openRequestDialog = async () => {
        if (!requestDialog) return;
        requestForm?.reset();
        clearMessage(requestError);
        if (requestStatus) requestStatus.textContent = "";
        updateRequestTypeInfo();
        if (purposeRemaining) purposeRemaining.textContent = "500";
        setBusy(requestForm, false);
        if (requestTypeCatalog.length === 0) await populateRequestTypes();
        if (typeof requestDialog.showModal === "function") {
            if (!requestDialog.open) requestDialog.showModal();
        } else {
            requestDialog.setAttribute("open", "");
        }
        window.setTimeout(() => requestTypeSelect?.focus(), 60);
    };

    const closeRequestDialog = () => {
        if (!requestDialog) return;
        if (typeof requestDialog.close === "function" && requestDialog.open) requestDialog.close();
        else requestDialog.removeAttribute("open");
        requestForm?.reset();
        clearMessage(requestError);
        if (requestStatus) requestStatus.textContent = "";
    };

    select("[data-open-new-request]")?.addEventListener("click", openRequestDialog);
    select("[data-close-request-dialog]")?.addEventListener("click", closeRequestDialog);
    requestDialog?.addEventListener("click", (event) => {
        if (event.target === requestDialog) closeRequestDialog();
    });

    requestForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (requestForm.getAttribute("aria-busy") === "true") return;
        clearMessage(requestError);
        if (requestStatus) requestStatus.textContent = "";

        const requestCode = requestForm.elements.requestCode?.value?.trim() || "";
        const copies = Number(requestForm.elements.copies?.value) || 1;
        const purpose = requestForm.elements.purpose?.value?.trim() || "";

        if (!requestCode) {
            showError(requestError, "Select a request type before submitting.");
            requestTypeSelect?.focus();
            return;
        }

        setBusy(requestForm, true);
        if (requestStatus) requestStatus.textContent = "Submitting request…";
        try {
            const response = await auth.submitStudentRequest({ requestCode, copies, purpose });
            const created = response?.request;

            // Refresh the requests list on the dashboard
            if (created) {
                if (!state.studentDashboard) state.studentDashboard = {};
                if (!Array.isArray(state.studentDashboard.requests)) state.studentDashboard.requests = [];
                state.studentDashboard.requests.unshift(created);
                const requestList = select("[data-request-list]");
                if (requestList) {
                    const item = dashboardListItem(
                        created.requestType?.name || "Student request",
                        `${created.requestNumber} · Just now`,
                        humanize(created.status)
                    );
                    requestList.prepend(item);
                    // Remove any "empty" placeholder
                    select(".dashboard-list__empty", requestList)?.remove();
                }
                setText("[data-request-count]", plural(state.studentDashboard.requests.length, "request"));
            }

            if (requestStatus) requestStatus.textContent = `Request ${created?.requestNumber || ""} submitted successfully.`;
            window.setTimeout(closeRequestDialog, 1200);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (error.status === 422) {
                showError(requestError, error.message || "Review your selection and try again.");
            } else if (error.code === "NETWORK_ERROR") {
                showError(requestError, error.message);
            } else {
                showError(requestError, "The request could not be submitted. Try again.");
            }
            if (requestStatus) requestStatus.textContent = "";
        } finally {
            setBusy(requestForm, false);
        }
    });

    const enrollmentDialog = select("[data-enrollment-dialog]");
    const enrollmentForm = select("[data-enrollment-form]");
    const enrollmentError = select("[data-enrollment-error]");
    const enrollmentStatus = select("[data-enrollment-status]");
    const enrollmentSave = select("[data-save-enrollment]");
    const enrollmentSubmit = select("[data-submit-enrollment]");
    let enrollmentApplication = null;
    let admissionApplication = null;
    let enrollmentOptions = null;

    const selectedSubjectState = {
        items: [], locked: false
    };

    const selectedProgram = () => (enrollmentOptions?.programs || []).find((entry) => entry.id === enrollmentInput("programId")?.value) || null;
    const selectedProgramLabel = () => selectedProgram()?.code ? `${selectedProgram().code} — ${selectedProgram().name}` : "Choose a program";
    const selectedYearLevel = () => {
        const raw = enrollmentInput("yearLevel")?.value;
        const value = Number(raw);
        return Number.isInteger(value) && value > 0 ? value : null;
    };
    const selectedAcademicTerm = () => {
        const value = enrollmentInput("academicTermId")?.value;
        return (enrollmentOptions?.terms || []).find((entry) => entry.id === value) || null;
    };
    const availableSubjectsForSelection = () => {
        const programId = enrollmentInput("programId")?.value;
        const yearLevel = selectedYearLevel();
        const term = selectedAcademicTerm();
        if (!programId || yearLevel == null || !term) return [];
        return (enrollmentOptions?.curriculumSubjects || []).filter((item) => (
            item.academicTermId === term.id
            &&
            item.programId === programId
            && Number(item.yearLevel) === yearLevel
            && Number(item.termNumber) === Number(term.termNumber)
        )).sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || String(a.subjectCode).localeCompare(String(b.subjectCode)));
    };
    const updateSubjectCartSummary = () => {
        const selectedCount = selectedSubjectState.items.length;
        const totalUnits = selectedSubjectState.items.reduce((sum, item) => sum + Number(item.creditUnits || 0), 0);
        const count = select("[data-subject-count]");
        const total = select("[data-subject-total]");
        const program = select("[data-subject-program]");
        const loadStatus = select("[data-subject-load-status]");
        if (count) count.textContent = `${selectedCount} selected`;
        if (total) total.textContent = `${totalUnits} unit${totalUnits === 1 ? "" : "s"}`;
        if (program) program.textContent = selectedProgramLabel();
        if (loadStatus) {
            loadStatus.textContent = selectedSubjectState.locked ? "Submitted · read only" : selectedCount === 0 ? "Waiting for selection" : totalUnits > 29 ? "Over limit" : "Within limit";
        }
    };
    const renderSubjectSelection = () => {
        const catalogContainer = select("[data-subject-catalog]");
        const cartContainer = select("[data-subject-cart]");
        if (!catalogContainer || !cartContainer) return;
        const catalog = availableSubjectsForSelection();
        const selectedIds = new Set(selectedSubjectState.items.map((item) => item.id || item.subjectId));
        catalogContainer.replaceChildren();
        if (!enrollmentInput("programId")?.value || !selectedYearLevel() || !selectedAcademicTerm()) {
            const empty = document.createElement("div");
            empty.className = "subject-cart__empty";
            empty.innerHTML = "<strong>Waiting for academic context</strong><small>Select a program, year level, and term to load the active curriculum subjects.</small>";
            catalogContainer.append(empty);
            cartContainer.replaceChildren();
            updateSubjectCartSummary();
            return;
        }
        if (!catalog.length) {
            const empty = document.createElement("div");
            empty.className = "subject-cart__empty";
            empty.innerHTML = `<strong>No curriculum subjects available</strong><small>No active curriculum items match ${escapeHtml(selectedProgram()?.code || "this program")} for Year ${escapeHtml(selectedYearLevel())} in ${escapeHtml(selectedAcademicTerm()?.name || "this term")}.</small>`;
            catalogContainer.append(empty);
            cartContainer.replaceChildren();
            updateSubjectCartSummary();
            return;
        }
        catalog.forEach((item) => {
            const card = document.createElement("article");
            const selected = selectedIds.has(item.id || item.subjectId);
            const isAlreadyCompleted = Boolean(item.isPassed || item.alreadyCompleted);
            const requirements = item.requirements || item.prerequisites || [];
            const blockedPrerequisites = requirements.filter((requirement) => requirement.type !== "COREQUISITE" && !requirement.eligible);
            const pendingCorequisites = requirements.filter((requirement) => requirement.type === "COREQUISITE" && !requirement.eligible);
            card.className = `subject-card${selected ? " is-selected" : ""}${isAlreadyCompleted ? " is-completed" : ""}`;
            const meta = document.createElement("div");
            meta.className = "subject-card__meta";
            meta.innerHTML = `<strong>${escapeHtml(item.subjectCode)} · ${escapeHtml(item.subjectTitle)}</strong><small>${Number(item.creditUnits || 0)} units · ${escapeHtml(item.type || "REQUIRED")} · ${escapeHtml(item.curriculumCode)}</small>`;
            if (isAlreadyCompleted) {
                const completedMessage = document.createElement("small");
                completedMessage.textContent = "✓ Already Completed / Credited";
                completedMessage.className = "subject-card__completed";
                completedMessage.style.color = "var(--success-fg, #137333)";
                completedMessage.style.fontWeight = "600";
                meta.append(completedMessage);
            } else if (blockedPrerequisites.length) {
                const prerequisiteMessage = document.createElement("small");
                prerequisiteMessage.textContent = blockedPrerequisites.map((requirement) => `${requirement.requiredSubject.code}: ${humanize(requirement.state)}`).join(" · ");
                prerequisiteMessage.className = "subject-card__warning";
                meta.append(prerequisiteMessage);
            }
            if (pendingCorequisites.length) {
                const corequisiteMessage = document.createElement("small");
                corequisiteMessage.textContent = pendingCorequisites.map((requirement) => `Corequisite: ${requirement.requiredSubject.code}`).join(" · ");
                corequisiteMessage.className = "subject-card__warning";
                meta.append(corequisiteMessage);
            }
            const details = document.createElement("div");
            details.className = "subject-card__details";
            const badge = document.createElement("span");
            badge.className = "subject-card__pill";
            badge.textContent = item.type || "REQUIRED";
            details.append(badge);
            if (isAlreadyCompleted) {
                const completedPill = document.createElement("span");
                completedPill.className = "subject-card__pill";
                completedPill.style.background = "var(--success-bg, #e6f4ea)";
                completedPill.style.color = "var(--success-fg, #137333)";
                completedPill.textContent = "Completed";
                details.append(completedPill);
            }
            meta.append(details);
            const button = document.createElement("button");
            button.type = "button";
            button.className = `subject-card__button${selected ? " subject-card__button--selected" : ""}`;
            button.dataset.subjectAction = selected ? "remove" : "add";
            button.dataset.subjectId = item.id || item.subjectId;
            button.disabled = selectedSubjectState.locked || isAlreadyCompleted || Boolean(blockedPrerequisites.length && !selected);
            button.hidden = selectedSubjectState.locked;
            button.textContent = isAlreadyCompleted ? "Already completed" : selected ? "Remove" : blockedPrerequisites.length ? "Prerequisite required" : "Add to cart";
            card.append(meta, button);
            catalogContainer.append(card);
        });
        const activeCartItems = selectedSubjectState.locked ? selectedSubjectState.items : selectedSubjectState.items.filter((item) => catalog.some((entry) => (entry.id || entry.subjectId) === (item.id || item.subjectId)));
        selectedSubjectState.items = activeCartItems;
        cartContainer.replaceChildren();
        if (!activeCartItems.length) {
            const empty = document.createElement("div");
            empty.className = "subject-cart__empty";
            empty.innerHTML = "<strong>No subjects selected</strong><small>Add subjects from the active curriculum to build your cart.</small>";
            cartContainer.append(empty);
        } else {
            activeCartItems.forEach((item) => {
                const row = document.createElement("article");
                row.className = "subject-cart__item";
                const details = document.createElement("div");
                details.innerHTML = `<strong>${escapeHtml(item.subjectCode)} · ${escapeHtml(item.subjectTitle)}</strong><small>${Number(item.creditUnits || 0)} units · ${escapeHtml(item.type || "REQUIRED")}</small>`;
                const tag = document.createElement("span");
                tag.className = "subject-cart__tag";
                tag.textContent = item.type || "REQUIRED";
                const removeButton = document.createElement("button");
                removeButton.type = "button";
                removeButton.className = "subject-cart__remove";
                removeButton.dataset.subjectAction = "remove";
                removeButton.dataset.subjectId = item.id || item.subjectId;
                removeButton.textContent = "Remove";
                removeButton.disabled = selectedSubjectState.locked;
                removeButton.hidden = selectedSubjectState.locked;
                row.append(details, tag, removeButton);
                cartContainer.append(row);
            });
        }
        updateSubjectCartSummary();
    };
    const getPaymentStatusMessage = (transaction) => {
        if (!transaction) return "Payment status unavailable.";

        switch (String(transaction.status).toUpperCase()) {
            case "VERIFIED":
            case "PAID":
                return "✓ Payment already completed. Proceeding to next step.";
            case "PENDING":
                return "Your payment is pending. Continue processing it now.";
            case "PROCESSING":
                return "Your payment is currently being processed. Please wait...";
            case "FAILED":
            case "EXPIRED":
                return "Previous payment failed or expired. You can try again.";
            case "CREATED":
                return "Payment initiated. Continue processing your payment.";
            default:
                return `Payment status: ${transaction.status}. Please try again or contact support.`;
        }
    };

    const handleSubjectSelectionToggle = (event) => {
        const button = event.target.closest("[data-subject-action]");
        if (!button || button.disabled || selectedSubjectState.locked || enrollmentForm?.getAttribute("aria-busy") === "true") return;
        const catalog = availableSubjectsForSelection();
        const subjectId = button.dataset.subjectId;
        if (!subjectId) return;
        const item = catalog.find((entry) => String(entry.id || entry.subjectId) === String(subjectId));
        if (!item) return;
        const current = selectedSubjectState.items.find((entry) => String(entry.id || entry.subjectId) === String(subjectId));
        if (button.dataset.subjectAction === "add" && !current) {
            selectedSubjectState.items.push({ ...item });
        }
        if (button.dataset.subjectAction === "remove" && current) {
            selectedSubjectState.items = selectedSubjectState.items.filter((entry) => String(entry.id || entry.subjectId) !== String(subjectId));
        }
        renderSubjectSelection();
    };
    const setSubjectSelectionState = () => {
        const catalog = availableSubjectsForSelection();
        if (!selectedSubjectState.locked) selectedSubjectState.items = selectedSubjectState.items.filter((selected) => catalog.some((item) => String(item.id || item.subjectId) === String(selected.id || selected.subjectId)));
        renderSubjectSelection();
    };

    const enrollmentInput = (name) => select(`[data-enrollment-form] [name="${name}"]`);
    const setNestedValue = (target, path, value) => {
        const parts = path.split(".");
        let current = target;
        parts.forEach((part, index) => {
            if (index === parts.length - 1) current[part] = value;
            else current = current[part] ||= {};
        });
    };
    const enrollmentFormData = () => {
        const data = {};
        selectAll("[data-enrollment-form] [name]").forEach((input) => {
            if (input.name === "studentNumber" || input.name === "schoolEmail" || input.name === "programId" || input.name === "academicTermId" || input.name === "yearLevel") return;
            setNestedValue(data, input.name, input.value.trim());
        });
        return data;
    };
    const fillEnrollmentForm = (application, profile) => {
        enrollmentInput("studentNumber").value = profile?.studentNumber || "";
        enrollmentInput("schoolEmail").value = profile?.schoolEmail || "";
        const data = application?.formData || {};
        const fill = (object, prefix = "") => Object.entries(object || {}).forEach(([key, value]) => {
            const path = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === "object" && !Array.isArray(value)) fill(value, path);
            else if (enrollmentInput(path)) enrollmentInput(path).value = value ?? "";
        });
        fill(data);
        if (!data.personal?.fullName) enrollmentInput("personal.fullName").value = profile?.fullName || "";
        if (!data.personal?.birthday) enrollmentInput("personal.birthday").value = profile?.birthday || "";
        enrollmentInput("contact.personalEmail").value ||= profile?.personalEmail || "";
        enrollmentInput("contact.mobileNumber").value ||= profile?.mobileNumber || "";
        if (application) {
            enrollmentInput("programId").value = application.programId || enrollmentOptions?.studentContext?.programId || "";
            enrollmentInput("academicTermId").value = application.academicTermId || "";
            enrollmentInput("yearLevel").value = application.yearLevel || profile?.currentYearLevel || "";
            selectedSubjectState.items = (application.formData?.selection?.subjectIds || [])
                .map((subjectId) => (enrollmentOptions?.curriculumSubjects || []).find((item) => item.academicTermId === application.academicTermId && (item.subjectId === subjectId || item.id === subjectId)))
                .filter(Boolean);
        } else {
            if (enrollmentOptions?.studentContext?.programId) {
                enrollmentInput("programId").value = enrollmentOptions.studentContext.programId;
            }
            if (profile?.currentYearLevel) {
                enrollmentInput("yearLevel").value = String(profile.currentYearLevel);
            }
            const openTerm = (enrollmentOptions?.terms || []).find((item) => item.enrollmentOpen) || (enrollmentOptions?.terms || [])[0];
            if (openTerm && !enrollmentInput("academicTermId").value) {
                enrollmentInput("academicTermId").value = openTerm.id;
            }
        }
        setSubjectSelectionState();
    };
    const populateEnrollmentOptions = (options) => {
        const programSelect = enrollmentInput("programId");
        const termSelect = enrollmentInput("academicTermId");
        const yearSelect = enrollmentInput("yearLevel");
        programSelect.replaceChildren(new Option("Choose a program", ""));
        termSelect.replaceChildren(new Option("Choose an academic term", ""));
        (options?.programs || []).forEach((item) => programSelect.append(new Option(`${item.code} — ${item.name}`, item.id)));
        (options?.terms || []).forEach((item) => {
            const label = item.enrollmentOpen ? `${item.name} (enrollment open)`
                : item.periodStatus === "CLOSED" ? `${item.name} (enrollment closed)` : item.name;
            termSelect.append(new Option(label, item.id));
        });
        const assignedProgram = (options?.programs || []).find((item) => item.id === options?.studentContext?.programId);
        if (assignedProgram) {
            programSelect.value = assignedProgram.id;
        }
        const openTerm = (options?.terms || []).find((item) => item.enrollmentOpen) || (options?.terms || [])[0];
        if (openTerm && !termSelect.value) {
            termSelect.value = openTerm.id;
        }
        const currentProgram = assignedProgram || (options?.programs || []).find((item) => item.id === programSelect.value) || options?.programs?.[0];
        if (yearSelect && currentProgram) {
            const currentYearVal = yearSelect.value;
            yearSelect.replaceChildren(new Option("Select", ""));
            for (let year = 1; year <= Number(currentProgram.durationYears || 0); year += 1) {
                yearSelect.append(new Option(`Year ${year}`, String(year)));
            }
            yearSelect.value = currentYearVal || String(options?.studentContext?.currentYearLevel || "1");
        }
        programSelect.dataset.enrollmentLocked = assignedProgram ? "true" : "false";
        yearSelect.dataset.enrollmentLocked = "false";
        setSubjectSelectionState();
    };
    const selectedEnrollmentTerm = () => (enrollmentOptions?.terms || []).find(
        (item) => item.id === enrollmentInput("academicTermId")?.value
    );
    const updateEnrollmentWindow = () => {
        const term = selectedEnrollmentTerm();
        setText("[data-enrollment-window]", !term ? ""
            : term.enrollmentOpen ? "Enrollment is open for this term." : "Enrollment is not open for this term.");
        if (!enrollmentApplication || ["DRAFT", "REJECTED", "RETURNED_FOR_CORRECTION"].includes(enrollmentApplication.status)) {
            enrollmentSubmit.disabled = !term?.enrollmentOpen;
        }
        setSubjectSelectionState();
        return Boolean(term?.enrollmentOpen);
    };
    const setEnrollmentLocked = (locked) => {
        selectedSubjectState.locked = locked;
        selectAll("input, select, textarea", enrollmentForm).forEach((input) => {
            input.disabled = locked || input.readOnly || input.dataset.enrollmentLocked === "true";
        });
        enrollmentSave.disabled = locked;
        enrollmentSubmit.disabled = locked;
        renderSubjectSelection();
    };

    // ── Document handling for enrollment form ──────────────────────────────
    let documentTypes = [];
    let studentDocuments = [];
    const documentsList = select("[data-documents-list]");
    const documentsHint = select("[data-documents-hint]");

    const fetchDocumentTypes = async () => {
        try {
            const data = await auth.getDocumentTypes();
            documentTypes = data?.documentTypes || [];
        } catch {
            documentTypes = [];
        }
    };

    const fetchStudentDocuments = async (admissionApplicationId) => {
        if (!admissionApplicationId) {
            studentDocuments = [];
            return;
        }
        try {
            const data = await auth.getStudentDocuments();
            studentDocuments = data?.documents || [];
        } catch {
            studentDocuments = [];
        }
    };

    const renderDocumentsList = () => {
        if (!documentsList) return;
        documentsList.replaceChildren();
        if (!documentTypes.length) {
            const empty = document.createElement("p");
            empty.className = "dashboard-list__empty";
            empty.textContent = "Loading required documents...";
            documentsList.append(empty);
            return;
        }
        const requiredTypes = documentTypes.filter((dt) => dt.required);
        if (!requiredTypes.length) {
            const empty = document.createElement("p");
            empty.className = "dashboard-list__empty";
            empty.textContent = "No required documents configured.";
            documentsList.append(empty);
            return;
        }
        const isLocked = Boolean(enrollmentApplication && !["DRAFT", "REJECTED", "RETURNED_FOR_CORRECTION"].includes(enrollmentApplication.status));
        requiredTypes.forEach((docType) => {
            const existingDoc = studentDocuments.find((d) => d.documentTypeId === docType.id);
            const item = document.createElement("article");
            item.className = "document-item";
            item.dataset.documentTypeId = docType.id;

            const header = document.createElement("div");
            header.className = "document-item__header";

            const title = document.createElement("h4");
            title.textContent = docType.name;

            const requiredBadge = document.createElement("span");
            requiredBadge.className = "status-pill status-required";
            requiredBadge.textContent = "Required";

            header.append(title, requiredBadge);

            const detail = document.createElement("p");
            detail.className = "document-item__detail";

            const actions = document.createElement("div");
            actions.className = "document-item__actions";

            if (existingDoc) {
                const status = existingDoc.status;
                const statusMap = {
                    PENDING: "Pending",
                    SUBMITTED: "Uploaded",
                    VERIFIED: "Verified",
                    REJECTED: "Rejected",
                    RETURNED_FOR_CORRECTION: "Returned for correction"
                };
                detail.textContent = `${statusMap[status] || status} · ${existingDoc.originalFileName || "Document"} · ${formatDate(existingDoc.uploadedAt)}`;
                detail.classList.add(`status-${String(status).toLowerCase()}`);

                if (existingDoc.remarks) {
                    const remark = document.createElement("small");
                    remark.textContent = `Remark: ${existingDoc.remarks}`;
                    remark.style.display = "block";
                    remark.style.marginTop = "4px";
                    detail.append(remark);
                }

                if (existingDoc.filePath) {
                    const viewBtn = document.createElement("a");
                    viewBtn.className = "button button--quiet button--small";
                    viewBtn.href = `/api/v1/student/documents/${existingDoc.id}/view`;
                    viewBtn.target = "_blank";
                    viewBtn.rel = "noopener";
                    viewBtn.textContent = "View";
                    actions.append(viewBtn);
                }

                // Allow replacement ONLY if not locked, or if explicitly returned for correction
                if (!isLocked || status === "RETURNED_FOR_CORRECTION") {
                    if (["PENDING", "SUBMITTED", "RETURNED_FOR_CORRECTION", "REJECTED"].includes(status)) {
                        const replaceInput = document.createElement("input");
                        replaceInput.type = "file";
                        replaceInput.accept = ".pdf,.jpg,.jpeg,.png";
                        replaceInput.className = "document-replace-input";
                        replaceInput.style.display = "none";
                        replaceInput.dataset.documentTypeId = docType.id;
                        replaceInput.dataset.documentId = existingDoc.id;
                        replaceInput.addEventListener("change", handleDocumentReplace);
                        actions.append(replaceInput);

                        const replaceBtn = document.createElement("button");
                        replaceBtn.type = "button";
                        replaceBtn.className = "button button--quiet button--small";
                        replaceBtn.textContent = "Replace";
                        replaceBtn.addEventListener("click", () => replaceInput.click());
                        actions.append(replaceBtn);
                    }
                }
            } else {
                detail.textContent = isLocked ? "Not submitted (Locked)" : "Not submitted";

                if (!isLocked) {
                    const uploadInput = document.createElement("input");
                    uploadInput.type = "file";
                    uploadInput.accept = ".pdf,.jpg,.jpeg,.png";
                    uploadInput.className = "document-upload-input";
                    uploadInput.style.display = "none";
                    uploadInput.dataset.documentTypeId = docType.id;
                    uploadInput.addEventListener("change", handleDocumentUpload);
                    actions.append(uploadInput);

                    const uploadBtn = document.createElement("button");
                    uploadBtn.type = "button";
                    uploadBtn.className = "button button--primary button--small";
                    uploadBtn.textContent = "Upload";
                    uploadBtn.addEventListener("click", () => uploadInput.click());
                    actions.append(uploadBtn);
                }
            }

            item.append(header, detail, actions);
            documentsList.append(item);
        });

        // Show/hide hint based on completion
        const allUploaded = requiredTypes.every((dt) => studentDocuments.some((d) => d.documentTypeId === dt.id));
        if (documentsHint) documentsHint.hidden = isLocked || allUploaded;
    };

    const handleDocumentUpload = async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        const documentTypeId = input.dataset.documentTypeId;
        if (!file || !documentTypeId) return;
        if (!admissionApplication?.id) {
            showError(enrollmentError, "Admission application record could not be loaded. Please refresh the page.");
            return;
        }

        const uploadBtn = input.nextElementSibling;
        const originalText = uploadBtn?.textContent;
        uploadBtn.disabled = true;
        uploadBtn.textContent = "Uploading...";

        try {
            const result = await auth.uploadStudentDocument(documentTypeId, admissionApplication.id, file);
            if (result?.document) {
                await fetchStudentDocuments(admissionApplication.id);
                renderDocumentsList();
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            showError(enrollmentError, error.message || "Failed to upload document. Please try again.");
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = originalText;
            input.value = "";
        }
    };

    const handleDocumentReplace = async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        const documentTypeId = input.dataset.documentTypeId;
        const documentId = input.dataset.documentId;
        if (!file || !documentTypeId || !documentId) return;
        if (!admissionApplication?.id) {
            showError(enrollmentError, "Admission application record could not be loaded. Please refresh the page.");
            return;
        }

        const replaceBtn = input.nextElementSibling;
        const originalText = replaceBtn?.textContent;
        replaceBtn.disabled = true;
        replaceBtn.textContent = "Replacing...";

        try {
            // The upload endpoint replaces the existing document atomically by type.
            const result = await auth.uploadStudentDocument(documentTypeId, admissionApplication.id, file);
            if (result?.document) {
                await fetchStudentDocuments(admissionApplication.id);
                renderDocumentsList();
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            showError(enrollmentError, error.message || "Failed to replace document. Please try again.");
        } finally {
            replaceBtn.disabled = false;
            replaceBtn.textContent = originalText;
            input.value = "";
        }
    };

    const validateRequiredDocuments = () => {
        const requiredTypes = documentTypes.filter((dt) => dt.required);
        const missing = requiredTypes.filter((dt) => !studentDocuments.some((d) => d.documentTypeId === dt.id));
        return missing.map((dt) => dt.name);
    };

    const loadEnrollmentApplication = async () => {
        const [application, options, docTypes] = await Promise.all([
            auth.getEnrollmentApplication(),
            auth.getEnrollmentOptions(),
            auth.getDocumentTypes()
        ]);
        enrollmentApplication = application.application;
        admissionApplication = application.admission;
        enrollmentOptions = options;
        documentTypes = docTypes?.documentTypes || [];
        populateEnrollmentOptions(options);
        fillEnrollmentForm(enrollmentApplication, application.profile);
        const locked = Boolean(enrollmentApplication && !["DRAFT", "REJECTED", "RETURNED_FOR_CORRECTION"].includes(enrollmentApplication.status));
        setEnrollmentLocked(locked);
        updateEnrollmentWindow();
        setText("[data-enrollment-form-status]", enrollmentApplication?.status ? humanize(enrollmentApplication.status) : "Draft");
        if (enrollmentApplication?.reviewRemarks) enrollmentStatus.textContent = `Returned for correction: ${enrollmentApplication.reviewRemarks}`;
        await fetchStudentDocuments(admissionApplication?.id);
        renderDocumentsList();
    };
    const openEnrollmentDialog = async () => {
        if (!enrollmentDialog) return;
        clearMessage(enrollmentError);
        enrollmentStatus.textContent = "Loading enrollment application...";
        try {
            await loadEnrollmentApplication();
            if (typeof enrollmentDialog.showModal === "function") {
                if (!enrollmentDialog.open) enrollmentDialog.showModal();
            } else {
                enrollmentDialog.setAttribute("open", "");
            }
            window.setTimeout(() => enrollmentInput("personal.fullName")?.focus(), 60);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            showError(enrollmentError, "The enrollment form could not be loaded. Try again.");
            enrollmentStatus.textContent = "";
        }
    };
    const closeEnrollmentDialog = () => {
        if (!enrollmentDialog || enrollmentForm?.getAttribute("aria-busy") === "true") return;
        if (typeof enrollmentDialog.close === "function" && enrollmentDialog.open) enrollmentDialog.close();
        else enrollmentDialog.removeAttribute("open");
        clearMessage(enrollmentError);
        enrollmentStatus.textContent = "";
    };
    const saveEnrollment = async (submit) => {
        clearMessage(enrollmentError);
        const payload = {
            programId: enrollmentInput("programId").value,
            academicTermId: enrollmentInput("academicTermId").value,
            yearLevel: enrollmentInput("yearLevel").value,
            selectedSubjectIds: selectedSubjectState.items.map((item) => item.id || item.subjectId),
            formData: enrollmentFormData()
        };
        const required = [payload.programId, payload.academicTermId, payload.yearLevel];
        if (required.some((value) => !value)) {
            showError(enrollmentError, "Choose a program, academic term, and year level.");
            return;
        }
        if (submit && !updateEnrollmentWindow()) {
            showError(enrollmentError, "Enrollment is not open for the selected academic term.");
            return;
        }
        if (submit) {
            const missingDocs = validateRequiredDocuments();
            if (missingDocs.length > 0) {
                showError(enrollmentError, `Please complete all required documents before submitting your application. Missing: ${missingDocs.join(", ")}`);
                if (documentsHint) documentsHint.hidden = false;
                return;
            }
        }
        setBusy(enrollmentForm, true);
        enrollmentStatus.textContent = submit ? "Submitting enrollment application..." : "Saving draft...";
        try {
            const result = submit
                ? await auth.submitEnrollmentApplication(payload)
                : await auth.saveEnrollmentApplication(payload);
            enrollmentApplication = result.application;
            setText("[data-enrollment-form-status]", humanize(enrollmentApplication.status));
            enrollmentStatus.textContent = submit
                ? "Enrollment submitted for Program Head review. Your selected subjects are now read only."
                : "Enrollment draft saved. You can continue later.";
            if (submit) setEnrollmentLocked(true);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            showError(enrollmentError, error.message || "The enrollment application could not be saved.");
            enrollmentStatus.textContent = "";
        } finally {
            // Always release busy state so dialog controls (including close) work after request completion.
            setBusy(enrollmentForm, false);
            const locked = Boolean(
                enrollmentApplication
                && !["DRAFT", "RETURNED_FOR_CORRECTION", "REJECTED"].includes(enrollmentApplication.status)
            );
            setEnrollmentLocked(locked);
            updateEnrollmentWindow();
        }
    };
    select("[data-open-enrollment-application]")?.addEventListener("click", openEnrollmentDialog);
    select("[data-close-enrollment]")?.addEventListener("click", closeEnrollmentDialog);
    enrollmentDialog?.addEventListener("click", (event) => { if (event.target === enrollmentDialog) closeEnrollmentDialog(); });
    enrollmentInput("academicTermId")?.addEventListener("change", updateEnrollmentWindow);
    enrollmentInput("programId")?.addEventListener("change", () => {
        const prog = selectedProgram();
        const yearSelect = enrollmentInput("yearLevel");
        if (prog && yearSelect) {
            const currentYear = yearSelect.value;
            yearSelect.replaceChildren(new Option("Select", ""));
            for (let year = 1; year <= Number(prog.durationYears || 0); year += 1) {
                yearSelect.append(new Option(`Year ${year}`, String(year)));
            }
            if (currentYear && Number(currentYear) <= Number(prog.durationYears || 0)) {
                yearSelect.value = currentYear;
            }
        }
        setSubjectSelectionState();
        updateEnrollmentWindow();
    });
    enrollmentInput("yearLevel")?.addEventListener("change", () => {
        setSubjectSelectionState();
        updateEnrollmentWindow();
    });
    document.addEventListener("click", handleSubjectSelectionToggle);
    enrollmentSave?.addEventListener("click", () => saveEnrollment(false));
    enrollmentSubmit?.addEventListener("click", () => saveEnrollment(true));

    // --- System Monitoring ---
    const systemLogsTable = select("[data-system-logs-table]");
    const systemLogsBody = select("[data-system-logs-body]");
    const systemLogsStatus = select("[data-system-logs-status]");
    const logSeverityFilter = select("[data-log-filter]");
    const logSearchInput = select("[data-log-search]");
    const refreshLogsBtn = select("[data-refresh-system-logs]");
    const monitoringHealthStatus = select("[data-monitoring-health-status]");

    const renderMonitoringHealth = (health) => {
        state.monitoringHealth = health;
        const performance = health?.performance || {};
        const incidents = health?.incidents || {};
        setText("[data-monitoring-database]", health?.database?.status === "available" ? "Available" : "Unavailable");
        setText("[data-monitoring-database-latency]", health?.database?.latencyMs == null ? "Latency unavailable" : `${health.database.latencyMs} ms latency`);
        setText("[data-monitoring-requests]", String(performance.requestsTotal || 0));
        setText("[data-monitoring-average]", `${performance.averageDurationMs || 0} ms average`);
        setText("[data-monitoring-errors]", String(performance.serverErrorsTotal || 0));
        setText("[data-monitoring-slow]", `${performance.slowRequestsTotal || 0} slow requests`);
        setText("[data-monitoring-incidents]", String(incidents.openHighPriority ?? 0));
        setText("[data-monitoring-critical]", `${incidents.criticalLast24Hours ?? 0} critical in 24 hours`);
        if (monitoringHealthStatus) {
            monitoringHealthStatus.textContent = health?.status === "healthy" ? "Healthy" : "Degraded";
            monitoringHealthStatus.className = `status-pill ${health?.status === "healthy" ? "status-pill--info" : "status-pill--critical"}`;
        }
        setText("[data-monitoring-health-updated]", health?.checkedAt ? `Last checked ${new Date(health.checkedAt).toLocaleString()}` : "");
    };

    const deleteUser = async (user, button) => {
        if (!isAdministrator() || needsPasswordChange()) return;
        const name = displayName(user);
        if (!window.confirm(`Delete ${name}'s account? This permanently removes sign-in access and anonymizes the account while retaining required audit references. Disable it instead if you need to keep the account identifiable.`)) return;

        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        const priorLabel = button.textContent;
        button.textContent = "Deleting…";
        if (usersStatus) usersStatus.textContent = "Deleting account…";
        try {
            await auth.deleteUser(user.id);
            state.users = state.users.filter((candidate) => String(candidate.id) !== String(user.id));
            renderUsers();
            if (usersStatus) usersStatus.textContent = `${name}'s account was deleted.`;
        } catch (error) {
            if (handleExpiredSession(error)) return;
            button.disabled = false;
            button.setAttribute("aria-busy", "false");
            button.textContent = priorLabel;
            if (usersStatus) {
                usersStatus.textContent = error.code === "ACCOUNT_DELETE_BLOCKED"
                    ? "That account has protected records. Disable it instead of deleting it."
                    : error.message || "The account could not be deleted.";
            }
        }
    };

    const loadMonitoringHealth = async () => {
        try {
            renderMonitoringHealth(await auth.getMonitoringHealth());
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (monitoringHealthStatus) {
                monitoringHealthStatus.textContent = "Unavailable";
                monitoringHealthStatus.className = "status-pill status-pill--critical";
            }
            setText("[data-monitoring-health-updated]", "Health data could not be loaded.");
        }
    };

    const loadSystemLogs = async () => {
        if (!systemLogsTable) return;
        try {
            systemLogsStatus.textContent = "Loading system logs...";
            systemLogsStatus.hidden = false;
            systemLogsTable.hidden = true;

            const options = {};
            if (logSeverityFilter?.value) options.severity = logSeverityFilter.value;

            const response = await auth.getSystemLogs(options);
            state.systemLogs = response?.entries || response?.data?.entries || [];
            renderSystemLogs();
            systemLogsStatus.hidden = true;
            systemLogsTable.hidden = false;
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load system logs", error);
            systemLogsStatus.textContent = "Failed to load system logs.";
        }
    };

    const renderSystemLogs = () => {
        if (!systemLogsBody) return;
        systemLogsBody.innerHTML = "";

        const query = (logSearchInput?.value || "").trim().toLowerCase();
        let logs = state.systemLogs || [];

        if (query) {
            logs = logs.filter((log) => {
                const msg = (log.message || "").toLowerCase();
                const cat = (log.category || "").toLowerCase();
                const errId = (log.errorId || log.id || "").toLowerCase();
                const tech = (log.technicalDetail || "").toLowerCase();
                const sev = (log.severity || "").toLowerCase();
                const status = (log.status || "").toLowerCase();
                return msg.includes(query) || cat.includes(query) || errId.includes(query) || tech.includes(query) || sev.includes(query) || status.includes(query);
            });
        }

        if (!logs || logs.length === 0) {
            systemLogsBody.insertAdjacentHTML("beforeend", `<tr><td colspan="6" class="empty-state">${query ? "No system logs match your search." : "No system logs found."}</td></tr>`);
            return;
        }

        for (const log of logs) {
            const tr = document.createElement("tr");

            const dateStr = new Date(log.createdAt).toLocaleString();

            const severityMap = { INFO: "status-pill--info", WARNING: "status-pill--warning", HIGH: "status-pill--high", CRITICAL: "status-pill--critical" };
            const severityBadge = "status-pill " + (severityMap[log.severity] || "");

            tr.innerHTML = `
            <td>
                <small>${escapeHtml(log.errorId || log.id)}</small><br/>
                <span class="muted">${escapeHtml(dateStr)}</span>
            </td>
            <td><span class="${severityBadge}">${escapeHtml(log.severity)}</span></td>
            <td>${escapeHtml(log.category)}</td>
            <td>
                <strong>${escapeHtml(log.message)}</strong>
                <details>
                    <summary>Technical Details</summary>
                    <pre><code>${escapeHtml(log.technicalDetail || "")}</code></pre>
                </details>
            </td>
            <td><span class="status-pill">${escapeHtml(log.status)}</span></td>
            <td>
                <select data-log-id="${escapeHtml(log.id)}" class="status-select">
                    <option value="OPEN" ${log.status === "OPEN" ? "selected" : ""}>OPEN</option>
                    <option value="INVESTIGATING" ${log.status === "INVESTIGATING" ? "selected" : ""}>INVESTIGATING</option>
                    <option value="RESOLVED" ${log.status === "RESOLVED" ? "selected" : ""}>RESOLVED</option>
                    <option value="IGNORED" ${log.status === "IGNORED" ? "selected" : ""}>IGNORED</option>
                </select>
            </td>
        `;
            systemLogsBody.appendChild(tr);
        }
    };

    systemLogsBody?.addEventListener("change", async (event) => {
        if (event.target.classList.contains("status-select")) {
            const select = event.target;
            const logId = select.dataset.logId;
            const newStatus = select.value;
            select.disabled = true;
            try {
                await auth.updateSystemLogStatus(logId, newStatus);
                const log = state.systemLogs.find(l => l.id === logId);
                if (log) log.status = newStatus;
                renderSystemLogs();
            } catch (error) {
                handleExpiredSession(error);
                select.value = state.systemLogs.find(l => l.id === logId)?.status || "OPEN";
                alert("Failed to update status.");
            } finally {
                select.disabled = false;
            }
        }
    });

    logSearchInput?.addEventListener("input", renderSystemLogs);
    logSeverityFilter?.addEventListener("change", loadSystemLogs);
    refreshLogsBtn?.addEventListener("click", () => {
        void Promise.allSettled([loadSystemLogs(), loadMonitoringHealth()]);
    });

    // Hook into existing load routine
    const originalLoadUsers = loadUsers;
    loadUsers = async () => {
        await Promise.allSettled([originalLoadUsers(), loadSystemLogs(), loadMonitoringHealth(), loadAdminFaculty()]);
    };

    // ── Admin Faculty Management ─────────────────────────────────────

    const loadAdminFaculty = async () => {
        if (!adminFacultyTbody) return;
        try {
            adminFacultyTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1rem;">Loading faculty...</td></tr>`;

            const [facultyRes, collegesRes] = await Promise.all([
                auth.getAdminFaculty(),
                state.adminColleges.length === 0 ? auth.getAdminColleges() : Promise.resolve({ colleges: state.adminColleges })
            ]);

            state.adminFaculty = facultyRes?.faculty || facultyRes?.data?.faculty || [];
            const colleges = collegesRes?.colleges || collegesRes?.data?.colleges;
            if (colleges) {
                state.adminColleges = colleges;
                populateFacultyColleges();
            }

            renderAdminFaculty();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load faculty accounts:", error);
            adminFacultyTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1rem; color:var(--color-error)">Failed to load faculty accounts.</td></tr>`;
        }
    };

    const populateFacultyColleges = () => {
        if (!facultyCollegeSelect) return;
        const currentVal = facultyCollegeSelect.value;
        facultyCollegeSelect.innerHTML = `<option value="">Select college...</option>`;
        const colleges = Array.isArray(state.adminColleges) ? state.adminColleges : [];
        for (const c of colleges) {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = `${c.code} · ${c.name}`;
            facultyCollegeSelect.appendChild(opt);
        }
        if (currentVal) facultyCollegeSelect.value = currentVal;
    };

    const renderAdminFaculty = () => {
        if (!adminFacultyTbody) return;
        adminFacultyTbody.innerHTML = "";

        if (!state.adminFaculty || state.adminFaculty.length === 0) {
            adminFacultyTbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="text-align:center; padding:1.5rem;">No faculty accounts found.</td></tr>`;
            return;
        }

        for (const f of state.adminFaculty) {
            const tr = document.createElement("tr");
            const isActive = f.status === "ACTIVE";
            const statusBadge = isActive
                ? `<span class="status-pill status-pill--info">Active</span>`
                : `<span class="status-pill status-pill--critical">Inactive</span>`;

            tr.innerHTML = `
                <td><strong>${escapeHtml(f.employeeNumber)}</strong></td>
                <td>${escapeHtml(f.fullName)}</td>
                <td>${escapeHtml(f.institutionalEmail || "—")}</td>
                <td>${escapeHtml(f.college?.code || "—")}</td>
                <td>${f.assignedClassesCount}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="button button--quiet button--small" type="button" data-toggle-faculty-status="${f.id}" data-current-status="${f.status}">
                        ${isActive ? "Deactivate" : "Activate"}
                    </button>
                </td>
            `;
            adminFacultyTbody.appendChild(tr);
        }
    };

    adminFacultyTbody?.addEventListener("click", async (e) => {
        const toggleBtn = e.target.closest("[data-toggle-faculty-status]");
        if (!toggleBtn) return;
        const facultyId = toggleBtn.getAttribute("data-toggle-faculty-status");
        const currentStatus = toggleBtn.getAttribute("data-current-status");
        const newStatus = currentStatus === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";

        if (!confirm(`Are you sure you want to ${newStatus === "ACTIVE" ? "activate" : "deactivate"} this faculty account?`)) return;

        toggleBtn.disabled = true;
        try {
            await auth.updateAdminFaculty(facultyId, { status: newStatus });
            await loadAdminFaculty();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            alert(error.message || "Failed to update faculty status.");
            toggleBtn.disabled = false;
        }
    });

    showFacultyFormBtn?.addEventListener("click", async () => {
        if (facultyCreateForm) facultyCreateForm.reset();
        if (facultyCreateError) {
            facultyCreateError.textContent = "";
            facultyCreateError.style.display = "none";
        }
        if (!state.adminColleges || state.adminColleges.length === 0) {
            if (facultyCollegeSelect) {
                facultyCollegeSelect.innerHTML = `<option value="">Loading colleges...</option>`;
            }
            try {
                const collegesRes = await auth.getAdminColleges();
                const colleges = collegesRes?.colleges || collegesRes?.data?.colleges || [];
                state.adminColleges = colleges;
            } catch (err) {
                console.error("Failed to load colleges for faculty form:", err);
            }
        }
        populateFacultyColleges();
        if (typeof facultyCreateDialog?.showModal === "function") {
            if (!facultyCreateDialog.open) facultyCreateDialog.showModal();
        } else {
            facultyCreateDialog?.setAttribute("open", "");
        }
    });

    closeFacultyCreateDialogBtn?.addEventListener("click", () => {
        facultyCreateDialog?.close();
    });

    facultyCreateForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = facultyCreateForm.querySelector("[type='submit']");
        submitBtn.disabled = true;
        if (facultyCreateError) {
            facultyCreateError.textContent = "";
            facultyCreateError.style.display = "none";
        }

        const formData = new FormData(facultyCreateForm);
        const payload = {
            firstName: String(formData.get("firstName") || "").trim(),
            middleName: String(formData.get("middleName") || "").trim() || undefined,
            lastName: String(formData.get("lastName") || "").trim(),
            suffix: String(formData.get("suffix") || "").trim() || undefined,
            employeeNumber: String(formData.get("employeeNumber") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            collegeId: String(formData.get("collegeId") || "").trim(),
            password: String(formData.get("password") || "").trim() || undefined
        };

        try {
            const res = await auth.createAdminFaculty(payload);
            facultyCreateDialog?.close();
            await loadAdminFaculty();
            const created = res?.data ?? res;
            if (created?.tempPassword) {
                alert(`Faculty account created successfully!\n\nUsername: ${created.username}\nTemporary Password: ${created.tempPassword}\n\nPlease share this temporary password securely with the faculty member.`);
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (facultyCreateError) {
                facultyCreateError.textContent = error.message || "Failed to create faculty account.";
                facultyCreateError.style.display = "block";
            }
        } finally {
            submitBtn.disabled = false;
        }
    });

    refreshAdminFacultyBtn?.addEventListener("click", () => {
        void loadAdminFaculty();
    });


    // ── Teacher Workspace (Assigned Classes & Grade Encoding) ─────────

    const loadFacultyClasses = async () => {
        if (!facultyClassesGrid) return;
        try {
            facultyClassesGrid.innerHTML = `<p style="text-align:center; padding:2rem; color:var(--color-text-tertiary)">Loading assigned classes...</p>`;
            const res = await auth.getFacultyClasses();
            state.facultyClasses = res?.classes || res?.data?.classes || [];
            renderFacultyClasses();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load faculty classes:", error);
            facultyClassesGrid.innerHTML = `<p style="text-align:center; padding:2rem; color:var(--color-error)">Failed to load assigned classes.</p>`;
        }
    };

    const renderFacultyClasses = () => {
        if (!facultyClassesGrid) return;
        facultyClassesGrid.innerHTML = "";

        if (!state.facultyClasses || state.facultyClasses.length === 0) {
            facultyClassesGrid.innerHTML = `<p style="text-align:center; padding:2rem; color:var(--color-text-tertiary)">No classes currently assigned to you for this term.</p>`;
            return;
        }

        for (const c of state.facultyClasses) {
            const card = document.createElement("div");
            card.className = "faculty-class-card";

            const schedulesStr = c.schedules?.length
                ? c.schedules.map(s => `${s.weekday} ${s.startsAt ? s.startsAt.slice(11, 16) : ""} - ${s.endsAt ? s.endsAt.slice(11, 16) : ""} (${s.room?.code || "TBA"})`).join(", ")
                : "No schedule set";

            card.innerHTML = `
                <div class="faculty-class-card__header">
                    <div>
                        <span class="eyebrow">${escapeHtml(c.offeringCode)}</span>
                        <h3 class="faculty-class-card__title">${escapeHtml(c.subject.code)} · ${escapeHtml(c.subject.title)}</h3>
                    </div>
                    <span class="status-pill status-pill--info">${escapeHtml(c.status)}</span>
                </div>
                <div class="faculty-class-card__meta">
                    <div><strong>Section:</strong> ${escapeHtml(c.section?.code || "—")}</div>
                    <div><strong>Term:</strong> ${escapeHtml(c.academicTerm?.name || "—")} (${escapeHtml(c.academicTerm?.academicYear?.code || "")})</div>
                    <div><strong>Schedule:</strong> ${escapeHtml(schedulesStr)}</div>
                    <div><strong>Enrolled:</strong> ${c.enrolledCount} / ${c.capacity != null ? c.capacity : "∞"} students</div>
                </div>
                <div class="faculty-class-card__footer">
                    <button class="button button--primary button--small" type="button" data-open-roster="${c.offeringId}">
                        Open Class Roster &amp; Grades
                    </button>
                </div>
            `;
            facultyClassesGrid.appendChild(card);
        }
    };

    refreshFacultyBtn?.addEventListener("click", () => {
        void loadFacultyClasses();
    });

    facultyClassesGrid?.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-open-roster]");
        if (!btn) return;
        const offeringId = btn.getAttribute("data-open-roster");
        await openFacultyRoster(offeringId);
    });

    const openFacultyRoster = async (offeringId) => {
        if (!facultyRosterDialog) return;
        facultyRosterTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem;">Loading class roster and grades...</td></tr>`;
        if (typeof facultyRosterDialog?.showModal === "function") {
            if (!facultyRosterDialog.open) facultyRosterDialog.showModal();
        } else {
            facultyRosterDialog?.setAttribute("open", "");
        }

        try {
            const res = await auth.getFacultyClassRoster(offeringId);
            const data = res?.offering ? res : (res?.data || {});
            state.activeOfferingRoster = data;

            if (facultyRosterTitle) {
                facultyRosterTitle.textContent = `${data.offering.subjectCode} · ${data.offering.subjectTitle} (${data.offering.section || "No Section"})`;
            }
            if (facultyRosterInfo) {
                facultyRosterInfo.innerHTML = `
                    <span><strong>Offering Code:</strong> ${escapeHtml(data.offering.offeringCode)}</span> &bull; 
                    <span><strong>Status:</strong> ${escapeHtml(data.offering.status)}</span> &bull; 
                    <span><strong>Enrolled Students:</strong> ${data.students.length}</span>
                `;
            }

            renderFacultyRosterStudents();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load roster:", error);
            facultyRosterTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--color-error)">Failed to load class roster.</td></tr>`;
        }
    };

    const renderFacultyRosterStudents = () => {
        if (!facultyRosterTbody || !state.activeOfferingRoster) return;
        facultyRosterTbody.innerHTML = "";

        const students = state.activeOfferingRoster.students || [];
        if (students.length === 0) {
            facultyRosterTbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="text-align:center; padding:1.5rem;">No students are officially enrolled in this class yet.</td></tr>`;
            if (saveDraftGradesBtn) saveDraftGradesBtn.disabled = true;
            if (submitGradesBtn) submitGradesBtn.disabled = true;
            return;
        }

        let allPosted = true;
        let anySubmitted = false;

        students.forEach((s, idx) => {
            const tr = document.createElement("tr");
            const grade = s.grades?.[0];
            const isPosted = grade?.status === "POSTED";
            const isSubmitted = grade?.status === "SUBMITTED";

            if (!isPosted) allPosted = false;
            if (isSubmitted) anySubmitted = true;

            let statusBadge = `<span class="status-pill">Not Graded</span>`;
            if (grade?.status === "DRAFT") {
                statusBadge = `<span class="status-pill status-draft">Draft</span>`;
            } else if (grade?.status === "SUBMITTED") {
                statusBadge = `<span class="status-pill status-submitted">Submitted</span>`;
            } else if (grade?.status === "POSTED") {
                statusBadge = `<span class="status-pill status-posted">Posted</span>`;
            }
            if (grade?.remarks && grade?.status === "DRAFT") {
                statusBadge += `<small class="grade-return-remarks">Returned: ${escapeHtml(grade.remarks)}</small>`;
            }

            const isInputDisabled = isPosted || isSubmitted;

            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(s.studentNumber)}</strong></td>
                <td>${escapeHtml(s.fullName)}</td>
                <td>${escapeHtml(s.program?.code || "—")} · Year ${s.yearLevel || "—"}</td>
                <td>
                    <input type="number" step="0.25" min="0" max="100" class="grade-input"
                        data-enrollment-item-id="${s.enrollmentItemId}"
                        value="${grade?.numericGrade != null ? grade.numericGrade : ""}"
                        ${isInputDisabled ? "disabled" : ""}
                        placeholder="0-100">
                </td>
                <td>${statusBadge}</td>
            `;
            facultyRosterTbody.appendChild(tr);
        });

        if (saveDraftGradesBtn) saveDraftGradesBtn.disabled = allPosted || anySubmitted;
        if (submitGradesBtn) submitGradesBtn.disabled = allPosted;
    };

    closeRosterDialogBtn?.addEventListener("click", () => {
        facultyRosterDialog?.close();
    });

    const collectRosterGrades = () => {
        if (!state.activeOfferingRoster) return [];
        const gradingPeriodId = state.activeOfferingRoster.gradingPeriods?.[0]?.id || null;

        const inputs = selectAll(".grade-input", facultyRosterTbody);
        const grades = [];
        for (const input of inputs) {
            if (input.disabled) continue;
            const val = input.value.trim();
            if (val !== "") {
                const numericGrade = Number(val);
                if (!Number.isNaN(numericGrade)) {
                    grades.push({
                        enrollmentItemId: input.getAttribute("data-enrollment-item-id"),
                        gradingPeriodId,
                        numericGrade
                    });
                }
            }
        }
        return grades;
    };

    saveDraftGradesBtn?.addEventListener("click", async () => {
        if (!state.activeOfferingRoster) return;
        const grades = collectRosterGrades();
        if (grades.length === 0) {
            alert("Please enter at least one grade before saving.");
            return;
        }

        saveDraftGradesBtn.disabled = true;
        try {
            await auth.saveFacultyGrades(state.activeOfferingRoster.offering.id, grades);
            await openFacultyRoster(state.activeOfferingRoster.offering.id);
            alert("Draft grades saved successfully.");
        } catch (error) {
            if (handleExpiredSession(error)) return;
            alert(error.message || "Failed to save draft grades.");
        } finally {
            saveDraftGradesBtn.disabled = false;
        }
    });

    submitGradesBtn?.addEventListener("click", async () => {
        if (!state.activeOfferingRoster) return;
        const grades = collectRosterGrades();
        if (grades.length === 0) {
            alert("Please enter at least one grade before submitting.");
            return;
        }

        if (!confirm("Are you sure you want to submit these grades to the Registrar? Once submitted, you cannot edit them without Registrar approval.")) return;

        submitGradesBtn.disabled = true;
        try {
            await auth.submitFacultyGrades(state.activeOfferingRoster.offering.id, grades);
            await openFacultyRoster(state.activeOfferingRoster.offering.id);
            alert("Grades submitted to the Dean for review successfully.");
        } catch (error) {
            if (handleExpiredSession(error)) return;
            alert(error.message || "Failed to submit grades.");
        } finally {
            submitGradesBtn.disabled = false;
        }
    });


    // ── Registrar Grade Approvals ─────────────────────────────────────

    const loadRegistrarGradeSubmissions = async () => {
        if (!gradeSubmissionsTbody) return;
        try {
            gradeSubmissionsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:1rem;">Loading submissions...</td></tr>`;
            const res = await auth.getRegistrarGradeSubmissions();
            state.gradeSubmissions = res?.submissions || res?.data?.submissions || [];
            renderRegistrarGradeSubmissions();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load grade submissions:", error);
            gradeSubmissionsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:1rem; color:var(--color-error)">Failed to load grade submissions.</td></tr>`;
        }
    };

    const renderRegistrarGradeSubmissions = () => {
        const badge = select("[data-registrar-grades-badge]");
        if (badge) {
            const count = state.gradeSubmissions ? state.gradeSubmissions.length : 0;
            badge.textContent = count;
            badge.hidden = count === 0;
        }

        if (!gradeSubmissionsTbody) return;
        gradeSubmissionsTbody.innerHTML = "";

        if (!state.gradeSubmissions || state.gradeSubmissions.length === 0) {
            gradeSubmissionsTbody.innerHTML = `<tr><td colspan="8" class="empty-state" style="text-align:center; padding:1.5rem;">No pending grade submissions awaiting review.</td></tr>`;
            return;
        }

        for (const s of state.gradeSubmissions) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(s.offeringCode)}</strong></td>
                <td>${escapeHtml(s.subjectCode)} · ${escapeHtml(s.subjectTitle)}</td>
                <td>${escapeHtml(s.section || "—")}</td>
                <td>${escapeHtml(s.academicTerm)}</td>
                <td>${escapeHtml(s.instructor)}</td>
                <td>${s.enrolledCount}</td>
                <td><span class="status-pill status-submitted">${s.submittedGradeCount} / ${s.totalGradeCount}</span></td>
                <td>
                    <button class="button button--primary button--small" type="button" data-review-grades="${s.offeringId}">
                        Review &amp; Approve
                    </button>
                </td>
            `;
            gradeSubmissionsTbody.appendChild(tr);
        }
    };

    refreshGradeSubmissionsBtn?.addEventListener("click", () => {
        void loadRegistrarGradeSubmissions();
    });

    gradeSubmissionsTbody?.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-review-grades]");
        if (!btn) return;
        const offeringId = btn.getAttribute("data-review-grades");
        await openRegistrarGradeSheet(offeringId);
    });

    const openRegistrarGradeSheet = async (offeringId) => {
        if (!gradeSheetDialog) return;
        gradeSheetTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1rem;">Loading grade sheet...</td></tr>`;
        if (typeof gradeSheetDialog?.showModal === "function") {
            if (!gradeSheetDialog.open) gradeSheetDialog.showModal();
        } else {
            gradeSheetDialog?.setAttribute("open", "");
        }

        if (approveGradesBtn) approveGradesBtn.disabled = true;
        if (returnGradesBtn) returnGradesBtn.disabled = true;

        try {
            const res = await auth.getRegistrarGradeSheet(offeringId);
            const data = res?.offering ? res : (res?.data || {});
            state.activeRegistrarGradeSheet = data;

            if (gradeSheetTitle && data.offering) {
                gradeSheetTitle.textContent = `Grade Sheet · ${data.offering.subjectCode} · ${data.offering.subjectTitle} (${data.instructor || "Unassigned"})`;
            }

            renderRegistrarGradeSheetStudents();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load grade sheet:", error);
            gradeSheetTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1rem; color:var(--color-error)">Failed to load grade sheet.</td></tr>`;
            if (approveGradesBtn) approveGradesBtn.disabled = true;
            if (returnGradesBtn) returnGradesBtn.disabled = true;
        }
    };

    const renderRegistrarGradeSheetStudents = () => {
        if (!gradeSheetTbody || !state.activeRegistrarGradeSheet) return;
        gradeSheetTbody.innerHTML = "";

        const students = state.activeRegistrarGradeSheet.students || [];
        if (students.length === 0) {
            gradeSheetTbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="text-align:center; padding:1rem;">No student grades found for this offering.</td></tr>`;
            if (approveGradesBtn) approveGradesBtn.disabled = true;
            return;
        }

        const hasApproved = students.some(s => s.grades?.some(g => g.status === "APPROVED"));
        if (approveGradesBtn) {
            approveGradesBtn.disabled = !hasApproved;
            approveGradesBtn.textContent = hasApproved ? "Verify & Post Grades" : "Awaiting Dean Approval";
        }
        if (returnGradesBtn) returnGradesBtn.disabled = !hasApproved;

        students.forEach((s, idx) => {
            const tr = document.createElement("tr");
            const grade = s.grades?.[0];

            let statusBadge = `<span class="status-pill">Not Graded</span>`;
            if (grade?.status === "DRAFT") {
                statusBadge = `<span class="status-pill status-draft">Draft</span>`;
            } else if (grade?.status === "APPROVED") {
                statusBadge = `<span class="status-pill status-submitted">Dean Approved</span>`;
            } else if (grade?.status === "POSTED") {
                statusBadge = `<span class="status-pill status-posted">Posted</span>`;
            }

            const programText = typeof s.program === "object" ? s.program?.code : s.program;

            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(s.studentNumber)}</strong></td>
                <td>${escapeHtml(s.fullName)}</td>
                <td>${escapeHtml(programText || "—")} · Year ${s.yearLevel || "—"}</td>
                <td><strong>${grade?.numericGrade != null ? grade.numericGrade : "—"}</strong></td>
                <td>${statusBadge}</td>
            `;
            gradeSheetTbody.appendChild(tr);
        });
    };

    closeGradeSheetDialogBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            gradeSheetDialog?.close();
        });
    });

    approveGradesBtn?.addEventListener("click", async () => {
        if (!state.activeRegistrarGradeSheet) return;
        if (!confirm("Are you sure you want to approve and post these grades? This action will permanently lock the grades and publish them to student records.")) return;

        approveGradesBtn.disabled = true;
        try {
            await auth.approveRegistrarGrades(state.activeRegistrarGradeSheet.offering.id);
            gradeSheetDialog?.close();
            await loadRegistrarGradeSubmissions();
            alert("Grades approved and posted successfully.");
        } catch (error) {
            if (handleExpiredSession(error)) return;
            alert(error.message || "Failed to approve grades.");
        } finally {
            approveGradesBtn.disabled = false;
        }
    });

    returnGradesBtn?.addEventListener("click", async () => {
        if (!state.activeRegistrarGradeSheet) return;
        const remarks = window.prompt("Explain why these grades are being returned for correction:");
        if (!remarks || !remarks.trim()) return;

        returnGradesBtn.disabled = true;
        try {
            await auth.returnRegistrarGrades(state.activeRegistrarGradeSheet.offering.id, remarks.trim());
            gradeSheetDialog?.close();
            await loadRegistrarGradeSubmissions();
            alert("Grades returned to the faculty with remarks.");
        } catch (error) {
            if (handleExpiredSession(error)) return;
            alert(error.message || "Failed to return grades.");
        } finally {
            returnGradesBtn.disabled = false;
        }
    });

    // ── Student Assistant Workspace ─────────────────────────────────
    const loadStudentAssistantData = async () => {
        if (!isStudentAssistant() || needsPasswordChange()) return;
        clearMessage(saEncodeError);
        if (saStatus) saStatus.textContent = "Loading Student Assistant workspace…";
        try {
            const [dashboard, applicationsData] = await Promise.all([
                auth.getStudentAssistantDashboard(),
                auth.getStudentAssistantApplications(state.studentAssistantFilter || "PENDING"),
            ]);
            state.studentAssistantDashboard = dashboard;
            const applications = applicationsData?.applications || [];
            state.studentAssistantApplications = applications;

            // Render header and metrics
            if (saDepartmentContext) {
                const dept = dashboard.department;
                const programsStr = (dashboard.programs || []).map((p) => p.code).join(", ");
                saDepartmentContext.textContent = `Assigned Department: ${dept.code} · ${dept.name} (${dept.college?.name || "College"}) [Programs: ${programsStr || "None"}]`;
            }
            const pendingMetric = dashboard.metrics?.pendingCount ?? dashboard.metrics?.pendingEncoding ?? 0;
            const encodedMetric = dashboard.metrics?.encodedCount ?? dashboard.metrics?.encoded ?? 0;
            if (saPendingCount) saPendingCount.textContent = String(pendingMetric);
            if (saEncodedCount) saEncodedCount.textContent = String(encodedMetric);
            if (saProgramsCount) saProgramsCount.textContent = String((dashboard.programs || []).length);

            applyStudentAssistantView();

            if (state.selectedSaApplicationId) {
                await loadStudentAssistantApplicationDetail(state.selectedSaApplicationId);
            }
            if (saStatus) saStatus.textContent = "";
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (saStatus) saStatus.textContent = error.message || "Failed to load Student Assistant workspace.";
        }
    };

    // Search + sort over the loaded list. Every search word must match the
    // student name, student/application number, or program.
    function applyStudentAssistantView() {
        const all = state.studentAssistantApplications || [];
        const terms = String(select("[data-sa-search]")?.value || "")
            .trim().slice(0, 100).toLowerCase().split(/\s+/).filter(Boolean);
        const sortKey = select("[data-sa-sort]")?.value || "oldest";

        const matches = terms.length
            ? all.filter((app) => {
                const haystack = [
                    app.studentName, app.studentNumber, app.applicationNumber,
                    app.program?.code, app.program?.name
                ].filter(Boolean).join(" ").toLowerCase();
                return terms.every((term) => haystack.includes(term));
            })
            : [...all];

        const time = (app) => new Date(app.submittedAt || 0).getTime();
        const byName = (a, b) => String(a.studentName || "").localeCompare(String(b.studentName || ""), undefined, { sensitivity: "base" });
        const comparators = {
            oldest: (a, b) => time(a) - time(b),
            newest: (a, b) => time(b) - time(a),
            "name-asc": byName,
            "name-desc": (a, b) => byName(b, a),
            subjects: (a, b) => (b.subjectCount || 0) - (a.subjectCount || 0)
        };
        matches.sort(comparators[sortKey] || comparators.oldest);

        renderStudentAssistantApplications(matches);
        if (saStatus && terms.length) {
            saStatus.textContent = `${matches.length} of ${all.length} applications`;
        }
    }

    let saSearchTimer = null;
    select("[data-sa-search]")?.addEventListener("input", () => {
        clearTimeout(saSearchTimer);
        saSearchTimer = setTimeout(applyStudentAssistantView, 200);
    });
    select("[data-sa-sort]")?.addEventListener("change", applyStudentAssistantView);

    const renderStudentAssistantApplications = (applications = []) => {
        if (!saApplicationsList) return;
        saApplicationsList.replaceChildren();

        if (!applications.length) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.style.padding = "2rem 1rem";
            empty.style.textAlign = "center";
            const searching = Boolean(String(select("[data-sa-search]")?.value || "").trim());
            empty.textContent = searching
                ? "No applications match your search."
                : state.studentAssistantFilter === "ENCODED"
                    ? "No completed encoded applications found in your department."
                    : "No applications pending encoding in your assigned department.";
            saApplicationsList.append(empty);
            return;
        }

        applications.forEach((app) => {
            const card = document.createElement("article");
            card.className = "dashboard-item";
            if (state.selectedSaApplicationId === app.id) {
                card.classList.add("is-selected");
            }
            card.style.cursor = "pointer";

            const isEncoded = app.encodingStatus === "COMPLETED";
            const badgeClass = isEncoded ? "badge--success" : "badge--warning";
            const badgeText = isEncoded ? "Encoded" : "Needs Encoding";

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                    <div>
                        <strong style="display: block; font-size: 0.95rem; color: var(--ink);">${escapeHtml(app.studentName)}</strong>
                        <span style="font-size: 0.8rem; color: var(--muted);">${escapeHtml(app.studentNumber || app.applicationNumber)} · ${escapeHtml(app.program?.code || "—")} · Year ${app.yearLevel || 1}</span>
                    </div>
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--muted); display: flex; justify-content: space-between;">
                    <span>${app.subjectCount} subjects approved</span>
                    <span>${formatDate(app.submittedAt)}</span>
                </div>
            `;

            card.addEventListener("click", () => {
                selectAll(".dashboard-item", saApplicationsList).forEach((el) => el.classList.remove("is-selected"));
                card.classList.add("is-selected");
                void loadStudentAssistantApplicationDetail(app.id);
            });

            saApplicationsList.append(card);
        });
    };

    const loadStudentAssistantApplicationDetail = async (applicationId) => {
        if (!applicationId) return;
        state.selectedSaApplicationId = applicationId;
        clearMessage(saEncodeError);

        if (saEmptyState) saEmptyState.hidden = true;
        if (saDetailContainer) saDetailContainer.hidden = false;
        if (saSubjectsBody) {
            saSubjectsBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 1.5rem;">Loading application subjects and sections…</td></tr>`;
        }

        try {
            const detail = await auth.getStudentAssistantApplicationDetail(applicationId);
            state.currentSaDetail = detail;

            if (saStudentName) saStudentName.textContent = detail.studentName;
            if (saStudentDetails) {
                saStudentDetails.textContent = `${detail.studentNumber || detail.applicationNumber} · ${detail.program?.name || detail.program?.code} · Year ${detail.yearLevel} · ${detail.academicTerm?.name || "Term"}`;
            }
            if (saStudentStatus) {
                const isEncoded = detail.encodingStatus === "COMPLETED";
                saStudentStatus.textContent = isEncoded ? "Encoded by SA" : "Pending SA Encoding";
                saStudentStatus.className = `badge ${isEncoded ? "badge--success" : "badge--warning"}`;
            }

            // Render Footprint Banner if already encoded
            if (saFootprintBanner) {
                if (detail.encoding?.encodedByDisplayName) {
                    saFootprintBanner.hidden = false;
                    if (saEncodedByText) {
                        saEncodedByText.textContent = `${detail.encoding.encodedByDisplayName} (@${detail.encoding.encodedByUsername || "sa"})`;
                    }
                    if (saEncodedAtText) {
                        saEncodedAtText.textContent = `on ${formatDate(detail.encoding.encodedAt)}`;
                    }
                } else {
                    saFootprintBanner.hidden = true;
                }
            }

            // Render subjects and offering dropdowns
            renderStudentAssistantSubjects(detail);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (saSubjectsBody) {
                saSubjectsBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--color-error, #dc2626); padding: 1.5rem;">${escapeHtml(error.message || "Failed to load application details.")}</td></tr>`;
            }
        }
    };

    const renderStudentAssistantSubjects = (detail) => {
        if (!saSubjectsBody) return;
        saSubjectsBody.replaceChildren();

        const items = detail.items || [];
        const choices = detail.offeringChoices || [];
        const existingAssignments = detail.encoding?.assignments || [];

        if (!items.length) {
            saSubjectsBody.innerHTML = `<tr><td colspan="3" class="empty-state" style="text-align:center; padding: 1.5rem;">No evaluated subjects found for this application.</td></tr>`;
            return;
        }

        items.forEach((item) => {
            const tr = document.createElement("tr");

            const subjChoices = choices.filter((c) => c.subjectId === item.subjectId);
            const preSelected = existingAssignments.find((a) => a.curriculumSubjectId === item.id);

            let optionsHtml = `<option value="">Choose section, instructor &amp; schedule</option>`;
            subjChoices.forEach((choice) => {
                const isSelected = preSelected && preSelected.courseOfferingId === choice.id;
                const teacher = choice.instructor?.name ? choice.instructor.name : "TBA";
                const schedule = choice.schedule?.summary ? choice.schedule.summary : "Schedule TBA";
                const seats = choice.availableSeats != null ? ` · ${choice.availableSeats} seats available` : "";
                const disabled = !choice.available && !isSelected ? "disabled" : "";
                optionsHtml += `<option value="${escapeHtml(choice.id)}" ${isSelected ? "selected" : ""} ${disabled}>
                    ${escapeHtml(choice.sectionCode)} · ${escapeHtml(teacher)} · ${escapeHtml(schedule)}${seats}
                </option>`;
            });

            tr.innerHTML = `
                <td>
                    <div class="sa-subject-code">${escapeHtml(item.subject?.code || "SUBJ")}</div>
                    <div class="sa-subject-title">${escapeHtml(item.subject?.title || "")}</div>
                </td>
                <td style="white-space: nowrap; font-weight: 600;">
                    ${item.creditUnits || 3} units
                </td>
                <td>
                    <select class="sa-offering-select" data-sa-curriculum-subject-id="${escapeHtml(item.id)}" required>
                        ${optionsHtml}
                    </select>
                    ${subjChoices.length === 0 ? `<div style="font-size: 0.78rem; color: #dc2626; margin-top: 0.25rem;">No active section offerings created for this subject.</div>` : ""}
                </td>
            `;

            saSubjectsBody.append(tr);
        });
    };

    const submitStudentAssistantEncoding = async (event) => {
        event.preventDefault();
        clearMessage(saEncodeError);
        const applicationId = state.selectedSaApplicationId;
        if (!applicationId || !state.currentSaDetail) return;

        const selectElements = selectAll("[data-sa-curriculum-subject-id]", saSubjectsBody);
        const missing = selectElements.filter((sel) => !sel.value);
        if (missing.length > 0) {
            showError(saEncodeError, "Every approved subject must have an assigned section and schedule before saving. If any section is missed or omitted, it will NOT proceed to the Registrar.");
            missing[0]?.focus();
            return;
        }

        const assignments = selectElements.map((sel) => ({
            curriculumSubjectId: sel.dataset.saCurriculumSubjectId,
            courseOfferingId: sel.value,
        }));

        setBusy(saEncodeForm, true);
        if (saSubmitEncode) {
            saSubmitEncode.disabled = true;
            saSubmitEncode.textContent = "Saving subject encoding…";
        }

        try {
            await auth.encodeStudentAssistantSubjects(applicationId, assignments);
            await loadStudentAssistantData();
            await loadStudentAssistantApplicationDetail(applicationId);
            if (saStatus) {
                saStatus.textContent = "Encoding completed successfully. The application is now ready for Registrar verification.";
                saStatus.classList.add("form-status--success");
            }
            saFootprintBanner?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (error) {
            if (handleExpiredSession(error)) return;
            showError(saEncodeError, error.message || "Failed to save subject encoding.");
        } finally {
            setBusy(saEncodeForm, false);
            if (saSubmitEncode) {
                saSubmitEncode.disabled = false;
                saSubmitEncode.textContent = "Save & Complete Subject Encoding";
            }
        }
    };

    saEncodeForm?.addEventListener("submit", submitStudentAssistantEncoding);
    refreshStudentAssistantBtn?.addEventListener("click", () => void loadStudentAssistantData());

    selectAll("[data-sa-filter]").forEach((chip) => {
        chip.addEventListener("click", () => {
            selectAll("[data-sa-filter]").forEach((c) => {
                c.classList.remove("active");
                c.setAttribute("aria-pressed", "false");
            });
            chip.classList.add("active");
            chip.setAttribute("aria-pressed", "true");
            state.studentAssistantFilter = chip.dataset.saFilter;
            void loadStudentAssistantData();
        });
    });


    // ==========================================================================
    // STUDENT SERVICES CENTER (SSC) WORKSPACE LOGIC
    // ==========================================================================

    const loadSscData = async () => {
        if (!isSsc() || needsPasswordChange()) return;
        if (sscStatus) {
            sscStatus.textContent = "Loading recognized organizations…";
            sscStatus.className = "form-status";
        }
        try {
            const response = await auth.getSscClubs("ALL");
            const clubs = Array.isArray(response) ? response : response?.clubs;
            state.sscClubs = Array.isArray(clubs) ? clubs : [];

            // Compute counts
            const total = state.sscClubs.length;
            const active = state.sscClubs.filter((c) => c.status === "ACTIVE").length;
            const inactive = state.sscClubs.filter((c) => c.status === "INACTIVE").length;
            const expired = state.sscClubs.filter((c) => c.status === "EXPIRED").length;

            if (sscTotalClubs) sscTotalClubs.textContent = total;
            if (sscActiveClubs) sscActiveClubs.textContent = active;
            if (sscInactiveClubs) sscInactiveClubs.textContent = inactive;
            if (sscExpiredClubs) sscExpiredClubs.textContent = expired;

            renderSscClubs();
            if (sscStatus) sscStatus.textContent = `${total} recognized organization${total === 1 ? "" : "s"} loaded.`;
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (sscStatus) {
                sscStatus.textContent = error.message || "The organization directory could not be loaded.";
                sscStatus.className = "form-status form-status--error";
            }
            if (sscClubsBody) {
                sscClubsBody.innerHTML = `<tr><td colspan="8" class="empty-cell">Unable to load recognized organizations. Use Refresh directory to try again.</td></tr>`;
            }
        }
    };

    const renderSscClubs = () => {
        if (!sscClubsBody) return;
        sscClubsBody.replaceChildren();

        const filter = state.sscCurrentFilter;
        const query = (sscSearch?.value || "").trim().toLowerCase();
        let clubs = state.sscClubs;
        if (filter !== "ALL") {
            clubs = clubs.filter((c) => c.status === filter);
        }
        if (query) {
            clubs = clubs.filter((club) => [
                club.code,
                club.name,
                club.category,
                club.accountUsername,
                club.account?.username,
            ].some((value) => String(value || "").toLowerCase().includes(query)));
        }

        if (!clubs.length) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="8" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No ${filter === "ALL" ? "" : filter.toLowerCase() + " "}clubs found.</td>`;
            sscClubsBody.append(tr);
            return;
        }

        clubs.forEach((club) => {
            const tr = document.createElement("tr");
            const startFmt = club.effectivityStartDate ? new Date(club.effectivityStartDate).toLocaleDateString() : "—";
            const endFmt = club.effectivityEndDate ? new Date(club.effectivityEndDate).toLocaleDateString() : "—";
            const statusClass = club.status === "ACTIVE" ? "status-pill--active" : club.status === "EXPIRED" ? "status-pill--expired" : "status-pill--inactive";
            const canToggle = club.status !== "EXPIRED";
            const nextStatus = club.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

            tr.innerHTML = `
                <td><strong>${escapeHtml(club.code)}</strong></td>
                <td>${escapeHtml(club.name)}</td>
                <td><span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">${escapeHtml(humanize(club.category))}</span></td>
                <td>${escapeHtml(club.accountUsername || club.account?.username || "—")}</td>
                <td>${escapeHtml(startFmt)}</td>
                <td>${escapeHtml(endFmt)}</td>
                <td><span class="status-pill ${statusClass}">${escapeHtml(club.status)}</span></td>
                <td>
                    <div style="display: flex; gap: 0.35rem; align-items: center;">
                        <button class="button button--quiet button--compact" type="button" data-ssc-toggle-status="${escapeHtml(club.id)}" data-current-status="${escapeHtml(club.status)}" ${canToggle ? "" : "disabled"} title="${canToggle ? `Set organization ${nextStatus.toLowerCase()}` : "Update the effectivity dates before activating an expired organization"}">
                            ${canToggle ? (club.status === "ACTIVE" ? "Deactivate" : "Activate") : "Update dates first"}
                        </button>
                        <button class="button button--outline button--compact" type="button" data-ssc-edit-dates="${escapeHtml(club.id)}">
                            Edit Dates
                        </button>
                    </div>
                </td>
            `;
            sscClubsBody.append(tr);
        });

        // Wire row buttons
        selectAll("[data-ssc-toggle-status]", sscClubsBody).forEach((btn) => {
            btn.addEventListener("click", async () => {
                const clubId = btn.getAttribute("data-ssc-toggle-status");
                const currentStatus = btn.getAttribute("data-current-status");
                const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                try {
                    btn.disabled = true;
                    await auth.updateSscClubStatus(clubId, newStatus);
                    await loadSscData();
                    if (sscStatus) {
                        sscStatus.textContent = `Organization status updated to ${newStatus.toLowerCase()}.`;
                        sscStatus.className = "form-status form-status--success";
                    }
                } catch (error) {
                    if (sscStatus) {
                        sscStatus.textContent = error.message || "Failed to update organization status.";
                        sscStatus.className = "form-status form-status--error";
                    }
                    btn.disabled = false;
                }
            });
        });

        selectAll("[data-ssc-edit-dates]", sscClubsBody).forEach((btn) => {
            btn.addEventListener("click", () => {
                const clubId = btn.getAttribute("data-ssc-edit-dates");
                const club = state.sscClubs.find((c) => c.id === clubId);
                if (!club || !sscEditDatesDialog) return;

                select("#edit-dates-club-id").value = club.id;
                select("#edit-dates-start").value = club.effectivityStartDate ? club.effectivityStartDate.slice(0, 10) : "";
                select("#edit-dates-end").value = club.effectivityEndDate ? club.effectivityEndDate.slice(0, 10) : "";
                if (sscDatesError) sscDatesError.hidden = true;
                if (typeof sscEditDatesDialog?.showModal === "function") {
                    if (!sscEditDatesDialog.open) sscEditDatesDialog.showModal();
                } else {
                    sscEditDatesDialog?.setAttribute("open", "");
                }
            });
        });
    };

    // SSC Filter buttons
    selectAll("[data-ssc-filter]").forEach((btn) => {
        btn.addEventListener("click", () => {
            selectAll("[data-ssc-filter]").forEach((b) => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            state.sscCurrentFilter = btn.getAttribute("data-ssc-filter") || "ALL";
            renderSscClubs();
        });
    });
    sscSearch?.addEventListener("input", () => renderSscClubs());
    clearSscSearchBtn?.addEventListener("click", () => {
        if (sscSearch) sscSearch.value = "";
        renderSscClubs();
        sscSearch?.focus();
    });

    // SSC Create Club Dialog
    openCreateClubBtn?.addEventListener("click", () => {
        if (!sscCreateClubDialog) return;
        sscCreateClubForm?.reset();
        if (sscCreateError) sscCreateError.hidden = true;
        if (sscStatus) sscStatus.textContent = "";
        if (typeof sscCreateClubDialog?.showModal === "function") {
            if (!sscCreateClubDialog.open) sscCreateClubDialog.showModal();
        } else {
            sscCreateClubDialog?.setAttribute("open", "");
        }
    });

    selectAll("[data-close-ssc-create]").forEach((btn) => {
        btn.addEventListener("click", () => sscCreateClubDialog?.close());
    });

    selectAll("[data-close-ssc-dates]").forEach((btn) => {
        btn.addEventListener("click", () => sscEditDatesDialog?.close());
    });

    refreshSscBtn?.addEventListener("click", () => void loadSscData());

    sscCreateClubForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!sscCreateClubForm.checkValidity()) {
            sscCreateClubForm.reportValidity();
            return;
        }
        const formData = new FormData(sscCreateClubForm);
        const clubData = {
            code: String(formData.get("code") || "").trim().toUpperCase(),
            name: String(formData.get("name") || "").trim(),
            category: String(formData.get("category") || "ACADEMIC"),
            description: String(formData.get("description") || "").trim() || undefined,
            adviser: String(formData.get("adviser") || "").trim(),
            username: String(formData.get("username") || "").trim(),
            password: String(formData.get("password") || ""),
            effectivityStartDate: String(formData.get("effectiveStartDate") || ""),
            effectivityEndDate: String(formData.get("effectiveEndDate") || "")
        };

        const submitBtn = select("[data-ssc-submit-create]", sscCreateClubForm);
        try {
            if (submitBtn) submitBtn.disabled = true;
            if (sscCreateError) sscCreateError.hidden = true;
            await auth.createSscClub(clubData);
            sscCreateClubDialog?.close();
            await loadSscData();
            if (sscStatus) {
                sscStatus.textContent = `Club "${clubData.name}" (${clubData.code}) was chartered successfully.`;
                sscStatus.className = "form-status form-status--success";
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (sscCreateError) {
                const messages = {
                    CLUB_ADVISER_REQUIRED: "Please enter the assigned club adviser.",
                    CLUB_NAME_REQUIRED: "Please enter a club name.",
                    CLUB_USERNAME_REQUIRED: "Please enter a club account username.",
                    CLUB_PASSWORD_REQUIRED: "Please enter an initial password.",
                    CLUB_USERNAME_TAKEN: "That club account username is already in use.",
                    CLUB_NAME_TAKEN: "A club with that name already exists.",
                    START_DATE_MUST_PRECEDE_END_DATE: "The start date must be before the expiration date.",
                    INVALID_EFFECTIVITY_DATES: "Enter valid effectivity dates."
                };
                sscCreateError.textContent = messages[error.message] || error.message || "Failed to create club.";
                sscCreateError.hidden = false;
            }
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    sscEditDatesForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(sscEditDatesForm);
        const clubId = String(formData.get("clubId") || "");
        const startDate = String(formData.get("effectiveStartDate") || "");
        const endDate = String(formData.get("effectiveEndDate") || "");

        try {
            if (sscDatesError) sscDatesError.hidden = true;
            await auth.updateSscClubEffectivity(clubId, startDate, endDate);
            sscEditDatesDialog?.close();
            await loadSscData();
            if (sscStatus) {
                sscStatus.textContent = "Club effectivity dates updated successfully.";
                sscStatus.className = "form-status form-status--success";
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (sscDatesError) {
                sscDatesError.textContent = error.message || "Failed to update effectivity dates.";
                sscDatesError.hidden = false;
            }
        }
    });

    // ==========================================================================
    // CLUB ACCOUNT WORKSPACE LOGIC
    // ==========================================================================

    const loadClubData = async () => {
        if (!isClub() || needsPasswordChange()) return;
        try {
            const dashboard = await auth.getClubDashboard();
            state.clubDashboard = dashboard;

            // Render Header
            if (clubHeaderName) clubHeaderName.textContent = `${dashboard.club.name} (${dashboard.club.code})`;
            if (clubHeaderCategory) clubHeaderCategory.textContent = `${humanize(dashboard.club.category)} Organization`;
            const startFmt = dashboard.club.effectiveStartDate ? new Date(dashboard.club.effectiveStartDate).toLocaleDateString() : "—";
            const endFmt = dashboard.club.effectiveEndDate ? new Date(dashboard.club.effectiveEndDate).toLocaleDateString() : "—";
            if (clubHeaderLead) clubHeaderLead.textContent = `Effectivity: ${startFmt} to ${endFmt} | Description: ${dashboard.club.description || "Active student organization."}`;
            if (clubHeaderStatus) {
                clubHeaderStatus.textContent = dashboard.club.status;
                clubHeaderStatus.className = `status-pill ${dashboard.club.status === "ACTIVE" ? "status-pill--active" : "status-pill--inactive"}`;
            }

            // Render Modules
            renderClubOfficers(dashboard.officers || []);
            renderClubMembers(dashboard.members || [], dashboard.clearanceSummary || { totalMembers: 0, clearedMembers: 0, pendingMembers: 0 });
            renderClubAnnouncements(dashboard.announcements || []);
            renderClubDocuments(dashboard.documents || []);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load club dashboard:", error);
        }
    };

    const renderClubOfficers = (officers = []) => {
        if (!clubOfficersBody) return;
        clubOfficersBody.replaceChildren();

        const allOfficers = Array.isArray(officers) ? officers : [];
        const query = (state.clubOfficerSearch || "").trim().toLowerCase();

        const filtered = allOfficers.filter((officer) => {
            if (!query) return true;
            const idNumber = String(officer.studentNumber || officer.studentIdNumber || officer.student?.studentNumber || officer.student?.studentIdNumber || "").toLowerCase();
            const officerName = String(officer.studentName || officer.name || officer.fullName || officer.student?.fullName || officer.student?.name || "").toLowerCase();
            const position = String(officer.position || "").toLowerCase();
            return idNumber.includes(query) || officerName.includes(query) || position.includes(query);
        });

        if (!filtered.length) {
            const tr = document.createElement("tr");
            const emptyMsg = query
                ? `No officers match search query "${escapeHtml(query)}".`
                : "No officers appointed yet. Use the form above to assign officers.";
            tr.innerHTML = `<td colspan="5" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">${emptyMsg}</td>`;
            clubOfficersBody.append(tr);
            return;
        }

        filtered.forEach((officer) => {
            const tr = document.createElement("tr");
            const authBadge = officer.canClearClearance
                ? '<span class="club-badge club-badge--authority">Clearance Officer (Authorized)</span>'
                : '<span class="club-badge club-badge--none">Standard Officer</span>';

            const idNumber = officer.studentNumber || officer.studentIdNumber || officer.student?.studentNumber || officer.student?.studentIdNumber || "—";
            const officerName = officer.studentName || officer.name || officer.fullName || officer.student?.fullName || officer.student?.name || "—";

            tr.innerHTML = `
                <td><strong>${escapeHtml(idNumber)}</strong></td>
                <td>${escapeHtml(officerName)}</td>
                <td>${escapeHtml(officer.position || "—")}</td>
                <td>${authBadge}</td>
                <td>
                    <div style="display: flex; gap: 0.35rem;">
                        <button class="button button--quiet button--compact" type="button" data-toggle-officer-auth="${escapeHtml(officer.id)}" data-current-auth="${officer.canClearClearance}">
                            ${officer.canClearClearance ? "Revoke Auth" : "Grant Auth"}
                        </button>
                        <button class="button button--outline button--compact" type="button" data-remove-officer="${escapeHtml(officer.id)}">
                            Remove
                        </button>
                    </div>
                </td>
            `;
            clubOfficersBody.append(tr);
        });

        // Wire officer action buttons
        selectAll("[data-toggle-officer-auth]", clubOfficersBody).forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-toggle-officer-auth");
                const current = btn.getAttribute("data-current-auth") === "true";
                try {
                    btn.disabled = true;
                    await auth.updateClubOfficer(id, { canClearClearance: !current });
                    await loadClubData();
                } catch (error) {
                    alert(error.message || "Failed to update officer authority.");
                    btn.disabled = false;
                }
            });
        });

        selectAll("[data-remove-officer]", clubOfficersBody).forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-remove-officer");
                if (!confirm("Are you sure you want to remove this officer?")) return;
                try {
                    btn.disabled = true;
                    await auth.removeClubOfficer(id);
                    await loadClubData();
                } catch (error) {
                    alert(error.message || "Failed to remove officer.");
                    btn.disabled = false;
                }
            });
        });
    };

    const renderClubMembers = (members = [], summary = {}) => {
        if (!clubMembersBody) return;
        clubMembersBody.replaceChildren();

        const allMembers = Array.isArray(members) ? members : [];

        if (clubClearedCount) clubClearedCount.textContent = summary.clearedMembers || 0;
        if (clubTotalMembersCount) clubTotalMembersCount.textContent = summary.totalMembers || 0;

        const query = (state.clubMemberSearch || "").trim().toLowerCase();
        const filter = state.clubMemberFilter || "ALL";

        const filtered = allMembers.filter((member) => {
            const clearanceStatus = (member.clearanceStatus || member.clearance?.status || "PENDING").toUpperCase();
            if (filter !== "ALL" && clearanceStatus !== filter) return false;

            if (!query) return true;
            const idNumber = String(member.studentNumber || member.studentIdNumber || member.student?.studentNumber || member.student?.studentIdNumber || "").toLowerCase();
            const memberName = String(member.studentName || member.name || member.fullName || member.student?.fullName || member.student?.name || "").toLowerCase();
            const programCode = String(member.student?.program?.code || member.program || "").toLowerCase();
            const remarks = String(member.clearanceRemarks || member.clearance?.remarks || "").toLowerCase();
            return idNumber.includes(query) || memberName.includes(query) || programCode.includes(query) || remarks.includes(query);
        });

        if (!filtered.length) {
            const tr = document.createElement("tr");
            const emptyMsg = query
                ? `No members match search query "${escapeHtml(query)}".`
                : filter !== "ALL"
                    ? `No members with status "${filter}".`
                    : "No enrolled members yet.";
            tr.innerHTML = `<td colspan="8" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">${emptyMsg}</td>`;
            clubMembersBody.append(tr);
            return;
        }

        filtered.forEach((member) => {
            const tr = document.createElement("tr");
            const clearanceStatus = member.clearanceStatus || member.clearance?.status || "PENDING";
            const pillClass = clearanceStatus === "CLEARED" ? "status-pill--active" : "status-pill--pending";
            const clearedAt = member.clearedAt
                ? new Date(member.clearedAt).toLocaleString()
                : (member.clearance?.clearedAt ? new Date(member.clearance.clearedAt).toLocaleString() : "—");
            const clearedBy = member.clearance?.clearedByOfficer?.fullName || member.clearedBy || "—";
            const remarksText = member.clearanceRemarks || member.clearance?.remarks || "—";
            const idNumber = member.studentNumber || member.studentIdNumber || member.student?.studentNumber || member.student?.studentIdNumber || "—";
            const memberName = member.studentName || member.name || member.fullName || member.student?.fullName || member.student?.name || "—";
            const programCode = member.student?.program?.code || member.program || "—";
            const yearLevel = member.currentYearLevel || member.student?.currentYearLevel || member.student?.yearLevel || "—";
            const isOfficer = member.role === "OFFICER" || member.isOfficer;

            const remarksBubble = remarksText !== "—"
                ? `<div class="portal-remarks-bubble" title="${escapeHtml(remarksText)}">${escapeHtml(remarksText)}</div>`
                : `<span style="color: var(--muted); font-size: 0.82rem;">—</span>`;

            tr.innerHTML = `
                <td><strong>${escapeHtml(idNumber)}</strong></td>
                <td>${escapeHtml(memberName)}</td>
                <td>${escapeHtml(programCode)} - Yr ${escapeHtml(yearLevel)}</td>
                <td>${isOfficer ? "<strong>Officer</strong>" : "Member"}</td>
                <td><span class="status-pill ${pillClass}">${escapeHtml(clearanceStatus)}</span></td>
                <td>${escapeHtml(clearedAt)}</td>
                <td>${escapeHtml(clearedBy)}</td>
                <td>${remarksBubble}</td>
            `;
            clubMembersBody.append(tr);
        });
    };

    const renderClubAnnouncements = (announcements = []) => {
        if (!clubAnnouncementsList) return;
        clubAnnouncementsList.replaceChildren();

        const allItems = Array.isArray(announcements) ? announcements : [];
        const query = (state.clubAnnouncementSearch || "").trim().toLowerCase();

        const filtered = allItems.filter((item) => {
            if (!query) return true;
            const title = String(item.title || "").toLowerCase();
            const content = String(item.content || "").toLowerCase();
            const author = String(item.authorName || item.postedBy?.displayName || item.postedBy || "").toLowerCase();
            return title.includes(query) || content.includes(query) || author.includes(query);
        });

        if (!filtered.length) {
            const emptyMsg = query
                ? `No announcements match search query "${escapeHtml(query)}".`
                : "No announcements published yet.";
            clubAnnouncementsList.innerHTML = `<div class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">${emptyMsg}</div>`;
            return;
        }

        filtered.forEach((item) => {
            const card = document.createElement("div");
            card.className = "announcement-card";
            const dateFmt = (item.publishedAt || item.createdAt) ? new Date(item.publishedAt || item.createdAt).toLocaleDateString() : "—";
            const author = item.authorName || item.postedBy?.displayName || item.postedBy || "Club";

            card.innerHTML = `
                <div class="announcement-card__meta">
                    <span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">Announcement</span>
                    <span>${escapeHtml(dateFmt)} • By ${escapeHtml(author)}</span>
                </div>
                <h4 class="announcement-card__title">${escapeHtml(item.title)}</h4>
                <p class="announcement-card__content">${escapeHtml(item.content)}</p>
                <div style="margin-top: 0.5rem; display: flex; justify-content: flex-end;">
                    <button class="button button--quiet button--compact" type="button" data-delete-announcement="${escapeHtml(item.id)}" style="color: var(--danger);">
                        Delete
                    </button>
                </div>
            `;
            clubAnnouncementsList.append(card);
        });

        selectAll("[data-delete-announcement]", clubAnnouncementsList).forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-delete-announcement");
                if (!confirm("Are you sure you want to delete this announcement?")) return;
                try {
                    await auth.deleteClubAnnouncement(id);
                    await loadClubData();
                } catch (error) {
                    alert(error.message || "Failed to delete announcement.");
                }
            });
        });
    };

    const renderClubDocuments = (documents = []) => {
        if (!clubDocumentsBody) return;
        clubDocumentsBody.replaceChildren();

        const allDocs = Array.isArray(documents) ? documents : [];
        const query = (state.clubDocSearch || "").trim().toLowerCase();
        const catFilter = state.clubDocCategory || "ALL";

        const filtered = allDocs.filter((doc) => {
            const category = (doc.category || "").toUpperCase();
            if (catFilter !== "ALL" && category !== catFilter) return false;

            if (!query) return true;
            const title = String(doc.title || "").toLowerCase();
            const fileName = String(doc.fileName || "").toLowerCase();
            const uploader = String(doc.uploadedBy?.displayName || doc.uploadedBy || "").toLowerCase();
            return title.includes(query) || fileName.includes(query) || uploader.includes(query);
        });

        if (!filtered.length) {
            const tr = document.createElement("tr");
            const emptyMsg = query
                ? `No documents match search query "${escapeHtml(query)}".`
                : catFilter !== "ALL"
                    ? `No documents in category "${catFilter}".`
                    : "No documents archived yet.";
            tr.innerHTML = `<td colspan="6" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">${emptyMsg}</td>`;
            clubDocumentsBody.append(tr);
            return;
        }

        filtered.forEach((doc) => {
            const tr = document.createElement("tr");
            const dateFmt = (doc.uploadedAt || doc.createdAt) ? new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString() : "—";
            const documentUrl = safeExternalUrl(doc.fileUrl);

            tr.innerHTML = `
                <td><span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">${escapeHtml(humanize(doc.category || "Document"))}</span></td>
                <td><strong>${escapeHtml(doc.title)}</strong></td>
                <td>${escapeHtml(doc.fileName || "—")}</td>
                <td>${escapeHtml(doc.uploadedBy?.displayName || doc.uploadedBy || "Club Admin")}</td>
                <td>${escapeHtml(dateFmt)}</td>
                <td>
                    <div style="display: flex; gap: 0.35rem;">
                        ${documentUrl ? `<a class="button button--outline button--compact" href="${escapeHtml(documentUrl)}" target="_blank" rel="noopener noreferrer">View</a>` : '<span class="status-pill status-pill--quiet">Unavailable</span>'}
                        <button class="button button--quiet button--compact" type="button" data-delete-document="${escapeHtml(doc.id)}" style="color: var(--danger);">Delete</button>
                    </div>
                </td>
            `;
            clubDocumentsBody.append(tr);
        });

        selectAll("[data-delete-document]", clubDocumentsBody).forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-delete-document");
                if (!confirm("Are you sure you want to delete this document record?")) return;
                try {
                    await auth.deleteClubDocument(id);
                    await loadClubData();
                } catch (error) {
                    alert(error.message || "Failed to delete document.");
                }
            });
        });
    };

    let lastVerifiedStudentId = null;

    // Officer Student ID verification
    verifyOfficerBtn?.addEventListener("click", async () => {
        const input = select("#officer-student-id");
        const studentNumber = input?.value.trim();
        if (!studentNumber) {
            if (officerVerifyResult) {
                officerVerifyResult.textContent = "Please enter a Student ID number.";
                officerVerifyResult.style.color = "var(--danger)";
            }
            return;
        }

        try {
            verifyOfficerBtn.disabled = true;
            if (officerVerifyResult) officerVerifyResult.textContent = "Verifying student…";
            const response = await auth.validateClubStudent(studentNumber);
            const student = response?.student || response;
            if (student?.id) {
                lastVerifiedStudentId = student.id;
            }
            if (officerVerifyResult) {
                const name = student.studentName || student.fullName || "Student";
                const program = student.program || student.programCode || "N/A";
                const yr = student.currentYearLevel || student.yearLevel || "N/A";
                officerVerifyResult.textContent = `Verified: ${name} (${program} - Yr ${yr})`;
                officerVerifyResult.style.color = "var(--success)";
            }
        } catch (error) {
            lastVerifiedStudentId = null;
            if (officerVerifyResult) {
                officerVerifyResult.textContent = error.message || "Student record not found.";
                officerVerifyResult.style.color = "var(--danger)";
            }
        } finally {
            verifyOfficerBtn.disabled = false;
        }
    });

    // Officer Assignment Form Submit
    assignOfficerForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(assignOfficerForm);
        const inputStudentIdNumber = String(formData.get("studentIdNumber") || "").trim();
        const data = {
            studentId: lastVerifiedStudentId || inputStudentIdNumber,
            studentIdNumber: inputStudentIdNumber,
            studentNumber: inputStudentIdNumber,
            position: String(formData.get("position") || "").trim(),
            canClearClearance: formData.get("canClearClearance") === "on"
        };

        const submitBtn = select("[data-submit-officer-btn]", assignOfficerForm);
        try {
            if (submitBtn) submitBtn.disabled = true;
            if (officerError) officerError.hidden = true;
            await auth.assignClubOfficer(data);
            assignOfficerForm.reset();
            lastVerifiedStudentId = null;
            if (officerVerifyResult) officerVerifyResult.textContent = "";
            alert("Club officer appointed successfully!");
            await loadClubData();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (officerError) {
                officerError.textContent = error.message || "Failed to assign officer.";
                officerError.hidden = false;
            }
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    // Announcement Create Form Submit
    createAnnouncementForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(createAnnouncementForm);
        const data = {
            title: String(formData.get("title") || "").trim(),
            content: String(formData.get("content") || "").trim()
        };

        try {
            if (announcementError) announcementError.hidden = true;
            await auth.createClubAnnouncement(data);
            createAnnouncementForm.reset();
            alert("Announcement published successfully!");
            await loadClubData();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (announcementError) {
                announcementError.textContent = error.message || "Failed to publish announcement.";
                announcementError.hidden = false;
            }
        }
    });

    // Document Create Form Submit
    createDocumentForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(createDocumentForm);
        const data = {
            title: String(formData.get("title") || "").trim(),
            category: String(formData.get("category") || "RESOLUTION"),
            fileName: String(formData.get("fileName") || "").trim() || undefined,
            fileUrl: String(formData.get("fileUrl") || "").trim()
        };

        try {
            if (documentError) documentError.hidden = true;
            await auth.createClubDocument(data);
            createDocumentForm.reset();
            alert("Classified document recorded successfully!");
            await loadClubData();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (documentError) {
                documentError.textContent = error.message || "Failed to archive document.";
                documentError.hidden = false;
            }
        }
    });

    refreshClubBtn?.addEventListener("click", () => void loadClubData());

    // Club Workspace Search & Filter Listeners
    clubOfficerSearchInput?.addEventListener("input", (e) => {
        state.clubOfficerSearch = e.target.value;
        renderClubOfficers(state.clubDashboard?.officers || []);
    });

    clubMemberSearchInput?.addEventListener("input", (e) => {
        state.clubMemberSearch = e.target.value;
        renderClubMembers(state.clubDashboard?.members || [], state.clubDashboard?.clearanceSummary || {});
    });

    clubMemberFilterGroup?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-club-member-filter]");
        if (!btn) return;
        selectAll("[data-club-member-filter]", clubMemberFilterGroup).forEach((b) => b.classList.remove("filter-pill--active"));
        btn.classList.add("filter-pill--active");
        state.clubMemberFilter = btn.getAttribute("data-club-member-filter") || "ALL";
        renderClubMembers(state.clubDashboard?.members || [], state.clubDashboard?.clearanceSummary || {});
    });

    clubAnnouncementSearchInput?.addEventListener("input", (e) => {
        state.clubAnnouncementSearch = e.target.value;
        renderClubAnnouncements(state.clubDashboard?.announcements || []);
    });

    clubDocSearchInput?.addEventListener("input", (e) => {
        state.clubDocSearch = e.target.value;
        renderClubDocuments(state.clubDashboard?.documents || []);
    });

    clubDocFilterSelect?.addEventListener("change", (e) => {
        state.clubDocCategory = e.target.value || "ALL";
        renderClubDocuments(state.clubDashboard?.documents || []);
    });

    // ==========================================================================
    // STUDENT CLUBS EXPERIENCE LOGIC
    // ==========================================================================

    const loadStudentClubs = async () => {
        if (!isStudentWorkspace() || needsPasswordChange()) return;
        if (studentClubsStatus) {
            studentClubsStatus.textContent = "Loading active clubs…";
            studentClubsStatus.className = "form-status";
        }
        try {
            const [available, myClubs] = await Promise.all([
                auth.getStudentAvailableClubs(),
                auth.getStudentMyClubs()
            ]);
            const availableClubs = Array.isArray(available)
                ? available
                : available?.clubs || available?.data?.clubs || available?.data?.data?.clubs;
            const enrolledClubs = Array.isArray(myClubs)
                ? myClubs
                : myClubs?.clubs || myClubs?.data?.clubs || myClubs?.data?.data?.clubs;
            state.studentAvailableClubs = Array.isArray(availableClubs) ? availableClubs : [];
            state.studentMyClubs = Array.isArray(enrolledClubs) ? enrolledClubs : [];

            // Update active membership badge
            const activeCount = state.studentMyClubs.filter((m) => (m.club?.status || m.status) === "ACTIVE").length;
            if (studentActiveClubsCount) studentActiveClubsCount.textContent = activeCount;

            renderStudentMyClubs();
            renderStudentAvailableClubs(activeCount);
            if (studentClubsStatus) {
                studentClubsStatus.textContent = `${state.studentAvailableClubs.length} active club${state.studentAvailableClubs.length === 1 ? "" : "s"} available to join.`;
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (studentClubsStatus) {
                studentClubsStatus.textContent = error.message || "The active club directory could not be loaded.";
                studentClubsStatus.className = "form-status form-status--error";
            }
            console.error("Failed to load student clubs:", error);
        }
    };

    const renderStudentMyClubs = () => {
        if (!studentMyClubsBody) return;
        studentMyClubsBody.replaceChildren();

        if (!state.studentMyClubs.length) {
            const tr = document.createElement("tr");
            tr.innerHTML = '<td colspan="7" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">You have not joined any clubs yet. Browse available clubs below to join!</td>';
            studentMyClubsBody.append(tr);
            return;
        }

        state.studentMyClubs.forEach((item) => {
            const tr = document.createElement("tr");
            const club = item.club || item;
            const clubId = item.clubId || club.id;
            const clubCode = club.code || item.clubCode || "—";
            const clubName = club.name || item.clubName || "—";
            const clubCategory = club.category || item.category || "—";
            const clearanceStatus = item.clearance?.status || item.clearanceStatus || "PENDING";
            const clrClass = clearanceStatus === "CLEARED" ? "status-pill--active" : "status-pill--pending";
            const clubStatus = club.status || item.status;
            const clubStatusClass = clubStatus === "ACTIVE" ? "status-pill--active" : clubStatus === "EXPIRED" ? "status-pill--expired" : "status-pill--inactive";
            const roleLabel = (item.role === "OFFICER" || item.isOfficer) ? `<strong>Officer: ${escapeHtml(item.officer?.position || item.officerPosition || "Leader")}</strong>` : "Member";

            tr.innerHTML = `
                <td><strong>${escapeHtml(clubCode)}</strong></td>
                <td>${escapeHtml(clubName)}</td>
                <td><span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">${escapeHtml(humanize(clubCategory))}</span></td>
                <td>${roleLabel}</td>
                <td><span class="status-pill ${clrClass}">${escapeHtml(clearanceStatus)}</span></td>
                <td><span class="status-pill ${clubStatusClass}">${escapeHtml(clubStatus)}</span></td>
                <td>
                    <button class="button button--primary button--compact" type="button" data-open-club-portal="${escapeHtml(clubId || "")}" ${clubId ? "" : "disabled"}>
                        Open Portal
                    </button>
                </td>
            `;
            studentMyClubsBody.append(tr);
        });

        selectAll("[data-open-club-portal]", studentMyClubsBody).forEach((btn) => {
            btn.addEventListener("click", () => {
                const clubId = btn.getAttribute("data-open-club-portal");
                if (clubId) void openStudentClubPortal(clubId);
            });
        });
    };

    const renderStudentAvailableClubs = (activeCount) => {
        if (!studentAvailableClubsGrid) return;
        studentAvailableClubsGrid.replaceChildren();

        const maxReached = activeCount >= 3;
        const joinedClubIds = new Set(state.studentMyClubs.map((m) => m.clubId || m.club?.id).filter(Boolean));

        if (!state.studentAvailableClubs.length) {
            studentAvailableClubsGrid.innerHTML = '<div class="empty-cell" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--muted);">No clubs are currently open for enrollment.</div>';
            return;
        }

        state.studentAvailableClubs.forEach((club) => {
            const card = document.createElement("div");
            card.className = "club-card";
            const isJoined = joinedClubIds.has(club.id);
            const startFmt = (club.effectivityStartDate || club.effectiveStartDate)
                ? new Date(club.effectivityStartDate || club.effectiveStartDate).toLocaleDateString() : "";
            const endFmt = (club.effectivityEndDate || club.effectiveEndDate)
                ? new Date(club.effectivityEndDate || club.effectiveEndDate).toLocaleDateString() : "";

            let actionHtml = "";
            if (isJoined) {
                actionHtml = '<span class="status-pill status-pill--active">Enrolled Member</span>';
            } else if (maxReached) {
                actionHtml = '<button class="button button--outline button--compact" type="button" disabled title="Maximum 3 active clubs reached">Limit Reached (3/3)</button>';
            } else {
                actionHtml = `<button class="button button--primary button--compact" type="button" data-student-join-club="${escapeHtml(club.id)}">Join Club</button>`;
            }

            card.innerHTML = `
                <div>
                    <div class="club-card__header">
                        <span class="club-card__category">${escapeHtml(humanize(club.category))}</span>
                        <span class="status-pill status-pill--active">ACTIVE</span>
                    </div>
                    <div style="font-weight: 700; font-size: 0.88rem; color: var(--red-900);">${escapeHtml(club.code)}</div>
                    <h4 class="club-card__title">${escapeHtml(club.name)}</h4>
                    <p class="club-card__description">${escapeHtml(club.description || "Active student organization and community.")}</p>
                </div>
                <div class="club-card__footer">
                    <div class="club-card__effectivity">Term: ${escapeHtml(startFmt)} – ${escapeHtml(endFmt)}</div>
                    ${actionHtml}
                </div>
            `;
            studentAvailableClubsGrid.append(card);
        });

        selectAll("[data-student-join-club]", studentAvailableClubsGrid).forEach((btn) => {
            btn.addEventListener("click", async () => {
                const clubId = btn.getAttribute("data-student-join-club");
                try {
                    btn.disabled = true;
                    await auth.joinStudentClub(clubId);
                    alert("Congratulations! You have successfully joined the club.");
                    await loadStudentClubs();
                    await loadStudentDashboard();
                } catch (error) {
                    alert(error.message || "Failed to join club.");
                    btn.disabled = false;
                }
            });
        });
    };

    refreshStudentClubsBtn?.addEventListener("click", () => void loadStudentClubs());
    const refreshClearanceFormBtn = select("[data-refresh-clearance-form]");
    refreshClearanceFormBtn?.addEventListener("click", () => void loadStudentDashboard());

    // Dynamic Student Club Portal Modal
    const openStudentClubPortal = async (clubId) => {
        try {
            const portal = await auth.getStudentClubPortal(clubId);
            state.studentActiveClubPortal = portal;

            // Reset search & filter states on open
            state.portalEvalFilter = "ALL";
            state.portalEvalSearch = "";
            state.portalDocSearch = "";
            state.portalOfficerSearch = "";
            state.portalAnnouncementSearch = "";

            if (portalEvalSearchInput) portalEvalSearchInput.value = "";
            if (portalDocSearchInput) portalDocSearchInput.value = "";
            if (portalOfficerSearchInput) portalOfficerSearchInput.value = "";
            if (portalAnnouncementSearchInput) portalAnnouncementSearchInput.value = "";
            if (portalDocFilter) portalDocFilter.value = "ALL";

            if (portalEvalFilterGroup) {
                selectAll("[data-eval-filter]", portalEvalFilterGroup).forEach((btn) => {
                    btn.classList.toggle("active", btn.getAttribute("data-eval-filter") === "ALL");
                });
            }

            // Render Header
            if (portalClubName) portalClubName.textContent = `${portal.club.name} (${portal.club.code})`;
            if (portalCategoryLabel) portalCategoryLabel.textContent = `${humanize(portal.club.category)} Organization`;
            const startFmt = portal.club.effectivityStartDate
                ? new Date(portal.club.effectivityStartDate).toLocaleDateString() : "";
            const endFmt = portal.club.effectivityEndDate
                ? new Date(portal.club.effectivityEndDate).toLocaleDateString() : "";
            if (portalClubLead) portalClubLead.textContent = `Term: ${startFmt} – ${endFmt} • ${portal.club.description || ""}`;
            if (portalClubStatus) {
                portalClubStatus.textContent = portal.club.status;
                portalClubStatus.className = `status-pill ${portal.club.status === "ACTIVE" ? "status-pill--active" : "status-pill--expired"}`;
            }
            if (portalRolePill) {
                portalRolePill.textContent = portal.dashboardType === "OFFICER_WITH_CLEARANCE"
                    ? "Officer: Clearance authority"
                    : portal.dashboardType === "OFFICER_WITHOUT_CLEARANCE"
                        ? "Officer"
                        : "Member";
            }
            if (portalExpiredBanner) {
                portalExpiredBanner.hidden = !portal.isExpired;
            }

            // Render My Clearance Card
            const clr = portal.myClearance || {};
            if (portalMyClearancePill) {
                const clrStat = clr.status || "PENDING";
                portalMyClearancePill.textContent = clrStat;
                portalMyClearancePill.className = `status-pill ${clrStat === "CLEARED" ? "status-pill--active" : "status-pill--pending"}`;
            }
            if (portalMyClearanceDate) {
                portalMyClearanceDate.textContent = clr.clearedAt ? new Date(clr.clearedAt).toLocaleString() : "Not evaluated yet";
            }
            if (portalMyClearanceBy) {
                portalMyClearanceBy.textContent = clr.clearedByOfficer ? `${clr.clearedByOfficer.fullName} (${clr.clearedByOfficer.position || "Clearance Officer"})` : (clr.clearedBy || "Pending Sign-off");
            }
            if (portalMyClearanceRemarks) {
                portalMyClearanceRemarks.textContent = clr.remarks || "No remarks entered.";
            }

            // Render Announcements Feed
            renderPortalAnnouncements(portal.announcements || []);

            // Render Documents Table
            renderPortalDocuments(portal.documents || []);

            // Render Officers Roster
            renderPortalOfficers(portal.officers || []);

            // DYNAMIC CLEARANCE EVALUATION PANEL (TYPE 1 ONLY)
            if (portal.dashboardType === "OFFICER_WITH_CLEARANCE") {
                if (portalEvalTab) portalEvalTab.hidden = false;
                renderPortalClearanceEvaluation(portal.members || [], portal.club.id);
            } else {
                if (portalEvalTab) portalEvalTab.hidden = true;
            }

            // Reset tab to feed
            switchStudentPortalTab("feed");
            if (typeof studentClubPortalDialog?.showModal === "function") {
                if (!studentClubPortalDialog.open) studentClubPortalDialog.showModal();
            } else {
                studentClubPortalDialog?.setAttribute("open", "");
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            alert(error.message || "Failed to open club portal.");
        }
    };

    const renderPortalAnnouncements = (announcements) => {
        if (!portalAnnouncementsFeed) return;
        portalAnnouncementsFeed.replaceChildren();

        const all = Array.isArray(announcements) ? announcements : [];
        const query = (state.portalAnnouncementSearch || "").trim().toLowerCase();

        const visible = query
            ? all.filter((a) => {
                const title = (a.title || "").toLowerCase();
                const content = (a.content || "").toLowerCase();
                const author = (a.authorName || a.postedBy?.displayName || a.postedBy || "").toLowerCase();
                return title.includes(query) || content.includes(query) || author.includes(query);
            })
            : all;

        if (!visible.length) {
            portalAnnouncementsFeed.innerHTML = `<div class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">${query ? 'No announcements match your search.' : 'No announcements published for this club.'}</div>`;
            return;
        }

        visible.forEach((item) => {
            const card = document.createElement("div");
            card.className = "announcement-card";
            const dateFmt = (item.publishedAt || item.createdAt) ? new Date(item.publishedAt || item.createdAt).toLocaleDateString() : "—";
            const author = item.authorName || item.postedBy?.displayName || item.postedBy || "Club";

            card.innerHTML = `
                <div class="announcement-card__meta">
                    <span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">Announcement</span>
                    <span>${escapeHtml(dateFmt)} • ${escapeHtml(author)}</span>
                </div>
                <h4 class="announcement-card__title">${escapeHtml(item.title)}</h4>
                <p class="announcement-card__content">${escapeHtml(item.content)}</p>
            `;
            portalAnnouncementsFeed.append(card);
        });
    };

    const renderPortalDocuments = (documents) => {
        if (!portalDocsBody) return;
        portalDocsBody.replaceChildren();

        const all = Array.isArray(documents) ? documents : [];
        const selectedCategory = portalDocFilter?.value || "ALL";
        const query = (state.portalDocSearch || "").trim().toLowerCase();

        let visible = selectedCategory === "ALL"
            ? all
            : all.filter((documentRecord) => documentRecord.category === selectedCategory);

        if (query) {
            visible = visible.filter((d) => {
                const title = (d.title || "").toLowerCase();
                const ref = (d.fileName || d.referenceNo || "").toLowerCase();
                const cat = (d.category || "").toLowerCase();
                return title.includes(query) || ref.includes(query) || cat.includes(query);
            });
        }

        if (!visible.length) {
            const emptyMsg = query
                ? `No documents match search query "${escapeHtml(query)}".`
                : selectedCategory === "ALL"
                    ? "No official documents available."
                    : "No documents match this classification.";
            portalDocsBody.innerHTML = `<tr><td colspan="5" class="empty-cell" style="text-align: center; padding: 2.5rem 1rem; color: var(--muted);">${emptyMsg}</td></tr>`;
            return;
        }

        visible.forEach((doc) => {
            const tr = document.createElement("tr");
            const dateFmt = (doc.uploadedAt || doc.createdAt) ? new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString() : "—";
            const documentUrl = safeExternalUrl(doc.fileUrl);

            tr.innerHTML = `
                <td><span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">${escapeHtml(humanize(doc.category || "Document"))}</span></td>
                <td><strong>${escapeHtml(doc.title)}</strong></td>
                <td>${escapeHtml(doc.fileName || doc.referenceNo || "—")}</td>
                <td>${escapeHtml(dateFmt)}</td>
                <td style="text-align: right;">
                    ${documentUrl ? `<a class="button button--outline button--compact" href="${escapeHtml(documentUrl)}" target="_blank" rel="noopener noreferrer">View Document ↗</a>` : '<span class="status-pill status-pill--quiet">Unavailable</span>'}
                </td>
            `;
            portalDocsBody.append(tr);
        });
    };

    portalDocFilter?.addEventListener("change", () => {
        renderPortalDocuments(state.studentActiveClubPortal?.documents || []);
    });

    const renderPortalOfficers = (officers) => {
        if (!portalOfficersBody) return;
        portalOfficersBody.replaceChildren();

        const all = Array.isArray(officers) ? officers : [];
        const query = (state.portalOfficerSearch || "").trim().toLowerCase();

        const visible = query
            ? all.filter((o) => {
                const pos = (o.position || "").toLowerCase();
                const name = (o.studentName || o.name || o.fullName || o.student?.fullName || o.student?.name || "").toLowerCase();
                return pos.includes(query) || name.includes(query);
            })
            : all;

        if (!visible.length) {
            portalOfficersBody.innerHTML = `<tr><td colspan="3" class="empty-cell" style="text-align: center; padding: 2.5rem 1rem; color: var(--muted);">${query ? 'No officers match your search query.' : 'No officers listed.'}</td></tr>`;
            return;
        }

        visible.forEach((officer) => {
            const tr = document.createElement("tr");
            const clrBadge = officer.canClearClearance
                ? '<span class="club-badge club-badge--authority">Clearance Sign-off Authority</span>'
                : '<span class="club-badge club-badge--none">Officer</span>';
            const officerName = officer.studentName || officer.name || officer.fullName || officer.student?.fullName || officer.student?.name || "—";

            tr.innerHTML = `
                <td><strong>${escapeHtml(officer.position || "—")}</strong></td>
                <td>${escapeHtml(officerName)}</td>
                <td>${clrBadge}</td>
            `;
            portalOfficersBody.append(tr);
        });
    };

    const renderPortalClearanceEvaluation = (members = [], clubId) => {
        if (!portalEvalBody) return;
        portalEvalBody.replaceChildren();

        const allMembers = Array.isArray(members) ? members : [];

        // 1. Calculate stats counts
        const total = allMembers.length;
        const pendingCount = allMembers.filter((m) => (m.clearanceStatus || m.clearance?.status || "PENDING") === "PENDING").length;
        const clearedCount = allMembers.filter((m) => (m.clearanceStatus || m.clearance?.status || "PENDING") === "CLEARED").length;

        if (portalEvalCountAll) portalEvalCountAll.textContent = String(total);
        if (portalEvalCountPending) portalEvalCountPending.textContent = String(pendingCount);
        if (portalEvalCountCleared) portalEvalCountCleared.textContent = String(clearedCount);

        // 2. Filter by status filter pill & search query
        const filterStatus = state.portalEvalFilter || "ALL";
        const query = (state.portalEvalSearch || "").trim().toLowerCase();

        let visibleMembers = allMembers;

        if (filterStatus !== "ALL") {
            visibleMembers = visibleMembers.filter((m) => {
                const st = m.clearanceStatus || m.clearance?.status || "PENDING";
                return st === filterStatus;
            });
        }

        if (query) {
            visibleMembers = visibleMembers.filter((m) => {
                const sNumber = String(m.studentNumber || m.studentIdNumber || m.student?.studentNumber || m.student?.studentIdNumber || "").toLowerCase();
                const sName = String(m.studentName || m.name || m.fullName || m.student?.fullName || m.student?.name || "").toLowerCase();
                return sNumber.includes(query) || sName.includes(query);
            });
        }

        if (!visibleMembers.length) {
            const tr = document.createElement("tr");
            const emptyMsg = query
                ? `No members match search query "${escapeHtml(query)}".`
                : filterStatus !== "ALL"
                    ? `No members with clearance status "${filterStatus}".`
                    : "No members to evaluate.";
            tr.innerHTML = `<td colspan="7" class="empty-cell" style="text-align: center; padding: 2.5rem 1rem; color: var(--muted);">${emptyMsg}</td>`;
            portalEvalBody.append(tr);
            return;
        }

        visibleMembers.forEach((m) => {
            const tr = document.createElement("tr");
            const clrStatus = m.clearanceStatus || m.clearance?.status || "PENDING";
            const pillClass = clrStatus === "CLEARED" ? "status-pill--active" : "status-pill--pending";
            const evaluatedBy = m.clearance?.clearedByOfficer
                ? `${m.clearance.clearedByOfficer.fullName} (${m.clearance.clearedByOfficer.position || "Officer"})`
                : (m.clearedBy || "—");
            const remarksText = m.clearanceRemarks || m.clearance?.remarks || "—";
            const studentId = m.studentId || m.student?.id || m.id;
            const studentIdNumber = m.studentNumber || m.studentIdNumber || m.student?.studentNumber || m.student?.studentIdNumber || "—";
            const studentName = m.studentName || m.name || m.fullName || m.student?.fullName || m.student?.name || "—";
            const isOfficer = m.role === "OFFICER" || m.isOfficer;

            // Formatted remarks bubble with tooltip for long text
            const remarksBubble = remarksText !== "—"
                ? `<div class="portal-remarks-bubble" title="${escapeHtml(remarksText)}">${escapeHtml(remarksText)}</div>`
                : `<span style="color: var(--muted); font-size: 0.82rem;">—</span>`;

            tr.innerHTML = `
                <td><strong class="portal-id-tag">${escapeHtml(studentIdNumber)}</strong></td>
                <td><span class="portal-member-name">${escapeHtml(studentName)}</span></td>
                <td><span class="club-badge ${isOfficer ? 'club-badge--authority' : 'club-badge--none'}">${isOfficer ? "Officer" : "Member"}</span></td>
                <td><span class="status-pill ${pillClass}">${escapeHtml(clrStatus)}</span></td>
                <td><small style="color: var(--ink); opacity: 0.85;">${escapeHtml(evaluatedBy)}</small></td>
                <td>${remarksBubble}</td>
                <td style="text-align: right;">
                    <button class="button button--primary button--compact" type="button" data-eval-member-btn="${escapeHtml(studentId)}" data-target-name="${escapeHtml(studentName)}" data-current-status="${escapeHtml(clrStatus)}" data-current-remarks="${escapeHtml(remarksText !== "—" ? remarksText : "")}">
                        Evaluate
                    </button>
                </td>
            `;
            portalEvalBody.append(tr);
        });

        // Wire "Evaluate" button for each member
        selectAll("[data-eval-member-btn]", portalEvalBody).forEach((btn) => {
            btn.addEventListener("click", () => {
                const targetStudentId = btn.getAttribute("data-eval-member-btn");
                const targetName = btn.getAttribute("data-target-name");
                const currentStatus = btn.getAttribute("data-current-status");
                const currentRemarks = btn.getAttribute("data-current-remarks");

                if (!evalActionDialog) return;
                if (evalFormClubId) evalFormClubId.value = clubId;
                if (evalFormTargetId) evalFormTargetId.value = targetStudentId;
                if (evalFormTargetName) evalFormTargetName.textContent = targetName;
                if (evalFormStatus) evalFormStatus.value = currentStatus === "CLEARED" ? "CLEARED" : "PENDING";
                if (evalFormRemarks) evalFormRemarks.value = currentRemarks;
                if (evalActionError) evalActionError.hidden = true;
                if (typeof evalActionDialog?.showModal === "function") {
                    if (!evalActionDialog.open) evalActionDialog.showModal();
                } else {
                    evalActionDialog?.setAttribute("open", "");
                }
            });
        });
    };

    // Toolbar Input Listeners for Club Portal
    portalEvalSearchInput?.addEventListener("input", (e) => {
        state.portalEvalSearch = e.target.value;
        const clubId = state.studentActiveClubPortal?.club?.id;
        const members = state.studentActiveClubPortal?.members || [];
        renderPortalClearanceEvaluation(members, clubId);
    });

    portalEvalFilterGroup?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-eval-filter]");
        if (!btn) return;
        const filterVal = btn.getAttribute("data-eval-filter");
        state.portalEvalFilter = filterVal;

        selectAll("[data-eval-filter]", portalEvalFilterGroup).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const clubId = state.studentActiveClubPortal?.club?.id;
        const members = state.studentActiveClubPortal?.members || [];
        renderPortalClearanceEvaluation(members, clubId);
    });

    portalDocSearchInput?.addEventListener("input", (e) => {
        state.portalDocSearch = e.target.value;
        renderPortalDocuments(state.studentActiveClubPortal?.documents || []);
    });

    portalOfficerSearchInput?.addEventListener("input", (e) => {
        state.portalOfficerSearch = e.target.value;
        renderPortalOfficers(state.studentActiveClubPortal?.officers || []);
    });

    portalAnnouncementSearchInput?.addEventListener("input", (e) => {
        state.portalAnnouncementSearch = e.target.value;
        renderPortalAnnouncements(state.studentActiveClubPortal?.announcements || []);
    });

    // Close Dialog Buttons
    selectAll("[data-close-student-portal]").forEach((btn) => {
        btn.addEventListener("click", () => studentClubPortalDialog?.close());
    });

    selectAll("[data-close-eval-action]").forEach((btn) => {
        btn.addEventListener("click", () => evalActionDialog?.close());
    });

    // Evaluate Clearance Action Submit
    evalActionForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const clubId = evalFormClubId?.value;
        const targetStudentId = evalFormTargetId?.value;
        const status = evalFormStatus?.value;
        const remarks = evalFormRemarks?.value?.trim();

        try {
            if (evalActionError) evalActionError.hidden = true;
            await auth.evaluateStudentClubClearance(clubId, { targetStudentId, status, remarks });
            evalActionDialog?.close();
            alert("Clearance evaluation saved and stamped in audit trail successfully!");
            // Refresh the portal modal, student clubs, and clearance form
            await openStudentClubPortal(clubId);
            await loadStudentClubs();
            await loadStudentDashboard();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (evalActionError) {
                evalActionError.textContent = error.message || "Failed to save clearance evaluation.";
                evalActionError.hidden = false;
            }
        }
    });

    // ==========================================
    // DEAN WORKSPACE MODULE
    // ==========================================

    const renderDeanOverview = (overview) => {
        state.deanOverview = overview;
        if (deanCollegeContext) {
            deanCollegeContext.textContent = overview?.college
                ? `${overview.college.code} · ${overview.college.name}`
                : "Assigned College";
        }
        if (deanStudentsCount) deanStudentsCount.textContent = overview?.counts?.officialStudents ?? 0;
        if (deanFacultyCount) deanFacultyCount.textContent = overview?.counts?.facultyMembers ?? 0;
        if (deanProgramsCount) deanProgramsCount.textContent = overview?.counts?.programs ?? 0;
        if (deanGradesPendingCount) deanGradesPendingCount.textContent = overview?.counts?.pendingGradeApprovals ?? 0;
    };

    const loadDeanOverview = async () => {
        if (!isDean() || needsPasswordChange()) return;
        try {
            const data = await auth.getDeanDashboard();
            renderDeanOverview(data.overview);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load Dean dashboard overview:", error);
        }
    };

    // Tab 1: Grade Approvals
    const renderDeanGrades = (submissions) => {
        if (!deanGradesTbody) return;
        deanGradesTbody.innerHTML = "";

        const sourceList = submissions && Array.isArray(submissions) ? submissions : (state.deanGrades || []);
        state.deanGrades = sourceList;

        let list = [...sourceList];
        const query = (deanGradesSearch?.value || "").trim().toLowerCase();
        const sortBy = deanGradesSort?.value || "newest";

        if (query) {
            list = list.filter((s) => {
                const code = (s.offeringCode || "").toLowerCase();
                const subjCode = (s.subjectCode || "").toLowerCase();
                const subjTitle = (s.subjectTitle || "").toLowerCase();
                const section = (s.section || "").toLowerCase();
                const prog = (s.programCode || "").toLowerCase();
                const term = (s.academicTerm || "").toLowerCase();
                const instructor = (s.instructor || "").toLowerCase();
                return code.includes(query) || subjCode.includes(query) || subjTitle.includes(query) ||
                    section.includes(query) || prog.includes(query) || term.includes(query) || instructor.includes(query);
            });
        }

        if (sortBy === "newest") {
            list.sort((a, b) => new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0));
        } else if (sortBy === "oldest") {
            list.sort((a, b) => new Date(a.createdAt || a.submittedAt || 0) - new Date(b.createdAt || b.submittedAt || 0));
        } else if (sortBy === "subject") {
            list.sort((a, b) => (a.subjectCode || "").localeCompare(b.subjectCode || ""));
        } else if (sortBy === "instructor") {
            list.sort((a, b) => (a.instructor || "").localeCompare(b.instructor || ""));
        } else if (sortBy === "students") {
            list.sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0));
        }

        if (list.length === 0) {
            deanGradesTbody.innerHTML = `<tr><td colspan="9" class="empty-state" style="text-align:center; padding:1.5rem;">${query ? "No grade submissions match your search criteria." : "No grade submissions currently pending Dean review."}</td></tr>`;
            return;
        }

        list.forEach((s) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(s.offeringCode)}</strong></td>
                <td>${escapeHtml(s.subjectCode)} · ${escapeHtml(s.subjectTitle)}</td>
                <td>${escapeHtml(s.section || "—")}</td>
                <td>${escapeHtml(s.programCode || "—")}</td>
                <td>${escapeHtml(s.academicTerm)}</td>
                <td>${escapeHtml(s.instructor)}</td>
                <td>${s.enrolledCount}</td>
                <td><span class="status-pill status-submitted">${s.submittedGradeCount} / ${s.totalGradeCount}</span></td>
                <td>
                    <button class="button button--primary button--small" type="button" data-dean-review-grades="${s.offeringId}">
                        Review Grades
                    </button>
                </td>
            `;
            deanGradesTbody.appendChild(tr);
        });
    };

    deanGradesSearch?.addEventListener("input", () => renderDeanGrades());
    deanGradesSort?.addEventListener("change", () => renderDeanGrades());

    const loadDeanGrades = async () => {
        if (!isDean() || needsPasswordChange()) return;
        try {
            const res = await auth.getDeanPendingGrades();
            state.deanGrades = res?.submissions || [];
            renderDeanGrades(state.deanGrades);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load Dean pending grades:", error);
            if (deanGradesTbody) {
                deanGradesTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:1.5rem; color:var(--color-error)">Failed to load grade submissions: ${escapeHtml(error.message)}</td></tr>`;
            }
        }
    };

    const openDeanGradeSheet = async (offeringId) => {
        if (!deanGradeDialog) return;
        if (deanGradeSheetTbody) {
            deanGradeSheetTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem;">Loading collegiate grade sheet…</td></tr>`;
        }
        if (deanGradeRemarks) deanGradeRemarks.value = "";
        if (deanGradeError) deanGradeError.hidden = true;
        if (deanApproveGradesBtn) deanApproveGradesBtn.disabled = true;
        if (deanReturnGradesBtn) deanReturnGradesBtn.disabled = true;

        if (typeof deanGradeDialog?.showModal === "function") {
            if (!deanGradeDialog.open) deanGradeDialog.showModal();
        } else {
            deanGradeDialog?.setAttribute("open", "");
        }

        try {
            const res = await auth.getDeanGradeSheet(offeringId);
            const data = res?.offering ? res : (res?.data || {});
            state.activeDeanGradeSheet = data;

            if (deanGradeDialogTitle && data.offering) {
                deanGradeDialogTitle.textContent = `Grade Sheet · ${data.offering.subjectCode} · ${data.offering.subjectTitle}`;
            }
            if (deanGradeDialogMeta && data.offering) {
                deanGradeDialogMeta.textContent = `Offering: ${data.offering.offeringCode} · Section: ${data.offering.section || "—"} · Instructor: ${data.instructor || "Unassigned"}`;
            }

            renderDeanGradeSheetStudents();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load Dean grade sheet:", error);
            if (deanGradeSheetTbody) {
                deanGradeSheetTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:var(--color-error)">Failed to load grade sheet: ${escapeHtml(error.message)}</td></tr>`;
            }
        }
    };

    const renderDeanGradeSheetStudents = () => {
        if (!deanGradeSheetTbody || !state.activeDeanGradeSheet) return;
        deanGradeSheetTbody.innerHTML = "";

        const students = state.activeDeanGradeSheet.students || [];
        if (students.length === 0) {
            deanGradeSheetTbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="text-align:center; padding:1.5rem;">No student grades found for this offering.</td></tr>`;
            if (deanApproveGradesBtn) deanApproveGradesBtn.disabled = true;
            if (deanReturnGradesBtn) deanReturnGradesBtn.disabled = true;
            return;
        }

        const hasSubmitted = students.some((s) => s.grades?.some((g) => g.status === "SUBMITTED"));
        if (deanApproveGradesBtn) {
            deanApproveGradesBtn.disabled = !hasSubmitted;
            deanApproveGradesBtn.textContent = hasSubmitted ? "Approve & Forward to Registrar" : "No Pending Submissions";
        }
        if (deanReturnGradesBtn) {
            deanReturnGradesBtn.disabled = !hasSubmitted;
        }

        students.forEach((s, idx) => {
            const tr = document.createElement("tr");
            const grade = s.grades?.[0];

            let statusBadge = `<span class="status-pill">Not Graded</span>`;
            if (grade?.status === "DRAFT") {
                statusBadge = `<span class="status-pill status-draft">Draft</span>`;
            } else if (grade?.status === "SUBMITTED") {
                statusBadge = `<span class="status-pill status-submitted">Submitted</span>`;
            } else if (grade?.status === "APPROVED") {
                statusBadge = `<span class="status-pill status-pill--success">Dean Approved</span>`;
            } else if (grade?.status === "POSTED") {
                statusBadge = `<span class="status-pill status-posted">Posted</span>`;
            }

            const programText = typeof s.program === "object" ? s.program?.code : s.program;

            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(s.studentNumber)}</strong></td>
                <td>${escapeHtml(s.fullName)}</td>
                <td>${escapeHtml(programText || "—")} · Year ${s.yearLevel || "—"}</td>
                <td><strong style="font-size:1.05rem;">${grade?.numericGrade != null ? grade.numericGrade : "—"}</strong></td>
                <td>${statusBadge}</td>
                <td><small style="color:var(--muted);">${escapeHtml(grade?.remarks || "—")}</small></td>
            `;
            deanGradeSheetTbody.appendChild(tr);
        });
    };

    deanApproveGradesBtn?.addEventListener("click", async () => {
        if (!state.activeDeanGradeSheet?.offering?.id) return;
        if (!confirm("Approve this grade sheet and forward to the Registrar for final posting?")) return;

        deanApproveGradesBtn.disabled = true;
        if (deanGradeError) deanGradeError.hidden = true;

        try {
            const remarks = deanGradeRemarks?.value?.trim() || "";
            await auth.approveDeanGrades(state.activeDeanGradeSheet.offering.id, { remarks });
            deanGradeDialog?.close();
            alert("Grade sheet approved and forwarded to the Registrar successfully.");
            await Promise.allSettled([loadDeanGrades(), loadDeanOverview()]);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (deanGradeError) {
                deanGradeError.textContent = error.message || "Failed to approve grade sheet.";
                deanGradeError.hidden = false;
            }
        } finally {
            deanApproveGradesBtn.disabled = false;
        }
    });

    deanReturnGradesBtn?.addEventListener("click", async () => {
        if (!state.activeDeanGradeSheet?.offering?.id) return;
        const remarks = deanGradeRemarks?.value?.trim() || "";
        if (!remarks || remarks.length < 5) {
            if (deanGradeError) {
                deanGradeError.textContent = "Dean remarks (at least 5 characters) are required to explain why grades are being returned for correction.";
                deanGradeError.hidden = false;
            }
            deanGradeRemarks?.focus();
            return;
        }

        if (!confirm("Return this grade sheet to the instructor for correction? Grades will revert to DRAFT so the instructor can modify and resubmit.")) return;

        deanReturnGradesBtn.disabled = true;
        if (deanGradeError) deanGradeError.hidden = true;

        try {
            await auth.returnDeanGrades(state.activeDeanGradeSheet.offering.id, { remarks });
            deanGradeDialog?.close();
            alert("Grade sheet returned to instructor with your remarks.");
            await Promise.allSettled([loadDeanGrades(), loadDeanOverview()]);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (deanGradeError) {
                deanGradeError.textContent = error.message || "Failed to return grade sheet.";
                deanGradeError.hidden = false;
            }
        } finally {
            deanReturnGradesBtn.disabled = false;
        }
    });

    deanGradesTbody?.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-dean-review-grades]");
        if (!btn) return;
        const offeringId = btn.getAttribute("data-dean-review-grades");
        if (offeringId) await openDeanGradeSheet(offeringId);
    });

    closeDeanGradeDialogBtns.forEach((btn) => {
        btn.addEventListener("click", () => deanGradeDialog?.close());
    });

    refreshDeanGradesBtn?.addEventListener("click", () => void loadDeanGrades());

    // Tab 2: Official Students
    const renderDeanStudents = () => {
        if (!deanStudentsTbody) return;
        deanStudentsTbody.innerHTML = "";

        const query = deanStudentSearch?.value?.trim().toLowerCase() || "";
        const sortBy = deanStudentSort?.value || "name-asc";

        let list = [...(state.deanStudents || [])];
        if (query) {
            list = list.filter((s) => {
                const num = (s.studentNumber || "").toLowerCase();
                const name = (s.fullName || "").toLowerCase();
                const pCode = (s.program?.code || "").toLowerCase();
                const pName = (s.program?.name || "").toLowerCase();
                const term = (s.academicTerm || "").toLowerCase();
                return num.includes(query) || name.includes(query) || pCode.includes(query) || pName.includes(query) || term.includes(query);
            });
        }

        list.sort((a, b) => {
            if (sortBy === "name" || sortBy === "name-asc") return (a.fullName || "").localeCompare(b.fullName || "");
            if (sortBy === "name-desc") return (b.fullName || "").localeCompare(a.fullName || "");
            if (sortBy === "number") return (a.studentNumber || "").localeCompare(b.studentNumber || "");
            if (sortBy === "program") return (a.program?.code || "").localeCompare(b.program?.code || "");
            if (sortBy === "yearLevel") return (a.yearLevel || 0) - (b.yearLevel || 0);
            return 0;
        });

        if (list.length === 0) {
            deanStudentsTbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="text-align:center; padding:1.5rem;">${query ? "No official students match your search." : "No official students currently enrolled under your college."}</td></tr>`;
            return;
        }

        list.forEach((s, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(s.studentNumber)}</strong></td>
                <td>${escapeHtml(s.fullName)}</td>
                <td>${escapeHtml(s.program?.code || "—")} · <small style="color:var(--muted);">${escapeHtml(s.program?.name || "")}</small></td>
                <td>Year ${s.yearLevel || "—"}</td>
                <td>${escapeHtml(s.academicTerm || "—")}</td>
            `;
            deanStudentsTbody.appendChild(tr);
        });
    };

    const loadDeanStudents = async () => {
        if (!isDean() || needsPasswordChange()) return;
        try {
            const res = await auth.getDeanStudents();
            state.deanStudents = res?.students || [];
            renderDeanStudents();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load Dean students:", error);
            if (deanStudentsTbody) {
                deanStudentsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--color-error)">Failed to load official students: ${escapeHtml(error.message)}</td></tr>`;
            }
        }
    };

    deanStudentSearch?.addEventListener("input", renderDeanStudents);
    deanStudentSort?.addEventListener("change", renderDeanStudents);

    // Tab 3: Faculty
    const renderDeanFaculty = () => {
        if (!deanFacultyTbody) return;
        deanFacultyTbody.innerHTML = "";

        const query = (deanFacultySearch?.value || "").trim().toLowerCase();
        const sortBy = deanFacultySort?.value || "name-asc";

        let list = [...(state.deanFaculty || [])];
        if (query) {
            list = list.filter((f) => {
                const empNum = (f.employeeNumber || "").toLowerCase();
                const name = (f.fullName || "").toLowerCase();
                const deptName = (f.department?.name || "").toLowerCase();
                const deptCode = (f.department?.code || "").toLowerCase();
                const email = (f.institutionalEmail || "").toLowerCase();
                const status = (f.status || "").toLowerCase();
                return empNum.includes(query) || name.includes(query) || deptName.includes(query) || deptCode.includes(query) || email.includes(query) || status.includes(query);
            });
        }

        list.sort((a, b) => {
            if (sortBy === "name-asc") return (a.fullName || "").localeCompare(b.fullName || "");
            if (sortBy === "name-desc") return (b.fullName || "").localeCompare(a.fullName || "");
            if (sortBy === "employee") return (a.employeeNumber || "").localeCompare(b.employeeNumber || "");
            if (sortBy === "department") return (a.department?.name || "").localeCompare(b.department?.name || "");
            return 0;
        });

        if (list.length === 0) {
            deanFacultyTbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="text-align:center; padding:1.5rem;">${query ? "No faculty members match your search." : "No faculty members currently assigned to departments in your college."}</td></tr>`;
            return;
        }

        list.forEach((f, idx) => {
            const tr = document.createElement("tr");
            const statusClass = f.status === "ACTIVE" ? "status-pill--success" : "status-pill--warning";
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(f.employeeNumber)}</strong></td>
                <td>${escapeHtml(f.fullName)}</td>
                <td>${escapeHtml(f.department?.name || "—")} <small style="color:var(--muted);">[${escapeHtml(f.department?.code || "")}]</small></td>
                <td>${escapeHtml(f.institutionalEmail || "—")}</td>
                <td><span class="status-pill ${statusClass}">${escapeHtml(f.status || "ACTIVE")}</span></td>
            `;
            deanFacultyTbody.appendChild(tr);
        });
    };

    const loadDeanFaculty = async () => {
        if (!isDean() || needsPasswordChange()) return;
        try {
            const res = await auth.getDeanFaculty();
            state.deanFaculty = res?.faculty || [];
            renderDeanFaculty();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load Dean faculty:", error);
            if (deanFacultyTbody) {
                deanFacultyTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--color-error)">Failed to load faculty: ${escapeHtml(error.message)}</td></tr>`;
            }
        }
    };

    deanFacultySearch?.addEventListener("input", renderDeanFaculty);
    deanFacultySort?.addEventListener("change", renderDeanFaculty);

    // Tab 4: Program Evaluation
    const renderDeanEvaluations = (evaluations) => {
        if (!deanEvaluationsTbody) return;
        deanEvaluationsTbody.innerHTML = "";

        const sourceList = evaluations && Array.isArray(evaluations) ? evaluations : (state.deanEvaluations || []);
        state.deanEvaluations = sourceList;

        let list = [...sourceList];
        const query = (deanEvalSearch?.value || "").trim().toLowerCase();
        const sortBy = deanEvalSort?.value || "newest";

        if (query) {
            list = list.filter((e) => {
                const name = (e.student?.name || "").toLowerCase();
                const num = (e.student?.studentNumber || "").toLowerCase();
                const prog = (e.program?.code || "").toLowerCase();
                const term = (e.academicTerm?.name || "").toLowerCase();
                return name.includes(query) || num.includes(query) || prog.includes(query) || term.includes(query);
            });
        }

        if (sortBy === "newest") {
            list.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
        } else if (sortBy === "oldest") {
            list.sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
        } else if (sortBy === "name") {
            list.sort((a, b) => (a.student?.name || "").localeCompare(b.student?.name || ""));
        } else if (sortBy === "program") {
            list.sort((a, b) => (a.program?.code || "").localeCompare(b.program?.code || ""));
        }

        if (list.length === 0) {
            deanEvaluationsTbody.innerHTML = `<tr><td colspan="8" class="empty-state" style="text-align:center; padding:1.5rem;">${query ? "No student evaluations match your search." : "No student enrollments pending collegiate evaluation."}</td></tr>`;
            return;
        }

        list.forEach((e) => {
            const tr = document.createElement("tr");
            const submittedStr = e.submittedAt ? formatDate(e.submittedAt) : "—";
            tr.innerHTML = `
                <td><strong>${escapeHtml(e.student?.name || "")}</strong><br><small style="color:var(--muted);">${escapeHtml(e.student?.studentNumber || "")}</small></td>
                <td>${escapeHtml(e.program?.code || "—")}</td>
                <td>Year ${e.yearLevel || "—"}</td>
                <td>${escapeHtml(e.academicTerm?.name || "—")}</td>
                <td>${e.subjectCount || 0}</td>
                <td><span class="status-pill status-submitted">${escapeHtml(e.status || "SUBMITTED")}</span></td>
                <td><small>${escapeHtml(submittedStr)}</small></td>
                <td>
                    <button class="button button--primary button--small" type="button" data-dean-eval-open="${e.id}">
                        Evaluate
                    </button>
                </td>
            `;
            deanEvaluationsTbody.appendChild(tr);
        });
    };

    deanEvalSearch?.addEventListener("input", () => renderDeanEvaluations());
    deanEvalSort?.addEventListener("change", () => renderDeanEvaluations());

    const loadDeanEvaluations = async () => {
        if (!isDean() || needsPasswordChange()) return;
        try {
            const res = await auth.getDeanPendingEvaluations();
            state.deanEvaluations = res?.evaluations || [];
            renderDeanEvaluations(state.deanEvaluations);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load Dean evaluations:", error);
            if (deanEvaluationsTbody) {
                deanEvaluationsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--color-error)">Failed to load evaluations: ${escapeHtml(error.message)}</td></tr>`;
            }
        }
    };

    refreshDeanEvaluationsBtn?.addEventListener("click", () => void loadDeanEvaluations());

    const openDeanEvaluation = async (enrollmentId) => {
        if (!deanEvaluationDialog) return;
        if (deanEvalIssuesContainer) deanEvalIssuesContainer.innerHTML = "";
        if (deanEvalSubjectsTbody) {
            deanEvalSubjectsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem;">Loading academic evaluation…</td></tr>`;
        }
        if (deanEvalOverrideReasonField) deanEvalOverrideReasonField.hidden = true;
        if (deanEvalOverrideReason) deanEvalOverrideReason.value = "";
        if (deanEvalRemarks) deanEvalRemarks.value = "";
        if (deanEvalError) deanEvalError.hidden = true;
        if (deanSubmitEvaluationBtn) deanSubmitEvaluationBtn.disabled = false;

        if (typeof deanEvaluationDialog?.showModal === "function") {
            if (!deanEvaluationDialog.open) deanEvaluationDialog.showModal();
        } else {
            deanEvaluationDialog?.setAttribute("open", "");
        }

        try {
            const evaluation = await auth.getDeanEnrollmentEvaluation(enrollmentId);
            renderDeanEvaluation(evaluation);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load enrollment evaluation:", error);
            if (deanEvalSubjectsTbody) {
                deanEvalSubjectsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--color-error)">Failed to load evaluation: ${escapeHtml(error.message)}</td></tr>`;
            }
        }
    };

    const renderDeanEvaluation = (evaluation) => {
        state.activeDeanEvaluation = evaluation;
        const student = evaluation.enrollment?.student;
        const term = evaluation.enrollment?.academicTerm;
        const program = evaluation.enrollment?.program;

        if (deanEvalTitle) {
            deanEvalTitle.textContent = `${student?.studentNumber || "Student"} · ${student?.name || "Student Evaluation"}`;
        }
        if (deanEvalMeta) {
            deanEvalMeta.textContent = `${program?.code || "—"} (${program?.name || ""}) · Year ${evaluation.enrollment?.yearLevel || "—"} · ${term?.name || ""}`;
        }

        if (deanEvalIssuesContainer) {
            deanEvalIssuesContainer.innerHTML = "";
            const summary = document.createElement("div");
            const hasBlockers = evaluation.blockingIssues && evaluation.blockingIssues.length > 0;
            summary.className = `program-head-evaluation-summary ${hasBlockers ? "has-blockers" : "is-clear"}`;
            summary.style.marginBottom = "1rem";
            summary.textContent = `${evaluation.totalUnits} of ${evaluation.maximumUnits} maximum units · ${evaluation.blockingIssues?.length || 0} blocking issue(s)`;
            deanEvalIssuesContainer.appendChild(summary);
        }

        if (deanEvalSubjectsTbody) {
            deanEvalSubjectsTbody.innerHTML = "";
            const items = evaluation.items || [];
            items.forEach((item) => {
                const tr = document.createElement("tr");
                const issues = item.issues || [];
                const missingPrereq = issues.some((iss) => iss.code === "MISSING_PREREQUISITE" && iss.blocking);

                let issueHtml = "";
                if (issues.length === 0) {
                    issueHtml = `<span style="color:var(--color-success, #16a34a); font-size:0.85rem;">Academic checks passed</span>`;
                } else {
                    issueHtml = issues.map((iss) => {
                        const color = iss.blocking ? "var(--color-error, #dc2626)" : "var(--color-warning, #d97706)";
                        return `<div style="color:${color}; font-size:0.85rem; margin-bottom:0.25rem;">• ${escapeHtml(iss.message)}</div>`;
                    }).join("");
                }

                let overrideHtml = "—";
                if (missingPrereq) {
                    overrideHtml = `<label style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.85rem; cursor:pointer;">
                        <input type="checkbox" data-dean-override-item="${item.id}" /> Override Prerequisite
                    </label>`;
                }

                const placement = item.curriculumPlacement
                    ? `Year ${item.curriculumPlacement.yearLevel}, Term ${item.curriculumPlacement.termNumber}`
                    : "Out-of-sequence / Elective";

                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.subject?.code || "")}</strong><br><small style="color:var(--muted);">${escapeHtml(item.subject?.title || "")}</small></td>
                    <td>${escapeHtml(item.offering?.section?.code || "—")}</td>
                    <td>${item.creditUnits || item.subject?.units || 0}</td>
                    <td><small>${escapeHtml(placement)}</small></td>
                    <td>${issueHtml}</td>
                    <td>${overrideHtml}</td>
                `;
                deanEvalSubjectsTbody.appendChild(tr);
            });
        }

        syncDeanOverrideVisibility();
    };

    const syncDeanOverrideVisibility = () => {
        const checkedOverrides = selectAll("input[data-dean-override-item]:checked", deanEvaluationDialog || document);
        if (deanEvalOverrideReasonField) {
            deanEvalOverrideReasonField.hidden = checkedOverrides.length === 0;
        }
        if (deanEvalOverrideReason) {
            deanEvalOverrideReason.required = checkedOverrides.length > 0;
        }
    };

    deanEvaluationDialog?.addEventListener("change", (e) => {
        if (e.target.matches("input[data-dean-override-item]")) {
            syncDeanOverrideVisibility();
        }
    });

    deanSubmitEvaluationBtn?.addEventListener("click", async () => {
        if (!state.activeDeanEvaluation?.enrollment?.id) return;
        const enrollmentId = state.activeDeanEvaluation.enrollment.id;

        const checkedBoxes = selectAll("input[data-dean-override-item]:checked", deanEvaluationDialog || document);
        const overrideItemIds = checkedBoxes.map((cb) => cb.getAttribute("data-dean-override-item")).filter(Boolean);
        const overrideReason = deanEvalOverrideReason?.value?.trim() || "";
        const remarks = deanEvalRemarks?.value?.trim() || "";

        if (overrideItemIds.length > 0 && (!overrideReason || overrideReason.length < 5)) {
            if (deanEvalError) {
                deanEvalError.textContent = "A justification of at least 5 characters is required when overriding prerequisite requirements.";
                deanEvalError.hidden = false;
            }
            deanEvalOverrideReason?.focus();
            return;
        }

        if (deanEvalError) deanEvalError.hidden = true;
        deanSubmitEvaluationBtn.disabled = true;

        try {
            await auth.approveDeanEnrollmentEvaluation(enrollmentId, {
                overrideItemIds,
                overrideReason,
                remarks
            });
            deanEvaluationDialog?.close();
            alert("Collegiate evaluation approved. The enrollment assessment is now completed.");
            await Promise.allSettled([loadDeanEvaluations(), loadDeanOverview()]);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (deanEvalError) {
                deanEvalError.textContent = error.message || "Failed to approve enrollment evaluation.";
                deanEvalError.hidden = false;
            }
        } finally {
            deanSubmitEvaluationBtn.disabled = false;
        }
    });

    deanEvaluationsTbody?.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-dean-eval-open]");
        if (!btn) return;
        const enrollmentId = btn.getAttribute("data-dean-eval-open");
        if (enrollmentId) await openDeanEvaluation(enrollmentId);
    });

    closeDeanEvalDialogBtns.forEach((btn) => {
        btn.addEventListener("click", () => deanEvaluationDialog?.close());
    });

    // Tab 5: Class Schedules
    const renderDeanSchedules = () => {
        if (!deanSchedulesTbody) return;
        deanSchedulesTbody.innerHTML = "";

        const query = (deanSchedulesSearch?.value || "").trim().toLowerCase();
        const sortBy = deanSchedulesSort?.value || "offering";

        let list = [...(state.deanSchedules || [])];
        if (query) {
            list = list.filter((s) => {
                const offCode = (s.offeringCode || "").toLowerCase();
                const subjCode = (s.subject?.code || "").toLowerCase();
                const subjTitle = (s.subject?.title || "").toLowerCase();
                const secCode = (s.section?.code || "").toLowerCase();
                const progCode = (s.program?.code || "").toLowerCase();
                const instructor = (s.instructor?.name || "").toLowerCase();
                const schedStr = (s.schedules || []).map(sc => `${sc.dayOfWeek} ${sc.startsAt || ""}–${sc.endsAt || ""} ${sc.room ? sc.room.name : ""}`).join(" ").toLowerCase();
                return offCode.includes(query) || subjCode.includes(query) || subjTitle.includes(query) ||
                    secCode.includes(query) || progCode.includes(query) || instructor.includes(query) || schedStr.includes(query);
            });
        }

        list.sort((a, b) => {
            if (sortBy === "offering") return (a.offeringCode || "").localeCompare(b.offeringCode || "");
            if (sortBy === "subject") return (a.subject?.code || "").localeCompare(b.subject?.code || "");
            if (sortBy === "program") return (a.program?.code || "").localeCompare(b.program?.code || "");
            if (sortBy === "instructor") return (a.instructor?.name || "").localeCompare(b.instructor?.name || "");
            return 0;
        });

        if (list.length === 0) {
            deanSchedulesTbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="text-align:center; padding:1.5rem;">${query ? "No class offerings match your search." : "No scheduled class offerings found under your college programs."}</td></tr>`;
            return;
        }

        list.forEach((s) => {
            const tr = document.createElement("tr");
            const schedStr = (s.schedules && s.schedules.length > 0)
                ? s.schedules.map((sc) => `${sc.dayOfWeek} ${sc.startsAt || ""}–${sc.endsAt || ""} ${sc.room ? `(${sc.room.name || sc.room.code})` : ""}`).join("; ")
                : "TBA";

            tr.innerHTML = `
                <td><strong>${escapeHtml(s.offeringCode)}</strong></td>
                <td>${escapeHtml(s.subject?.code || "")} · ${escapeHtml(s.subject?.title || "")}</td>
                <td>${escapeHtml(s.section?.code || "—")}</td>
                <td>${escapeHtml(s.program?.code || "—")}</td>
                <td>${escapeHtml(s.instructor?.name || "Unassigned")}</td>
                <td>${escapeHtml(schedStr)}</td>
            `;
            deanSchedulesTbody.appendChild(tr);
        });
    };

    deanSchedulesSearch?.addEventListener("input", renderDeanSchedules);
    deanSchedulesSort?.addEventListener("change", renderDeanSchedules);

    const loadDeanSchedules = async () => {
        if (!isDean() || needsPasswordChange()) return;
        try {
            const res = await auth.getDeanSchedules();
            state.deanSchedules = res?.schedules || [];
            renderDeanSchedules();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load Dean schedules:", error);
            if (deanSchedulesTbody) {
                deanSchedulesTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--color-error)">Failed to load schedules: ${escapeHtml(error.message)}</td></tr>`;
            }
        }
    };

    // Dean Top Refresh
    deanRefreshBtn?.addEventListener("click", () => void loadDeanData());

    const loadDeanData = async () => {
        if (!isDean() || needsPasswordChange()) return;
        await Promise.allSettled([
            loadDeanOverview(),
            loadDeanGrades(),
            loadDeanStudents(),
            loadDeanFaculty(),
            loadDeanEvaluations(),
            loadDeanSchedules()
        ]);
    };

    // =========================================================================
    // AI-ASSISTED ACADEMIC RECORD IMPORT & CREDITING MODULE
    // =========================================================================

    // Student DOM Elements
    const studentImportDialog = select("[data-student-import-dialog]");
    const studentImportForm = select("[data-student-import-form]");
    const openStudentImportBtns = selectAll("[data-open-student-import-modal]");
    const closeStudentImportBtns = selectAll("[data-close-student-import-dialog]");
    const studentImportTargetProgram = select("#import-target-program");
    const studentImportError = select("[data-student-import-error]");
    const studentImportStatus = select("[data-student-import-status]");
    const studentImportRequestsList = select("[data-student-import-requests-list]");
    const refreshStudentImportRequestsBtn = select("[data-refresh-student-import-requests]");

    // Registrar DOM Elements
    const registrarImportsNavBadge = select("[data-registrar-imports-badge]");
    const refreshRegistrarImportsBtn = select("[data-refresh-registrar-imports]");
    const registrarImportSearch = select("[data-registrar-import-search]");
    const registrarImportStatusFilter = select("[data-registrar-import-status-filter]");
    const registrarImportsTbody = select("[data-registrar-imports-tbody]");
    const registrarImportDialog = select("[data-registrar-import-dialog]");
    const closeRegistrarImportDialogBtns = selectAll("[data-close-registrar-import-dialog]");
    const registrarImportDialogTitle = select("[data-registrar-import-dialog-title]");
    const registrarImportMeta = select("[data-registrar-import-meta]");
    const importDocName = select("[data-import-doc-name]");
    const importViewDocLink = select("[data-import-view-doc-link]");
    const importRejectBtn = select("[data-import-reject-btn]");
    const importProcessAiBtn = select("[data-import-process-ai-btn]");
    const importVerifyActions = select("[data-import-verify-actions]");
    const importRejectionField = select("[data-import-rejection-field]");
    const importRejectionReason = select("#import-rejection-reason");
    const importConfirmRejectBtn = select("[data-import-confirm-reject-btn]");
    const importCancelRejectBtn = select("[data-import-cancel-reject-btn]");
    const registrarImportPreviewContainer = select("[data-registrar-import-preview-container]");
    const importMetricsSummary = select("[data-import-metrics-summary]");
    const registrarImportItemsTbody = select("[data-registrar-import-items-tbody]");
    const importCommitRemarks = select("#import-commit-remarks");
    const importCommitBtn = select("[data-import-commit-btn]");
    const registrarImportDialogError = select("[data-registrar-import-dialog-error]");
    const registrarImportDialogStatus = select("[data-registrar-import-dialog-status]");

    // Status pill style helper
    const getImportStatusClass = (status) => {
        switch (status) {
            case "IMPORTED": return "status-pill--success";
            case "APPROVED":
            case "MATCHED": return "status-pill--primary";
            case "AI_PROCESSING":
            case "UNDER_REVIEW": return "status-pill--info";
            case "REJECTED": return "status-pill--danger";
            case "SUBMITTED":
            default: return "status-pill--warning";
        }
    };

    // ── Student Academic Record Import Logic ─────────────────────────────

    const renderStudentImportRequests = (requests = []) => {
        if (!studentImportRequestsList) return;
        studentImportRequestsList.innerHTML = "";

        const requestsBadge = select("[data-student-requests-badge]");
        if (requestsBadge) {
            requestsBadge.textContent = String(requests?.length || 0);
            requestsBadge.hidden = !requests || requests.length === 0;
        }

        if (!requests || requests.length === 0) {
            studentImportRequestsList.innerHTML = `<p class="dashboard-list__empty">You have not submitted any academic record import requests yet.</p>`;
            return;
        }

        requests.forEach((req) => {
            const item = document.createElement("div");
            item.className = "dashboard-list__item";
            item.style.display = "flex";
            item.style.justifyContent = "space-between";
            item.style.alignItems = "center";
            item.style.padding = "0.75rem 1rem";
            item.style.borderBottom = "1px solid var(--border, #e2e8f0)";

            const meta = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = `${req.requestNumber || "REQ"} · ${req.targetProgram?.code || "Program"} (${req.targetProgram?.name || ""})`;

            const sub = document.createElement("small");
            sub.style.display = "block";
            sub.style.color = "var(--muted, #64748b)";
            const schoolInfo = req.previousSchool ? `School: ${escapeHtml(req.previousSchool)} · ` : "";
            const dateVal = req.submittedAt || req.createdAt || req.document?.uploadedAt;
            const submittedDate = dateVal ? formatDate(dateVal) : "Recently";
            sub.innerHTML = `${schoolInfo}Submitted: ${submittedDate} · File: <em>${escapeHtml(req.originalFilename || "Document")}</em>`;

            if (req.status === "REJECTED" && req.rejectionReason) {
                const rejMsg = document.createElement("div");
                rejMsg.style.color = "var(--danger, #dc2626)";
                rejMsg.style.fontSize = "0.8rem";
                rejMsg.style.marginTop = "0.25rem";
                rejMsg.innerHTML = `<strong>Rejection reason:</strong> ${escapeHtml(req.rejectionReason)}`;
                sub.appendChild(rejMsg);
            }

            if (req.status === "IMPORTED" && req.remarks) {
                const impMsg = document.createElement("div");
                impMsg.style.color = "var(--color-success, #16a34a)";
                impMsg.style.fontSize = "0.8rem";
                impMsg.style.marginTop = "0.25rem";
                impMsg.innerHTML = `<strong>Registrar:</strong> ${escapeHtml(req.remarks)}`;
                sub.appendChild(impMsg);
            }

            meta.appendChild(title);
            meta.appendChild(sub);

            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.alignItems = "center";
            actions.style.gap = "0.75rem";

            const pill = document.createElement("span");
            pill.className = `status-pill ${getImportStatusClass(req.status)}`;
            pill.textContent = humanize(req.status);

            const docLink = document.createElement("a");
            docLink.href = auth.getAcademicRecordImportDocumentUrl(req.id);
            docLink.target = "_blank";
            docLink.rel = "noopener noreferrer";
            docLink.className = "button button--quiet button--compact";
            docLink.textContent = "View File ↗";

            actions.appendChild(pill);
            actions.appendChild(docLink);

            item.appendChild(meta);
            item.appendChild(actions);
            studentImportRequestsList.appendChild(item);
        });
    };

    const loadStudentImportRequests = async () => {
        if (!isStudentWorkspace() || needsPasswordChange()) return;
        try {
            const res = await auth.getAcademicRecordImportRequests();
            state.studentImportRequests = res?.requests || [];
            renderStudentImportRequests(state.studentImportRequests);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load student import requests:", error);
            if (studentImportRequestsList) {
                studentImportRequestsList.innerHTML = `<p class="dashboard-list__empty" style="color: var(--danger, #dc2626);">Unable to load import requests: ${escapeHtml(error.message)}</p>`;
            }
        }
    };

    const loadTargetProgramsForStudent = async () => {
        if (state.academicPrograms?.length) return state.academicPrograms;
        try {
            const res = await auth.getAdmissionPrograms().catch(() => null);
            if (res?.programs?.length) {
                state.academicPrograms = res.programs;
                return state.academicPrograms;
            }
        } catch (e) {
            console.warn("Could not load admission programs:", e);
        }

        try {
            const res = await auth.getEnrollmentOptions().catch(() => null);
            if (res?.programs?.length) {
                state.academicPrograms = res.programs;
                return state.academicPrograms;
            }
        } catch (e) {
            console.warn("Could not load enrollment options programs:", e);
        }

        if (state.registrarOfferingOptions?.programs?.length) {
            state.academicPrograms = state.registrarOfferingOptions.programs;
            return state.academicPrograms;
        }

        return state.academicPrograms || [];
    };

    const openStudentImportModal = async () => {
        if (!studentImportDialog) return;
        if (studentImportError) studentImportError.hidden = true;
        if (studentImportStatus) studentImportStatus.textContent = "";
        studentImportForm?.reset();

        // Populate programs
        if (studentImportTargetProgram) {
            studentImportTargetProgram.innerHTML = `<option value="">Loading active programs…</option>`;
            let programs = await loadTargetProgramsForStudent();
            if (!programs.length && state.registrarOfferingOptions?.programs) {
                programs = state.registrarOfferingOptions.programs;
            }
            if (!programs.length) {
                try {
                    const data = await auth.getRegistrarOfferingOptions().catch(() => null);
                    if (data?.programs) {
                        programs = data.programs;
                        state.academicPrograms = programs;
                    }
                } catch { }
            }
            if (!programs.length) {
                try {
                    const data = await auth.getAdminPrograms().catch(() => null);
                    if (data?.programs) {
                        programs = data.programs;
                        state.academicPrograms = programs;
                    }
                } catch { }
            }

            studentImportTargetProgram.innerHTML = `<option value="">Select target academic program…</option>`;
            if (programs.length === 0) {
                studentImportTargetProgram.innerHTML = `<option value="">No academic programs available</option>`;
            } else {
                programs.forEach((prog) => {
                    const opt = document.createElement("option");
                    opt.value = prog.id;
                    opt.textContent = `${prog.code} — ${prog.name}`;
                    studentImportTargetProgram.appendChild(opt);
                });
            }

            // Default to student's currently assigned program if any
            const currentProgId = state.studentDashboard?.student?.program?.id ||
                state.studentDashboard?.student?.programId ||
                state.studentDashboard?.student?.program_id;
            if (currentProgId && studentImportTargetProgram.querySelector(`option[value="${currentProgId}"]`)) {
                studentImportTargetProgram.value = currentProgId;
            }
        }

        if (typeof studentImportDialog.showModal === "function") {
            if (!studentImportDialog.open) studentImportDialog.showModal();
        } else {
            studentImportDialog.setAttribute("open", "");
        }
    };

    openStudentImportBtns.forEach((btn) => btn.addEventListener("click", () => void openStudentImportModal()));
    refreshStudentImportRequestsBtn?.addEventListener("click", () => void loadStudentImportRequests());
    closeStudentImportBtns.forEach((btn) => btn.addEventListener("click", () => studentImportDialog?.close()));

    studentImportForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!studentImportForm.checkValidity()) {
            studentImportForm.reportValidity();
            return;
        }

        const formData = new FormData(studentImportForm);
        const targetProgramId = formData.get("targetProgramId");
        const docFile = formData.get("document");

        if (!targetProgramId) {
            if (studentImportError) {
                studentImportError.textContent = "Please select a target academic program.";
                studentImportError.hidden = false;
            }
            return;
        }

        if (!docFile || !(docFile instanceof File) || docFile.size === 0) {
            if (studentImportError) {
                studentImportError.textContent = "Please select a valid academic record document (PDF, PNG, or JPG/JPEG).";
                studentImportError.hidden = false;
            }
            return;
        }

        if (docFile.size > 10 * 1024 * 1024) {
            if (studentImportError) {
                studentImportError.textContent = "Uploaded file size exceeds the 10MB limit.";
                studentImportError.hidden = false;
            }
            return;
        }

        if (studentImportError) studentImportError.hidden = true;
        setBusy(studentImportDialog, true);
        if (studentImportStatus) studentImportStatus.textContent = "Uploading academic records securely...";

        try {
            await auth.submitAcademicRecordImportRequest(formData);
            if (studentImportStatus) studentImportStatus.textContent = "Academic record submitted successfully for evaluation!";
            setTimeout(() => {
                studentImportDialog?.close();
                void loadStudentImportRequests();
                if (typeof switchStudentGradesTab === "function") {
                    switchStudentGradesTab("requests");
                }
            }, 1000);
        } catch (err) {
            if (handleExpiredSession(err)) return;
            if (studentImportError) {
                studentImportError.textContent = err.message || "Failed to submit academic record request.";
                studentImportError.hidden = false;
            }
            if (studentImportStatus) studentImportStatus.textContent = "";
        } finally {
            setBusy(studentImportDialog, false);
        }
    });

    // ── Registrar Academic Record Import Review & AI Processing Logic ────

    const renderRegistrarImportsQueue = (requests = []) => {
        if (!registrarImportsTbody) return;
        registrarImportsTbody.innerHTML = "";

        // Update badge with pending count
        const pendingCount = requests.filter(r => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW").length;
        if (registrarImportsNavBadge) {
            registrarImportsNavBadge.textContent = String(pendingCount);
            registrarImportsNavBadge.hidden = pendingCount === 0;
        }

        if (!requests || requests.length === 0) {
            registrarImportsTbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="text-align: center; padding: 1.5rem;">No academic record import requests found matching your filter.</td></tr>`;
            return;
        }

        requests.forEach((req) => {
            const tr = document.createElement("tr");

            // Program mismatch detection indicator
            let mismatchBadge = "";
            if (req.student?.program?.code && req.targetProgram?.code && req.student.program.code !== req.targetProgram.code) {
                mismatchBadge = `<br><span class="status-pill status-pill--warning" style="font-size: 0.72rem; padding: 2px 6px;">Target ≠ Active (${escapeHtml(req.student.program.code)})</span>`;
            }

            const studentCell = `<strong>${escapeHtml(req.student?.name || "Student")}</strong><br><small style="color:var(--muted);">${escapeHtml(req.student?.studentNumber || "")}</small>`;
            const programCell = `<strong>${escapeHtml(req.targetProgram?.code || "—")}</strong> <small style="color:var(--muted);">${escapeHtml(req.targetProgram?.name || "")}</small>${mismatchBadge}`;
            const schoolCell = escapeHtml(req.previousSchool || "—");
            const statusCell = `<span class="status-pill ${getImportStatusClass(req.status)}">${escapeHtml(humanize(req.status))}</span>`;
            const dateVal = req.submittedAt || req.createdAt || req.document?.uploadedAt;
            const dateCell = `<small>${dateVal ? formatDate(dateVal) : "—"}</small>`;

            let actionBtnText = "Review & Process";
            if (req.status === "MATCHED") actionBtnText = "Resolve & Commit";
            else if (req.status === "IMPORTED") actionBtnText = "View Details";

            tr.innerHTML = `
                <td><strong>${escapeHtml(req.requestNumber || "REQ")}</strong></td>
                <td>${studentCell}</td>
                <td>${programCell}</td>
                <td>${schoolCell}</td>
                <td>${statusCell}</td>
                <td>${dateCell}</td>
                <td>
                    <button class="button button--primary button--small" type="button" data-registrar-review-import="${req.id}">
                        ${actionBtnText}
                    </button>
                </td>
            `;

            registrarImportsTbody.appendChild(tr);
        });
    };

    const loadRegistrarImportRequests = async () => {
        if (!isRegistrar() || needsPasswordChange()) return;
        const search = registrarImportSearch?.value?.trim() || "";
        const status = registrarImportStatusFilter?.value || "";

        try {
            const res = await auth.getAcademicRecordImportRequests({ search, status });
            state.registrarImportRequests = res?.requests || [];
            renderRegistrarImportsQueue(state.registrarImportRequests);
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load registrar import requests:", error);
            if (registrarImportsTbody) {
                registrarImportsTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--danger, #dc2626);">Failed to load import requests: ${escapeHtml(error.message)}</td></tr>`;
            }
        }
    };

    let registrarImportSearchTimer = null;
    registrarImportSearch?.addEventListener("input", () => {
        clearTimeout(registrarImportSearchTimer);
        registrarImportSearchTimer = setTimeout(() => void loadRegistrarImportRequests(), 300);
    });
    registrarImportStatusFilter?.addEventListener("change", () => void loadRegistrarImportRequests());
    refreshRegistrarImportsBtn?.addEventListener("click", () => void loadRegistrarImportRequests());

    // Open Registrar Review Dialog
    const openRegistrarImportReview = async (requestId) => {
        if (!registrarImportDialog) return;
        state.activeRegistrarImport = null;
        state.activeRegistrarImportPreview = null;

        if (registrarImportDialogError) registrarImportDialogError.hidden = true;
        if (registrarImportDialogStatus) registrarImportDialogStatus.textContent = "";
        if (importRejectionField) importRejectionField.hidden = true;
        if (importRejectionReason) importRejectionReason.value = "";
        if (importCommitRemarks) importCommitRemarks.value = "";
        if (registrarImportPreviewContainer) registrarImportPreviewContainer.hidden = true;

        if (typeof registrarImportDialog.showModal === "function") {
            if (!registrarImportDialog.open) registrarImportDialog.showModal();
        } else {
            registrarImportDialog.setAttribute("open", "");
        }

        try {
            const res = await auth.getAcademicRecordImportRequest(requestId);
            const req = res?.request;
            state.activeRegistrarImport = req;

            if (registrarImportDialogTitle) {
                registrarImportDialogTitle.textContent = `${req.requestNumber || "REQ"} · ${req.student?.name || "Student"}`;
            }

            // Mismatch notice
            let mismatchNotice = "";
            if (req.student?.program?.code && req.targetProgram?.code && req.student.program.code !== req.targetProgram.code) {
                mismatchNotice = `
                    <div style="background: rgba(217, 119, 6, 0.1); border-left: 3px solid var(--color-warning, #d97706); padding: 0.5rem 0.75rem; border-radius: 4px; margin-top: 0.5rem; font-size: 0.85rem; color: var(--ink);">
                        <strong>Program Mismatch Notice:</strong> Student's active enrolled program is <strong>${escapeHtml(req.student.program.code)}</strong>, but evaluation target is <strong>${escapeHtml(req.targetProgram.code)}</strong>. AI matching will strictly scope against the target program curriculum. Importing will NOT alter the student's official degree program.
                    </div>
                `;
            }

            if (registrarImportMeta) {
                const reqSubmittedDate = req.submittedAt || req.createdAt || req.document?.uploadedAt;
                registrarImportMeta.innerHTML = `
                    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; background: var(--surface-2, #f8fafc); padding: 0.75rem 1rem; border-radius: 6px; font-size: 0.9rem;">
                        <div><strong style="color:var(--muted);">Student:</strong> ${escapeHtml(req.student?.name || "")} (${escapeHtml(req.student?.studentNumber || "")})</div>
                        <div><strong style="color:var(--muted);">Target Program:</strong> ${escapeHtml(req.targetProgram?.code || "")} — ${escapeHtml(req.targetProgram?.name || "")}</div>
                        <div><strong style="color:var(--muted);">Previous School:</strong> ${escapeHtml(req.previousSchool || "Not specified")}</div>
                        <div><strong style="color:var(--muted);">Submitted:</strong> ${reqSubmittedDate ? formatDate(reqSubmittedDate) : "—"}</div>
                        <div><strong style="color:var(--muted);">Status:</strong> <span class="status-pill ${getImportStatusClass(req.status)}">${escapeHtml(humanize(req.status))}</span></div>
                    </div>
                    ${mismatchNotice}
                    ${req.remarks ? `<p style="font-size:0.85rem; margin-top:0.5rem; color:var(--muted);"><strong>Student Notes:</strong> ${escapeHtml(req.remarks)}</p>` : ""}
                    ${req.rejectionReason ? `<p style="font-size:0.85rem; margin-top:0.5rem; color:var(--danger, #dc2626);"><strong>Rejection Reason:</strong> ${escapeHtml(req.rejectionReason)}</p>` : ""}
                `;
            }

            // Document info
            if (importDocName) {
                importDocName.textContent = `Document: ${req.originalFilename || "Academic Record File"}`;
            }
            if (importViewDocLink) {
                importViewDocLink.href = auth.getAcademicRecordImportDocumentUrl(req.id);
            }

            // Step 1 controls
            if (importVerifyActions) {
                const canVerify = req.status === "SUBMITTED" || req.status === "UNDER_REVIEW" || req.status === "APPROVED_FOR_AI";
                importVerifyActions.hidden = !canVerify;
            }

            if (importProcessAiBtn) {
                if (req.status === "UNDER_REVIEW") {
                    importProcessAiBtn.innerHTML = `✨ Re-run AI Matching`;
                } else if (req.status === "SUBMITTED") {
                    importProcessAiBtn.innerHTML = `✨ Approve & Run AI Matching`;
                } else {
                    importProcessAiBtn.innerHTML = `✨ Run AI Matching`;
                }
            }

            // If already MATCHED, APPROVED, IMPORTED, or UNDER_REVIEW, load preview automatically
            if (["MATCHED", "APPROVED", "IMPORTED", "UNDER_REVIEW"].includes(req.status)) {
                await loadRegistrarImportPreview(req.id);
            }
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load import request review:", error);
            if (registrarImportDialogError) {
                registrarImportDialogError.textContent = error.message || "Failed to load request.";
                registrarImportDialogError.hidden = false;
            }
        }
    };

    // Load AI Matching Preview & Conflicts Table
    const loadRegistrarImportPreview = async (requestId) => {
        try {
            const preview = await auth.getAcademicRecordImportPreview(requestId);
            state.activeRegistrarImportPreview = preview;
            renderRegistrarImportPreview(preview);
        } catch (error) {
            console.error("Failed to load import preview:", error);
            if (registrarImportDialogError) {
                registrarImportDialogError.textContent = error.message || "Failed to load match preview.";
                registrarImportDialogError.hidden = false;
            }
        }
    };

    const renderRegistrarImportPreview = (previewData) => {
        if (!registrarImportPreviewContainer || !previewData) return;
        registrarImportPreviewContainer.hidden = false;

        const preview = previewData?.preview || previewData || {};
        const isImported = Boolean(preview.isImported || preview.status === "IMPORTED");
        const isRejected = Boolean(preview.isRejected || preview.status === "REJECTED");

        const metrics = preview.metrics || preview.summary || {};
        const totalExtracted = metrics.totalExtracted ?? metrics.totalDetected ?? 0;
        const highMatch = metrics.highMatch ?? metrics.highMatches ?? 0;
        const needsReview = metrics.needsReview ?? 0;
        const conflictCount = metrics.conflictCount ?? metrics.conflicts ?? 0;

        // Metrics Summary
        if (importMetricsSummary) {
            const methodLabel = preview.extractionMethod === "GEMINI" ? "Gemini AI" : "Deterministic";
            importMetricsSummary.innerHTML = `
                <article class="metric-card" style="padding: 0.4rem 0.75rem;"><small>Method</small><strong>${escapeHtml(methodLabel)}</strong></article>
                <article class="metric-card" style="padding: 0.4rem 0.75rem;"><small>Extracted</small><strong>${totalExtracted}</strong></article>
                <article class="metric-card" style="padding: 0.4rem 0.75rem;"><small>High Match</small><strong style="color:var(--color-success, #16a34a);">${highMatch}</strong></article>
                <article class="metric-card" style="padding: 0.4rem 0.75rem;"><small>Needs Review</small><strong style="color:var(--color-warning, #d97706);">${needsReview}</strong></article>
                <article class="metric-card" style="padding: 0.4rem 0.75rem;"><small>Conflicts</small><strong style="color:${conflictCount > 0 ? 'var(--danger, #dc2626)' : 'inherit'};">${conflictCount}</strong></article>
            `;
        }

        const rawItems = preview.items || preview.records || [];
        const items = rawItems.map((item, idx) => {
            const code = item.sourceSubjectCode || item.extractedCode || "—";
            const title = item.sourceSubjectTitle || item.extractedTitle || "";
            const units = item.sourceUnits ?? item.extractedUnits ?? "—";
            const grade = item.sourceGrade || item.extractedGrade || "—";
            const status = item.status || item.matchStatus || "NO_MATCH";
            const score = item.confidenceScore ?? item.matchScore ?? 0;
            const hasConflict = Boolean(item.hasConflict || item.conflict?.hasConflict);
            const existingGrade = item.existingGrade || item.conflict?.existingGrade || "POSTED";
            const matchedCode = item.matchedSubject?.code || item.matchedSubjectCode;
            const matchedTitle = item.matchedSubject?.title || item.matchedSubjectTitle;
            const matchedUnits = item.matchedSubject?.units ?? item.matchedSubjectUnits;
            const matchedId = item.matchedSubject?.id || item.matchedSubjectId;
            const recordIndex = item.recordIndex ?? item.id ?? idx;

            return {
                ...item,
                recordIndex,
                id: recordIndex,
                sourceSubjectCode: code,
                sourceSubjectTitle: title,
                sourceUnits: units,
                sourceGrade: grade,
                status,
                confidenceScore: score,
                hasConflict,
                existingGrade,
                matchedSubjectId: matchedId,
                matchedSubject: matchedCode ? {
                    id: matchedId,
                    code: matchedCode,
                    title: matchedTitle,
                    units: matchedUnits
                } : null
            };
        });

        // Items Table
        if (registrarImportItemsTbody) {
            registrarImportItemsTbody.innerHTML = "";
            if (!items || items.length === 0) {
                registrarImportItemsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1rem;">No subjects were extracted or matched.</td></tr>`;
                return;
            }

            items.forEach((item) => {
                const tr = document.createElement("tr");

                // Extracted info
                const extractedSubject = `<strong>${escapeHtml(item.sourceSubjectCode || "—")}</strong><br><small style="color:var(--muted);">${escapeHtml(item.sourceSubjectTitle || "")} (${item.sourceUnits ?? "—"}u)</small>`;
                const extractedGrade = `<strong style="font-size: 1.05rem;">${escapeHtml(item.sourceGrade || "—")}</strong>`;

                // Academic Year & Term cell with correction controls
                const isPeriodUnclear = item.periodStatus === "UNCLEAR_OR_MISSING" || !item.academicYear || !item.term;
                let periodDisplay = "";
                if (isImported) {
                    periodDisplay = `<strong>${escapeHtml(item.academicYear || "Legacy")}</strong><br><small style="color:var(--muted);">${escapeHtml(item.term || "Historical")}</small>`;
                } else if (isPeriodUnclear) {
                    periodDisplay = `
                        <div style="min-width: 140px;">
                            <span class="status-pill status-pill--warning" style="font-size: 0.72rem; padding: 2px 6px; margin-bottom: 3px; display: inline-block;">⚠️ AY/Term Unclear</span>
                            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 2px;">
                                <input type="text" data-item-ay="${item.id}" value="${escapeHtml(item.academicYear || '')}" placeholder="AY (e.g. 2023-2024)" style="font-size: 0.78rem; padding: 2px 5px; width: 100%; border: 1px solid var(--line, #cbd5e1); border-radius: 3px;" title="Academic Year (e.g. 2023-2024 or leave blank for Legacy)" />
                                <select data-item-term="${item.id}" style="font-size: 0.78rem; padding: 2px 4px; width: 100%; border: 1px solid var(--line, #cbd5e1); border-radius: 3px;">
                                    <option value="1st Semester" ${item.term && /1st|first|1\b/i.test(item.term) ? "selected" : ""}>1st Semester</option>
                                    <option value="2nd Semester" ${item.term && /2nd|second|2\b/i.test(item.term) ? "selected" : ""}>2nd Semester</option>
                                    <option value="Summer" ${item.term && /summer|midyear|3\b/i.test(item.term) ? "selected" : ""}>Summer</option>
                                    <option value="Legacy / Unknown Historical Term" ${!item.term || /legacy|unknown/i.test(item.term) ? "selected" : ""}>Legacy / Unknown Historical Term</option>
                                </select>
                            </div>
                        </div>
                    `;
                } else {
                    periodDisplay = `
                        <div style="min-width: 130px;">
                            <strong>${escapeHtml(item.academicYear)}</strong><br><small style="color:var(--muted);">${escapeHtml(item.term)}</small>
                            <details style="margin-top: 3px; font-size: 0.75rem;">
                                <summary style="cursor: pointer; color: var(--color-primary, #0284c7);">Edit AY/Term</summary>
                                <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
                                    <input type="text" data-item-ay="${item.id}" value="${escapeHtml(item.academicYear)}" placeholder="AY (e.g. 2023-2024)" style="font-size: 0.75rem; padding: 2px 4px; width: 100%;" />
                                    <select data-item-term="${item.id}" style="font-size: 0.75rem; padding: 2px 4px; width: 100%;">
                                        <option value="1st Semester" ${item.term && /1st|first|1\b/i.test(item.term) ? "selected" : ""}>1st Semester</option>
                                        <option value="2nd Semester" ${item.term && /2nd|second|2\b/i.test(item.term) ? "selected" : ""}>2nd Semester</option>
                                        <option value="Summer" ${item.term && /summer|midyear|3\b/i.test(item.term) ? "selected" : ""}>Summer</option>
                                        <option value="Legacy / Unknown Historical Term">Legacy / Unknown Historical Term</option>
                                    </select>
                                </div>
                            </details>
                        </div>
                    `;
                }

                // Matched curriculum subject
                let matchDisplay = `<span style="color:var(--muted);">No catalog match</span>`;
                if (item.matchedSubject) {
                    const matchPlacement = item.curriculumPlacement ? ` · Y${item.curriculumPlacement.yearLevel}T${item.curriculumPlacement.termNumber}` : "";
                    matchDisplay = `<strong>${escapeHtml(item.matchedSubject.code)}</strong> · ${escapeHtml(item.matchedSubject.title)} (${item.matchedSubject.units}u)${matchPlacement}`;
                }

                // Confidence pill
                let confPillClass = "status-pill--warning";
                if (item.status === "HIGH_MATCH") confPillClass = "status-pill--success";
                else if (item.status === "CONFLICT") confPillClass = "status-pill--danger";
                else if (item.status === "NO_MATCH") confPillClass = "status-pill--secondary";

                const confDisplay = `<span class="status-pill ${confPillClass}" style="font-size: 0.75rem;">${escapeHtml(humanize(item.status))}</span><br><small style="color:var(--muted); font-size:0.7rem;">${Math.round((item.confidenceScore || 0) * 100)}% match</small>`;

                // Resolution / Action Control
                let actionControl = "";
                if (isImported) {
                    actionControl = `<span class="status-pill status-pill--success" style="font-size: 0.8rem;">Imported (${escapeHtml(item.resolutionAction || "COMMITTED")})</span>`;
                } else if (item.hasConflict) {
                    actionControl = `
                        <div style="background: rgba(220, 38, 38, 0.08); padding: 0.4rem; border-radius: 4px; font-size: 0.8rem;">
                            <span style="color: var(--danger, #dc2626); font-weight: 600;">Existing Grade: ${escapeHtml(item.existingGrade || "POSTED")}</span>
                            <select data-resolution-item="${item.id}" style="font-size: 0.8rem; margin-top: 0.25rem; width: 100%;">
                                <option value="KEEP_EXISTING" ${item.resolutionAction === "KEEP_EXISTING" ? "selected" : ""}>Keep Existing Grade</option>
                                <option value="USE_UPLOADED" ${item.resolutionAction === "USE_UPLOADED" ? "selected" : ""}>Use Uploaded Grade (${escapeHtml(item.sourceGrade || "")})</option>
                                <option value="SKIP" ${item.resolutionAction === "SKIP" ? "selected" : ""}>Skip (Do not import)</option>
                            </select>
                        </div>
                    `;
                } else if (!item.matchedSubjectId) {
                    actionControl = `<span style="color: var(--muted); font-size: 0.8rem;">No match to import</span>`;
                } else {
                    actionControl = `
                        <select data-resolution-item="${item.id}" style="font-size: 0.8rem; width: 100%;">
                            <option value="USE_UPLOADED" selected>Import Credited Subject</option>
                            <option value="SKIP">Skip (Do not import)</option>
                        </select>
                    `;
                }

                tr.innerHTML = `
                    <td>${extractedSubject}</td>
                    <td>${extractedGrade}</td>
                    <td>${periodDisplay}</td>
                    <td>${matchDisplay}</td>
                    <td>${confDisplay}</td>
                    <td>${actionControl}</td>
                `;

                registrarImportItemsTbody.appendChild(tr);
            });
        }

        // Hide commit button if already imported or rejected
        if (importCommitBtn) {
            importCommitBtn.hidden = Boolean(isImported || isRejected);
        }
    };

    // Rejection UI handlers
    importRejectBtn?.addEventListener("click", () => {
        if (importRejectionField) importRejectionField.hidden = false;
        importRejectionReason?.focus();
    });

    importCancelRejectBtn?.addEventListener("click", () => {
        if (importRejectionField) importRejectionField.hidden = true;
        if (importRejectionReason) importRejectionReason.value = "";
    });

    importConfirmRejectBtn?.addEventListener("click", async () => {
        const requestId = state.activeRegistrarImport?.id;
        const reason = importRejectionReason?.value?.trim() || "";
        if (!requestId) return;

        if (!reason || reason.length < 3) {
            alert("Please provide a valid rejection reason.");
            importRejectionReason?.focus();
            return;
        }

        if (!confirm("Reject this academic record import request?")) return;

        setBusy(registrarImportDialog, true);
        try {
            await auth.verifyAcademicRecordImportRequest(requestId, {
                action: "REJECT",
                remarks: reason,
                rejectionReason: reason
            });
            alert("Request has been marked as rejected.");
            registrarImportDialog?.close();
            await loadRegistrarImportRequests();
        } catch (err) {
            if (handleExpiredSession(err)) return;
            alert(err.message || "Failed to reject request.");
        } finally {
            setBusy(registrarImportDialog, false);
        }
    });

    // Run AI Matching Handler
    importProcessAiBtn?.addEventListener("click", async () => {
        const requestId = state.activeRegistrarImport?.id;
        if (!requestId) return;

        setBusy(registrarImportDialog, true);
        if (registrarImportDialogStatus) {
            registrarImportDialogStatus.textContent = "✨ Running Gemini AI OCR and matching subjects against target program curriculum. Please wait...";
        }
        if (registrarImportDialogError) registrarImportDialogError.hidden = true;

        try {
            // 1. Verify if still in SUBMITTED state
            if (state.activeRegistrarImport?.status === "SUBMITTED") {
                await auth.verifyAcademicRecordImportRequest(requestId, { action: "APPROVE" });
            }
            // 2. Trigger AI Matching
            const res = await auth.processAcademicRecordImportAI(requestId);
            const req = res?.data?.request || res?.request || res;
            const extractedCount = req?.matchedData?.records?.length || 0;

            if (extractedCount > 0) {
                if (registrarImportDialogStatus) {
                    registrarImportDialogStatus.textContent = `✨ AI matching complete! Extracted ${extractedCount} subject(s). Review subjects and conflict resolutions below.`;
                }
            } else {
                throw new Error("No academic records could be extracted. AI/OCR processing failed or the document is unreadable.");
            }

            // 3. Reload preview
            await loadRegistrarImportPreview(requestId);
            await loadRegistrarImportRequests();
        } catch (err) {
            if (handleExpiredSession(err)) return;
            if (registrarImportDialogError) {
                registrarImportDialogError.textContent = err.message || "AI Matching failed.";
                registrarImportDialogError.hidden = false;
            }
            if (registrarImportDialogStatus) registrarImportDialogStatus.textContent = "";
        } finally {
            setBusy(registrarImportDialog, false);
        }
    });

    // Commit Credited Grades Handler
    importCommitBtn?.addEventListener("click", async () => {
        const requestId = state.activeRegistrarImport?.id;
        const preview = state.activeRegistrarImportPreview?.preview || state.activeRegistrarImportPreview;
        const rawItems = preview?.items || preview?.records || [];
        if (!requestId || !rawItems.length) return;

        const resolutions = rawItems.map((item, idx) => {
            const recordIndex = item.recordIndex ?? item.id ?? idx;
            const selectEl = select(`select[data-resolution-item="${recordIndex}"]`, registrarImportDialog || document);
            const ayInput = select(`input[data-item-ay="${recordIndex}"]`, registrarImportDialog || document);
            const termInput = select(`select[data-item-term="${recordIndex}"]`, registrarImportDialog || document);

            const academicYear = ayInput?.value?.trim() || item.academicYear || undefined;
            const term = termInput?.value?.trim() || item.term || undefined;

            return {
                recordIndex,
                id: recordIndex,
                resolutionAction: selectEl?.value || item.resolutionAction || "USE_UPLOADED",
                academicYear,
                term
            };
        });

        const remarks = importCommitRemarks?.value?.trim() || "";

        if (!confirm("Confirm and import credited subjects into official student history? Posted grades will immediately integrate into student records and prerequisite evaluation.")) return;

        setBusy(registrarImportDialog, true);
        if (registrarImportDialogStatus) registrarImportDialogStatus.textContent = "Importing credited subjects and posting grades...";
        if (registrarImportDialogError) registrarImportDialogError.hidden = true;

        try {
            const result = await auth.commitAcademicRecordImport(requestId, { resolutions, remarks });
            alert(`Success! Imported ${result?.importedCount || 0} subject(s) with posted grades into student record.`);
            registrarImportDialog?.close();
            await loadRegistrarImportRequests();
        } catch (err) {
            if (handleExpiredSession(err)) return;
            if (registrarImportDialogError) {
                registrarImportDialogError.textContent = err.message || "Failed to commit academic import.";
                registrarImportDialogError.hidden = false;
            }
            if (registrarImportDialogStatus) registrarImportDialogStatus.textContent = "";
        } finally {
            setBusy(registrarImportDialog, false);
        }
    });

    registrarImportsTbody?.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-registrar-review-import]");
        if (!btn) return;
        const requestId = btn.getAttribute("data-registrar-review-import");
        if (requestId) await openRegistrarImportReview(requestId);
    });

    closeRegistrarImportDialogBtns.forEach((btn) => btn.addEventListener("click", () => registrarImportDialog?.close()));

    // ── Floating Report Button & System Issue Reports Module ─────────────
    const openReportBtn = select("[data-open-report-dialog]");
    const closeReportBtns = selectAll("[data-close-report-dialog]");
    const reportDialog = select("[data-report-dialog]");
    const reportForm = select("[data-report-form]");
    const reportError = select("[data-report-error]");
    const reportStatus = select("[data-report-status]");

    openReportBtn?.addEventListener("click", () => {
        if (reportError) reportError.hidden = true;
        if (reportStatus) reportStatus.textContent = "";
        reportForm?.reset();
        reportDialog?.showModal();
    });

    closeReportBtns.forEach((btn) => btn.addEventListener("click", () => reportDialog?.close()));

    reportForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(reportForm);
        const category = String(formData.get("category") || "BUG").trim();
        const description = String(formData.get("description") || "").trim();
        const fileInput = select("#report-screenshot");

        if (description.length < 5) {
            if (reportError) {
                reportError.textContent = "Please provide a description of at least 5 characters.";
                reportError.hidden = false;
            }
            return;
        }

        setBusy(reportForm, true);
        if (reportStatus) reportStatus.textContent = "Submitting issue report…";
        if (reportError) reportError.hidden = true;

        let screenshotData = null;
        if (fileInput?.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            if (file.size <= 5 * 1024 * 1024) {
                screenshotData = await new Promise((res) => {
                    const reader = new FileReader();
                    reader.onload = () => res(reader.result);
                    reader.onerror = () => res(null);
                    reader.readAsDataURL(file);
                });
            }
        }

        const globalAlertEl = select("[data-global-error]");
        const errorCode = globalAlertEl && !globalAlertEl.hidden ? globalAlertEl.textContent?.slice(0, 100) : null;

        try {
            await auth.submitSystemReport({
                category,
                description,
                screenshotData,
                pageUrl: window.location.href,
                browserInfo: navigator.userAgent,
                errorCode
            });
            if (reportStatus) reportStatus.textContent = "Report submitted successfully! Thank you for helping improve the portal.";
            setTimeout(() => {
                reportDialog?.close();
                reportForm?.reset();
                if (typeof isAdministrator === "function" && isAdministrator()) {
                    void renderAdminReports();
                }
            }, 1200);
        } catch (err) {
            if (reportError) {
                reportError.textContent = err.message || "Failed to submit report. Please try again.";
                reportError.hidden = false;
            }
            if (reportStatus) reportStatus.textContent = "";
        } finally {
            setBusy(reportForm, false);
        }
    });

    // Admin System Reports Dashboard
    const adminReportsTbody = select("[data-admin-reports-tbody]");
    const adminReportFilterBtns = selectAll(".admin-report-filter-btn");
    const refreshAdminReportsBtn = select("[data-refresh-admin-reports]");
    let currentAdminReportFilter = "ALL";

    const renderAdminReports = async () => {
        if (!adminReportsTbody) return;
        adminReportsTbody.innerHTML = `<tr><td colspan="6" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">Loading user reports…</td></tr>`;

        try {
            const res = await auth.getSystemReports({ status: currentAdminReportFilter });
            const reports = res?.reports || res?.data?.reports || [];

            const badgeCount = select("[data-admin-reports-badge]");
            if (badgeCount) {
                const openCount = reports.filter((r) => r.status === "OPEN" || r.status === "IN_REVIEW").length;
                badgeCount.textContent = String(openCount);
                badgeCount.hidden = openCount === 0;
            }

            if (reports.length === 0) {
                adminReportsTbody.innerHTML = `<tr><td colspan="6" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No system reports found for this filter.</td></tr>`;
                return;
            }

            adminReportsTbody.innerHTML = "";
            reports.forEach((rep) => {
                const tr = document.createElement("tr");

                const statusPillClass =
                    rep.status === "RESOLVED" ? "status-pill--active" :
                        rep.status === "IN_REVIEW" ? "status-pill--warning" :
                            rep.status === "CLOSED" ? "status-pill--disabled" : "status-pill--pending";

                const categoryBadge =
                    rep.category === "BUG" ? "🔴 Bug" :
                        rep.category === "UI_ISSUE" ? "🎨 UI Issue" :
                            rep.category === "SUGGESTION" ? "💡 Suggestion" : "📌 Other";

                const screenshotHtml = rep.screenshotData
                    ? `<br><a href="${escapeHtml(rep.screenshotData)}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-size: 0.8rem; font-weight: 600;">View Screenshot ↗</a>`
                    : "";

                tr.innerHTML = `
                    <td style="font-size: 0.85rem; white-space: nowrap;">${formatDate(rep.createdAt)}</td>
                    <td style="font-size: 0.85rem; font-weight: 600;">${categoryBadge}</td>
                    <td style="font-size: 0.88rem; max-width: 280px; word-break: break-word;">
                        ${escapeHtml(rep.description)}
                        ${screenshotHtml}
                    </td>
                    <td style="font-size: 0.82rem; color: var(--muted);">
                        <strong>User:</strong> ${escapeHtml(rep.user?.username || rep.userId || "Guest")}<br>
                        <strong>Role:</strong> ${escapeHtml(rep.userRole || "GUEST")}<br>
                        <small style="display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(rep.pageUrl || "/")}</small>
                    </td>
                    <td>
                        <span class="status-pill ${statusPillClass}" style="font-size: 0.78rem; padding: 0.25rem 0.6rem;">${humanize(rep.status)}</span>
                    </td>
                    <td style="white-space: nowrap;">
                        <select class="report-status-select" data-report-id="${rep.id}" style="font-size: 0.8rem; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--line);">
                            <option value="OPEN" ${rep.status === "OPEN" ? "selected" : ""}>Open</option>
                            <option value="IN_REVIEW" ${rep.status === "IN_REVIEW" ? "selected" : ""}>In Review</option>
                            <option value="RESOLVED" ${rep.status === "RESOLVED" ? "selected" : ""}>Resolved</option>
                            <option value="CLOSED" ${rep.status === "CLOSED" ? "selected" : ""}>Closed</option>
                        </select>
                    </td>
                `;
                adminReportsTbody.appendChild(tr);
            });
        } catch (err) {
            if (handleExpiredSession(err)) return;
            adminReportsTbody.innerHTML = `<tr><td colspan="6" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--danger);">Failed to load system reports: ${escapeHtml(err.message)}</td></tr>`;
        }
    };

    adminReportFilterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            adminReportFilterBtns.forEach((b) => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            currentAdminReportFilter = btn.getAttribute("data-report-filter") || "ALL";
            void renderAdminReports();
        });
    });

    refreshAdminReportsBtn?.addEventListener("click", () => void renderAdminReports());

    adminReportsTbody?.addEventListener("change", async (e) => {
        const selectEl = e.target.closest(".report-status-select");
        if (!selectEl) return;
        const reportId = selectEl.getAttribute("data-report-id");
        const newStatus = selectEl.value;
        if (!reportId || !newStatus) return;

        try {
            await auth.updateSystemReportStatus(reportId, { status: newStatus });
            void renderAdminReports();
        } catch (err) {
            if (handleExpiredSession(err)) return;
            alert(err.message || "Failed to update report status.");
        }
    });



    // ── Forgot Password Modal Module ─────────────────────────────────────
    const openForgotBtns = selectAll("[data-open-forgot-password-dialog]");
    const closeForgotBtns = selectAll("[data-close-forgot-password-dialog]");
    const forgotDialog = select("[data-forgot-password-dialog]");
    const forgotForm = select("[data-forgot-password-form]");
    const forgotError = select("[data-forgot-password-error]");
    const forgotStatus = select("[data-forgot-password-status]");

    openForgotBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            if (forgotError) forgotError.hidden = true;
            if (forgotStatus) forgotStatus.textContent = "";
            forgotForm?.reset();
            forgotDialog?.showModal();
        });
    });

    closeForgotBtns.forEach((btn) => btn.addEventListener("click", () => forgotDialog?.close()));

    forgotForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(forgotForm);
        const identifier = String(formData.get("identifier") || "").trim();

        if (!identifier) {
            if (forgotError) {
                forgotError.textContent = "Please enter your username or registered email.";
                forgotError.hidden = false;
            }
            return;
        }

        setBusy(forgotForm, true);
        if (forgotStatus) forgotStatus.textContent = "Processing request…";
        if (forgotError) forgotError.hidden = true;

        try {
            const res = await auth.requestPasswordReset({ identifier });
            if (forgotStatus) {
                forgotStatus.textContent = res?.data?.message || "If an eligible account matches that identifier, password-reset instructions will be sent to your primary email.";
            }
            setTimeout(() => {
                forgotDialog?.close();
                forgotForm?.reset();
            }, 3000);
        } catch (err) {
            if (forgotError) {
                forgotError.textContent = err.message || "Unable to request password reset. Please try again later.";
                forgotError.hidden = false;
            }
            if (forgotStatus) forgotStatus.textContent = "";
        } finally {
            setBusy(forgotForm, false);
        }
    });

    void bootstrap();
})();
