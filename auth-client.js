(() => {
    "use strict";

    const API_ROOT = "/api/v1";
    let csrfToken = "";

    class AuthApiError extends Error {
        constructor(message, options = {}) {
            super(message || "The request could not be completed.");
            this.name = "AuthApiError";
            this.status = options.status || 0;
            this.code = options.code || "REQUEST_FAILED";
            this.details = options.details || null;
            this.retryAfter = options.retryAfter || null;
        }
    }

    const readJson = async (response) => {
        if (response.status === 204) return {};
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return {};
        try {
            return await response.json();
        } catch {
            return {};
        }
    };

    const updateCsrf = (payload) => {
        const nextToken = payload?.data?.csrfToken || payload?.csrfToken;
        if (typeof nextToken === "string" && nextToken) csrfToken = nextToken;
    };

    const request = async (path, options = {}) => {
        const method = (options.method || "GET").toUpperCase();
        const headers = new Headers({ Accept: "application/json" });
        // Merge any custom headers passed in options
        if (options.headers instanceof Headers) {
            options.headers.forEach((value, key) => headers.set(key, value));
        } else if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => headers.set(key, value));
        }
        const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method);
        const isFormData = options.body instanceof FormData;

        if (!isFormData && options.body !== undefined) headers.set("Content-Type", "application/json");
        if (unsafe && csrfToken) headers.set("X-CSRF-Token", csrfToken);

        let response;
        try {
            response = await fetch(`${API_ROOT}${path}`, {
                method,
                headers,
                credentials: "same-origin",
                cache: "no-store",
                body: isFormData ? options.body : (options.body === undefined ? undefined : JSON.stringify(options.body)),
                signal: options.signal,
            });
        } catch (error) {
            if (error?.name === "AbortError") throw error;
            throw new AuthApiError("Unable to reach the portal. Check your connection and try again.", {
                code: "NETWORK_ERROR",
            });
        }

        const payload = await readJson(response);
        updateCsrf(payload);

        if (!response.ok || payload?.ok === false || payload?.error) {
            const serverError = payload?.error || {};
            if (String(serverError.code || "").includes("CSRF")) csrfToken = "";
            throw new AuthApiError(serverError.message || "The request could not be completed.", {
                status: response.status,
                code: serverError.code || `HTTP_${response.status}`,
                details: serverError.details || serverError.fieldErrors || null,
                retryAfter: response.headers.get("Retry-After"),
            });
        }

        return payload?.data ?? payload ?? {};
    };

    const getCsrf = async (options = {}) => {
        const data = await request("/auth/csrf", options);
        if (typeof data.csrfToken === "string") csrfToken = data.csrfToken;
        return data;
    };

    const ensureCsrf = async (options = {}) => {
        if (!csrfToken) await getCsrf(options);
    };

    const mutate = async (path, method, body, options = {}) => {
        await ensureCsrf(options);
        const headers = new Headers({ Accept: "application/json" });
        if (body instanceof FormData) {
            // Let browser set Content-Type with boundary for FormData
            return request(path, { ...options, method, body, headers });
        }
        return request(path, { ...options, method, body });
    };

    const safeLandingPath = (candidate, fallback = "/portal.html") => {
        if (typeof candidate !== "string" || !candidate.startsWith("/") || candidate.startsWith("//")) {
            return fallback;
        }
        try {
            const url = new URL(candidate, window.location.origin);
            return url.origin === window.location.origin
                ? `${url.pathname}${url.search}${url.hash}`
                : fallback;
        } catch {
            return fallback;
        }
    };

    const api = {
        AuthApiError,
        getCsrf,
        getAdmissionPrograms: (options = {}) => request("/admission/programs", options),
        registerStudent: (data, options = {}) => mutate("/admission/register", "POST", data, options),
        getSession: async (options = {}) => {
            const data = await request("/auth/session", options);
            if (typeof data.csrfToken === "string") csrfToken = data.csrfToken;
            return data;
        },
        login: (identifier, password, remember, options = {}) =>
            mutate("/auth/login", "POST", { identifier, password, remember: Boolean(remember) }, options),
        logout: (options = {}) => mutate("/auth/logout", "POST", {}, options),
        forgotPassword: (identifier, options = {}) =>
            mutate("/auth/forgot-password", "POST", { identifier }, options),
        resetPassword: (token, newPassword, options = {}) =>
            mutate("/auth/reset-password", "POST", { token, newPassword }, options),
        changePassword: (currentPassword, newPassword, options = {}) =>
            mutate("/auth/change-password", "POST", { currentPassword, newPassword }, options),
        getStudentDashboard: (options = {}) => request("/student/dashboard", options),
        getEnrollmentOptions: (options = {}) => request("/student/enrollment/options", options),
        getEnrollmentApplication: (options = {}) => request("/student/enrollment", options),
        saveEnrollmentApplication: (data, options = {}) => mutate("/student/enrollment", "PUT", data, options),
        submitEnrollmentApplication: (data, options = {}) => mutate("/student/enrollment/submit", "POST", data, options),
        getRegistrarDashboard: (options = {}) => request("/registrar/dashboard", options),
        getRegistrarApplications: (status = "", options = {}) => {
            const query = status ? `?status=${encodeURIComponent(status)}` : "";
            return request(`/registrar/applications${query}`, options);
        },
        getRegistrarApplicationReview: (id, options = {}) => request(`/registrar/applications/${encodeURIComponent(id)}`, options),
        reviewRegistrarApplication: (id, status, decisionNotes, options = {}) => {
            const { sectionAssignments, ...requestOptions } = options;
            return mutate(`/registrar/applications/${encodeURIComponent(id)}`, "PATCH", { status, decisionNotes, sectionAssignments }, requestOptions);
        },
        reviewRegistrarDocument: (id, status, remarks, options = {}) => mutate(`/registrar/documents/${encodeURIComponent(id)}`, "PATCH", { status, remarks }, options),
        createRegistrarAcademicYear: (data, options = {}) => mutate("/registrar/academic-years", "POST", data, options),
        createRegistrarAcademicTerm: (data, options = {}) => mutate("/registrar/academic-terms", "POST", data, options),
        openRegistrarEnrollment: (academicTermId, options = {}) => mutate("/registrar/enrollment-period/open", "POST", { academicTermId }, options),
        closeRegistrarEnrollment: (periodId, options = {}) => mutate("/registrar/enrollment-period/close", "POST", { periodId }, options),
        getProgramHeadDashboard: async (options = {}) => {
            const data = await request("/program-head/dashboard", options);
            return data.dashboard;
        },
        getProgramHeadSubjects: (query = "", options = {}) => {
            const suffix = query ? `?query=${encodeURIComponent(query)}` : "";
            return request(`/program-head/subjects${suffix}`, options);
        },
        getProgramHeadEnrollmentApplications: (options = {}) => request("/program-head/enrollment-applications", options),
        getProgramHeadEnrollmentApplication: async (id, options = {}) => {
            const data = await request(`/program-head/enrollment-applications/${encodeURIComponent(id)}`, options);
            return data.review;
        },
        decideProgramHeadEnrollmentApplication: (id, data, options = {}) => mutate(`/program-head/enrollment-applications/${encodeURIComponent(id)}`, "PATCH", data, options),
        getProgramHeadStudent: async (studentId, options = {}) => {
            const data = await request(`/program-head/students/${encodeURIComponent(studentId)}`, options);
            return data.student;
        },
        createProgramHeadCurriculum: (data, options = {}) => mutate("/program-head/curricula", "POST", data, options),
        addProgramHeadCurriculumSubject: (curriculumId, data, options = {}) => mutate(`/program-head/curricula/${encodeURIComponent(curriculumId)}/subjects`, "POST", data, options),
        createProgramHeadOffering: (data, options = {}) => mutate("/program-head/offerings", "POST", data, options),
        getProgramHeadEnrollmentEvaluation: async (enrollmentId, options = {}) => {
            const data = await request(`/program-head/enrollments/${encodeURIComponent(enrollmentId)}/evaluation`, options);
            return data.evaluation;
        },
        approveProgramHeadEnrollmentEvaluation: (enrollmentId, data, options = {}) => mutate(`/program-head/enrollments/${encodeURIComponent(enrollmentId)}/evaluation/approve`, "POST", data, options),
        getStudentProfile: (options = {}) => request("/student/profile", options),
        updateStudentProfile: (data, options = {}) => mutate("/student/profile", "PATCH", data, options),
        getRequestTypes: (options = {}) => request("/student/request-types", options),
        getStudentRequests: (options = {}) => request("/student/requests", options),
        submitStudentRequest: (data, options = {}) => mutate("/student/requests", "POST", data, options),
        getFinancialObligations: (academicTermId, options = {}) => {
            const params = new URLSearchParams();
            if (academicTermId) params.set('academicTermId', academicTermId);
            const query = params.toString() ? `?${params.toString()}` : '';
            return request(`/financial/obligations${query}`, options);
        },
        getFinancialSummary: (academicTermId, options = {}) => {
            const params = new URLSearchParams();
            if (academicTermId) params.set('academicTermId', academicTermId);
            const query = params.toString() ? `?${params.toString()}` : '';
            return request(`/financial/summary${query}`, options);
        },
        initiateFinancialPayment: (obligationId, paymentMethod = "ONLINE", options = {}) =>
            mutate("/financial/payments/initiate", "POST", { obligationId, paymentMethod }, options),
        processFinancialPayment: (transactionId, options = {}) =>
            mutate(`/financial/payments/${encodeURIComponent(transactionId)}/process`, "POST", {}, options),
        getObligationPayments: (obligationId, options = {}) =>
            request(`/financial/obligations/${encodeURIComponent(obligationId)}/payments`, options),
        getFinancialReceipts: (options = {}) => request("/financial/receipts", options),
        getRoles: (options = {}) => request("/admin/roles", options),
        getAdminPrograms: (options = {}) => request("/admin/programs", options),
        getUsers: (options = {}) => request("/admin/users", options),
        createUser: (account, options = {}) => mutate("/admin/users", "POST", account, options),
        updateUserStatus: (userId, status, options = {}) =>
            mutate(`/admin/users/${encodeURIComponent(userId)}/status`, "PATCH", { status }, options),
        updateUserRoles: (userId, roles, primaryRole, options = {}) =>
            mutate(`/admin/users/${encodeURIComponent(userId)}/roles`, "PUT", {
                roles,
                primaryRole,
            }, options),
        deleteUser: (userId, options = {}) => mutate(`/admin/users/${encodeURIComponent(userId)}`, "DELETE", {}, options),
        getDocumentTypes: (options = {}) => request("/student/documents/types", options),
        getStudentDocuments: (options = {}) => request("/student/documents", options),
        uploadStudentDocument: (documentTypeId, applicationId, file, options = {}) => {
            const formData = new FormData();
            formData.append("documentTypeId", documentTypeId);
            formData.append("applicationId", applicationId);
            formData.append("file", file);
            return mutate("/student/documents/upload", "POST", formData, { ...options, body: formData });
        },
        deleteStudentDocument: (id, options = {}) => mutate(`/student/documents/${encodeURIComponent(id)}`, "DELETE", {}, options),
        viewStudentDocument: (id, options = {}) => request(`/student/documents/${encodeURIComponent(id)}/view`, options),
        
        getSystemLogs: (options = {}) => {
            const query = new URLSearchParams();
            if (options.limit) query.set("limit", options.limit);
            if (options.severity) query.set("severity", options.severity);
            if (options.status) query.set("status", options.status);
            return request(`/admin/system-logs?${query.toString()}`, options);
        },
        updateSystemLogStatus: (id, status, options = {}) => mutate(`/admin/system-logs/${encodeURIComponent(id)}/status`, "PATCH", { status }, options),
        getMonitoringHealth: (options = {}) => request("/admin/monitoring/health", options),

        safeLandingPath,
        clearCsrf: () => {
            csrfToken = "";
        },
    };

    Object.defineProperty(window, "CJCAuth", {
        value: Object.freeze(api),
        configurable: false,
        writable: false,
    });
})();
