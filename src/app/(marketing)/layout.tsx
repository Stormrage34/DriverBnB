import type { Metadata } from "next";
import { KitBoot } from "@/components/marketing/kit-boot";

export const metadata: Metadata = {
  title: { absolute: "DriverCompass: truck driving jobs with the conditions written down" },
  description:
    "International C+E jobs from direct employers, each one answering the same 29 fields: gross pay, rotation, home time, accommodation and who signs the contract.",
  openGraph: {
    title: "DriverCompass: truck driving jobs with the conditions written down",
    description:
      "Every vacancy answers the same 29 fields, so two offers compare field by field.",
    type: "website",
    images: ["/share.jpg"],
  },
  twitter: { card: "summary_large_image" },
};

const PALETTE = `
@font-face {
  font-family: "Schibsted Grotesk";
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url("/assets/fonts/schibsted-grotesk.woff2") format("woff2");
}
@font-face {
  font-family: "JetBrains Mono";
  font-style: normal;
  font-weight: 400 500;
  font-display: swap;
  src: url("/assets/fonts/jetbrains-mono.woff2") format("woff2");
}
:root {
  --p-bg: #f6f5f1; --p-surface: #e8e9e6; --p-ink: #0a1a2a; --p-muted: #5a6570;
  --p-accent: #e8a33d; --p-accent-ink: #111111; --p-action: #0a1a2a; --p-action-ink: #f6f5f1;
  --p-inv-bg: #0a1a2a; --p-inv-surface: #182736; --p-inv-ink: #f6f5f1; --p-inv-muted: #939aa0;
  --p-inv-accent: #e8a33d; --p-inv-accent-ink: #111111; --p-inv-action: #e8a33d; --p-inv-action-ink: #111111;
  --font-display: "Schibsted Grotesk", system-ui, sans-serif;
  --font-text: "Schibsted Grotesk", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --display-weight: 400;
  --display-tracking: -0.035em;
  --display-tracking-xl: -0.042em;
  --ly-scale: 0.98;
}
`;

