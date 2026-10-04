export async function handleClubRoutes(request, response, context, url, pathname, method, deps) {
  const {
    clubStore,
    requirePermission,
    requireStatePermission,
    readJson,
    sendJson,
    audit,
    error,
    config
  } = deps;

  const handleCatch = (caught) => {
    const badRequestErrors = [
      "CLUB_NAME_REQUIRED",
      "CLUB_ADVISER_REQUIRED",
      "CLUB_USERNAME_REQUIRED",
      "CLUB_PASSWORD_REQUIRED",
      "EFFECTIVITY_DATES_REQUIRED",
      "START_DATE_MUST_PRECEDE_END_DATE",
      "INVALID_EFFECTIVITY_DATES",
      "INVALID_STATUS",
      "STUDENT_ID_REQUIRED",
      "OFFICER_POSITION_REQUIRED",
      "ANNOUNCEMENT_TITLE_REQUIRED",
      "ANNOUNCEMENT_CONTENT_REQUIRED",
      "DOCUMENT_TITLE_REQUIRED",
      "INVALID_CLEARANCE_STATUS",
      "TARGET_STUDENT_NOT_IN_CLUB",
      "MAXIMUM_ACTIVE_CLUBS_REACHED"
    ];
    if (badRequestErrors.includes(caught.message)) {
      error(400, caught.message, caught.message);
    }
    const conflictErrors = [
      "CLUB_NAME_TAKEN",
      "CLUB_USERNAME_TAKEN",
      "CLUB_NOT_AVAILABLE",
      "CLUB_EXPIRED",
      "ALREADY_CLUB_MEMBER"
    ];
    if (conflictErrors.includes(caught.message)) {
      error(409, caught.message, caught.message);
    }
    const notFoundErrors = [
      "CLUB_NOT_FOUND",
      "CLUB_ACCOUNT_NOT_FOUND",
      "STUDENT_NOT_FOUND",
      "OFFICER_NOT_FOUND",
      "ANNOUNCEMENT_NOT_FOUND",
      "DOCUMENT_NOT_FOUND",
      "STUDENT_PROFILE_NOT_FOUND",
      "NOT_A_CLUB_MEMBER"
    ];
    if (notFoundErrors.includes(caught.message)) {
      error(404, caught.message, caught.message);
    }
    if (caught.message === "CLEARANCE_AUTHORITY_REQUIRED") {
      error(403, "CLEARANCE_AUTHORITY_REQUIRED", "Only club officers with clearance authority can evaluate clearances.");
    }
    throw caught;
  };

  // ─────────────────────────────────────────────────────────────
  // 1. SSC ROUTES
  // ─────────────────────────────────────────────────────────────

  if (pathname === "/api/v1/ssc/clubs" && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.ssc");
    try {
      const filter = url.searchParams.get("filter") || "ALL";
      const result = await clubStore.listClubsForSsc(filter);
      sendJson(response, 200, { data: result });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  if (pathname === "/api/v1/ssc/clubs" && method === "POST") {
    const session = await requireStatePermission(request, context, "portal.access.ssc");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const result = await clubStore.createClub(session.user.id, body);
      await audit(context, request, "ssc.club_created", "success", {
        actorUserId: session.user.id,
        metadata: { clubId: result.club.id, clubName: result.club.name, clubCode: result.club.code }
      });
      sendJson(response, 201, { data: result });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  const sscStatusMatch = pathname.match(/^\/api\/v1\/ssc\/clubs\/([0-9a-f-]{36})\/status$/i);
  if (sscStatusMatch && method === "PATCH") {
    const session = await requireStatePermission(request, context, "portal.access.ssc");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const clubId = sscStatusMatch[1];
      const club = await clubStore.updateClubStatus(session.user.id, clubId, body?.status);
      await audit(context, request, "ssc.club_status_updated", "success", {
        actorUserId: session.user.id,
        metadata: { clubId, status: club.status }
      });
      sendJson(response, 200, { data: { club } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  const sscEffectivityMatch = pathname.match(/^\/api\/v1\/ssc\/clubs\/([0-9a-f-]{36})\/effectivity$/i);
  if (sscEffectivityMatch && method === "PATCH") {
    const session = await requireStatePermission(request, context, "portal.access.ssc");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const clubId = sscEffectivityMatch[1];
      const club = await clubStore.updateClubEffectivity(session.user.id, clubId, body);
      await audit(context, request, "ssc.club_effectivity_updated", "success", {
        actorUserId: session.user.id,
        metadata: { clubId, effectivityStartDate: club.effectivityStartDate, effectivityEndDate: club.effectivityEndDate }
      });
      sendJson(response, 200, { data: { club } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CLUB ACCOUNT ROUTES (Role: club)
  // ─────────────────────────────────────────────────────────────

  if (pathname === "/api/v1/club/dashboard" && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.club");
    try {
      const data = await clubStore.getClubDashboard(session.user.id);
      sendJson(response, 200, { data });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  const validateStudentMatch = pathname.match(/^\/api\/v1\/club\/validate-student\/([^/]+)$/i);
  if (validateStudentMatch && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.club");
    try {
      const studentNumber = decodeURIComponent(validateStudentMatch[1]);
      const student = await clubStore.validateStudentForOfficer(session.user.id, studentNumber);
      sendJson(response, 200, { data: { student } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  if (pathname === "/api/v1/club/officers" && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.club");
    try {
      const officers = await clubStore.listOfficers(session.user.id);
      sendJson(response, 200, { data: { officers } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  if (pathname === "/api/v1/club/officers" && method === "POST") {
    const session = await requireStatePermission(request, context, "portal.access.club");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const officer = await clubStore.assignOfficer(session.user.id, body);
      await audit(context, request, "club.officer_assigned", "success", {
        actorUserId: session.user.id,
        metadata: { studentId: officer.studentId, position: officer.position, canClearClearance: officer.canClearClearance }
      });
      sendJson(response, 201, { data: { officer } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  const officerIdMatch = pathname.match(/^\/api\/v1\/club\/officers\/([0-9a-f-]{36})$/i);
  if (officerIdMatch && method === "PATCH") {
    const session = await requireStatePermission(request, context, "portal.access.club");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const officer = await clubStore.updateOfficer(session.user.id, officerIdMatch[1], body);
      await audit(context, request, "club.officer_updated", "success", {
        actorUserId: session.user.id,
        metadata: { officerId: officer.id, position: officer.position, canClearClearance: officer.canClearClearance }
      });
      sendJson(response, 200, { data: { officer } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  if (officerIdMatch && method === "DELETE") {
    const session = await requireStatePermission(request, context, "portal.access.club");
    try {
      await clubStore.removeOfficer(session.user.id, officerIdMatch[1]);
      await audit(context, request, "club.officer_removed", "success", {
        actorUserId: session.user.id,
        metadata: { officerId: officerIdMatch[1] }
      });
      sendJson(response, 200, { data: { success: true } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  if (pathname === "/api/v1/club/members" && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.club");
    try {
      const members = await clubStore.listMembers(session.user.id);
      sendJson(response, 200, { data: { members } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  if (pathname === "/api/v1/club/announcements" && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.club");
    try {
      const announcements = await clubStore.listAnnouncements(session.user.id);
      sendJson(response, 200, { data: { announcements } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  if (pathname === "/api/v1/club/announcements" && method === "POST") {
    const session = await requireStatePermission(request, context, "portal.access.club");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const announcement = await clubStore.createAnnouncement(session.user.id, body);
      await audit(context, request, "club.announcement_created", "success", {
        actorUserId: session.user.id,
        metadata: { announcementId: announcement.id, title: announcement.title }
      });
      sendJson(response, 201, { data: { announcement } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  const announcementIdMatch = pathname.match(/^\/api\/v1\/club\/announcements\/([0-9a-f-]{36})$/i);
  if (announcementIdMatch && method === "DELETE") {
    const session = await requireStatePermission(request, context, "portal.access.club");
    try {
      await clubStore.deleteAnnouncement(session.user.id, announcementIdMatch[1]);
      sendJson(response, 200, { data: { success: true } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  if (pathname === "/api/v1/club/documents" && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.club");
    try {
      const documents = await clubStore.listDocuments(session.user.id);
      sendJson(response, 200, { data: { documents } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  if (pathname === "/api/v1/club/documents" && method === "POST") {
    const session = await requireStatePermission(request, context, "portal.access.club");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const doc = await clubStore.createDocument(session.user.id, body);
      await audit(context, request, "club.document_created", "success", {
        actorUserId: session.user.id,
        metadata: { documentId: doc.id, title: doc.title, category: doc.category }
      });
      sendJson(response, 201, { data: { document: doc } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  const documentIdMatch = pathname.match(/^\/api\/v1\/club\/documents\/([0-9a-f-]{36})$/i);
  if (documentIdMatch && method === "DELETE") {
    const session = await requireStatePermission(request, context, "portal.access.club");
    try {
      await clubStore.deleteDocument(session.user.id, documentIdMatch[1]);
      sendJson(response, 200, { data: { success: true } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. STUDENT CLUB ROUTES (Role: student)
  // ─────────────────────────────────────────────────────────────

  if (pathname === "/api/v1/student/clubs/available" && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.student");
    try {
      const clubs = await clubStore.listAvailableClubs(session.user.id);
      sendJson(response, 200, { data: { clubs } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  if (pathname === "/api/v1/student/clubs/my-clubs" && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.student");
    try {
      const clubs = await clubStore.listMyClubs(session.user.id);
      sendJson(response, 200, { data: { clubs } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  const studentJoinMatch = pathname.match(/^\/api\/v1\/student\/clubs\/([0-9a-f-]{36})\/join$/i);
  if (studentJoinMatch && method === "POST") {
    const session = await requireStatePermission(request, context, "portal.access.student");
    try {
      const clubId = studentJoinMatch[1];
      const membership = await clubStore.joinClub(session.user.id, clubId);
      await audit(context, request, "student.club_joined", "success", {
        actorUserId: session.user.id,
        metadata: { clubId, membershipId: membership.id }
      });
      sendJson(response, 201, { data: { membership } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  const studentPortalMatch = pathname.match(/^\/api\/v1\/student\/clubs\/([0-9a-f-]{36})\/portal$/i);
  if (studentPortalMatch && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.student");
    try {
      const clubId = studentPortalMatch[1];
      const portalData = await clubStore.getStudentClubPortal(session.user.id, clubId);
      sendJson(response, 200, { data: portalData });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  const studentClearanceMatch = pathname.match(/^\/api\/v1\/student\/clubs\/([0-9a-f-]{36})\/clearance$/i);
  if (studentClearanceMatch && method === "POST") {
    const session = await requireStatePermission(request, context, "portal.access.student");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const clubId = studentClearanceMatch[1];
      const clearance = await clubStore.evaluateClearance(session.user.id, clubId, body);
      await audit(context, request, "student_officer.clearance_evaluated", "success", {
        actorUserId: session.user.id,
        metadata: { clubId, targetStudentId: body?.targetStudentId, status: clearance.status }
      });
      sendJson(response, 200, { data: { clearance } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  const studentClearanceHistoryMatch = pathname.match(/^\/api\/v1\/student\/clubs\/([0-9a-f-]{36})\/clearance-history$/i);
  if (studentClearanceHistoryMatch && method === "GET") {
    const session = await requirePermission(request, context, "portal.access.student");
    try {
      const clubId = studentClearanceHistoryMatch[1];
      const history = await clubStore.listClubClearanceHistory(session.user.id, clubId);
      sendJson(response, 200, { data: { history } });
      return true;
    } catch (caught) {
      handleCatch(caught);
    }
  }

  return false;
}
