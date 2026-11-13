import type { CSSProperties } from "react";

const h = (n: number, extra?: CSSProperties): CSSProperties =>
  ({ "--h": n, ...extra }) as CSSProperties;

const VacancyRow = ({
  lane,
  employer,
  pay,
  status,
  tone = "",
}: {
  lane: string;
  employer: string;
  pay: string;
  status: string;
  tone?: string;
}) => (
  <li className="d-win__row">
    <span>
      <b>{lane}</b>
      <small>{employer}</small>
    </span>
    <span className={`d-chip${tone}`}>{status}</span>
  </li>
);

export default function MarketingHome() {
  return (
    <main id="top">
      {/* The hero, dealt: collage. Words on the left, the vacancy window on the
          lit mesh ground on the right, one record card over its lower-left. */}
      <section className="hero hero--collage" data-enter aria-labelledby="hero-h">
        <div className="wrap">
          <div className="hero-text grid hero__grid">
            <div className="hero__text span-5">
              <h1 id="hero-h">Truck jobs with the conditions written down</h1>
              <p className="hero__lead">
                DriverCompass lists international C+E jobs from direct employers. Every vacancy answers the
                same 29 fields, so two offers compare field by field.
              </p>
              <div className="btn-row">
                <a className="btn btn--primary" href="/register?role=driver">
                  Create a profile
                </a>
                <a className="btn btn--secondary" href="#record">
                  See a vacancy record
                </a>
              </div>
              <p className="hero__proof">Free for drivers. Employers pay to list.</p>
            </div>
            <div
              className="hero__art span-6 start-7"
              data-fx="gradient-mesh"
              data-fx-seed="41"
              role="img"
              aria-label="A list of DriverCompass vacancies with the open record's pay, rotation and accommodation"
            >
              <div className="ly-piece ly-piece--main d-win" aria-hidden="true">
                <div className="d-win__bar">
                  <span className="d-win__dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>DriverCompass · Vacancies</span>
                </div>
                <div className="d-win__body">
                  <div className="d-side">
                    <span className="is-on">
                      <i />
                      Open
                    </span>
                    <span>
                      <i />
                      Saved
                    </span>
                    <span>
                      <i />
                      Enquiries
                    </span>
                    <span>
                      <i />
                      Reviews
                    </span>
                    <span className="d-side__label">Countries</span>
                    <span>
                      <i />
                      NL
                    </span>
                    <span>
                      <i />
                      DE
                    </span>
                  </div>
                  <div className="d-main">
                    <div className="d-main__head">
                      <h4>Vacancies</h4>
                      <span className="d-btn">Direct employers</span>
                    </div>
                    <div className="d-tabs">
                      <span className="is-on">All 128</span>
                      <span>Reefer 41</span>
                      <span>Tank 18</span>
                    </div>
                    <ul className="d-rows">
                      <VacancyRow
                        lane="C+E reefer, NL–DE–DK"
                        employer="Direct employer · Rotterdam"
                        pay="€2,950"
                        status="Confirmed"
                        tone=" d-chip--ok"
                      />
                      <VacancyRow
                        lane="C+E tank, ADR"
                        employer="Direct employer · Bremen"
                        pay="€3,240"
                        status="Confirmed"
                        tone=" d-chip--ok"
                      />
                      <VacancyRow
                        lane="C+E container, NL"
                        employer="Agency declared · Venlo"
                        pay="€2,600"
                        status="Agency"
                        tone=" d-chip--warn"
                      />
                      <VacancyRow
                        lane="C+E box, DE–NL"
                        employer="Direct employer · Hamburg"
                        pay="€2,780"
                        status="Confirmed"
                        tone=" d-chip--ok"
                      />
                      <VacancyRow
                        lane="C+E reefer, NL–FR"
                        employer="Direct employer · Breda"
                        pay="€2,700"
                        status="Review due"
                        tone=" d-chip--warn"
                      />
                      <VacancyRow
                        lane="C+E tipper, DK"
                        employer="Direct employer · Aarhus"
                        pay="€3,100"
                        status="Confirmed"
                        tone=" d-chip--ok"
                      />
                    </ul>
                  </div>
                </div>
              </div>
              <div className="ly-piece ly-piece--note d-card" aria-hidden="true" data-ly-steps="700">
                <div className="d-card__row">
                  <h5>Record check</h5>
                  <span className="d-chip d-chip--ok" data-step data-step-at="4">
                    29 of 29
                  </span>
                </div>
                <div className="d-note__line" data-step>
                  <i>✓</i>
                  <span>
                    <b>Gross pay</b> and period confirmed
                  </span>
                </div>
                <div className="d-note__line" data-step>
                  <i>✓</i>
                  <span>
                    <b>Rotation</b> 3 weeks out, 1 home
                  </span>
                </div>
                <div className="d-note__line" data-step>
                  <i>✓</i>
                  <span>
                    <b>Accommodation</b> free, single room
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The product, big: the vacancy list beside the open record. */}
      <section className="section" id="record" aria-labelledby="record-h" style={h(1)}>
        <div className="wrap">
          <div className="grid">
            <div className="span-5">
              <h2 id="record-h">Job conditions, in one record</h2>
            </div>
            <div className="span-6 start-7">
              <p className="t-lead">
                Pay, rotation, home time, accommodation, loading and who signs the contract. The same fields
                in the same order, so a missing answer is visible before you reply.
              </p>
              <a className="link" href="#fields">
                See what the record holds
              </a>
            </div>
          </div>

          <div
            className="ui app fill"
            role="img"
            aria-label="DriverCompass vacancies beside the open vacancy record for a reefer job between the Netherlands, Germany and Denmark"
          >
            <div className="app__pane app__pane--list">
              <div className="ui-panel d-win">
                <div className="d-win__bar">
                  <span className="d-win__dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>DriverCompass · Vacancies</span>
                </div>
                <ul className="d-win__rows">
                  <VacancyRow
                    lane="C+E reefer, NL–DE–DK"
                    employer="Direct employer · Rotterdam"
                    pay="€2,950"
                    status="Confirmed"
                    tone=" d-chip--ok"
                  />
                  <VacancyRow
                    lane="C+E tank, ADR"
                    employer="Direct employer · Bremen"
                    pay="€3,240"
                    status="Confirmed"
                    tone=" d-chip--ok"
                  />
                  <VacancyRow
                    lane="C+E container, NL"
                    employer="Agency declared · Venlo"
                    pay="€2,600"
                    status="Agency"
                    tone=" d-chip--warn"
                  />
                  <VacancyRow
                    lane="C+E box, DE–NL"
                    employer="Direct employer · Hamburg"
                    pay="€2,780"
                    status="Confirmed"
                    tone=" d-chip--ok"
                  />
                  <VacancyRow
                    lane="C+E reefer, NL–FR"
                    employer="Direct employer · Breda"
                    pay="€2,700"
                    status="Review due"
                    tone=" d-chip--warn"
                  />
                  <VacancyRow
                    lane="C+E tipper, DK"
                    employer="Direct employer · Aarhus"
                    pay="€3,100"
                    status="Confirmed"
                    tone=" d-chip--ok"
                  />
                  <VacancyRow
                    lane="C+E ADR tank container"
                    employer="Direct employer · Antwerp"
                    pay="€3,350"
                    status="Confirmed"
                    tone=" d-chip--ok"
                  />
                  <VacancyRow
                    lane="C+E tramping, NL–BE"
                    employer="Agency declared · Tilburg"
                    pay="€2,560"
                    status="Agency"
                    tone=" d-chip--warn"
                  />
                  <VacancyRow
                    lane="C+E reefer, NL–SE"
                    employer="Direct employer · Gothenburg"
                    pay="€3,020"
                    status="Confirmed"
                    tone=" d-chip--ok"
                  />
                  <VacancyRow
                    lane="C+E box, PL–DE"
                    employer="Direct employer · Poznań"
                    pay="€2,640"
                    status="Verifying"
                  />
                </ul>
              </div>
            </div>
            <div className="app__pane app__pane--open">
              <div className="ui-panel rec">
                <div className="rec__head">
                  <h4>C+E reefer, NL–DE–DK</h4>
                  <span className="d-chip d-chip--ok">Confirmed</span>
                  <span className="rec__meta">Rotterdam · updated 12 Nov</span>
                </div>
                <dl className="rec__grid">
                  <div className="rec__row">
                    <dt>Gross pay</dt>
                    <dd>€2,950 / month</dd>
                  </div>
                  <div className="rec__row">
                    <dt>Allowances</dt>
                    <dd>Night per CAO</dd>
                  </div>
                  <div className="rec__row">
                    <dt>Rotation</dt>
                    <dd>3 out, 1 home</dd>
                  </div>
                  <div className="rec__row">
                    <dt>Home time</dt>
                    <dd>Week 36 at home</dd>
                  </div>
                  <div className="rec__row">
                    <dt>Weekly rest</dt>
                    <dd>Hotel at depot</dd>
                  </div>
                  <div className="rec__row">
                    <dt>Accommodation</dt>
                    <dd>Free, single room</dd>
                  </div>
                  <div className="rec__row">
                    <dt>Loading</dt>
                    <dd>Occasional</dd>
                  </div>
                  <div className="rec__row">
                    <dt>Truck</dt>
                    <dd>Volvo FH 2022</dd>
                  </div>
                  <div className="rec__row">
                    <dt>Contract</dt>
                    <dd>Direct employer</dd>
                  </div>
                  <div className="rec__row">
                    <dt>Apply</dt>
                    <dd>Email the employer</dd>
                  </div>
                </dl>
                <div className="rec__review">
                  <p className="rec__review-head">
                    Driver review <span className="d-chip d-chip--ok">Verified</span>
                  </p>
                  <p className="rec__review-text">
                    &ldquo;Rotation held for eight months. Pay was gross and on time; the Friday
                    handover was the long part.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What the record holds: three fragments on lit panels. */}
      <section className="section" id="fields" aria-labelledby="fields-h" style={h(1)}>
        <div className="wrap">
          <div className="section-head">
            <h2 id="fields-h">
              Conditions the advert leaves out. <span className="muted">Pay, rotation, home time, accommodation.</span>
            </h2>
          </div>
          <div className="grid cards-3">
            <article className="card card--row span-4">
              <h3>Pay is gross, with the period</h3>
              <p>The range, the period and every allowance, checked against the employer&rsquo;s own words.</p>
              <div className="panel">
                <div className="stage">
                  <div
                    className="at-rise fit"
                    style={{ "--fit-max": "340px", "--ax": "24px", "--ay": "40px" } as CSSProperties}
                    data-ui-loop
                  >
                    <div className="ui ui-panel ui-checks" data-ui="checklist">
                      <div className="ui-checks__head">
                        <div className="ui-title">Vacancy record</div>
                        <span className="ui-spacer" />
                        <div className="ui-meta" data-checks-count>
                          12 of 12
                        </div>
                      </div>
                      <div className="ui-checks__bar">
                        <i data-checks-bar style={{ "--k": 1 } as CSSProperties} />
                      </div>
                      <ul className="ui-checks__list">
                        <li className="ui-check is-done">
                          <span className="ui-check__box">
                            <svg viewBox="0 0 16 16">
                              <path d="m4.5 8.2 2.3 2.3 4.7-5" />
                            </svg>
                          </span>
                          <span className="ui-check__label">Gross €2,950 a month</span>
                        </li>
                        <li className="ui-check is-done">
                          <span className="ui-check__box">
                            <svg viewBox="0 0 16 16">
                              <path d="m4.5 8.2 2.3 2.3 4.7-5" />
                            </svg>
                          </span>
                          <span className="ui-check__label">8% holiday allowance</span>
                        </li>
                        <li className="ui-check is-done">
                          <span className="ui-check__box">
                            <svg viewBox="0 0 16 16">
                              <path d="m4.5 8.2 2.3 2.3 4.7-5" />
                            </svg>
                          </span>
                          <span className="ui-check__label">Night allowance, CAO road</span>
                        </li>
                        <li className="ui-check is-done">
                          <span className="ui-check__box">
                            <svg viewBox="0 0 16 16">
                              <path d="m4.5 8.2 2.3 2.3 4.7-5" />
                            </svg>
                          </span>
                          <span className="ui-check__label">No net per-day construction</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="card card--row span-4">
              <h3>Reviews from drivers who were there</h3>
              <p>The platform checks the employer, the relationship and the period. Never the opinion.</p>
              <div className="panel">
                <div className="stage stage--fade-b">
                  <div
                    className="at-rise fit"
                    style={
                      {
                        "--fit-max": "380px",
                        "--ax": "24px",
                        "--ay": "calc(100% - 180px)",
                        "--ay-sm": "24px",
                      } as CSSProperties
                    }
                  >
                    <div className="ui ui-notify" data-ui="notify">
                      <ul className="ui-notify__list" data-notify-list>
                        <li className="ui-note">
                          <span className="ui-note__ico">
                            <svg className="ui-icon" viewBox="0 0 16 16">
                              <path d="m3.5 8.4 2.8 2.8 6.2-6.4" />
                            </svg>
                          </span>
                          <span className="ui-note__text">
                            <span className="ui-note__title">
                              Review verified<time>2d</time>
                            </span>
                            <span className="ui-note__body">Employer, contract and period confirmed</span>
                          </span>
                        </li>
                        <li className="ui-note">
                          <span className="ui-note__ico">
                            <svg className="ui-icon" viewBox="0 0 16 16">
                              <path d="M3 4h10v6H8l-3 2v-2H3z" />
                            </svg>
                          </span>
                          <span className="ui-note__text">
                            <span className="ui-note__title">
                              Employer replied<time>4d</time>
                            </span>
                            <span className="ui-note__body">Right of reply on every review</span>
                          </span>
                        </li>
                        <li className="ui-note">
                          <span className="ui-note__ico">
                            <svg className="ui-icon" viewBox="0 0 16 16">
                              <circle cx="8" cy="8" r="5.5" />
                              <path d="M8 5v3l2 1.5" />
                            </svg>
                          </span>
                          <span className="ui-note__text">
                            <span className="ui-note__title">
                              One review per contract<time>1w</time>
                            </span>
                            <span className="ui-note__body">No campaigns, no paid placement</span>
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="card card--row span-4">
              <h3>Agencies declare themselves</h3>
              <p>Every company states its role. An agency listed as a direct employer is suspended.</p>
              <div className="panel">
                <div className="stage stage--fade-b">
                  <div
                    className="at-corner to-edge"
                    style={{ "--ax": "24px", "--ay": "32px" } as CSSProperties}
                  >
                    <div className="ui ui-doc" data-ui="doc">
                      <article className="ui-doc__page">
                        <div className="ui-doc__label">Company profile · Example Carrier Demo B.V.</div>
                        <div className="ui-doc__title">Hiring model</div>
                        <div className="ui-doc__text">
                          This company hires drivers on its own contracts.{" "}
                          <mark className="ui-doc__mark is-on">Direct employer</mark>, declared and checked
                          against the registration.
                        </div>
                        <div className="ui-doc__text">
                          Vacancies are published by the entity that signs the contract:{" "}
                          <mark
                            className="ui-doc__mark"
                            data-kind="Check"
                            data-msg="A second entity signs: the vacancy must name it."
                            data-where="Company record, updated 12 Nov"
                          >
                            one contracting entity
                          </mark>{" "}
                          per vacancy.
                        </div>
                        <div className="ui-doc__text">
                          Agencies, subcontractors and intermediaries declare their role before a vacancy
                          goes live.
                        </div>
                        <div className="ui-doc__text">
                          A company that misstates its role loses publishing rights.
                        </div>
                      </article>
                      <aside className="ui-doc__note ui-panel is-on" aria-live="polite">
                        <div className="ui-doc__kind">
                          <span className="ui-doc__dot" />
                          <span data-doc-kind>Checked</span>
                        </div>
                        <div className="ui-doc__msg" data-doc-msg>
                          Direct employer, matched to the registration.
                        </div>
                        <div className="ui-doc__where" data-doc-where>
                          Company record, 12 Nov
                        </div>
                      </aside>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Verification on the inverse ground: the dealt iris-opens moment. */}
      <section
        className="section ground-inverse"
        id="verification"
        aria-labelledby="verification-h"
        data-moment="iris-opens"
        data-moment-opts='{"from": "base"}'
        style={h(1)}
      >
        <div className="wrap">
          <div className="section-head">
            <h2 id="verification-h">
              How verification works. <span className="muted">Three checks, and a subscription moves none of them.</span>
            </h2>
            <p>
              Each check is shown on its own, with the date it was made, so a paid listing never reads as a
              verified one.
            </p>
          </div>
          <div className="verify">
            <div className="verify__step">
              <p className="verify__num">01</p>
              <h3>Employer identity</h3>
              <p>Legal name and registration number checked against the register, once a year.</p>
            </div>
            <div className="verify__step">
              <p className="verify__num">02</p>
              <h3>Vacancy conditions</h3>
              <p>Pay, rotation, home time and accommodation confirmed with the employer.</p>
            </div>
            <div className="verify__step">
              <p className="verify__num">03</p>
              <h3>Driver reviews</h3>
              <p>The driver&rsquo;s contract and dates checked. The opinion stays theirs.</p>
            </div>
          </div>
          <dl className="verify__log">
            <div>
              <dt>Employer identity</dt>
              <dd>Checked 12 Nov 2026</dd>
            </div>
            <div>
              <dt>Vacancy conditions</dt>
              <dd>Confirmed 12 Nov 2026</dd>
            </div>
            <div>
              <dt>Review, contract and dates</dt>
              <dd>Checked 9 Nov 2026</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* The dealt letters-assemble statement. */}
      <section className="section" id="why" data-moment="letters-assemble" style={h(1)}>
        <div className="wrap">
          <h2 className="mo-la__type">Real drivers. Real conditions.</h2>
          <p className="mo-la__sub">
            An advert says what a company promises. A record states the conditions, and a review
            says what the work was like for the driver who was there.
          </p>
        </div>
      </section>

      {/* Questions, every answer open. */}
      <section className="section" id="questions" aria-labelledby="questions-h" style={h(1)}>
        <div className="wrap">
          <div className="section-head">
            <h2 id="questions-h">Questions drivers ask</h2>
          </div>
          <div className="grid faq-grid">
            <div className="faq span-7">
            <div className="faq__item">
              <h3>Is DriverCompass a recruitment agency?</h3>
              <p>
                No. We publish the conditions, record what drivers report and carry the enquiry. The employment
                discussion happens directly between driver and employer.
              </p>
            </div>
            <div className="faq__item">
              <h3>Can an employer pay for better reviews?</h3>
              <p>
                No. A subscription buys listing tools. It moves no review, score, check or ranking, and a paid
                listing is never marked verified.
              </p>
            </div>
            <div className="faq__item">
              <h3>What does it cost a driver?</h3>
              <p>
                Nothing. Reading records and reviews, and contacting employers through the platform, are free.
              </p>
            </div>
            <div className="faq__item">
              <h3>Do I have to upload my CV or my documents?</h3>
              <p>
                No. Profiles work without documents. Optional checks are never public, and you can remove them.
              </p>
            </div>
            <div className="faq__item">
              <h3>What happens to my reviews if I hide my profile?</h3>
              <p>
                They stay published: hiding a profile hides you, not what you reported. You choose what is
                shown next to a review.
              </p>
            </div>
            </div>
            <aside className="span-4 start-9 faq-side">
              <div className="panel faq-side__panel" role="img" aria-label="A vacancy record with its four deciding fields and a verified driver review">
                <div className="faq-record" aria-hidden="true">
                  <p className="faq-record__head">C+E reefer, NL–DE–DK</p>
                  <p className="faq-record__sub">Direct employer · Rotterdam</p>
                  <dl>
                    <div>
                      <dt>Gross pay</dt>
                      <dd>€2,950 / month</dd>
                    </div>
                    <div>
                      <dt>Rotation</dt>
                      <dd>3 out, 1 home</dd>
                    </div>
                    <div>
                      <dt>Home time</dt>
                      <dd>Week 36</dd>
                    </div>
                    <div>
                      <dt>Accommodation</dt>
                      <dd>Free, single</dd>
                    </div>
                  </dl>
                  <p className="faq-record__review">
                    <span className="d-chip d-chip--ok">Review verified</span> Contract and dates checked
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
