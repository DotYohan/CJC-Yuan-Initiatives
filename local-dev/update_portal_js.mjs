import fs from "fs";

const jsPath = "portal.js";
let js = fs.readFileSync(jsPath, "utf8");

// 1. Add 'ssc' to accountCreationRoleSlugs
js = js.replace(
    'const accountCreationRoleSlugs = new Set(["administrator", "registrar", "program_head", "cashier", "student", "student_assistant"]);',
    'const accountCreationRoleSlugs = new Set(["administrator", "registrar", "program_head", "cashier", "student", "student_assistant", "ssc"]);'
);

// 2. Add roleNames for ssc and club
js = js.replace(
    'student_assistant: "Student Assistant",',
    'student_assistant: "Student Assistant",\n        ssc: "Student Services Center",\n        club: "Club Account",'
);

// 3. Add isSsc and isClub helpers
js = js.replace(
    'const isStudentAssistant = () => state.roles.includes("student_assistant");',
    'const isStudentAssistant = () => state.roles.includes("student_assistant");\n    const isSsc = () => state.roles.includes("ssc");\n    const isClub = () => state.roles.includes("club");'
);

// 4. Add state properties
const stateTarget = `        selectedSaApplicationId: null,
        currentSaDetail: null,
    };`;

const stateReplacement = `        selectedSaApplicationId: null,
        currentSaDetail: null,
        sscLoaded: false,
        sscClubs: [],
        sscCurrentFilter: "ALL",
        clubLoaded: false,
        clubDashboard: null,
        studentClubsLoaded: false,
        studentAvailableClubs: [],
        studentMyClubs: [],
        studentActiveClubPortal: null,
    };`;

js = js.replace(stateTarget, stateReplacement);

// 5. Add DOM selectors
const selectorTarget = `    const refreshStudentAssistantBtn = select("[data-refresh-student-assistant]");`;
const selectorAdditions = `    const refreshStudentAssistantBtn = select("[data-refresh-student-assistant]");

    // SSC DOM Elements
    const sscPanel = select("[data-ssc-panel]");
    const sscTotalClubs = select("[data-ssc-total-clubs]");
    const sscActiveClubs = select("[data-ssc-active-clubs]");
    const sscInactiveClubs = select("[data-ssc-inactive-clubs]");
    const sscExpiredClubs = select("[data-ssc-expired-clubs]");
    const sscClubsTable = select("[data-ssc-clubs-table]");
    const sscClubsBody = select("[data-ssc-clubs-body]");
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

    // Student Clubs DOM Elements
    const studentActiveClubsCount = select("[data-student-active-clubs-count]");
    const refreshStudentClubsBtn = select("[data-refresh-student-clubs]");
    const studentMyClubsBody = select("[data-student-my-clubs-body]");
    const studentAvailableClubsGrid = select("[data-student-available-clubs-grid]");
    const studentClubPortalDialog = select("[data-student-club-portal-dialog]");
    const portalClubName = select("[data-portal-club-name]");
    const portalCategoryLabel = select("[data-portal-category-label]");
    const portalClubLead = select("[data-portal-club-lead]");
    const portalClubStatus = select("[data-portal-club-status]");
    const portalRolePill = select("[data-portal-role-pill]");
    const portalExpiredBanner = select("[data-portal-expired-banner]");
    const portalAnnouncementsFeed = select("[data-portal-announcements-feed]");
    const portalDocsBody = select("[data-portal-docs-body]");
    const portalOfficersBody = select("[data-portal-officers-body]");
    const portalMyClearancePill = select("[data-portal-my-clearance-pill]");
    const portalMyClearanceDate = select("[data-portal-my-clearance-date]");
    const portalMyClearanceBy = select("[data-portal-my-clearance-by]");
    const portalMyClearanceRemarks = select("[data-portal-my-clearance-remarks]");
    const portalEvalTab = select("[data-portal-eval-tab]");
    const portalEvalBody = select("[data-portal-eval-body]");
    const evalActionDialog = select("[data-eval-action-dialog]");
    const evalActionForm = select("[data-eval-action-form]");
    const evalActionError = select("[data-eval-action-error]");
    const evalFormTargetName = select("#eval-form-target-name");
    const evalFormClubId = select("#eval-form-club-id");
    const evalFormTargetId = select("#eval-form-target-id");
    const evalFormStatus = select("#eval-form-status");
    const evalFormRemarks = select("#eval-form-remarks");`;

