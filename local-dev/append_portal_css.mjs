import fs from "fs";

const cssPath = "portal.css";
let css = fs.readFileSync(cssPath, "utf8");

const clubStyles = `

/* ==========================================================================
   Club Environment & Student Services Center (SSC) Styles
   ========================================================================== */

.ssc-filter-btn.is-active {
    background: var(--red-900) !important;
    color: var(--white) !important;
}

.status-pill--active {
    background: #e9f7f0;
    color: #176b4d;
}

.status-pill--inactive {
    background: #f1f0ee;
    color: var(--muted);
}

.status-pill--expired {
    background: #ffe3e7;
    color: #a42335;
}

.status-pill--cleared {
    background: #e9f7f0;
    color: #176b4d;
}

.status-pill--pending {
    background: #fff6dc;
    color: #8a5a00;
}

.club-card {
    background: var(--white);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.club-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(63, 18, 30, 0.08);
}

.club-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
}

.club-card__category {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--red-800);
}

.club-card__title {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0.25rem 0 0.5rem;
}

.club-card__description {
    font-size: 0.88rem;
    color: var(--muted);
    line-height: 1.45;
    margin-bottom: 1rem;
    flex-grow: 1;
}

.club-card__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--line);
    padding-top: 0.75rem;
    margin-top: 0.5rem;
}

.club-card__effectivity {
    font-size: 0.78rem;
    color: var(--muted);
}

.announcement-card {
    background: var(--white);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    position: relative;
}

.announcement-card.is-priority {
    border-left: 4px solid var(--danger);
    background: #fffdfd;
}

.announcement-card__meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.82rem;
    color: var(--muted);
}

.announcement-card__title {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--ink);
    margin: 0 0 0.35rem;
}

.announcement-card__content {
    font-size: 0.9rem;
    color: var(--ink);
    line-height: 1.5;
    margin: 0;
}

.club-badge {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.03em;
}

.club-badge--authority {
    background: #e9f7f0;
    color: #176b4d;
    border: 1px solid rgba(23, 107, 77, 0.2);
}

.club-badge--none {
    background: #f4f3f1;
    color: var(--muted);
}
`;

if (!css.includes("Club Environment & Student Services Center (SSC) Styles")) {
    css += clubStyles;
    fs.writeFileSync(cssPath, css, "utf8");
    console.log("Appended clubStyles to portal.css.");
} else {
    console.log("clubStyles already present in portal.css.");
}
