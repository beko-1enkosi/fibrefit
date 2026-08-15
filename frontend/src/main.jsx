import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const FALLBACK_AREAS = ['Midrand', 'Sandton', 'Centurion'];
const AREA_COORDS = {
  Midrand: [-25.9992, 28.1263],
  Sandton: [-26.1076, 28.0567],
  Centurion: [-25.8603, 28.1894],
};

const USAGE_OPTIONS = [
  { value: 'streaming', label: 'Streaming' },
  { value: 'remote work', label: 'Remote work' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'studying', label: 'Studying' },
  { value: 'browsing', label: 'General browsing' },
];

const ISSUE_OPTIONS = [
  'No internet',
  'Slow internet',
  'Unstable connection',
  'Outage',
  'Poor service',
];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function MapFocus({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

function App() {
  const [areas, setAreas] = useState(FALLBACK_AREAS);
  const [area, setArea] = useState('Midrand');
  const [packages, setPackages] = useState([]);
  const [reports, setReports] = useState([]);
  const [budget, setBudget] = useState(800);
  const [household, setHousehold] = useState(4);
  const [usage, setUsage] = useState(['streaming', 'remote work']);
  const [includeCurrentPlan, setIncludeCurrentPlan] = useState(true);
  const [currentSpeed, setCurrentSpeed] = useState(50);
  const [currentPrice, setCurrentPrice] = useState(799);
  const [results, setResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [apiWarning, setApiWarning] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');
  const [showAssistant, setShowAssistant] = useState(false);
  const [question, setQuestion] = useState('Why is this my best match?');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/areas`)
      .then((response) => {
        if (!response.ok) throw new Error('Could not load areas');
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length) setAreas(data);
      })
      .catch(() => {
        setAreas(FALLBACK_AREAS);
        setApiWarning('Backend unavailable. Start FastAPI to use live FibreFit demo data.');
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API}/packages?area=${encodeURIComponent(area)}`).then((r) => {
        if (!r.ok) throw new Error('Could not load packages');
        return r.json();
      }),
      fetch(`${API}/reports?area=${encodeURIComponent(area)}`).then((r) => {
        if (!r.ok) throw new Error('Could not load reports');
        return r.json();
      }),
    ])
      .then(([packageData, reportData]) => {
        if (cancelled) return;
        setPackages(packageData);
        setReports(reportData);
        setApiWarning('');
      })
      .catch(() => {
        if (cancelled) return;
        setPackages([]);
        setReports([]);
        setApiWarning('We could not reach the FibreFit API. Check that the FastAPI server is running.');
      });

    return () => {
      cancelled = true;
    };
  }, [area]);

  const coords = AREA_COORDS[area] || AREA_COORDS.Midrand;

  const networks = useMemo(
    () => [...new Set(packages.map((item) => item.network))].sort(),
    [packages],
  );

  const isps = useMemo(
    () => [...new Set(packages.map((item) => item.isp))].sort(),
    [packages],
  );

  const reportCounts = useMemo(() => {
    const counts = {};
    reports.forEach((report) => {
      counts[report.issue_type] = (counts[report.issue_type] || 0) + 1;
    });
    return counts;
  }, [reports]);

  function toggleUsage(item) {
    setUsage((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  }

  async function findMatch() {
    setRecommendationError('');
    setLoadingResults(true);
    setResults(null);

    if (!usage.length) {
      setRecommendationError('Choose at least one main internet use.');
      setLoadingResults(false);
      return;
    }

    try {
      const response = await fetch(`${API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area,
          budget: Number(budget),
          household_size: Number(household),
          usage,
          current_speed: includeCurrentPlan ? Number(currentSpeed) || null : null,
          current_price: includeCurrentPlan ? Number(currentPrice) || null : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not calculate a recommendation.');

      setResults(data);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (error) {
      setRecommendationError(error.message || 'Could not calculate a recommendation.');
    } finally {
      setLoadingResults(false);
    }
  }

  async function ask(customQuestion) {
    const nextQuestion = customQuestion || question;
    if (!nextQuestion.trim()) return;
    setQuestion(nextQuestion);
    setAnswer('');
    setAsking(true);

    try {
      const response = await fetch(`${API}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: nextQuestion,
          context: results || { area, budget, household_size: household, usage, packages },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Assistant request failed.');
      setAnswer(data.answer || 'No answer returned.');
    } catch (error) {
      setAnswer(error.message || 'The assistant is unavailable right now.');
    } finally {
      setAsking(false);
    }
  }

  function handleAreaCheck() {
    scrollToId('area-overview');
  }

  function handleReportCreated(report) {
    setReports((current) => [report, ...current]);
    setReportSuccess('Thanks — your report has been added to the community feed.');
    window.setTimeout(() => setReportSuccess(''), 4000);
  }

  return (
    <div className="appShell">
      <header className="siteHeader">
        <button className="brandButton" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          FibreFit
        </button>
        <nav aria-label="Main navigation">
          <button className="navLink" onClick={() => scrollToId('finder')}>Find Fibre</button>
          <button className="navLink" onClick={() => scrollToId('community')}>Community</button>
          <button className="navLink" onClick={() => scrollToId('compare')}>Compare</button>
          <button className="secondaryButton" onClick={() => setShowReport(true)}>Report issue</button>
        </nav>
      </header>

      {apiWarning && <div className="statusBanner warning">{apiWarning}</div>}
      {reportSuccess && <div className="statusBanner success">{reportSuccess}</div>}

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">Connectivity decisions, made clearer.</p>
          <h1 id="hero-title">Find better fibre. Know when to switch.</h1>
          <p className="heroCopy">
            See what fibre is available in your area, compare packages against your household needs,
            and check what your community is reporting before you make a decision.
          </p>

          <div className="locationSearch">
            <label>
              <span>Your area</span>
              <select value={area} onChange={(event) => setArea(event.target.value)}>
                {areas.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <button className="primaryButton" onClick={handleAreaCheck}>Check my area</button>
          </div>

          <p className="demoNotice">
            Hackathon demo: coverage, reliability and package information is curated demo data, not live provider data.
          </p>
        </section>

        <section id="area-overview" className="sectionBlock areaOverview">
          <div className="sectionHeading">
            <p className="eyebrow">Area overview</p>
            <h2>What does FibreFit know about {area}?</h2>
            <p>Start with availability and community context before choosing a package.</p>
          </div>

          <div className="summaryGrid">
            <article className="summaryCard">
              <strong>{packages.length}</strong>
              <span>demo packages</span>
            </article>
            <article className="summaryCard">
              <strong>{networks.length}</strong>
              <span>fibre networks</span>
            </article>
            <article className="summaryCard">
              <strong>{isps.length}</strong>
              <span>ISPs represented</span>
            </article>
            <article className="summaryCard">
              <strong>{reports.length}</strong>
              <span>community reports</span>
            </article>
          </div>

          <div className="areaGrid">
            <div className="mapPanel">
              <div className="mapMeta">
                <div>
                  <h3>{area} connectivity map</h3>
                  <p>Demo location and recent community issue markers.</p>
                </div>
                <div className="legend" aria-label="Map legend">
                  <span><i className="dot areaDot" /> Area</span>
                  <span><i className="dot reportDot" /> Report</span>
                </div>
              </div>

              <MapContainer center={coords} zoom={13}>
                <MapFocus center={coords} />
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <CircleMarker center={coords} radius={10} pathOptions={{ color: '#222', fillOpacity: 0.8 }}>
                  <Popup>{area} demo fibre area</Popup>
                </CircleMarker>
                {reports.map((report, index) => (
                  <CircleMarker
                    key={report.id}
                    center={[
                      coords[0] + 0.0045 * ((index % 4) + 1),
                      coords[1] - 0.004 * ((index % 5) + 1),
                    ]}
                    radius={7}
                    pathOptions={{ color: '#8a2d2d', fillOpacity: 0.75 }}
                  >
                    <Popup>
                      <strong>{report.issue_type}</strong><br />
                      {report.network || 'Network not supplied'}<br />
                      {report.note || 'No extra note supplied'}
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>

            <aside className="availabilityPanel">
              <h3>Networks available in demo data</h3>
              {networks.length ? (
                <div className="plainList">
                  {networks.map((network) => (
                    <div className="plainListRow" key={network}>
                      <span>{network}</span>
                      <small>{packages.filter((item) => item.network === network).length} package(s)</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No package data loaded for this area.</p>
              )}
              <button className="textButton" onClick={() => scrollToId('finder')}>Find a package that fits me →</button>
            </aside>
          </div>
        </section>

        <section id="finder" className="sectionBlock finder">
          <div className="sectionHeading">
            <p className="eyebrow">Find my FibreFit</p>
            <h2>Tell us what your household actually needs.</h2>
            <p>FibreFit ranks the demo packages instead of showing you every option at once.</p>
          </div>

          <div className="finderLayout">
            <div className="finderForm">
              <div className="formGrid">
                <label>
                  <span>Monthly budget (R)</span>
                  <input
                    type="number"
                    min="100"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                  />
                </label>
                <label>
                  <span>People using the connection</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={household}
                    onChange={(event) => setHousehold(event.target.value)}
                  />
                </label>
              </div>

              <fieldset>
                <legend>Main internet use</legend>
                <p className="fieldHelp">Choose all that apply.</p>
                <div className="chips">
                  {USAGE_OPTIONS.map((option) => (
                    <button
                      type="button"
                      className={usage.includes(option.value) ? 'chip active' : 'chip'}
                      onClick={() => toggleUsage(option.value)}
                      key={option.value}
                      aria-pressed={usage.includes(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="currentPlanBox">
                <label className="checkboxLabel">
                  <input
                    type="checkbox"
                    checked={includeCurrentPlan}
                    onChange={(event) => setIncludeCurrentPlan(event.target.checked)}
                  />
                  <span>I already have fibre and want to compare my current plan</span>
                </label>

                {includeCurrentPlan && (
                  <div className="formGrid currentPlanFields">
                    <label>
                      <span>Current speed (Mbps)</span>
                      <input
                        type="number"
                        min="1"
                        value={currentSpeed}
                        onChange={(event) => setCurrentSpeed(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Current monthly price (R)</span>
                      <input
                        type="number"
                        min="1"
                        value={currentPrice}
                        onChange={(event) => setCurrentPrice(event.target.value)}
                      />
                    </label>
                  </div>
                )}
              </div>

              {recommendationError && <p className="formError">{recommendationError}</p>}

              <button className="primaryButton" onClick={findMatch} disabled={loadingResults}>
                {loadingResults ? 'Calculating your FibreFit…' : 'Find my best match'}
              </button>
            </div>

            <aside className="finderExplainer">
              <h3>How FibreFit uses this</h3>
              <ol>
                <li>Filters packages to your selected area.</li>
                <li>Checks your budget and household size.</li>
                <li>Matches speed and use cases to your needs.</li>
                <li>Ranks useful alternatives without asking AI to choose for you.</li>
              </ol>
            </aside>
          </div>
        </section>

        {results?.best_match && (
          <section id="compare" className="sectionBlock results" ref={resultRef}>
            <div className="sectionHeading">
              <p className="eyebrow">Your FibreFit</p>
              <h2>Three useful options. No package overload.</h2>
              <p>These results come from FibreFit's scoring logic using the demo dataset.</p>
            </div>

            <div className="cards">
              <RecommendationCard label="Best match" item={results.best_match} featured />
              <RecommendationCard label="Best value" item={results.best_value} />
              <RecommendationCard label="Fastest" item={results.fastest} />
            </div>

            {results.current_comparison && (
              <div className="comparisonPanel">
                <div>
                  <p className="eyebrow">Switch smarter</p>
                  <h3>How does the best match compare with what you have?</h3>
                </div>

                <div className="comparisonGrid">
                  <article>
                    <span>Current plan</span>
                    <strong>{results.current_comparison.current_speed} Mbps</strong>
                    <p>R{results.current_comparison.current_price}/month</p>
                  </article>
                  <div className="comparisonArrow" aria-hidden="true">→</div>
                  <article>
                    <span>FibreFit best match</span>
                    <strong>{results.current_comparison.recommended_speed} Mbps</strong>
                    <p>R{results.current_comparison.recommended_price}/month</p>
                  </article>
                </div>

                <ComparisonMessage comparison={results.current_comparison} />
                <div className="comparisonActions">
                  <button className="secondaryButton" onClick={() => {
                    setQuestion('Should I switch from my current package?');
                    setShowAssistant(true);
                  }}>
                    Ask FibreFit to explain this
                  </button>
                  <button className="textButton" onClick={() => scrollToId('community')}>
                    Check community reports first →
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <section id="community" className="sectionBlock community">
          <div className="sectionHeading">
            <p className="eyebrow">Community connectivity</p>
            <h2>Is it only you?</h2>
            <p>Community reports are signals from users, not official provider outage declarations.</p>
          </div>

          <div className="communityLayout">
            <div>
              <div className="issueSummary">
                {Object.keys(reportCounts).length ? (
                  Object.entries(reportCounts).map(([issue, count]) => (
                    <div className="issueSummaryRow" key={issue}>
                      <span>{issue}</span>
                      <strong>{count}</strong>
                    </div>
                  ))
                ) : (
                  <p>No reports yet for {area}.</p>
                )}
              </div>
              <button className="secondaryButton" onClick={() => setShowReport(true)}>Report my connection</button>
            </div>

            <div className="reportFeed">
              <div className="feedHeader">
                <h3>Recent activity in {area}</h3>
                <span>{reports.length} report{reports.length === 1 ? '' : 's'}</span>
              </div>
              {reports.length ? (
                reports.map((report) => <ReportCard report={report} key={report.id} />)
              ) : (
                <div className="emptyState">
                  <p>No community reports have been added for this demo area yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="sectionBlock finalCallout">
          <p className="eyebrow">FibreFit principle</p>
          <h2>We are not fixing fibre infrastructure.</h2>
          <p>We are helping consumers understand the options and information around their connectivity so they can make better decisions.</p>
          <button className="primaryButton" onClick={() => scrollToId('finder')}>Find my FibreFit</button>
        </section>
      </main>

      <footer>
        <strong>FibreFit</strong>
        <p>Find better fibre. Know when to switch.</p>
        <small>Hackathon MVP using curated demo data.</small>
      </footer>

      <button
        className="assistantButton"
        onClick={() => setShowAssistant((open) => !open)}
        aria-label="Open FibreFit assistant"
        aria-expanded={showAssistant}
      >
        ?
      </button>

      {showAssistant && (
        <AssistantPanel
          question={question}
          setQuestion={setQuestion}
          answer={answer}
          asking={asking}
          onAsk={ask}
          onClose={() => setShowAssistant(false)}
          hasResults={Boolean(results?.best_match)}
        />
      )}

      {showReport && (
        <ReportModal
          area={area}
          networks={networks}
          isps={isps}
          onClose={() => setShowReport(false)}
          onCreated={handleReportCreated}
        />
      )}
    </div>
  );
}

function RecommendationCard({ label, item, featured = false }) {
  const packageInfo = item.package;
  return (
    <article className={featured ? 'recommendationCard featured' : 'recommendationCard'}>
      <div className="cardTopline">
        <span className="cardLabel">{label}</span>
        <strong>{item.match_percentage}% match</strong>
      </div>
      <h3>{packageInfo.isp}</h3>
      <p>{packageInfo.network} network</p>
      <div className="speedValue">
        {packageInfo.download_mbps}<small> Mbps</small>
      </div>
      <p className="uploadText">Upload: {packageInfo.upload_mbps} Mbps</p>
      <strong className="priceValue">R{packageInfo.price}/month</strong>
      <p className="contractText">{packageInfo.contract}</p>
      <ul>
        {item.reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
    </article>
  );
}

function ComparisonMessage({ comparison }) {
  const faster = comparison.recommended_speed > comparison.current_speed;
  const saving = comparison.monthly_saving > 0;

  if (faster && saving) {
    return (
      <p className="comparisonMessage">
        This demo option gives you {comparison.recommended_speed - comparison.current_speed} Mbps more download speed while saving about R{comparison.monthly_saving} per month (R{comparison.annual_saving} per year).
      </p>
    );
  }

  if (saving) {
    return (
      <p className="comparisonMessage">
        This demo option could save about R{comparison.monthly_saving} per month (R{comparison.annual_saving} per year). Compare the speed and suitability before switching.
      </p>
    );
  }

  if (faster) {
    return (
      <p className="comparisonMessage">
        This option costs more, but offers {comparison.recommended_speed - comparison.current_speed} Mbps more download speed. FibreFit treats that as a performance/value trade-off, not an automatic reason to switch.
      </p>
    );
  }

  return (
    <p className="comparisonMessage">
      FibreFit has not found a clear price-and-speed win here. That is useful too: the platform should not recommend switching just for the sake of switching.
    </p>
  );
}

function ReportCard({ report }) {
  const date = report.created_at ? new Date(report.created_at) : null;
  const displayDate = date && !Number.isNaN(date.valueOf())
    ? date.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Recently';

  return (
    <article className="reportCard">
      <div>
        <strong>{report.issue_type}</strong>
        <span>{report.area} · {report.network || 'Network not supplied'}</span>
      </div>
      <small>{displayDate}</small>
      {report.note && <p>{report.note}</p>}
    </article>
  );
}

function AssistantPanel({ question, setQuestion, answer, asking, onAsk, onClose, hasResults }) {
  const prompts = hasResults
    ? [
        'Why is this my best match?',
        'Can I get something cheaper?',
        'Is this enough for my household?',
        'Should I switch from my current package?',
      ]
    : [
        'What speed might my household need?',
        'What is the difference between an ISP and a fibre network?',
      ];

  return (
    <aside className="assistantPanel" aria-label="FibreFit assistant">
      <button className="closeButton" onClick={onClose} aria-label="Close assistant">×</button>
      <p className="eyebrow">Ask about FibreFit</p>
      <h3>FibreFit assistant</h3>
      <p>{hasResults ? 'Ask about the recommendation FibreFit calculated.' : 'Run a recommendation for the most useful personalised answers.'}</p>

      <div className="promptList">
        {prompts.map((prompt) => (
          <button type="button" key={prompt} onClick={() => onAsk(prompt)}>{prompt}</button>
        ))}
      </div>

      <label>
        <span>Your question</span>
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
      </label>
      <button className="primaryButton" onClick={() => onAsk()} disabled={asking}>
        {asking ? 'Asking…' : 'Ask FibreFit'}
      </button>

      {answer && <div className="assistantAnswer">{answer}</div>}
    </aside>
  );
}

function ReportModal({ area, networks, isps, onClose, onCreated }) {
  const [issue, setIssue] = useState('Slow internet');
  const [network, setNetwork] = useState('');
  const [isp, setIsp] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area,
          issue_type: issue,
          network: network || null,
          isp: isp || null,
          note: note.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not submit your report.');
      onCreated(data);
      onClose();
    } catch (submitError) {
      setError(submitError.message || 'Could not submit your report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modalBackdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <button className="closeButton" onClick={onClose} aria-label="Close report form">×</button>
        <p className="eyebrow">Community report</p>
        <h2 id="report-title">Report a connectivity issue</h2>
        <p>Your report is a community signal. It does not create an official provider outage ticket.</p>

        <form onSubmit={submit}>
          <label>
            <span>Area</span>
            <input value={area} readOnly />
          </label>

          <label>
            <span>What is happening?</span>
            <select value={issue} onChange={(event) => setIssue(event.target.value)}>
              {ISSUE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <div className="formGrid">
            <label>
              <span>Network (optional)</span>
              <select value={network} onChange={(event) => setNetwork(event.target.value)}>
                <option value="">Not sure</option>
                {networks.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>ISP (optional)</span>
              <select value={isp} onChange={(event) => setIsp(event.target.value)}>
                <option value="">Not sure</option>
                {isps.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <label>
            <span>Short note (optional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Example: Connection has been dropping since this morning."
            />
          </label>

          {error && <p className="formError">{error}</p>}

          <div className="modalActions">
            <button type="button" className="textButton" onClick={onClose}>Cancel</button>
            <button type="submit" className="primaryButton" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Report issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
