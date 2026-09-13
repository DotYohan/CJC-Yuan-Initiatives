(() => {
    "use strict";
    const auth = window.CJCAuth;
    const form = document.querySelector("[data-signup-form]");
    const errorBox = document.querySelector("[data-signup-error]");
    const status = document.querySelector("[data-signup-status]");
    const success = document.querySelector("[data-signup-success]");
    const setError = (message) => { errorBox.textContent = message; errorBox.hidden = !message; };
    const setBusy = (busy) => { form.setAttribute("aria-busy", String(busy)); form.querySelectorAll("input, button").forEach((control) => { control.disabled = busy; }); };
    document.querySelectorAll("[data-signup-password-toggle]").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const input = document.getElementById(toggle.dataset.passwordTarget || "");
            if (!input) return;
            const showing = input.type === "password";
            input.type = showing ? "text" : "password";
            toggle.textContent = showing ? "Hide" : "Show";
            toggle.setAttribute("aria-label", `${showing ? "Hide" : "Show"} ${input.id === "confirm-password" ? "confirmed password" : "password"}`);
            toggle.setAttribute("aria-pressed", String(showing));
            toggle.closest(".password-field")?.classList.toggle("is-visible", showing);
        });
    });
    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        setError("");
        const values = new FormData(form);
        const payload = Object.fromEntries(values.entries());
        if (payload.password !== payload.confirmPassword) return setError("Passwords do not match.");
        if (Array.from(payload.password).length < 12) return setError("Password must contain at least 12 characters.");
        setBusy(true);
        status.textContent = "Creating your student account...";
        try {
            const result = await auth.registerStudent(payload);
            form.hidden = true;
            document.querySelector("[data-student-number]").textContent = result.studentNumber;
            document.querySelector("[data-school-email]").textContent = result.schoolEmail;
            document.querySelector("[data-application-number]").textContent = result.applicationNumber;
            success.hidden = false;
            status.textContent = "";
        } catch (caught) {
            setError(caught.message || "Registration could not be completed.");
            status.textContent = "";
        } finally { setBusy(false); }
    });
})();