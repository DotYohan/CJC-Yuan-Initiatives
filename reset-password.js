(() => {
    "use strict";

    const fragment = window.location.hash.slice(1);
    let token = "";
    if (fragment) {
        const parameters = new URLSearchParams(fragment);
        token = parameters.get("token") || "";
        if (!token && !fragment.includes("=")) {
            try {
                token = decodeURIComponent(fragment);
            } catch {
                token = "";
            }
        }
    }
    // A fragment is not sent to the server; remove it before any network request or user interaction.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

    const auth = window.CJCAuth;
    const select = (selector, scope = document) => scope.querySelector(selector);
    const selectAll = (selector, scope = document) => [...scope.querySelectorAll(selector)];
    const form = select("[data-reset-form]");
    const invalidView = select("[data-reset-invalid]");
    const successView = select("[data-reset-success]");
    const errorMessage = select("[data-reset-error]");
    const statusMessage = select("[data-reset-status]");
    const passwordLength = (value) => Array.from(value).length;

    const showError = (message) => {
        if (!errorMessage) return;
        errorMessage.textContent = message;
        errorMessage.hidden = false;
    };
    const clearError = () => {
        if (!errorMessage) return;
        errorMessage.textContent = "";
        errorMessage.hidden = true;
    };
    const setBusy = (busy) => {
        if (!form) return;
        form.setAttribute("aria-busy", String(busy));
        selectAll("input, button", form).forEach((control) => {
            control.disabled = busy;
        });
        select("[type='submit']", form)?.classList.toggle("is-busy", busy);
    };
    const showInvalidLink = () => {
        token = "";
        form.hidden = true;
        invalidView.hidden = false;
        successView.hidden = true;
    };

    if (!token || !auth) {
        showInvalidLink();
    } else {
        form.hidden = false;
        invalidView.hidden = true;
        window.setTimeout(() => select("#reset-new-password")?.focus(), 0);
    }

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

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!token || form.getAttribute("aria-busy") === "true") return;
        clearError();
        if (statusMessage) statusMessage.textContent = "";
        const newPassword = form.elements.newPassword.value;
        const confirmation = form.elements.confirmPassword.value;
        if (passwordLength(newPassword) < 12 || passwordLength(newPassword) > 128) {
            showError("Your new password must contain 12–128 characters.");
            form.elements.newPassword.focus();
            return;
        }
        if (newPassword !== confirmation) {
            showError("The new passwords do not match.");
            form.elements.confirmPassword.focus();
            return;
        }

        setBusy(true);
        if (statusMessage) statusMessage.textContent = "Resetting password…";
        try {
            await auth.resetPassword(token, newPassword);
            token = "";
            form.reset();
            form.hidden = true;
            invalidView.hidden = true;
            successView.hidden = false;
            successView.focus?.();
        } catch (error) {
            if (String(error.code).includes("CSRF")) {
                auth.clearCsrf();
                showError("Your secure reset session expired. Submit the form again.");
            } else if (error.status === 429) {
                showError("Too many reset attempts. Wait a few minutes, then try again.");
            } else if (error.code === "NETWORK_ERROR") {
                showError(error.message);
            } else if ([400, 404, 410, 422].includes(error.status)
                || /TOKEN|RESET.*EXPIRED|INVALID/i.test(String(error.code))) {
                showInvalidLink();
                return;
            } else {
                showError("The password could not be reset. Request a new reset link and try again.");
            }
            form.elements.newPassword.value = "";
            form.elements.confirmPassword.value = "";
            form.elements.newPassword.focus();
        } finally {
            if (statusMessage) statusMessage.textContent = "";
            setBusy(false);
        }
    });
})();
