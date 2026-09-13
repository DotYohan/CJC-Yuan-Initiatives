(() => {
    "use strict";

    const initializePortal = () => {
        if (window.__CJC_PORTAL_INITIALIZED__) return;
        window.__CJC_PORTAL_INITIALIZED__ = true;

        const body = document.body;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const select = (selector, scope = document) => scope.querySelector(selector);
        const selectAll = (selector, scope = document) => [...scope.querySelectorAll(selector)];
        body.classList.add("animations-ready");

        selectAll("[data-current-year]").forEach((element) => {
            element.textContent = String(new Date().getFullYear());
        });

        // Sticky header and back-to-top control.
        const header = select("[data-header]");
        const backToTop = select("[data-back-to-top]");
        let scrollTicking = false;
        const updateScrollState = () => {
            header?.classList.toggle("is-scrolled", window.scrollY > 12);
            backToTop?.classList.toggle("is-visible", window.scrollY > 650);
            scrollTicking = false;
        };
        window.addEventListener("scroll", () => {
            if (scrollTicking) return;
            window.requestAnimationFrame(updateScrollState);
            scrollTicking = true;
        }, { passive: true });
        updateScrollState();
        backToTop?.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
        });

        // Mobile navigation.
        const menuToggle = select("[data-menu-toggle]");
        const mobileMenu = select("[data-mobile-menu]");
        const setMenuOpen = (open) => {
            if (!menuToggle || !mobileMenu) return;
            if (open) {
                const availableHeight = Math.max(0, window.innerHeight - mobileMenu.getBoundingClientRect().top);
                mobileMenu.style.setProperty("--mobile-menu-height", `${Math.floor(availableHeight)}px`);
            } else {
                mobileMenu.style.removeProperty("--mobile-menu-height");
            }
            menuToggle.setAttribute("aria-expanded", String(open));
            menuToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
            mobileMenu.classList.toggle("is-open", open);
            body.classList.toggle("menu-open", open);
        };
        menuToggle?.addEventListener("click", () => {
            setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
        });
        selectAll("a", mobileMenu || document).forEach((link) => {
            link.addEventListener("click", () => setMenuOpen(false));
        });
        window.addEventListener("resize", () => {
            if (window.innerWidth > 1020) setMenuOpen(false);
            else if (menuToggle?.getAttribute("aria-expanded") === "true") setMenuOpen(true);
        });

        // Reveal-on-scroll animation.
        const revealItems = selectAll(".reveal:not(.is-visible)");
        if (reducedMotion.matches || !("IntersectionObserver" in window)) {
            revealItems.forEach((item) => item.classList.add("is-visible"));
        } else {
            const observer = new IntersectionObserver((entries, revealObserver) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                });
            }, { threshold: 0.14, rootMargin: "0px 0px -36px" });
            revealItems.forEach((item) => observer.observe(item));
        }

        // Keep desktop navigation aligned with the section in view.
        const trackedSections = ["home", "services", "about", "mission", "announcements", "contact"]
            .map((id) => document.getElementById(id))
            .filter(Boolean);
        const desktopLinks = selectAll(".desktop-nav__link");
        if ("IntersectionObserver" in window) {
            const navigationObserver = new IntersectionObserver((entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (!visible) return;
                desktopLinks.forEach((link) => {
                    const active = link.getAttribute("href") === `#${visible.target.id}`;
                    link.classList.toggle("is-active", active);
                    if (active) link.setAttribute("aria-current", "location");
                    else link.removeAttribute("aria-current");
                });
            }, { rootMargin: "-34% 0px -54%", threshold: [0, 0.25, 0.6] });
            trackedSections.forEach((section) => navigationObserver.observe(section));
        }

        // Accessible identity tabs.
        const tabs = selectAll("[role='tab']", select(".identity-tabs") || document);
        const activateTab = (nextTab, moveFocus = false) => {
            tabs.forEach((tab) => {
                const selected = tab === nextTab;
                const panel = document.getElementById(tab.getAttribute("aria-controls"));
                tab.classList.toggle("is-active", selected);
                tab.setAttribute("aria-selected", String(selected));
                tab.tabIndex = selected ? 0 : -1;
                if (panel) {
                    panel.hidden = !selected;
                    panel.classList.toggle("is-active", selected);
                }
            });
            if (moveFocus) nextTab.focus();
        };
        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => activateTab(tab));
            tab.addEventListener("keydown", (event) => {
                let nextIndex = null;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
                if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
                if (event.key === "Home") nextIndex = 0;
                if (event.key === "End") nextIndex = tabs.length - 1;
                if (nextIndex === null) return;
                event.preventDefault();
                activateTab(tabs[nextIndex], true);
            });
        });

        // Subtle pointer parallax for the portal preview.
        const hero = select("[data-hero]");
        const parallaxCard = select("[data-parallax-card]");
        if (hero && parallaxCard && window.matchMedia("(pointer: fine)").matches && !reducedMotion.matches) {
            hero.addEventListener("pointermove", (event) => {
                const bounds = hero.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                const y = (event.clientY - bounds.top) / bounds.height - 0.5;
                parallaxCard.style.setProperty("--card-x", `${x * 12}px`);
                parallaxCard.style.setProperty("--card-y", `${y * 10}px`);
            });
            hero.addEventListener("pointerleave", () => {
                parallaxCard.style.setProperty("--card-x", "0px");
                parallaxCard.style.setProperty("--card-y", "0px");
            });
        }

        // Same-origin authentication and account-aware portal entry points.
        const auth = window.CJCAuth;
        const loginDialog = select("[data-login-dialog]");
        const loginForm = select("[data-login-form]");
        const loginStatus = select("[data-login-status]");
        const loginAlert = select("[data-login-error]");
        const identifierInput = select("#login-identifier");
        const passwordInput = select("#login-password");
        const signInHeading = select("[data-signin-heading]");
        const authWarning = select("[data-auth-warning]");
        const recoveryView = select("[data-recovery-view]");
        const recoveryForm = select("[data-recovery-form]");
        const recoveryInput = select("#recovery-identifier");
        const recoveryError = select("[data-recovery-error]");
        const recoveryAlert = select("[data-recovery-alert]");
        const recoveryStatus = select("[data-recovery-status]");
        const state = { status: "loading", user: null, landingPath: "/portal.html" };
        let dialogRequest = null;

        const query = new URLSearchParams(window.location.search);
        const returnCandidate = auth?.safeLandingPath(query.get("returnTo"), "/portal.html") || "/portal.html";
        let requestedReturn = /^\/portal(?:\/|\.html(?:[?#]|$))/.test(returnCandidate)
            ? returnCandidate
            : "/portal.html";
        const shouldPromptSignIn = query.get("signin") === "1";
        if (shouldPromptSignIn || query.has("returnTo")) {
            query.delete("signin");
            query.delete("returnTo");
            const cleanQuery = query.toString();
            history.replaceState(null, "", `${location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${location.hash}`);
        }

        const accountLabel = (user) => String(
            user?.displayName || user?.name || user?.username || user?.email || "My account",
        );
        const renderAuthState = () => {
            const authenticated = state.status === "authenticated" && state.user;
            body.dataset.authState = state.status;
            selectAll("[data-auth-guest]").forEach((element) => {
                element.hidden = Boolean(authenticated);
            });
            selectAll("[data-account-link]").forEach((element) => {
                element.hidden = !authenticated;
                if (authenticated) element.href = auth.safeLandingPath(state.landingPath, "/portal.html");
            });
            selectAll("[data-account-name]").forEach((element) => {
                element.textContent = authenticated ? accountLabel(state.user) : "My account";
            });
            selectAll("[data-account-initial]").forEach((element) => {
                element.textContent = authenticated
                    ? accountLabel(state.user).trim().charAt(0).toUpperCase() || "C"
                    : "C";
            });
            selectAll("[data-auth-cta-label]").forEach((element) => {
                element.textContent = authenticated ? element.dataset.signedIn : element.dataset.signedOut;
            });
        };
        const setAuthState = (session = {}) => {
            const authenticated = Boolean(session.authenticated ?? session.user);
            state.status = authenticated ? "authenticated" : "anonymous";
            state.user = authenticated ? session.user : null;
            state.landingPath = auth.safeLandingPath(session.landingPath, "/portal.html");
            renderAuthState();
        };

        const clearLoginErrors = () => {
            selectAll(".field input", loginForm || document).forEach((input) => {
                input.classList.remove("is-invalid");
                input.removeAttribute("aria-invalid");
            });
            selectAll("[data-error-for]", loginForm || document).forEach((error) => {
                error.textContent = "";
            });
            if (loginAlert) {
                loginAlert.textContent = "";
                loginAlert.hidden = true;
            }
        };
        const setFieldError = (input, message) => {
            if (!input) return;
            input.classList.add("is-invalid");
            input.setAttribute("aria-invalid", "true");
            const error = select(`[data-error-for='${input.dataset.field}']`, loginForm || document);
            if (error) error.textContent = message;
        };
        const resetPasswordField = () => {
            if (!passwordInput) return;
            passwordInput.value = "";
            passwordInput.type = "password";
            const toggle = select("[data-password-target='login-password']");
            toggle?.closest(".password-field")?.classList.remove("is-visible");
            toggle?.setAttribute("aria-label", "Show password");
            toggle?.setAttribute("aria-pressed", "false");
        };
        const setFormBusy = (form, busy) => {
            if (!form) return;
            form.setAttribute("aria-busy", String(busy));
            selectAll("input, button", form).forEach((control) => {
                control.disabled = busy;
            });
            select("[type='submit']", form)?.classList.toggle("is-busy", busy);
        };
        const showSignIn = () => {
            signInHeading?.removeAttribute("hidden");
            authWarning?.removeAttribute("hidden");
            loginForm?.removeAttribute("hidden");
            if (recoveryView) recoveryView.hidden = true;
            loginDialog?.setAttribute("aria-labelledby", "login-title");
        };
        const resetLogin = () => {
            loginForm?.reset();
            recoveryForm?.reset();
            resetPasswordField();
            clearLoginErrors();
            if (loginStatus) loginStatus.textContent = "";
            if (recoveryError) recoveryError.textContent = "";
            if (recoveryAlert) {
                recoveryAlert.textContent = "";
                recoveryAlert.hidden = true;
            }
            if (recoveryStatus) recoveryStatus.textContent = "";
            setFormBusy(loginForm, false);
            setFormBusy(recoveryForm, false);
            showSignIn();
        };
        const openLogin = () => {
            if (!loginDialog) return;
            setMenuOpen(false);
            resetLogin();
            if (typeof loginDialog.showModal === "function") {
                if (!loginDialog.open) loginDialog.showModal();
            } else {
                loginDialog.setAttribute("open", "");
            }
            body.classList.add("dialog-open");
            window.setTimeout(() => identifierInput?.focus(), 80);
        };
        const closeLogin = () => {
            if (!loginDialog) return;
            dialogRequest?.abort();
            dialogRequest = null;
            if (typeof loginDialog.close === "function" && loginDialog.open) loginDialog.close();
            else loginDialog.removeAttribute("open");
            body.classList.remove("dialog-open");
            resetLogin();
        };

        selectAll("[data-open-login]").forEach((button) => {
            button.addEventListener("click", () => {
                if (state.status === "authenticated") {
                    location.assign(auth.safeLandingPath(state.landingPath, "/portal.html"));
                } else {
                    openLogin();
                }
            });
        });
        select("[data-close-login]")?.addEventListener("click", closeLogin);
        loginDialog?.addEventListener("cancel", () => {
            dialogRequest?.abort();
            dialogRequest = null;
            body.classList.remove("dialog-open");
            resetLogin();
        });
        loginDialog?.addEventListener("click", (event) => {
            if (event.target === loginDialog) closeLogin();
        });

        selectAll("[data-password-toggle]").forEach((toggle) => {
            toggle.addEventListener("click", () => {
                const input = document.getElementById(toggle.dataset.passwordTarget || "");
                if (!input) return;
                const showing = input.type === "password";
                input.type = showing ? "text" : "password";
                toggle.setAttribute("aria-label", showing ? "Hide password" : "Show password");
                toggle.setAttribute("aria-pressed", String(showing));
                toggle.closest(".password-field")?.classList.toggle("is-visible", showing);
                input.focus();
            });
        });

        loginForm?.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!auth || loginForm.getAttribute("aria-busy") === "true") return;
            clearLoginErrors();
            if (loginStatus) loginStatus.textContent = "";
            const identifier = identifierInput?.value.trim() || "";
            const password = passwordInput?.value || "";
            let firstInvalid = null;
            if (!identifier) {
                setFieldError(identifierInput, "Enter your project username or email address.");
                firstInvalid = identifierInput;
            }
            if (!password) {
                setFieldError(passwordInput, "Enter your password.");
                firstInvalid ||= passwordInput;
            }
            if (firstInvalid) {
                firstInvalid.focus();
                return;
            }

            setFormBusy(loginForm, true);
            if (loginStatus) loginStatus.textContent = "Signing in…";
            dialogRequest = new AbortController();
            try {
                const data = await auth.login(identifier, password, Boolean(loginForm.elements.remember?.checked), {
                    signal: dialogRequest.signal,
                });
                setAuthState({ authenticated: true, ...data });
                resetPasswordField();
                closeLogin();
                location.assign(auth.safeLandingPath(data.landingPath || requestedReturn, "/portal.html"));
            } catch (error) {
                if (error?.name === "AbortError") return;
                resetPasswordField();
                if (loginAlert) {
                    if (error.code === "NETWORK_ERROR") loginAlert.textContent = error.message;
                    else if (error.status === 429) {
                        loginAlert.textContent = "Too many sign-in attempts. Wait a few minutes, then try again.";
                    } else if (String(error.code).includes("CSRF")) {
                        loginAlert.textContent = "Your secure sign-in session expired. Please submit the form again.";
                        auth.clearCsrf();
                    } else {
                        loginAlert.textContent = "The username/email or password is incorrect, or this project account is unavailable.";
                    }
                    loginAlert.hidden = false;
                }
                if (loginStatus) loginStatus.textContent = "";
                passwordInput?.focus();
            } finally {
                dialogRequest = null;
                setFormBusy(loginForm, false);
            }
        });

        select("[data-forgot-password]")?.addEventListener("click", () => {
            clearLoginErrors();
            if (recoveryInput && identifierInput) recoveryInput.value = identifierInput.value.trim();
            signInHeading?.setAttribute("hidden", "");
            authWarning?.setAttribute("hidden", "");
            loginForm?.setAttribute("hidden", "");
            if (recoveryView) recoveryView.hidden = false;
            loginDialog?.setAttribute("aria-labelledby", "recovery-title");
            window.setTimeout(() => recoveryInput?.focus(), 0);
        });
        select("[data-back-to-signin]")?.addEventListener("click", () => {
            showSignIn();
            window.setTimeout(() => identifierInput?.focus(), 0);
        });

        recoveryForm?.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!auth || recoveryForm.getAttribute("aria-busy") === "true") return;
            const identifier = recoveryInput?.value.trim() || "";
            if (recoveryError) recoveryError.textContent = "";
            if (recoveryAlert) {
                recoveryAlert.textContent = "";
                recoveryAlert.hidden = true;
            }
            if (recoveryStatus) recoveryStatus.textContent = "";
            recoveryInput?.removeAttribute("aria-invalid");
            if (!identifier) {
                if (recoveryError) recoveryError.textContent = "Enter your project username or email address.";
                recoveryInput?.setAttribute("aria-invalid", "true");
                recoveryInput?.focus();
                return;
            }

            setFormBusy(recoveryForm, true);
            if (recoveryStatus) recoveryStatus.textContent = "Requesting reset instructions…";
            dialogRequest = new AbortController();
            try {
                await auth.forgotPassword(identifier, { signal: dialogRequest.signal });
                recoveryForm.reset();
                if (recoveryStatus) {
                    recoveryStatus.textContent = "If an eligible project account matches, reset instructions will be sent. Check your inbox.";
                }
            } catch (error) {
                if (error?.name === "AbortError") return;
                if (error.status === 429) {
                    if (recoveryStatus) recoveryStatus.textContent = "Please wait before requesting another reset message.";
                } else if (error.code === "NETWORK_ERROR") {
                    if (recoveryAlert) {
                        recoveryAlert.textContent = error.message;
                        recoveryAlert.hidden = false;
                    }
                    if (recoveryStatus) recoveryStatus.textContent = "";
                } else if (recoveryStatus) {
                    recoveryStatus.textContent = "If an eligible project account matches, reset instructions will be sent. Check your inbox.";
                }
            } finally {
                dialogRequest = null;
                setFormBusy(recoveryForm, false);
            }
        });

        renderAuthState();
        if (auth) {
            auth.getSession().then((session) => {
                setAuthState(session);
                if (state.status === "authenticated" && loginDialog?.open) closeLogin();
                if (!shouldPromptSignIn) return;
                if (state.status === "authenticated") {
                    location.assign(auth.safeLandingPath(state.landingPath, "/portal.html"));
                } else {
                    openLogin();
                }
            }).catch(() => {
                state.status = "unavailable";
                renderAuthState();
                if (shouldPromptSignIn) openLogin();
            });
        } else {
            state.status = "unavailable";
            renderAuthState();
        }

        window.addEventListener("pageshow", () => {
            const restoredQuery = new URLSearchParams(window.location.search);
            if (restoredQuery.get("signin") !== "1" && !restoredQuery.has("returnTo")) return;
            const restoredCandidate = auth?.safeLandingPath(restoredQuery.get("returnTo"), "/portal.html")
                || "/portal.html";
            requestedReturn = /^\/portal(?:\/|\.html(?:[?#]|$))/.test(restoredCandidate)
                ? restoredCandidate
                : "/portal.html";
            restoredQuery.delete("signin");
            restoredQuery.delete("returnTo");
            const cleanQuery = restoredQuery.toString();
            history.replaceState(null, "", `${location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${location.hash}`);
            if (state.status === "authenticated") {
                location.assign(auth.safeLandingPath(state.landingPath, requestedReturn));
            } else {
                openLogin();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
                setMenuOpen(false);
                menuToggle.focus();
            }
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializePortal, { once: true });
    } else {
        initializePortal();
    }
})();