const PAGE_CSS = `
/* The hero's stage: the dealt mesh sits under the window, with the page
   surface as its ground so the UI never waits for the canvas. */
.hero--collage .hero__art { left: 0 !important; right: auto; }
.mo-la__sub { color: var(--ink); }
.app > .app__pane--list .d-win__rows { padding-bottom: 24px; }
.hero__art { background: var(--p-surface); }
.hero__art > .ly-piece--note { left: var(--s-6); bottom: var(--s-6); width: 300px; z-index: 2; }
.ly-piece--main .d-row { grid-template-columns: 36px minmax(0, 1fr) 96px; }
.ly-piece--main .d-main { padding-right: var(--ly-cut-room); }
@media (max-width: 639px) { .ly-piece--main .d-row { grid-template-columns: 36px minmax(0, 1fr) 84px; } }

/* hero window internals, built from the product's own list */
.d-win { --u-bg: #ffffff; }
.d-win__row { display: grid; grid-template-columns: minmax(0, 1fr) 96px; gap: 12px; align-items: center; padding: 11px 0; border-top: 1px solid rgb(10 26 42 / .07); }
.d-win__row:first-child { border-top: 0; }
.d-win__row b { display: block; font-weight: 500; font-size: 13px; color: #14202c; }
.d-win__row small { display: block; font-size: 12px; color: #5c6874; }
.d-chip { justify-self: end; font-size: 12px; padding: 3px 8px; border-radius: 999px; background: #eef1ef; color: #3d4a56; white-space: nowrap; }
.d-chip--ok { background: #e5f1ea; color: #17673f; }
.d-chip--warn { background: #fdf0dc; color: #8a5300; }
.d-note__line { display: flex; align-items: center; gap: 10px; padding: 7px 0; font-size: 13px; color: #3d4247; border-top: 1px solid rgb(0 0 0 / .06); }
.d-note__line:first-of-type { border-top: 0; }
.d-note__line i { width: 18px; height: 18px; border-radius: 50%; flex: none; display: grid; place-items: center; background: #e7f4ec; color: #17673f; font-style: normal; font-size: 13px; font-weight: 700; }
.d-note__line i.warn { background: #fdf0dc; color: #8a5300; }
.d-note__line b { font-weight: 500; color: #16181a; }

/* the product window, the app-frame recipe of sections-library.md */
.app.ui { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); margin-top: var(--s-7); background: var(--u-bg); border: 1px solid var(--u-border); border-radius: var(--u-r); box-shadow: var(--u-shadow); }
.app > .app__pane { position: relative; min-width: 0; min-height: 0; overflow: hidden; }
.app > .app__pane + .app__pane { border-left: 1px solid var(--u-line); }
.app > .app__pane > .ui-panel { width: 100%; border: 0; border-radius: 0; box-shadow: none; }
.app > .app__pane::after { content: ""; position: absolute; inset: auto 0 0 0; height: 64px; background: linear-gradient(transparent, var(--u-bg)); pointer-events: none; }
@media (min-width: 1024px) and (max-width: 1279px) { .app.ui { grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); } }
@media (max-width: 1023px) {
  .app.ui { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
  .app > .app__pane--list { max-height: 252px; }
  .app > .app__pane--list::after { display: none; }
  .app .ui-win__side { display: none; }
  .app .ui-win__body { grid-template-columns: minmax(0, 1fr); }
  .app > .app__pane + .app__pane { border-left: 0; border-top: 1px solid var(--u-line); }
}
@media (max-width: 639px) {
  .app.ui { grid-template-rows: minmax(0, 1fr); }
  .app > .app__pane--list { display: none; }
  .app > .app__pane + .app__pane { border-top: 0; }
}

/* the record pane: the client's own screen, in the kit's UI tokens */
.rec { padding: 24px 28px; }
.rec__head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.rec__head h4 { font: 500 16px/1.3 var(--font-text); margin: 0; color: var(--u-ink); }
.rec__meta { font-size: 12px; color: var(--u-muted); }
.rec__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 32px; margin-top: 16px; }
.rec__row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-top: 1px solid var(--u-line); font-size: 13px; }
.rec__row dt { color: var(--u-muted); }
.rec__row dd { margin: 0; font-weight: 500; color: var(--u-ink); text-align: right; }
@media (max-width: 639px) { .rec { padding: 20px; } .rec__grid { grid-template-columns: minmax(0, 1fr); } }

/* feature cards */
#fields .panel { --p-h: 300px; }
#fields .stage > .at-rise { --ax: 24px; --ay: 40px; }
@media (max-width: 639px) { #fields .panel { --p-h: 190px; } #fields .stage > .at-rise { --ay-sm: 24px; } }

/* verification steps */
.verify { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s-6); margin-top: var(--s-7); }
.verify__step { border-top: 1px solid var(--line); padding-top: var(--s-4); }
.verify__num { font: 500 var(--t-label)/1 var(--font-mono); color: var(--muted); }
.verify__step h3 { margin: var(--s-3) 0 var(--s-2); }
.verify__step p { margin: 0; }
.verify__log { margin: var(--s-7) 0 0; border-top: 1px solid var(--line); }
.verify__log > div { display: flex; justify-content: space-between; gap: var(--s-4); padding: 14px 0; border-bottom: 1px solid var(--line); }
.verify__log dt { color: var(--ink); font-size: var(--t-body); }
.verify__log dd { margin: 0; color: var(--muted); font-size: var(--t-small); font-variant-numeric: tabular-nums; }
.rec__review { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--u-line); }
.rec__review-head { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 12px; color: var(--u-muted); }
.rec__review-text { margin: 0; font-size: 13px; line-height: 1.5; color: var(--u-ink); }
.faq-grid { row-gap: var(--s-6); }
.faq-side__panel { --p-h: 380px; background: var(--p-surface); border: 0; display: grid; place-items: center; }
.faq-record { width: min(100% - 48px, 300px); background: #fff; border: 1px solid rgb(10 26 42 / .12); border-radius: 12px; padding: 20px; box-shadow: 0 18px 40px -28px rgb(10 26 42 / .5); }
.faq-record__head { margin: 0; font: 500 15px/1.3 var(--font-text); color: #14202c; }
.faq-record__sub { margin: 2px 0 14px; font-size: 12px; color: #5c6874; }
.faq-record dl { margin: 0; }
.faq-record dl > div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid rgb(10 26 42 / .08); font-size: 13px; }
.faq-record dt { color: #5c6874; }
.faq-record dd { margin: 0; font-weight: 500; color: #14202c; }
.faq-record__review { margin: 14px 0 0; padding-top: 12px; border-top: 1px solid rgb(10 26 42 / .08); font-size: 12px; color: #5c6874; display: flex; align-items: center; gap: 8px; }
@media (max-width: 1023px) { .faq-side { display: none; } }
/* the close keeps the page's one filled button: the inverse ground would turn it amber */
footer.footer--dark .btn--primary { background: var(--p-action); color: var(--p-action-ink); border-color: transparent; }
footer.footer--dark .btn--primary:hover { background: color-mix(in oklab, var(--p-action) 88%, white); }
@media (max-width: 767px) { .verify { grid-template-columns: minmax(0, 1fr); gap: var(--s-5); } }
.focus\:outline-none:focus, .focus\:outline-none:focus-visible { outline: 2px solid var(--action); outline-offset: 3px; }
:where(a, button, summary, input, textarea, select, [tabindex]):focus-visible { outline: 2px solid var(--action); outline-offset: 3px; }
`;

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/assets/system.css" />
      <link rel="stylesheet" href="/assets/ui/cards.css" />
      <link rel="stylesheet" href="/assets/motion/motion.css" />
      <link rel="stylesheet" href="/assets/backgrounds/backgrounds.css" />
      <link rel="stylesheet" href="/assets/layout/layout.css" />
      <link rel="stylesheet" href="/assets/layout/demo.css" />
      <link rel="stylesheet" href="/assets/icons/icon.css" />
      <link rel="stylesheet" href="/assets/ui/base.css" />
      <link rel="stylesheet" href="/assets/ui/checklist/fragment.css" />
      <link rel="stylesheet" href="/assets/ui/notify/fragment.css" />
      <link rel="stylesheet" href="/assets/ui/doc/fragment.css" />
      <link rel="stylesheet" href="/assets/ui/window/fragment.css" />
      <link rel="stylesheet" href="/assets/moments/iris-opens/moment.css" />
      <link rel="stylesheet" href="/assets/moments/letters-assemble/moment.css" />
      <style dangerouslySetInnerHTML={{ __html: PALETTE + PAGE_CSS }} />
      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700);" +
            "document.documentElement.classList.add('mo-js');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500);",
        }}
      />

      <header className="nav">
        <div className="wrap nav__bar">
          <a className="skip-link" href="#top">
            Skip to content
          </a>
          <a className="nav__logo" href="#top">
            <span className="mark" data-mark="ring" aria-hidden="true" />
            DriverCompass
          </a>
          <nav className="nav__links" aria-label="Main">
            <div className="nav__item">
              <a className="nav__link" href="#record">
                Records
                <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M3 4.5l3 3 3-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <div className="nav__menu">
                <div className="wrap grid">
                  <div className="menu-col span-3">
                    <p className="t-label">The record</p>
                    <a href="#record">
                      Pay and rotation<span>The fields that decide the job</span>
                    </a>
                    <a href="#fields">
                      Accommodation<span>Free, deducted or absent</span>
                    </a>
                    <a href="#fields">
                      Contracting entity<span>Direct employer or agency</span>
                    </a>
                  </div>
                  <div className="menu-col span-3">
                    <p className="t-label">Trust</p>
                    <a href="#verification">
                      Three checks<span>Identity, vacancy, review</span>
                    </a>
                    <a href="#questions">
                      Questions<span>What drivers ask first</span>
                    </a>
                  </div>
                  <a className="menu-card span-3 start-10" href="#record">
                    <div className="panel menu-card__panel">
                      <div className="menu-mini" aria-hidden="true">
                        <span>
                          <b>Gross pay</b>
                          <em>€2,950</em>
                        </span>
                        <span>
                          <b>Rotation</b>
                          <em>3 / 1</em>
                        </span>
                        <span>
                          <b>Home time</b>
                          <em>Week 36</em>
                        </span>
                      </div>
                    </div>
                    <span className="t-card">One record, 29 fields</span>
                    <span className="t-small muted">The same order for every employer</span>
                  </a>
                </div>
              </div>
            </div>
            <div className="nav__item">
              <a className="nav__link" href="#verification">
                Verification
              </a>
            </div>
            <div className="nav__item">
              <a className="nav__link" href="#questions">
                Questions
              </a>
            </div>
            <div className="nav__item">
              <a className="nav__link" href="/for-employers">
                Employers
              </a>
            </div>
          </nav>
          <div className="nav__actions">
            <a className="nav__link" href="/login">
              Log in
            </a>
            <a className="btn btn--primary" href="/register?role=driver">
              Create a profile
            </a>
          </div>
          <button className="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {children}

      <footer className="footer closing footer--dark ground-inverse" id="contact" aria-labelledby="close-h">
        <div className="wrap">
          <div className="closing__cta close--type">
            <div className="section-head">
              <h2 id="close-h">Create a profile</h2>
              <p>Free for drivers. No documents required, and no employer can browse the profile.</p>
            </div>
            <a className="btn btn--primary btn--xl btn--wide" href="/register?role=driver">
              Create a profile
              <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
                <path className="m-arrow__stem" d="M1 6h8" />
                <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
              </svg>
            </a>
          </div>
          <div className="closing__links">
            <div className="grid">
              <div className="span-4 stack-4">
                <a className="nav__logo" href="#top">
                  <span className="mark" data-mark="ring" aria-hidden="true" />
                  DriverCompass
                </a>
                <p className="footer__lede">Truck driving jobs with the conditions written down.</p>
              </div>
              <div className="span-2 footer__col">
                <h3>Drivers</h3>
                <ul>
                  <li>
                    <a href="/jobs">Find work</a>
                  </li>
                  <li>
                    <a href="#record">The record</a>
                  </li>
                  <li>
                    <a href="/register?role=driver">Create a profile</a>
                  </li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Employers</h3>
                <ul>
                  <li>
                    <a href="/companies">Company profiles</a>
                  </li>
                  <li>
                    <a href="/for-employers">Post a vacancy</a>
                  </li>
                  <li>
                    <a href="#verification">Verification</a>
                  </li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Product</h3>
                <ul>
                  <li>
                    <a href="/how-verification-works">How verification works</a>
                  </li>
                  <li>
                    <a href="/review-policy">Review policy</a>
                  </li>
                  <li>
                    <a href="#questions">Questions</a>
                  </li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Legal</h3>
                <ul>
                  <li>
                    <a href="/privacy">Privacy</a>
                  </li>
                  <li>
                    <a href="/terms">Terms</a>
                  </li>
                  <li>
                    <a href="/contact">Contact</a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="footer__legal">
              <span>&copy; 2026 DriverCompass</span>
            </div>
          </div>
        </div>
      </footer>

      <nav className="actionbar" aria-label="Quick actions">
        <a className="btn btn--primary" href="/register?role=driver">
          Create a profile
        </a>
      </nav>

      <KitBoot />
    </>
  );
}
