import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const FALLBACK_AREAS = ['Tembisa', 'Ivory Park', 'Rabie Ridge'];

const AREA_COORDS = {
  Tembisa: [-25.9964, 28.2268],
  'Ivory Park': [-25.9875, 28.2039],
  'Rabie Ridge': [-26.0227, 28.1753],
};
const USAGE_OPTIONS = [
  ['streaming', 'Streaming'],
  ['remote work', 'Remote work'],
  ['gaming', 'Gaming'],
  ['studying', 'Studying'],
  ['browsing', 'General browsing'],
];
const ISSUE_OPTIONS = ['No internet', 'Slow internet', 'Unstable connection', 'Outage', 'Poor service'];

const CHAT_STORAGE_KEY = 'fibrefit-fit-chat';
const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hi 👋🏾 I’m Fit. I can help you understand your FibreFit recommendation, compare packages, or work out whether your current fibre still suits you.",
};

function loadSavedChat() {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!saved) return [WELCOME_MESSAGE];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : [WELCOME_MESSAGE];
  } catch {
    return [WELCOME_MESSAGE];
  }
}

function MessageText({ text }) {
  const lines = String(text || '').split('\n');

  return (
    <>
      {lines.map((line, lineIndex) => {
        const pieces = line.split(/(\*\*.*?\*\*)/g);
        return (
          <React.Fragment key={`${lineIndex}-${line}`}>
            {pieces.map((piece, pieceIndex) => {
              if (piece.startsWith('**') && piece.endsWith('**') && piece.length >= 4) {
                return <strong key={pieceIndex}>{piece.slice(2, -2)}</strong>;
              }
              return <React.Fragment key={pieceIndex}>{piece}</React.Fragment>;
            })}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
}

function go(path) {
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('fibrefit:navigate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function useRoute() {
  const [route, setRoute] = useState(window.location.pathname || '/');
  useEffect(() => {
    const update = () => setRoute(window.location.pathname || '/');
    window.addEventListener('popstate', update);
    window.addEventListener('fibrefit:navigate', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('fibrefit:navigate', update);
    };
  }, []);
  return route;
}

function MapFocus({ center }) {
  const map = useMap();
  useEffect(() => map.setView(center, 13), [center, map]);
  return null;
}

function App() {
  const route = useRoute();
  const [areas, setAreas] = useState(FALLBACK_AREAS);
  const [area, setArea] = useState(() => {
    const savedArea = localStorage.getItem('fibrefit-area');
    return FALLBACK_AREAS.includes(savedArea) ? savedArea : 'Tembisa';
  });
  const [packages, setPackages] = useState([]);
  const [reports, setReports] = useState([]);
  const [apiWarning, setApiWarning] = useState('');
  const [areaLoading, setAreaLoading] = useState(false);

  const [budget, setBudget] = useState(800);
  const [household, setHousehold] = useState(4);
  const [usage, setUsage] = useState(['streaming', 'remote work']);
  const [includeCurrentPlan, setIncludeCurrentPlan] = useState(true);
  const [currentSpeed, setCurrentSpeed] = useState(50);
  const [currentPrice, setCurrentPrice] = useState(799);
  const [currentIsp, setCurrentIsp] = useState('');
  const [currentNetwork, setCurrentNetwork] = useState('');
  const [results, setResults] = useState(() => {
    try {
      const saved = localStorage.getItem('fibrefit-results');

      return saved
        ? JSON.parse(saved)
        : null;
    } catch {
      return null;
    }
  });
  const [loadingResults, setLoadingResults] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');

  useEffect(() => {
    try {
      if (results) {
        localStorage.setItem('fibrefit-results', JSON.stringify(results));
      }
    } catch {
      // FibreFit still works if localStorage is unavailable.
    }
  }, [results]);

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState(loadSavedChat);
  const [asking, setAsking] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // The assistant still works if local storage is unavailable.
    }
  }, [messages]);

  useEffect(() => {
    if (!assistantOpen) return;
    const timer = window.setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [messages, asking, assistantOpen]);

  useEffect(() => {
    fetch(`${API}/areas`)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) return;

        const supportedAreas = FALLBACK_AREAS.filter((item) => data.includes(item));
        setAreas(supportedAreas.length ? supportedAreas : FALLBACK_AREAS);

        if (!FALLBACK_AREAS.includes(area)) {
          setArea('Tembisa');
        }
      })
      .catch(() => setApiWarning('We could not reach the FibreFit API. Check that FastAPI is running.'));
  }, []);

  useEffect(() => {
    localStorage.setItem('fibrefit-area', area);
    setAreaLoading(true);
    Promise.all([
      fetch(`${API}/packages?area=${encodeURIComponent(area)}`).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetch(`${API}/reports?area=${encodeURIComponent(area)}`).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
    ])
      .then(([packageData, reportData]) => {
        setPackages(packageData);
        setReports(reportData);
        setApiWarning('');
      })
      .catch(() => {
        setPackages([]);
        setReports([]);
        setApiWarning('We could not reach the FibreFit API. Check that FastAPI is running.');
      })
      .finally(() => setAreaLoading(false));
  }, [area]);

  const networks = useMemo(() => [...new Set(packages.map((item) => item.network))].sort(), [packages]);
  const isps = useMemo(() => [...new Set(packages.map((item) => item.isp))].sort(), [packages]);

  function toggleUsage(value) {
    setUsage((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function calculateRecommendation({ forceCurrentPlan = includeCurrentPlan } = {}) {
    setRecommendationError('');
    if (!usage.length) {
      setRecommendationError('Choose at least one main internet use.');
      return false;
    }
    setLoadingResults(true);
    try {
      const response = await fetch(`${API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area,
          budget: Number(budget),
          household_size: Number(household),
          usage,
          current_speed: forceCurrentPlan ? Number(currentSpeed) || null : null,
          current_price: forceCurrentPlan ? Number(currentPrice) || null : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not calculate your FibreFit.');
      setResults(data);
      go('/results');
      return true;
    } catch (error) {
      setRecommendationError(error.message || 'Could not calculate your FibreFit.');
      return false;
    } finally {
      setLoadingResults(false);
    }
  }

  async function askAssistant(customQuestion) {
    const nextQuestion = String(customQuestion ?? question).trim();
    if (!nextQuestion || asking) return;

    const userMessage = { role: 'user', content: nextQuestion };
    const conversationSnapshot = [...messages, userMessage];

    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setAsking(true);

    try {
      const response = await fetch(`${API}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: nextQuestion,
          context: {
            area,
            budget,
            household_size: household,
            usage,
            current_plan: includeCurrentPlan ? {
              isp: currentIsp || null,
              network: currentNetwork || null,
              speed: currentSpeed,
              price: currentPrice,
            } : null,
            recommendation: results,
            available_packages: packages,
            recent_reports: reports.slice(0, 5),
            conversation_history: conversationSnapshot
              .slice(-10)
              .map(({ role, content }) => ({ role, content })),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Assistant request failed.');

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.answer || 'I could not generate an answer for that.' },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: error.message || 'The FibreFit assistant is unavailable right now.' },
      ]);
    } finally {
      setAsking(false);
    }
  }

  function clearChat() {
    setMessages([WELCOME_MESSAGE]);
    setQuestion('');
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  }

  const shared = {
    areas, area, setArea, packages, reports, networks, isps, areaLoading,
    budget, setBudget, household, setHousehold, usage, toggleUsage,
    includeCurrentPlan, setIncludeCurrentPlan, currentSpeed, setCurrentSpeed,
    currentPrice, setCurrentPrice, currentIsp, setCurrentIsp,
    currentNetwork, setCurrentNetwork, results, loadingResults,
    recommendationError, calculateRecommendation, setReports,
  };

  let page;
  if (route === '/find') page = <FindPage {...shared} />;
  else if (route === '/results') page = <ResultsPage {...shared} />;
  else if (route === '/community') page = <CommunityPage {...shared} />;
  else if (route === '/compare') page = <ComparePage {...shared} />;
  else if (route === '/report') page = <ReportPage {...shared} />;
  else if (route === '/contact') page = <ContactPage area={area} areas={areas} />;
  else page = <HomePage {...shared} />;
  

  return (
    <div className="appShell">
      <Header route={route} />
      {apiWarning && <div className="statusBanner">{apiWarning}</div>}
      {page}
      <Footer />
      {!assistantOpen && (
        <button className="fitLauncher" onClick={() => setAssistantOpen(true)} aria-label="Ask Fit">
          <span className="fitLauncherBubble">Ask Fit</span>
          <span className="fitLauncherIcon"><BotIcon size={24} /></span>
        </button>
      )}
      {assistantOpen && (
        <AssistantPanel
          question={question}
          setQuestion={setQuestion}
          messages={messages}
          asking={asking}
          ask={askAssistant}
          clearChat={clearChat}
          chatEndRef={chatEndRef}
          close={() => setAssistantOpen(false)}
        />
      )}
    </div>
  );
}

function Header({ route }) {
  const links = [
    ['/find', 'Find Fibre'],
    ['/community', 'Community'],
    ['/compare', 'Compare'],
    ['/contact', 'Get in touch'],
  ];
  return (
    <header className="siteHeader">
      <button className="wordmark" onClick={() => go('/')}>FibreFit</button>
      <nav className="mainNav" aria-label="Main navigation">
        {links.map(([path, label]) => (
          <button key={path} className={`navLink ${route === path ? 'active' : ''}`} onClick={() => go(path)}>{label}</button>
        ))}
        <button className="navCta" onClick={() => go('/report')}>Report issue</button>
      </nav>
    </header>
  );
}

function HomePage({ areas, area, setArea, networks, reports, packages }) {
  return (
    <main className="page homePage">
      <section className="homeHero">
        <div className="heroMovingBackdrop" aria-hidden="true" />
        <div className="heroShade" aria-hidden="true" />
        <div className="heroInner">
          <div className="saStamp">Built for everyday connectivity decisions</div>
          <h1>Find better fibre.<br /><span>Know when to switch.</span></h1>
          <p>
            See what is available where you live, understand what your community is experiencing,
            and compare fibre options against what your household actually needs.
          </p>
          <div className="heroSearchCard">
            <label>
              <span>Where do you need fibre?</span>
              <select value={area} onChange={(event) => setArea(event.target.value)}>
                {areas.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <button className="buttonPrimary" onClick={() => go('/find')}>Check my area</button>
          </div>
          <div className="heroActions">
            <button className="buttonGhost" onClick={() => go('/compare')}>Compare my current plan</button>
            <button className="buttonGhost" onClick={() => go('/community')}>See community reports</button>
          </div>
          <small>Hackathon prototype · Coverage, reliability and package information is curated demo data.</small>
        </div>
      </section>

      <section className="homeIntro pageWidth">
        <p className="kicker">One place. Three clear actions.</p>
        <h2>Fibre decisions should not require ten browser tabs.</h2>
        <p className="lead">FibreFit brings availability, household needs and community experience together so you can make sense of your options.</p>
        <div className="actionGrid">
          <button className="actionCard" onClick={() => go('/find')}>
            <span className="actionNumber">01</span><h3>Find</h3><p>See fibre packages represented in your selected area and match them to your needs.</p><b>Find my FibreFit →</b>
          </button>
          <button className="actionCard" onClick={() => go('/compare')}>
            <span className="actionNumber">02</span><h3>Compare</h3><p>Put your current speed and price next to alternatives and see whether switching makes sense.</p><b>Compare my plan →</b>
          </button>
          <button className="actionCard" onClick={() => go('/community')}>
            <span className="actionNumber">03</span><h3>Report</h3><p>Check recent connectivity signals nearby and add your own experience to the community.</p><b>View community →</b>
          </button>
        </div>
      </section>

      <section className="snapshotBand">
        <div className="pageWidth snapshotLayout">
          <div>
            <p className="kicker light">A quick look at {area}</p>
            <h2>What FibreFit sees before you choose.</h2>
            <p>Availability and community context first. Recommendations second.</p>
            <button className="buttonLight" onClick={() => go('/find')}>Explore {area}</button>
          </div>
          <div className="snapshotCards">
            <article><strong>{packages.length}</strong><span>demo packages</span></article>
            <article><strong>{networks.length}</strong><span>networks represented</span></article>
            <article><strong>{reports.length}</strong><span>community reports</span></article>
          </div>
        </div>
      </section>

      <section className="testimonialsSection pageWidth">

        <div className="sectionSplit">
          <div>
            <p className="kicker">Demo community voices</p>
            <h2>People want clarity, not more fibre confusion.</h2>
          </div>

          <p>
            These are example user stories for the FibreFit hackathon prototype,
            showing the kinds of connectivity decisions the platform is designed
            to support.
          </p>
        </div>

        <div className="testimonialGrid">

          <article className="testimonialCard">
            <span className="quoteMark">“</span>

            <p>
              I know what I pay every month, but I never really knew whether
              50 Mbps was actually enough for my household. FibreFit makes
              the comparison easier to understand.
            </p>

            <div>
              <strong>Neo</strong>
              <span>Tembisa · Demo user story</span>
            </div>
          </article>


          <article className="testimonialCard featuredTestimonial">
            <span className="quoteMark">“</span>

            <p>
              When my connection is slow, the first thing I want to know is
              whether it is only happening to me. Seeing community reports
              gives me useful context before I make a decision.
            </p>

            <div>
              <strong>Ayanda</strong>
              <span>Ivory Park · Demo user story</span>
            </div>
          </article>


          <article className="testimonialCard">
            <span className="quoteMark">“</span>

            <p>
              I do not want to open five provider websites just to compare
              speed and price. I want one place that helps me understand
              what actually fits my budget.
            </p>

            <div>
              <strong>Kagiso</strong>
              <span>Rabie Ridge · Demo user story</span>
            </div>
          </article>

        </div>

      </section>

      <section className="homeClosing pageWidth">
        <div>
          <p className="kicker">Consumer-first by design</p>
          <h2>FibreFit does not tell everyone to switch.</h2>
        </div>
        <p>It gives you enough context to decide whether your current option still fits, whether an alternative offers better value, or whether there simply is not a strong reason to change.</p>
      </section>
    </main>
  );
}

function PageHero({ eyebrow, title, copy, children }) {
  return (
    <section className="innerHero pageWidth">
      <p className="kicker">{eyebrow}</p>
      <div className="innerHeroGrid"><h1>{title}</h1><div><p>{copy}</p>{children}</div></div>
    </section>
  );
}

function FindPage(props) {
  const { areas, area, setArea, packages, reports, networks, isps, areaLoading } = props;
  const coords = AREA_COORDS[area] || AREA_COORDS.Tembisa;
  return (
    <main className="page">
      <PageHero eyebrow="Find Fibre" title="Start with where you live." copy="Choose your demo area, see the networks represented there, then tell FibreFit what your household actually needs." />
      <section className="pageWidth findAreaGrid">
        <div className="mapCard">
          <div className="panelHeader"><div><span className="miniLabel">Selected area</span><h2>{area}</h2></div><span className="quietText">{reports.length} report{reports.length === 1 ? '' : 's'}</span></div>
          <MapContainer center={coords} zoom={13} className="fibreMap">
            <MapFocus center={coords} />
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <CircleMarker center={coords} radius={10} pathOptions={{ color: '#dd6e2e', fillColor: '#dd6e2e', fillOpacity: 0.8 }}><Popup>{area} demo fibre area</Popup></CircleMarker>
            {reports.map((report, index) => <ReportMarker key={report.id} report={report} index={index} coords={coords} />)}
          </MapContainer>
        </div>
        <aside className="availabilityCard">
          <label className="stackLabel"><span>Area</span><select value={area} onChange={(e) => setArea(e.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select></label>
          {areaLoading ? <p>Loading area data…</p> : <>
            <div className="infoBlock"><span className="miniLabel">Networks represented</span><div className="tagWrap">{networks.length ? networks.map((n) => <span className="softTag" key={n}>{n}</span>) : <span>None loaded</span>}</div></div>
            <div className="infoBlock"><span className="miniLabel">ISPs represented</span><div className="tagWrap">{isps.length ? isps.map((i) => <span className="softTag" key={i}>{i}</span>) : <span>None loaded</span>}</div></div>
            <div className="infoBlock"><span className="miniLabel">Packages in demo</span><strong className="bigStat">{packages.length}</strong></div>
          </>}
        </aside>
      </section>
      <section className="pageWidth formSection">
        <div className="sectionSplit"><div><p className="kicker">Find my FibreFit</p><h2>Tell us what your internet needs to handle.</h2></div><p>We use this to rank the packages in your selected area instead of overwhelming you with every option.</p></div>
        <FinderForm {...props} submitLabel="Find my best match" />
      </section>
    </main>
  );
}

function FinderForm(props) {
  const {
    budget, setBudget, household, setHousehold, usage, toggleUsage,
    includeCurrentPlan, setIncludeCurrentPlan, currentSpeed, setCurrentSpeed,
    currentPrice, setCurrentPrice, currentIsp, setCurrentIsp, currentNetwork,
    setCurrentNetwork, isps, networks, loadingResults, recommendationError,
    calculateRecommendation, submitLabel, alwaysCurrent = false,
  } = props;
  const showCurrent = alwaysCurrent || includeCurrentPlan;
  return (
    <div className="finderSurface">
      <div className="formGrid two">
        <label className="stackLabel"><span>Monthly budget (R)</span><input type="number" min="100" value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
        <label className="stackLabel"><span>People using the connection</span><input type="number" min="1" max="20" value={household} onChange={(e) => setHousehold(e.target.value)} /></label>
      </div>
      <fieldset className="usageFieldset"><legend>Main internet use</legend><p>Choose all that apply.</p><div className="choiceGrid">{USAGE_OPTIONS.map(([value, label]) => <button type="button" key={value} className={`choiceChip ${usage.includes(value) ? 'selected' : ''}`} onClick={() => toggleUsage(value)}>{label}</button>)}</div></fieldset>
      {!alwaysCurrent && <label className="checkRow"><input type="checkbox" checked={includeCurrentPlan} onChange={(e) => setIncludeCurrentPlan(e.target.checked)} /><span>I already have fibre and want to compare my current plan</span></label>}
      {showCurrent && <div className="currentPlanSurface">
        <div className="formGrid four">
          <label className="stackLabel"><span>Current ISP</span><select value={currentIsp} onChange={(e) => setCurrentIsp(e.target.value)}><option value="">Not sure / optional</option>{isps.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="stackLabel"><span>Current network</span><select value={currentNetwork} onChange={(e) => setCurrentNetwork(e.target.value)}><option value="">Not sure / optional</option>{networks.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="stackLabel"><span>Current speed (Mbps)</span><input type="number" min="1" value={currentSpeed} onChange={(e) => setCurrentSpeed(e.target.value)} /></label>
          <label className="stackLabel"><span>Current monthly price (R)</span><input type="number" min="1" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} /></label>
        </div>
      </div>}
      {recommendationError && <p className="formError">{recommendationError}</p>}
      <button className="buttonPrimary" disabled={loadingResults} onClick={() => calculateRecommendation({ forceCurrentPlan: showCurrent })}>{loadingResults ? 'Calculating your FibreFit…' : submitLabel}</button>
    </div>
  );
}

function ResultsPage(props) {
  const { results, area, household, usage, currentPrice, currentSpeed, currentIsp, currentNetwork } = props;
  if (!results?.best_match) return <main className="page"><PageHero eyebrow="Your FibreFit" title="No recommendation yet." copy="Tell us about your area and household first, then FibreFit will bring your three most useful options here."><button className="buttonPrimary" onClick={() => go('/find')}>Find my FibreFit</button></PageHero></main>;
  const entries = [['Best match', results.best_match], ['Best value', results.best_value], ['Fastest option', results.fastest]];
  const comparison = results.current_comparison;
  const saving = comparison?.monthly_saving || 0;
  return (
    <main className="page resultsPage">
      <PageHero eyebrow="Your FibreFit" title="Three useful options. No package overload." copy={`Based on ${area}, a household of ${household}, and your selected internet needs: ${usage.join(', ')}.`}><button className="buttonOutline" onClick={() => go('/find')}>Change my answers</button></PageHero>
      <section className="pageWidth recommendationGrid">{entries.map(([label, item], index) => <RecommendationCard key={label} label={label} item={item} featured={index === 0} />)}</section>
      {comparison && <section className="pageWidth comparisonSection">
        <div className="sectionSplit"><div><p className="kicker">Switch smarter</p><h2>How does the best match compare with what you have?</h2></div><p>FibreFit gives context. You still decide whether the difference is meaningful enough to switch.</p></div>
        <div className="compareBoard">
          <article className="planPanel current"><span className="miniLabel">Your current plan</span><h3>{currentIsp || 'Current connection'}</h3><p>{currentNetwork || 'Network not supplied'}</p><strong>{currentSpeed}<small> Mbps</small></strong><b>R{currentPrice}/month</b></article>
          <div className="compareArrow">→</div>
          <article className="planPanel recommended"><span className="miniLabel">FibreFit best match</span><h3>{results.best_match.package.isp}</h3><p>{results.best_match.package.network}</p><strong>{results.best_match.package.download_mbps}<small> Mbps</small></strong><b>R{results.best_match.package.price}/month</b></article>
          <article className={`decisionPanel ${saving > 0 ? 'positive' : ''}`}><span className="miniLabel">FibreFit context</span><h3>{saving > 0 ? 'Better value found' : 'No clear saving'}</h3><p>{saving > 0 ? `This option is R${saving} less per month — about R${comparison.annual_saving} per year — while offering ${comparison.recommended_speed} Mbps.` : 'The best match costs the same or more. Compare the added speed and suitability before deciding to switch.'}</p></article>
        </div>
      </section>}
      <section className="resultsNext pageWidth"><div><p className="kicker">Need context?</p><h2>Community signals can help you interpret what you are experiencing.</h2></div><button className="buttonOutline" onClick={() => go('/community')}>See {area} reports</button></section>
    </main>
  );
}

function RecommendationCard({ label, item, featured }) {
  const p = item.package;
  return <article className={`recommendationCard ${featured ? 'featured' : ''}`}>
    <div className="cardTop"><span className="recommendationLabel">{label}</span><span className="matchBadge">{item.match_percentage}% match</span></div>
    <h3>{p.isp}</h3><p className="networkLine">{p.network} network · {p.contract}</p>
    <div className="packageNumbers"><strong>{p.download_mbps}<small> Mbps</small></strong><b>R{p.price}<small>/month</small></b></div>
    <div className="detailRow"><span>Upload</span><b>{p.upload_mbps} Mbps</b></div><div className="detailRow"><span>Demo reliability</span><b>{p.reliability}%</b></div>
    <ul className="reasonList">{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
  </article>;
}

function CommunityPage({ area, setArea, areas, reports, setReports }) {
  const coords = AREA_COORDS[area] || AREA_COORDS.Tembisa;
  const counts = useMemo(() => reports.reduce((acc, report) => ({ ...acc, [report.issue_type]: (acc[report.issue_type] || 0) + 1 }), {}), [reports]);
  return <main className="page">
    <PageHero eyebrow="Community connectivity" title="Is it only you?" copy="Community reports are signals, not official outage declarations. They help you see whether nearby people are describing similar connectivity problems."><button className="buttonPrimary" onClick={() => go('/report')}>Report an issue</button></PageHero>
    <section className="pageWidth communityStats"><article><strong>{reports.length}</strong><span>reports in this demo area</span></article>{Object.entries(counts).slice(0, 3).map(([type, count]) => <article key={type}><strong>{count}</strong><span>{type}</span></article>)}</section>
    <section className="pageWidth communityLayout">
      <div className="mapCard"><div className="panelHeader"><div><span className="miniLabel">Community map</span><h2>{area}</h2></div><select value={area} onChange={(e) => setArea(e.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select></div><MapContainer center={coords} zoom={13} className="fibreMap"><MapFocus center={coords} /><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><CircleMarker center={coords} radius={10} pathOptions={{ color: '#dd6e2e', fillColor: '#dd6e2e', fillOpacity: 0.8 }}><Popup>{area}</Popup></CircleMarker>{reports.map((report, index) => <ReportMarker key={report.id} report={report} index={index} coords={coords} />)}</MapContainer></div>
      <div className="reportFeed"><div className="panelHeader"><div><span className="miniLabel">Recent activity</span><h2>What people are reporting</h2></div></div>{reports.length ? reports.map((report) => <ReportItem key={report.id} report={report} />) : <div className="emptyState">No reports yet for this demo area.</div>}<button className="buttonOutline full" onClick={() => go('/report')}>Add my report</button></div>
    </section>
  </main>;
}

function ReportMarker({ report, index, coords }) {
  const lat = coords[0] + 0.0045 * ((index % 4) + 1);
  const lng = coords[1] - 0.004 * ((index % 5) + 1);
  return <CircleMarker center={[lat, lng]} radius={7} pathOptions={{ color: '#a43b2b', fillColor: '#a43b2b', fillOpacity: 0.8 }}><Popup><b>{report.issue_type}</b><br />{report.network || 'Network not supplied'}<br />{report.note || 'No extra note supplied'}</Popup></CircleMarker>;
}

function ReportItem({ report }) {
  let date = '';
  try { date = new Date(report.created_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }); } catch { date = report.created_at; }
  return <article className="reportItem"><div><span className="issueDot" /><div><h3>{report.issue_type}</h3><p>{report.area} · {report.network || 'Network not supplied'}{report.isp ? ` · ${report.isp}` : ''}</p></div></div><time>{date}</time>{report.note && <p className="reportNote">{report.note}</p>}</article>;
}

function ComparePage(props) {
  const { area, setArea, areas } = props;
  return <main className="page"><PageHero eyebrow="Compare" title="Is your current fibre still a good fit?" copy="Tell FibreFit what you pay now and what your household needs. We will compare it with the demo alternatives represented in your area." />
    <section className="pageWidth compareIntro"><label className="stackLabel areaSelect"><span>Compare options in</span><select value={area} onChange={(e) => setArea(e.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select></label><FinderForm {...props} alwaysCurrent submitLabel="Compare my current plan" /></section>
    <section className="pageWidth trustNote"><span className="miniLabel">Important</span><p>A cheaper package does not automatically mean “switch”. FibreFit presents the difference in price, speed and fit so the consumer can make the final decision.</p></section>
  </main>;
}

function ReportPage({ area, setArea, areas, networks, isps, setReports }) {
  const [issue, setIssue] = useState('Slow internet');
  const [network, setNetwork] = useState('');
  const [isp, setIsp] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  async function submit() {
    setSending(true); setError('');
    try {
      const response = await fetch(`${API}/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ area, issue_type: issue, network: network || null, isp: isp || null, note: note || null }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.detail || 'Could not submit report.');
      setReports((current) => [data, ...current]); setCreated(true);
    } catch (e) { setError(e.message || 'Could not submit report.'); } finally { setSending(false); }
  }
  if (created) return <main className="page"><section className="successPage pageWidth"><div className="successIcon">✓</div><p className="kicker">Report received</p><h1>Thanks for adding a community signal.</h1><p>Your report has been added to the FibreFit demo feed for {area}. Community reports provide context; they are not official outage declarations.</p><div className="buttonRow"><button className="buttonPrimary" onClick={() => go('/community')}>View {area} community</button><button className="buttonOutline" onClick={() => { setCreated(false); setNote(''); }}>Report another issue</button></div></section></main>;
  return <main className="page"><PageHero eyebrow="Report an issue" title="Tell the community what is happening." copy="Keep it simple. Your report becomes one signal in the selected area's community activity." />
    <section className="pageWidth reportFormSurface"><div className="formGrid two"><label className="stackLabel"><span>Area</span><select value={area} onChange={(e) => setArea(e.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select></label><label className="stackLabel"><span>What is happening?</span><select value={issue} onChange={(e) => setIssue(e.target.value)}>{ISSUE_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="stackLabel"><span>Fibre network (optional)</span><select value={network} onChange={(e) => setNetwork(e.target.value)}><option value="">Not sure</option>{networks.map((item) => <option key={item}>{item}</option>)}</select></label><label className="stackLabel"><span>ISP (optional)</span><select value={isp} onChange={(e) => setIsp(e.target.value)}><option value="">Not sure</option>{isps.map((item) => <option key={item}>{item}</option>)}</select></label></div><label className="stackLabel"><span>Short note (optional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Connection has been dropping since this afternoon." /></label>{error && <p className="formError">{error}</p>}<button className="buttonPrimary" onClick={submit} disabled={sending}>{sending ? 'Submitting…' : 'Submit report'}</button><p className="privacyLine">FibreFit displays area-level demo reports, not precise household coordinates.</p></section>
  </main>;
}

function ContactPage({ area, areas }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedArea, setSelectedArea] = useState(area);
  const [category, setCategory] = useState('Complaint');
  const [message, setMessage] = useState('');

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submitContact(event) {
    event.preventDefault();

    setError('');

    if (!email.trim() || !message.trim()) {
      setError('Please enter your email address and message.');
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`${API}/contact`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          area: selectedArea || null,
          category,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || 'Could not send your message.',
        );
      }

      setSent(true);

    } catch (err) {
      setError(
        err.message ||
        'Could not send your message. Please try again.',
      );

    } finally {
      setSending(false);
    }
  }


  if (sent) {
    return (
      <main className="page">

        <section className="successPage pageWidth">

          <div className="successIcon">
            ✓
          </div>

          <p className="kicker">
            Message received
          </p>

          <h1>
            Thanks for getting in touch.
          </h1>

          <p>
            Your message has been recorded by the FibreFit
            hackathon prototype.
          </p>

          <div className="buttonRow">

            <button
              className="buttonPrimary"
              onClick={() => go('/')}
            >
              Back home
            </button>

            <button
              className="buttonOutline"
              onClick={() => {
                setSent(false);
                setMessage('');
              }}
            >
              Send another message
            </button>

          </div>

        </section>

      </main>
    );
  }


  return (
    <main className="page">

      <PageHero
        eyebrow="Get in touch"
        title="Have something to tell us?"
        copy="Send FibreFit feedback, a complaint, a data correction or a general question."
      />


      <section className="pageWidth contactLayout">

        <form
          className="contactFormSurface"
          onSubmit={submitContact}
        >

          <div className="formGrid two">

            <label className="stackLabel">
              <span>Name (optional)</span>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Your name"
              />
            </label>


            <label className="stackLabel">
              <span>Email address</span>

              <input
                type="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
              />
            </label>


            <label className="stackLabel">
              <span>Area</span>

              <select
                value={selectedArea}
                onChange={(event) =>
                  setSelectedArea(event.target.value)
                }
              >
                {areas.map((item) => (
                  <option key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>


            <label className="stackLabel">
              <span>What is this about?</span>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
              >
                <option>Complaint</option>
                <option>Feedback</option>
                <option>Incorrect fibre information</option>
                <option>Partnership enquiry</option>
                <option>Other</option>
              </select>
            </label>

          </div>


          <label className="stackLabel">
            <span>Your message</span>

            <textarea
              required
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="Tell us what happened, what you noticed, or what you would like FibreFit to improve."
            />
          </label>


          {error && (
            <p className="formError">
              {error}
            </p>
          )}


          <button
            className="buttonPrimary"
            type="submit"
            disabled={sending}
          >
            {sending
              ? 'Sending…'
              : 'Send message'}
          </button>

        </form>


        <aside className="contactAside">

          <p className="kicker">
            Before you send
          </p>

          <h2>
            Complaint or connectivity report?
          </h2>

          <p>
            Use this page when you want to contact FibreFit
            about the product, its information or your experience.
          </p>

          <div className="contactHelpCard">

            <span>
              Internet problem happening right now?
            </span>

            <strong>
              Add a community report instead.
            </strong>

            <button
              className="textLinkButton"
              onClick={() => go('/report')}
            >
              Report connectivity issue →
            </button>

          </div>

          <div className="contactHelpCard">

            <span>
              Want to understand your current package?
            </span>

            <strong>
              Compare before deciding to switch.
            </strong>

            <button
              className="textLinkButton"
              onClick={() => go('/compare')}
            >
              Compare my fibre →
            </button>

          </div>

        </aside>

      </section>

    </main>
  );
}

function BotIcon({ size = 22 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="7" width="14" height="11" rx="4" />
      <path d="M12 3v4" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M9 15h6" />
      <path d="M3 11v3" />
      <path d="M21 11v3" />
    </svg>
  );
}

function AssistantPanel({ question, setQuestion, messages, asking, ask, clearChat, chatEndRef, close }) {
  const suggestions = [
    'Why is this my best match?',
    'Can I get something cheaper?',
    'Is 50 Mbps enough for my family?',
    'Should I switch?',
  ];

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!asking && question.trim()) ask();
    }
  }

  return (
    <aside className="fitChatPanel" aria-label="FibreFit assistant">
      <div className="fitChatHeader">
        <div className="fitBotAvatar"><BotIcon size={27} /></div>
        <div className="fitChatIdentity">
          <strong>Fit</strong>
          <span>FibreFit assistant</span>
        </div>
        <button className="fitNewChat" onClick={clearChat} type="button">New chat</button>
        <button className="fitChatClose" onClick={close} aria-label="Close assistant" type="button">×</button>
      </div>

      <div className="fitChatMessages">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === 'user' ? 'fitMessage fitMessageUser' : 'fitMessage fitMessageBot'}
          >
            {message.role === 'assistant' && (
              <div className="fitMiniAvatar"><BotIcon size={17} /></div>
            )}

            <div className="fitMessageContent">
              {message.role === 'assistant' && <span className="fitMessageName">Fit</span>}
              <div className="fitMessageBubble"><MessageText text={message.content} /></div>
            </div>
          </div>
        ))}

        {messages.length === 1 && !asking && (
          <div className="fitQuickArea">
            <p>You can ask me:</p>
            <div className="fitQuickQuestions">
              {suggestions.map((item) => (
                <button key={item} type="button" onClick={() => ask(item)}>{item}</button>
              ))}
            </div>
          </div>
        )}

        {asking && (
          <div className="fitMessage fitMessageBot">
            <div className="fitMiniAvatar"><BotIcon size={17} /></div>
            <div className="fitTyping" aria-label="Fit is typing"><span /><span /><span /></div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="fitChatComposer">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Fit..."
          rows={1}
        />
        <button
          className="fitSendButton"
          onClick={() => ask()}
          disabled={asking || !question.trim()}
          type="button"
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2 11 13" />
            <path d="m22 2-7 20-4-9-9-4Z" />
          </svg>
        </button>
      </div>
      <div className="fitChatHint">Enter to send · Shift + Enter for a new line</div>
    </aside>
  );
}

function Footer() {
  return (
    <footer className="siteFooter">

      <div className="pageWidth footerGrid">

        <div className="footerBrand">

          <button onClick={() => go('/')}>
            FibreFit
          </button>

          <p>
            Find better fibre. Know when to switch.
          </p>

          <small>
            Consumer-first connectivity decisions
            for South Africa.
          </small>

        </div>


        <div>

          <h3>Explore</h3>

          <button onClick={() => go('/find')}>
            Find Fibre
          </button>

          <button onClick={() => go('/compare')}>
            Compare
          </button>

          <button onClick={() => go('/community')}>
            Community
          </button>

          <button onClick={() => go('/report')}>
            Report issue
          </button>

          <button onClick={() => go('/contact')}>
            Get in touch
          </button>

        </div>


        <div>

          <h3>About this demo</h3>

          <p>
            FibreFit is a hackathon prototype using
            curated package, coverage and
            community-report data.
          </p>

          <p>
            It does not provide official outage
            declarations or live ISP coverage.
          </p>

        </div>

      </div>


      <div className="footerBottom pageWidth">

        <span>
          © 2026 FibreFit
        </span>

        <span>
          Find → Report → Compare → Switch smarter.
        </span>

      </div>

    </footer>
  );
}

createRoot(document.getElementById('root')).render(<App />);