js = js.replace(selectorTarget, selectorAdditions);

// 6. Update renderWorkspace to show sscPanel and clubPanel
const renderWorkspaceTarget = `        const canManageFaculty = isFaculty() && !required;
        const canManageStudentAssistant = isStudentAssistant() && !required;
        adminPanel.hidden = !canManageAccounts;`;

const renderWorkspaceReplacement = `        const canManageFaculty = isFaculty() && !required;
        const canManageStudentAssistant = isStudentAssistant() && !required;
        const canManageSsc = isSsc() && !required;
        const canManageClub = isClub() && !required;
        adminPanel.hidden = !canManageAccounts;
        if (sscPanel) sscPanel.hidden = !canManageSsc;
        if (clubPanel) clubPanel.hidden = !canManageClub;`;

js = js.replace(renderWorkspaceTarget, renderWorkspaceReplacement);

const loadDataTarget = `        if (canManageStudentAssistant && !state.studentAssistantLoaded) {
            state.studentAssistantLoaded = true;
            void loadStudentAssistantData();
        }`;

const loadDataReplacement = `        if (canManageStudentAssistant && !state.studentAssistantLoaded) {
            state.studentAssistantLoaded = true;
            void loadStudentAssistantData();
        }
        if (canManageSsc && !state.sscLoaded) {
            state.sscLoaded = true;
            void loadSscData();
        }
        if (canManageClub && !state.clubLoaded) {
            state.clubLoaded = true;
            void loadClubData();
        }`;

js = js.replace(loadDataTarget, loadDataReplacement);

// 7. Update tab switchers
js = js.replace(
    'const switchStudentTab = initWorkspaceTabs("data-student-nav", "data-student-view");',
    `const switchStudentTab = initWorkspaceTabs("data-student-nav", "data-student-view", (view) => {
        if (view === "clubs") void loadStudentClubs();
    });
    const switchClubTab = initWorkspaceTabs("data-club-nav", "data-club-view");
    const switchStudentPortalTab = initWorkspaceTabs("data-portal-nav", "data-portal-view");`
);

// 8. Add full SSC, Club, and Student Club logic before bootstrap()
const bootstrapTarget = `    void bootstrap();
})();`;

