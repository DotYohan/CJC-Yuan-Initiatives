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
    const usersStatus = select("[data-users-status]");
    const usersTable = select("[data-users-table]");
    const usersBody = select("[data-users-body]");
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
        registrar: "Registrar",
        cashier: "Cashier",
        ssc: "SSC",
        lirc_director: "LiRC Director",
        laboratory_in_charge: "Laboratory In-charge",
        yearbook_coordinator: "Yearbook Coordinator",
        proctor: "Proctor",
    };
    const accountCreationRoleSlugs = new Set(["administrator", "registrar", "program_head", "cashier", "student"]);
    const humanize = (value) => String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
    const isStudentWorkspace = () => location.pathname === "/portal/student"
        || (location.pathname === "/portal.html" && state.user?.primaryRole === "student");
    const needsPasswordChange = () => Boolean(state.user?.mustChangePassword);
    const redirectToSignIn = () => {
        const returnTo = `${location.pathname}${location.search}`;
        location.replace(`/index.html?signin=1&returnTo=${encodeURIComponent(returnTo)}`);
    };

    const setText = (selector, value) => {
        const element = select(selector);
        if (element) element.textContent = value;
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
        setText("[data-clearance-form-status]", clearance ? humanize(clearance.status) : "Not started");
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
                    clearanceList.append(dashboardListItem(item.office || humanize(item.officeType), details, humanize(item.status)));
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
                return dashboardListItem(
                    `${meeting.subjectCode} — ${meeting.subjectTitle}`,
                    `${humanize(meeting.weekday)} · ${meeting.startsAt || "TBA"}–${meeting.endsAt || "TBA"} · ${room}`,
                    meeting.section || ""
                );
            }));
        }

        const grades = Array.isArray(dashboard.finalGrades) ? dashboard.finalGrades : [];
        const gradeList = clearDashboardList("[data-grade-list]", "No posted final grades are available for the current enrollment.");
        setText("[data-grade-count]", plural(grades.length, "grade"));
        if (grades.length) {
            gradeList.replaceChildren(...grades.map((grade) => dashboardListItem(
                `${grade.subjectCode} — ${grade.subjectTitle}`,
                `${grade.period}${grade.remarks ? ` · ${grade.remarks}` : ""}`,
                grade.letterGrade || grade.numericGrade || "Posted"
            )));
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
            : "";
        const primaryLabel = roleName(primaryRole);
        const name = displayName(user);
        const required = needsPasswordChange();
        const studentWorkspace = isStudentWorkspace();

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
        adminPanel.hidden = !canManageAccounts;
        if (monitoringPanel) monitoringPanel.hidden = !canManageAccounts;
        registrarPanel.hidden = !canManageRegistrar;
        programHeadPanel.hidden = !canManageProgramHead;
        studentDashboard.hidden = !studentWorkspace || required;

        if (required && !mandatoryPrompted) {
            mandatoryPrompted = true;
            window.setTimeout(() => openPasswordDialog(true), 0);
        }
        if (canManageAccounts && !state.adminLoaded) {
            state.adminLoaded = true;
            void loadAdminData();
        }
        if (canManageRegistrar && !state.registrarLoaded) {
            state.registrarLoaded = true;
            void loadRegistrarData();
        }
        if (canManageProgramHead && !state.programHeadLoaded) {
            state.programHeadLoaded = true;
            void loadProgramHeadData();
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
            if (error?.status !== 401) {
                buttons.forEach((button) => {
                    button.disabled = false;
                    button.setAttribute("aria-busy", "false");
                });
                if (passwordDialog?.open) {
                    showError(passwordError, "Could not sign out. Check your connection and try again.");
                } else {
                    showError(globalError, "Could not sign out. Check your connection and try again.");
                    globalError?.scrollIntoView({ block: "nearest" });
                }
                return;
            }
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
        syncProgramAssignment();
    };

    const renderProgramOptions = (programs = []) => {
        if (!programSelect) return;
        programSelect.replaceChildren(new Option(programs.length ? "Choose a program" : "No programs available", ""));
        programs.forEach((program) => programSelect.append(new Option(`${program.code} · ${program.name}`, program.id)));
        programSelect.disabled = !programs.length || roleSelect?.value !== "program_head";
    };

    const syncProgramAssignment = () => {
        const required = roleSelect?.value === "program_head";
        if (programAssignment) programAssignment.hidden = !required;
        if (programSelect) {
            programSelect.required = required;
            programSelect.disabled = !required || programSelect.options.length <= 1;
            if (!required) programSelect.value = "";
        }
    };
    roleSelect?.addEventListener("change", syncProgramAssignment);

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
        setText("[data-user-count]", `${state.users.length} account${state.users.length === 1 ? "" : "s"}`);
        if (!state.users.length) {
            if (usersStatus) usersStatus.textContent = "No project accounts were returned.";
            usersTable.hidden = true;
            return;
        }
        state.users.forEach((user) => {
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
        await Promise.allSettled([loadRoles(), loadUsers(), auth.getAdminPrograms().then((data) => renderProgramOptions(data.programs || []))]);
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

    const loadRegistrarData = async () => {
        if (!isRegistrar() || needsPasswordChange()) return;
        try {
            const dashboard = await auth.getRegistrarDashboard();
            renderRegistrarDashboard(dashboard);
            await loadRegistrarApplications();
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
            if (typeof programHeadStudentDialog?.showModal === "function") programHeadStudentDialog.showModal();
            else programHeadStudentDialog?.setAttribute("open", "");
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
        if (programHeadEvaluationForm) programHeadEvaluationForm.elements.enrollmentId.value = evaluation.enrollment.id;
    };

    const openProgramHeadEvaluation = async (enrollmentId) => {
        try {
            const evaluation = await auth.getProgramHeadEnrollmentEvaluation(enrollmentId);
            renderProgramHeadEvaluation(evaluation);
            if (typeof programHeadEvaluationDialog?.showModal === "function") programHeadEvaluationDialog.showModal();
            else programHeadEvaluationDialog?.setAttribute("open", "");
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (programHeadStatus) programHeadStatus.textContent = error.message || "The enrollment evaluation could not be loaded.";
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

        const offeringList = select("[data-program-head-offerings]");
        offeringList?.replaceChildren();
        for (const offering of dashboard?.courseOfferings || []) {
            const item = document.createElement("div"); item.className = "dashboard-list__item";
            const title = document.createElement("strong"); title.textContent = `${offering.offeringCode} · ${offering.subject.code} — ${offering.subject.title}`;
            const schedule = offering.schedules?.[0];
            const details = document.createElement("small");
            details.textContent = `${offering.academicTerm.name} · ${offering.classSection?.code || "No section"} · ${offering.faculty?.[0]?.name || "Instructor TBA"} · ${schedule ? `${humanize(schedule.weekday)} ${schedule.startsAt}–${schedule.endsAt}` : "Schedule TBA"}`;
            item.append(title, details); offeringList?.append(item);
        }
        if (!dashboard?.courseOfferings?.length) offeringList?.append(programHeadEmpty("No subject offerings have been opened for this program."));

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

    programHeadEvaluationForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = new FormData(programHeadEvaluationForm);
        const enrollmentId = String(values.get("enrollmentId") || "");
        const overrideItemIds = values.getAll("overrideItemIds").map(String);
        setBusy(programHeadEvaluationForm, true);
        try {
            const result = await auth.approveProgramHeadEnrollmentEvaluation(enrollmentId, {
                overrideItemIds,
                overrideReason: String(values.get("overrideReason") || "").trim()
            });
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
    const openProgramHeadApplication = async (id) => {
        try {
            programHeadApplicationReview = await auth.getProgramHeadEnrollmentApplication(id);
            const review = programHeadApplicationReview;
            setText("[data-program-head-application-title]", `${review.application.student.studentNumber} · ${review.application.student.name}`);
            const container = select("[data-program-head-application-detail]"); container.replaceChildren();
            const summary = document.createElement("p");
            summary.className = `program-head-evaluation-summary ${review.canApprove ? "is-clear" : "has-blockers"}`;
            summary.textContent = `${review.application.program.code} · ${review.application.academicTerm.academicYear.code} · ${review.application.academicTerm.name} · Year ${review.application.yearLevel} · ${review.curriculum ? `${review.curriculum.code} v${review.curriculum.version}` : "Curriculum unresolved"} · ${review.totalUnits}/${review.maximumUnits} units`;
            container.append(summary);
            for (const item of review.items) {
                const row = document.createElement("p"); row.className = "program-head-evaluation-item";
                row.textContent = `${item.subject.code} — ${item.subject.title} · ${item.creditUnits} units`; container.append(row);
            }
            for (const issue of review.issues) {
                const message = document.createElement("p"); message.className = "form-error"; message.textContent = issue.message; container.append(message);
            }
            programHeadApplicationDecision.reset();
            setText("[data-program-head-application-status]", review.canApprove ? "Academic checks passed." : "Resolve the academic issues or return the application for correction.");
            selectAll("button[type=submit]", programHeadApplicationDecision).forEach((button) => {
                button.disabled = review.application.status !== "SUBMITTED" || (button.value === "APPROVED" && !review.canApprove);
            });
            if (!programHeadApplicationDialog.open) programHeadApplicationDialog.showModal();
        } catch (error) {
            if (!handleExpiredSession(error) && programHeadStatus) programHeadStatus.textContent = error.message || "Application review could not be loaded.";
        }
    };
    programHeadApplicationDecision?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = event.submitter?.value;
        const id = programHeadApplicationReview?.application.id;
        if (!status || !id || programHeadApplicationDecision.getAttribute("aria-busy") === "true") return;
        const remarks = programHeadApplicationDecision.elements.remarks.value.trim();
        if (status !== "APPROVED" && !remarks) {
            setText("[data-program-head-application-status]", "Enter feedback before returning or rejecting this application.");
            programHeadApplicationDecision.elements.remarks.focus(); return;
        }
        setBusy(programHeadApplicationDecision, true);
        try {
            await auth.decideProgramHeadEnrollmentApplication(id, { status, remarks });
            programHeadApplicationDialog.close();
            await loadProgramHeadData();
            if (programHeadStatus) programHeadStatus.textContent = status === "APPROVED" ? "Application forwarded to Registrar verification." : "Decision saved and feedback sent to the student.";
        } catch (error) {
            if (!handleExpiredSession(error)) setText("[data-program-head-application-status]", error.message || "The decision could not be saved.");
        } finally {
            setBusy(programHeadApplicationDecision, false);
            const approve = select('button[value="APPROVED"]', programHeadApplicationDecision);
            if (approve) approve.disabled = !programHeadApplicationReview?.canApprove;
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
            empty.textContent = "No applications match this filter.";
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
            renderRegistrarApplications(state.registrarApplications);
            if (registrarApplicationsStatus) registrarApplicationsStatus.textContent = plural(state.registrarApplications.length, "application");
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (registrarApplicationsStatus) registrarApplicationsStatus.textContent = error.message || "Applications could not be loaded.";
        }
    };

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
            for (const item of enrollmentReview.items) {
                const field = document.createElement("div"); field.className = "field";
                const label = document.createElement("label"); label.textContent = `${item.subject.code} — ${item.subject.title} (${item.creditUnits} units)`;
                const input = document.createElement("select"); input.id = `section-${item.id}`; label.htmlFor = input.id;
                input.dataset.curriculumSubjectId = item.id; input.required = true;
                input.append(new Option("Choose a class section", ""));
                const choices = enrollmentReview.offeringChoices.filter((choice) => choice.subjectId === item.subjectId);
                for (const choice of choices) {
                    const option = new Option(`${choice.sectionCode} · ${choice.offeringCode}${choice.availableSeats == null ? "" : ` · ${choice.availableSeats} seats available`}`, choice.id);
                    option.disabled = !choice.available; input.append(option);
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
        syncProgramAssignment();
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
        empty.innerHTML = `<strong>No curriculum subjects available</strong><small>No active curriculum items match ${selectedProgram()?.code || "this program"} for Year ${selectedYearLevel()} in ${selectedAcademicTerm()?.name || "this term"}.</small>`;
        catalogContainer.append(empty);
        cartContainer.replaceChildren();
        updateSubjectCartSummary();
        return;
    }
    catalog.forEach((item) => {
        const card = document.createElement("article");
        const selected = selectedIds.has(item.id || item.subjectId);
        const requirements = item.requirements || item.prerequisites || [];
        const blockedPrerequisites = requirements.filter((requirement) => requirement.type !== "COREQUISITE" && !requirement.eligible);
        const pendingCorequisites = requirements.filter((requirement) => requirement.type === "COREQUISITE" && !requirement.eligible);
        card.className = `subject-card${selected ? " is-selected" : ""}`;
        const meta = document.createElement("div");
        meta.className = "subject-card__meta";
        meta.innerHTML = `<strong>${item.subjectCode} · ${item.subjectTitle}</strong><small>${Number(item.creditUnits || 0)} units · ${item.type || "REQUIRED"} · ${item.curriculumCode}</small>`;
        if (blockedPrerequisites.length) {
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
        meta.append(details);
        const button = document.createElement("button");
        button.type = "button";
        button.className = `subject-card__button${selected ? " subject-card__button--selected" : ""}`;
        button.dataset.subjectAction = selected ? "remove" : "add";
        button.dataset.subjectId = item.id || item.subjectId;
        button.disabled = selectedSubjectState.locked || Boolean(blockedPrerequisites.length && !selected);
        button.hidden = selectedSubjectState.locked;
        button.textContent = selected ? "Remove" : blockedPrerequisites.length ? "Prerequisite required" : "Add to cart";
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
            details.innerHTML = `<strong>${item.subjectCode} · ${item.subjectTitle}</strong><small>${Number(item.creditUnits || 0)} units · ${item.type || "REQUIRED"}</small>`;
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
        enrollmentInput("programId").value = application.programId || "";
        if (application.programId) updateYearLevelOptionsForProgram(application.programId);
        enrollmentInput("academicTermId").value = application.academicTermId || "";
        enrollmentInput("yearLevel").value = application.yearLevel || profile?.currentYearLevel || "";
        selectedSubjectState.items = (application.formData?.selection?.subjectIds || [])
            .map((subjectId) => (enrollmentOptions?.curriculumSubjects || []).find((item) => item.academicTermId === application.academicTermId && (item.subjectId === subjectId || item.id === subjectId)))
            .filter(Boolean);
    } else if (profile?.currentYearLevel) {
        enrollmentInput("yearLevel").value = profile.currentYearLevel;
    }
    setSubjectSelectionState();
};
const updateYearLevelOptionsForProgram = (programId) => {
    const yearSelect = enrollmentInput("yearLevel");
    if (!yearSelect) return;
    const prog = (enrollmentOptions?.programs || []).find((p) => p.id === programId);
    const maxYears = Number(prog?.durationYears || 4);
    const currentVal = yearSelect.value;
    yearSelect.replaceChildren(new Option("Select", ""));
    for (let year = 1; year <= maxYears; year += 1) {
        yearSelect.append(new Option(`Year ${year}`, String(year)));
    }
    if (currentVal && Number(currentVal) <= maxYears) {
        yearSelect.value = currentVal;
    } else {
        yearSelect.value = "1";
    }
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
        if (yearSelect) {
            yearSelect.replaceChildren(new Option("Select", ""));
            for (let year = 1; year <= Number(assignedProgram.durationYears || 0); year += 1) {
                yearSelect.append(new Option(`Year ${year}`, String(year)));
            }
            yearSelect.value = String(options?.studentContext?.currentYearLevel || "");
        }
    } else {
        if (yearSelect && !yearSelect.value) {
            yearSelect.replaceChildren(new Option("Select", ""));
            for (let year = 1; year <= 4; year += 1) {
                yearSelect.append(new Option(`Year ${year}`, String(year)));
            }
            yearSelect.value = "1";
        }
    }
    programSelect.dataset.enrollmentLocked = assignedProgram ? "true" : "false";
    yearSelect.dataset.enrollmentLocked = assignedProgram ? "true" : "false";
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

            // Allow replacement if document was returned for correction or is still pending
            if (["PENDING", "RETURNED_FOR_CORRECTION", "REJECTED"].includes(status)) {
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
        } else {
            detail.textContent = "Not submitted";

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

        item.append(header, detail, actions);
        documentsList.append(item);
    });

    // Show/hide hint based on completion
    const allUploaded = requiredTypes.every((dt) => studentDocuments.some((d) => d.documentTypeId === dt.id));
    if (documentsHint) documentsHint.hidden = allUploaded;
};

const handleDocumentUpload = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    const documentTypeId = input.dataset.documentTypeId;
    if (!file || !documentTypeId || !admissionApplication?.id) return;

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
    if (!file || !documentTypeId || !documentId || !admissionApplication?.id) return;

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
        if (typeof enrollmentDialog.showModal === "function") enrollmentDialog.showModal();
        else enrollmentDialog.setAttribute("open", "");
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
enrollmentInput("programId")?.addEventListener("change", (event) => {
    if (event.target.value) {
        updateYearLevelOptionsForProgram(event.target.value);
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
const escapeHtml = (unsafe) => (unsafe || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const systemLogsTable = select("[data-system-logs-table]");
const systemLogsBody = select("[data-system-logs-body]");
const systemLogsStatus = select("[data-system-logs-status]");
const logSeverityFilter = select("[data-log-filter]");
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

        const { data } = await auth.getSystemLogs(options);
        state.systemLogs = data.entries || [];
        renderSystemLogs();
        systemLogsStatus.hidden = true;
        systemLogsTable.hidden = false;
    } catch (error) {
        if (handleExpiredSession(error)) return;
        systemLogsStatus.textContent = "Failed to load system logs.";
    }
};

const renderSystemLogs = () => {
    if (!systemLogsBody) return;
    systemLogsBody.innerHTML = "";
    
    if (!state.systemLogs || state.systemLogs.length === 0) {
        systemLogsBody.insertAdjacentHTML("beforeend", `<tr><td colspan="6" class="empty-state">No system logs found.</td></tr>`);
        return;
    }
    
    for (const log of state.systemLogs) {
        const tr = document.createElement("tr");
        
        const dateStr = new Date(log.createdAt).toLocaleString();
        
        const severityMap = { INFO: "status-pill--info", WARNING: "status-pill--warning", HIGH: "status-pill--high", CRITICAL: "status-pill--critical" };
        const severityBadge = "status-pill " + (severityMap[log.severity] || "");

        tr.innerHTML = `
            <td>
                <small>${log.errorId || log.id}</small><br/>
                <span class="muted">${dateStr}</span>
            </td>
            <td><span class="${severityBadge}">${log.severity}</span></td>
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
                <select data-log-id="${log.id}" class="status-select">
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

logSeverityFilter?.addEventListener("change", loadSystemLogs);
refreshLogsBtn?.addEventListener("click", () => {
    void Promise.allSettled([loadSystemLogs(), loadMonitoringHealth()]);
});

// Hook into existing load routine
const originalLoadUsers = loadUsers;
loadUsers = async () => {
    await Promise.allSettled([originalLoadUsers(), loadSystemLogs(), loadMonitoringHealth()]);
};

void bootstrap();
})();