const moduleLogic = `
    // ==========================================================================
    // STUDENT SERVICES CENTER (SSC) WORKSPACE LOGIC
    // ==========================================================================

    const loadSscData = async () => {
        if (!isSsc() || needsPasswordChange()) return;
        try {
            const clubs = await auth.getSscClubs("ALL");
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
        } catch (error) {
            if (handleExpiredSession(error)) return;
            console.error("Failed to load SSC club data:", error);
        }
    };

    const renderSscClubs = () => {
        if (!sscClubsBody) return;
        sscClubsBody.replaceChildren();

        const filter = state.sscCurrentFilter;
        let clubs = state.sscClubs;
        if (filter !== "ALL") {
            clubs = clubs.filter((c) => c.status === filter);
        }

        if (!clubs.length) {
            const tr = document.createElement("tr");
            tr.innerHTML = \`<td colspan="8" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No \${filter === "ALL" ? "" : filter.toLowerCase() + " "}clubs found.</td>\`;
            sscClubsBody.append(tr);
            return;
        }

        clubs.forEach((club) => {
            const tr = document.createElement("tr");
            const startFmt = club.effectiveStartDate ? new Date(club.effectiveStartDate).toLocaleDateString() : "—";
            const endFmt = club.effectiveEndDate ? new Date(club.effectiveEndDate).toLocaleDateString() : "—";
            const statusClass = club.status === "ACTIVE" ? "status-pill--active" : club.status === "EXPIRED" ? "status-pill--expired" : "status-pill--inactive";

            tr.innerHTML = \`
                <td><strong>\${club.code}</strong></td>
                <td>\${club.name}</td>
                <td><span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">\${humanize(club.category)}</span></td>
                <td>\${club.account?.username || "—"}</td>
                <td>\${startFmt}</td>
                <td>\${endFmt}</td>
                <td><span class="status-pill \${statusClass}">\${club.status}</span></td>
                <td>
                    <div style="display: flex; gap: 0.35rem; align-items: center;">
                        <button class="button button--quiet button--compact" type="button" data-ssc-toggle-status="\${club.id}" data-current-status="\${club.status}">
                            \${club.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                        <button class="button button--outline button--compact" type="button" data-ssc-edit-dates="\${club.id}">
                            Edit Dates
                        </button>
                    </div>
                </td>
            \`;
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
                } catch (error) {
                    alert(error.message || "Failed to update club status.");
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
                select("#edit-dates-start").value = club.effectiveStartDate ? club.effectiveStartDate.slice(0, 10) : "";
                select("#edit-dates-end").value = club.effectiveEndDate ? club.effectiveEndDate.slice(0, 10) : "";
                if (sscDatesError) sscDatesError.hidden = true;
                sscEditDatesDialog.showModal();
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

    // SSC Create Club Dialog
    openCreateClubBtn?.addEventListener("click", () => {
        if (!sscCreateClubDialog) return;
        sscCreateClubForm?.reset();
        if (sscCreateError) sscCreateError.hidden = true;
        sscCreateClubDialog.showModal();
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
            accountUsername: String(formData.get("accountUsername") || "").trim(),
            accountPassword: String(formData.get("accountPassword") || ""),
            effectiveStartDate: String(formData.get("effectiveStartDate") || ""),
            effectiveEndDate: String(formData.get("effectiveEndDate") || "")
        };

        const submitBtn = select("[data-ssc-submit-create]", sscCreateClubForm);
        try {
            if (submitBtn) submitBtn.disabled = true;
            if (sscCreateError) sscCreateError.hidden = true;
            await auth.createSscClub(clubData);
            sscCreateClubDialog?.close();
            alert(\`Club "\${clubData.name}" (\${clubData.code}) chartered successfully!\`);
            await loadSscData();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (sscCreateError) {
                sscCreateError.textContent = error.message || "Failed to create club.";
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
            alert("Club effectivity dates updated successfully!");
            await loadSscData();
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
            if (clubHeaderName) clubHeaderName.textContent = \`\${dashboard.club.name} (\${dashboard.club.code})\`;
            if (clubHeaderCategory) clubHeaderCategory.textContent = \`\${humanize(dashboard.club.category)} Organization\`;
            const startFmt = dashboard.club.effectiveStartDate ? new Date(dashboard.club.effectiveStartDate).toLocaleDateString() : "—";
            const endFmt = dashboard.club.effectiveEndDate ? new Date(dashboard.club.effectiveEndDate).toLocaleDateString() : "—";
            if (clubHeaderLead) clubHeaderLead.textContent = \`Effectivity: \${startFmt} to \${endFmt} | Description: \${dashboard.club.description || "Active student organization."}\`;
            if (clubHeaderStatus) {
                clubHeaderStatus.textContent = dashboard.club.status;
                clubHeaderStatus.className = \`status-pill \${dashboard.club.status === "ACTIVE" ? "status-pill--active" : "status-pill--inactive"}\`;
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

    const renderClubOfficers = (officers) => {
        if (!clubOfficersBody) return;
        clubOfficersBody.replaceChildren();

        if (!officers.length) {
            const tr = document.createElement("tr");
            tr.innerHTML = '<td colspan="5" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No officers appointed yet. Use the form above to assign officers.</td>';
            clubOfficersBody.append(tr);
            return;
        }

        officers.forEach((officer) => {
            const tr = document.createElement("tr");
            const authBadge = officer.canClearClearance
                ? '<span class="club-badge club-badge--authority">Clearance Officer (Authorized)</span>'
                : '<span class="club-badge club-badge--none">Standard Officer</span>';

            tr.innerHTML = \`
                <td><strong>\${officer.student?.studentIdNumber || "—"}</strong></td>
                <td>\${officer.student?.fullName || "—"}</td>
                <td>\${officer.position}</td>
                <td>\${authBadge}</td>
                <td>
                    <div style="display: flex; gap: 0.35rem;">
                        <button class="button button--quiet button--compact" type="button" data-toggle-officer-auth="\${officer.id}" data-current-auth="\${officer.canClearClearance}">
                            \${officer.canClearClearance ? "Revoke Auth" : "Grant Auth"}
                        </button>
                        <button class="button button--outline button--compact" type="button" data-remove-officer="\${officer.id}">
                            Remove
                        </button>
                    </div>
                </td>
            \`;
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

    const renderClubMembers = (members, summary) => {
        if (!clubMembersBody) return;
        clubMembersBody.replaceChildren();

        if (clubClearedCount) clubClearedCount.textContent = summary.clearedMembers || 0;
        if (clubTotalMembersCount) clubTotalMembersCount.textContent = summary.totalMembers || 0;

        if (!members.length) {
            const tr = document.createElement("tr");
            tr.innerHTML = '<td colspan="8" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No enrolled members yet.</td>';
            clubMembersBody.append(tr);
            return;
        }

        members.forEach((member) => {
            const tr = document.createElement("tr");
            const clearanceStatus = member.clearance?.status || "PENDING";
            const pillClass = clearanceStatus === "CLEARED" ? "status-pill--active" : "status-pill--pending";
            const clearedAt = member.clearance?.clearedAt ? new Date(member.clearance.clearedAt).toLocaleString() : "—";
            const clearedBy = member.clearance?.clearedByOfficer?.fullName || "—";
            const remarks = member.clearance?.remarks || "—";

            tr.innerHTML = \`
                <td><strong>\${member.student?.studentIdNumber || "—"}</strong></td>
                <td>\${member.student?.fullName || "—"}</td>
                <td>\${member.student?.program?.code || "—"} - Yr \${member.student?.yearLevel || "—"}</td>
                <td>\${member.role === "OFFICER" ? "<strong>Officer</strong>" : "Member"}</td>
                <td><span class="status-pill \${pillClass}">\${clearanceStatus}</span></td>
                <td>\${clearedAt}</td>
                <td>\${clearedBy}</td>
                <td><small>\${remarks}</small></td>
            \`;
            clubMembersBody.append(tr);
        });
    };

    const renderClubAnnouncements = (announcements) => {
        if (!clubAnnouncementsList) return;
        clubAnnouncementsList.replaceChildren();

        if (!announcements.length) {
            clubAnnouncementsList.innerHTML = '<div class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No announcements published yet.</div>';
            return;
        }

        announcements.forEach((item) => {
            const card = document.createElement("div");
            card.className = \`announcement-card \${item.isPriority ? "is-priority" : ""}\`;
            const dateFmt = new Date(item.publishedAt).toLocaleDateString();

            card.innerHTML = \`
                <div class="announcement-card__meta">
                    <span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">\${humanize(item.category)}</span>
                    <span>\${dateFmt} • By \${item.authorName}</span>
                </div>
                <h4 class="announcement-card__title">\${item.isPriority ? "🔴 " : ""}\${item.title}</h4>
                <p class="announcement-card__content">\${item.content}</p>
                <div style="margin-top: 0.5rem; display: flex; justify-content: flex-end;">
                    <button class="button button--quiet button--compact" type="button" data-delete-announcement="\${item.id}" style="color: var(--danger);">
                        Delete
                    </button>
                </div>
            \`;
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

    const renderClubDocuments = (documents) => {
        if (!clubDocumentsBody) return;
        clubDocumentsBody.replaceChildren();

        if (!documents.length) {
            const tr = document.createElement("tr");
            tr.innerHTML = '<td colspan="6" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No documents archived yet.</td>';
            clubDocumentsBody.append(tr);
            return;
        }

        documents.forEach((doc) => {
            const tr = document.createElement("tr");
            const dateFmt = new Date(doc.uploadedAt).toLocaleDateString();

            tr.innerHTML = \`
                <td><span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">\${humanize(doc.category)}</span></td>
                <td><strong>\${doc.title}</strong></td>
                <td>\${doc.referenceNo || "—"}</td>
                <td>\${doc.uploadedBy?.displayName || "Club Admin"}</td>
                <td>\${dateFmt}</td>
                <td>
                    <div style="display: flex; gap: 0.35rem;">
                        <a class="button button--outline button--compact" href="\${doc.fileUrl}" target="_blank" rel="noopener noreferrer">View</a>
                        <button class="button button--quiet button--compact" type="button" data-delete-document="\${doc.id}" style="color: var(--danger);">Delete</button>
                    </div>
                </td>
            \`;
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

    // Officer Student ID verification
    verifyOfficerBtn?.addEventListener("click", async () => {
        const input = select("#officer-student-id");
        const studentId = input?.value.trim();
        if (!studentId) {
            if (officerVerifyResult) {
                officerVerifyResult.textContent = "Please enter a Student ID number.";
                officerVerifyResult.style.color = "var(--danger)";
            }
            return;
        }

        try {
            verifyOfficerBtn.disabled = true;
            if (officerVerifyResult) officerVerifyResult.textContent = "Verifying student…";
            const result = await auth.validateClubStudent(studentId);
            if (officerVerifyResult) {
                officerVerifyResult.textContent = \`Verified: \${result.fullName} (\${result.programCode || "N/A"} - Yr \${result.yearLevel || "N/A"})\`;
                officerVerifyResult.style.color = "var(--success)";
            }
        } catch (error) {
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
        const data = {
            studentIdNumber: String(formData.get("studentIdNumber") || "").trim(),
            position: String(formData.get("position") || "").trim(),
            canClearClearance: formData.get("canClearClearance") === "on"
        };

        const submitBtn = select("[data-submit-officer-btn]", assignOfficerForm);
        try {
            if (submitBtn) submitBtn.disabled = true;
            if (officerError) officerError.hidden = true;
            await auth.assignClubOfficer(data);
            assignOfficerForm.reset();
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
            category: String(formData.get("category") || "GENERAL"),
            content: String(formData.get("content") || "").trim(),
            isPriority: formData.get("isPriority") === "on"
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
            referenceNo: String(formData.get("referenceNo") || "").trim() || undefined,
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

    // ==========================================================================
    // STUDENT CLUBS EXPERIENCE LOGIC
    // ==========================================================================

    const loadStudentClubs = async () => {
        if (!isStudentWorkspace() || needsPasswordChange()) return;
        try {
            const [available, myClubs] = await Promise.all([
                auth.getStudentAvailableClubs(),
                auth.getStudentMyClubs()
            ]);
            state.studentAvailableClubs = Array.isArray(available) ? available : [];
            state.studentMyClubs = Array.isArray(myClubs) ? myClubs : [];

            // Update active membership badge
            const activeCount = state.studentMyClubs.filter((m) => m.club?.status === "ACTIVE").length;
            if (studentActiveClubsCount) studentActiveClubsCount.textContent = activeCount;

            renderStudentMyClubs();
            renderStudentAvailableClubs(activeCount);
        } catch (error) {
            if (handleExpiredSession(error)) return;
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
            const club = item.club;
            const clearanceStatus = item.clearance?.status || "PENDING";
            const clrClass = clearanceStatus === "CLEARED" ? "status-pill--active" : "status-pill--pending";
            const clubStatusClass = club.status === "ACTIVE" ? "status-pill--active" : club.status === "EXPIRED" ? "status-pill--expired" : "status-pill--inactive";
            const roleLabel = item.role === "OFFICER" ? \`<strong>Officer: \${item.officer?.position || "Leader"}</strong>\` : "Member";

            tr.innerHTML = \`
                <td><strong>\${club.code}</strong></td>
                <td>\${club.name}</td>
                <td><span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">\${humanize(club.category)}</span></td>
                <td>\${roleLabel}</td>
                <td><span class="status-pill \${clrClass}">\${clearanceStatus}</span></td>
                <td><span class="status-pill \${clubStatusClass}">\${club.status}</span></td>
                <td>
                    <button class="button button--primary button--compact" type="button" data-open-club-portal="\${club.id}">
                        Open Portal
                    </button>
                </td>
            \`;
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
        const joinedClubIds = new Set(state.studentMyClubs.map((m) => m.clubId));

        if (!state.studentAvailableClubs.length) {
            studentAvailableClubsGrid.innerHTML = '<div class="empty-cell" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--muted);">No clubs are currently open for enrollment.</div>';
            return;
        }

        state.studentAvailableClubs.forEach((club) => {
            const card = document.createElement("div");
            card.className = "club-card";
            const isJoined = joinedClubIds.has(club.id);
            const startFmt = club.effectiveStartDate ? new Date(club.effectiveStartDate).toLocaleDateString() : "";
            const endFmt = club.effectiveEndDate ? new Date(club.effectiveEndDate).toLocaleDateString() : "";

            let actionHtml = "";
            if (isJoined) {
                actionHtml = '<span class="status-pill status-pill--active">Enrolled Member</span>';
            } else if (maxReached) {
                actionHtml = '<button class="button button--outline button--compact" type="button" disabled title="Maximum 3 active clubs reached">Limit Reached (3/3)</button>';
            } else {
                actionHtml = \`<button class="button button--primary button--compact" type="button" data-student-join-club="\${club.id}">Join Club</button>\`;
            }

            card.innerHTML = \`
                <div>
                    <div class="club-card__header">
                        <span class="club-card__category">\${humanize(club.category)}</span>
                        <span class="status-pill status-pill--active">ACTIVE</span>
                    </div>
                    <div style="font-weight: 700; font-size: 0.88rem; color: var(--red-900);">\${club.code}</div>
                    <h4 class="club-card__title">\${club.name}</h4>
                    <p class="club-card__description">\${club.description || "Active student organization and community."}</p>
                </div>
                <div class="club-card__footer">
                    <div class="club-card__effectivity">Term: \${startFmt} – \${endFmt}</div>
                    \${actionHtml}
                </div>
            \`;
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
                } catch (error) {
                    alert(error.message || "Failed to join club.");
                    btn.disabled = false;
                }
            });
        });
    };

    refreshStudentClubsBtn?.addEventListener("click", () => void loadStudentClubs());

    // Dynamic Student Club Portal Modal
    const openStudentClubPortal = async (clubId) => {
        try {
            const portal = await auth.getStudentClubPortal(clubId);
            state.studentActiveClubPortal = portal;

            // Render Header
            if (portalClubName) portalClubName.textContent = \`\${portal.club.name} (\${portal.club.code})\`;
            if (portalCategoryLabel) portalCategoryLabel.textContent = \`\${humanize(portal.club.category)} Organization\`;
            const startFmt = portal.club.effectiveStartDate ? new Date(portal.club.effectiveStartDate).toLocaleDateString() : "";
            const endFmt = portal.club.effectiveEndDate ? new Date(portal.club.effectiveEndDate).toLocaleDateString() : "";
            if (portalClubLead) portalClubLead.textContent = \`Term: \${startFmt} – \${endFmt} • \${portal.club.description || ""}\`;
            if (portalClubStatus) {
                portalClubStatus.textContent = portal.club.status;
                portalClubStatus.className = \`status-pill \${portal.club.status === "ACTIVE" ? "status-pill--active" : "status-pill--expired"}\`;
            }
            if (portalRolePill) {
                portalRolePill.textContent = portal.membership.role === "OFFICER"
                    ? \`Officer: \${portal.membership.officer?.position || "Leader"}\`
                    : "Member";
            }
            if (portalExpiredBanner) {
                portalExpiredBanner.hidden = !portal.isExpired;
            }

            // Render My Clearance Card
            const clr = portal.myClearance;
            if (portalMyClearancePill) {
                portalMyClearancePill.textContent = clr.status;
                portalMyClearancePill.className = \`status-pill \${clr.status === "CLEARED" ? "status-pill--active" : "status-pill--pending"}\`;
            }
            if (portalMyClearanceDate) {
                portalMyClearanceDate.textContent = clr.clearedAt ? new Date(clr.clearedAt).toLocaleString() : "Not evaluated yet";
            }
            if (portalMyClearanceBy) {
                portalMyClearanceBy.textContent = clr.clearedByOfficer ? \`\${clr.clearedByOfficer.fullName} (\${clr.clearedByOfficer.position || "Clearance Officer"})\` : "Pending Sign-off";
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
            studentClubPortalDialog?.showModal();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            alert(error.message || "Failed to open club portal.");
        }
    };

    const renderPortalAnnouncements = (announcements) => {
        if (!portalAnnouncementsFeed) return;
        portalAnnouncementsFeed.replaceChildren();

        if (!announcements.length) {
            portalAnnouncementsFeed.innerHTML = '<div class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No announcements published for this club.</div>';
            return;
        }

        announcements.forEach((item) => {
            const card = document.createElement("div");
            card.className = \`announcement-card \${item.isPriority ? "is-priority" : ""}\`;
            const dateFmt = new Date(item.publishedAt).toLocaleDateString();

            card.innerHTML = \`
                <div class="announcement-card__meta">
                    <span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">\${humanize(item.category)}</span>
                    <span>\${dateFmt} • \${item.authorName}</span>
                </div>
                <h4 class="announcement-card__title">\${item.isPriority ? "🔴 " : ""}\${item.title}</h4>
                <p class="announcement-card__content">\${item.content}</p>
            \`;
            portalAnnouncementsFeed.append(card);
        });
    };

    const renderPortalDocuments = (documents) => {
        if (!portalDocsBody) return;
        portalDocsBody.replaceChildren();

        if (!documents.length) {
            portalDocsBody.innerHTML = '<tr><td colspan="5" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No official documents available.</td></tr>';
            return;
        }

        documents.forEach((doc) => {
            const tr = document.createElement("tr");
            const dateFmt = new Date(doc.uploadedAt).toLocaleDateString();

            tr.innerHTML = \`
                <td><span class="club-badge" style="background: var(--cream); border: 1px solid var(--line);">\${humanize(doc.category)}</span></td>
                <td><strong>\${doc.title}</strong></td>
                <td>\${doc.referenceNo || "—"}</td>
                <td>\${dateFmt}</td>
                <td>
                    <a class="button button--outline button--compact" href="\${doc.fileUrl}" target="_blank" rel="noopener noreferrer">View Document</a>
                </td>
            \`;
            portalDocsBody.append(tr);
        });
    };

    const renderPortalOfficers = (officers) => {
        if (!portalOfficersBody) return;
        portalOfficersBody.replaceChildren();

        if (!officers.length) {
            portalOfficersBody.innerHTML = '<tr><td colspan="3" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No officers listed.</td></tr>';
            return;
        }

        officers.forEach((officer) => {
            const tr = document.createElement("tr");
            const clrBadge = officer.canClearClearance
                ? '<span class="club-badge club-badge--authority">Clearance Sign-off Authority</span>'
                : '<span class="club-badge club-badge--none">Officer</span>';

            tr.innerHTML = \`
                <td><strong>\${officer.position}</strong></td>
                <td>\${officer.student?.fullName || "—"}</td>
                <td>\${clrBadge}</td>
            \`;
            portalOfficersBody.append(tr);
        });
    };

    const renderPortalClearanceEvaluation = (members, clubId) => {
        if (!portalEvalBody) return;
        portalEvalBody.replaceChildren();

        if (!members.length) {
            portalEvalBody.innerHTML = '<tr><td colspan="7" class="empty-cell" style="text-align: center; padding: 2rem; color: var(--muted);">No members to evaluate.</td></tr>';
            return;
        }

        members.forEach((m) => {
            const tr = document.createElement("tr");
            const clrStatus = m.clearance?.status || "PENDING";
            const pillClass = clrStatus === "CLEARED" ? "status-pill--active" : "status-pill--pending";
            const evaluatedBy = m.clearance?.clearedByOfficer ? \`\${m.clearance.clearedByOfficer.fullName} (\${m.clearance.clearedByOfficer.position || "Officer"})\` : "—";
            const remarks = m.clearance?.remarks || "—";
            const studentId = m.student?.id;
            const studentName = m.student?.fullName;

            tr.innerHTML = \`
                <td><strong>\${m.student?.studentIdNumber || "—"}</strong></td>
                <td>\${studentName || "—"}</td>
                <td>\${m.role === "OFFICER" ? "Officer" : "Member"}</td>
                <td><span class="status-pill \${pillClass}">\${clrStatus}</span></td>
                <td><small>\${evaluatedBy}</small></td>
                <td><small>\${remarks}</small></td>
                <td>
                    <button class="button button--primary button--compact" type="button" data-eval-member-btn="\${studentId}" data-target-name="\${studentName}" data-current-status="\${clrStatus}" data-current-remarks="\${remarks}">
                        Evaluate
                    </button>
                </td>
            \`;
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
                if (evalFormRemarks) evalFormRemarks.value = currentRemarks !== "—" ? currentRemarks : "";
                if (evalActionError) evalActionError.hidden = true;

                evalActionDialog.showModal();
            });
        });
    };

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
            // Refresh the portal modal and student clubs
            await openStudentClubPortal(clubId);
            await loadStudentClubs();
        } catch (error) {
            if (handleExpiredSession(error)) return;
            if (evalActionError) {
                evalActionError.textContent = error.message || "Failed to save clearance evaluation.";
                evalActionError.hidden = false;
            }
        }
    });
`;

js = js.replace(bootstrapTarget, `${moduleLogic}\n    void bootstrap();\n})();`);

fs.writeFileSync(jsPath, js, "utf8");
console.log("portal.js updated successfully!");
