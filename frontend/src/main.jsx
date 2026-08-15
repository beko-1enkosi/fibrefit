import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MapContainer, TileLayer, CircleMarker, Popup} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AREA_COORDS = {Midrand:[-25.9992,28.1263], Sandton:[-26.1076,28.0567], Centurion:[-25.8603,28.1894]};

function App(){
  const [areas,setAreas]=useState([]); const [area,setArea]=useState('Midrand'); const [budget,setBudget]=useState(800);
  const [household,setHousehold]=useState(4); const [usage,setUsage]=useState(['streaming','remote work']);
  const [currentSpeed,setCurrentSpeed]=useState(50); const [currentPrice,setCurrentPrice]=useState(799);
  const [results,setResults]=useState(null); const [reports,setReports]=useState([]); const [showReport,setShowReport]=useState(false);
  const [showAssistant,setShowAssistant]=useState(false); const [question,setQuestion]=useState('Why is this my best match?'); const [answer,setAnswer]=useState('');

  useEffect(()=>{fetch(`${API}/areas`).then(r=>r.json()).then(setAreas).catch(()=>setAreas(['Midrand','Sandton','Centurion']));},[]);
  useEffect(()=>{fetch(`${API}/reports?area=${encodeURIComponent(area)}`).then(r=>r.json()).then(setReports).catch(()=>setReports([]));},[area]);

  const toggleUsage=(item)=>setUsage(x=>x.includes(item)?x.filter(v=>v!==item):[...x,item]);
  async function findMatch(){ const r=await fetch(`${API}/recommend`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({area,budget:Number(budget),household_size:Number(household),usage,current_speed:Number(currentSpeed)||null,current_price:Number(currentPrice)||null})}); setResults(await r.json()); }
  async function ask(){ setAnswer('Thinking…'); const r=await fetch(`${API}/assistant`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,context:results||{area,budget,household,usage}})}); const data=await r.json(); setAnswer(data.answer||'No answer returned.'); }
  const coords=AREA_COORDS[area]||AREA_COORDS.Midrand;

  return <div>
    <header><strong>FibreFit</strong><nav><a href="#finder">Find Fibre</a><a href="#community">Community</a><a href="#compare">Compare</a><button onClick={()=>setShowReport(true)}>Report issue</button></nav></header>
    <main>
      <section className="hero"><p className="eyebrow">Connectivity decisions, made clearer.</p><h1>Find better fibre.<br/>Know when to switch.</h1><p>Compare demo fibre options for your area, see community connectivity reports and find a package that better matches how your household uses the internet.</p><div className="search"><select value={area} onChange={e=>setArea(e.target.value)}>{(areas.length?areas:['Midrand','Sandton','Centurion']).map(a=><option key={a}>{a}</option>)}</select><a className="primary" href="#finder">Check my area</a></div><small>Hackathon demo: coverage and package information is curated demo data, not live provider data.</small></section>

      <section className="mapSection"><div><p className="eyebrow">Your area</p><h2>What is happening in {area}?</h2><p>{reports.length} recent community report{reports.length===1?'':'s'} in the demo feed.</p></div><MapContainer center={coords} zoom={13} key={area}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><CircleMarker center={coords} radius={9}><Popup>{area} demo fibre area</Popup></CircleMarker>{reports.map((r,i)=><CircleMarker key={r.id} center={[coords[0]+.006*(i+1),coords[1]-.005*(i+1)]} radius={7}><Popup>{r.issue_type}<br/>{r.network||'Network not supplied'}</Popup></CircleMarker>)}</MapContainer></section>

      <section id="finder" className="finder"><div><p className="eyebrow">Find my FibreFit</p><h2>Tell us what your household needs.</h2></div><div className="formgrid"><label>Monthly budget<input type="number" value={budget} onChange={e=>setBudget(e.target.value)}/></label><label>People using the connection<input type="number" min="1" value={household} onChange={e=>setHousehold(e.target.value)}/></label></div><div><span className="label">Main internet use</span><div className="chips">{['streaming','remote work','gaming','studying','browsing'].map(u=><button className={usage.includes(u)?'chip active':'chip'} onClick={()=>toggleUsage(u)} key={u}>{u}</button>)}</div></div><details><summary>Add current package for switching comparison</summary><div className="formgrid"><label>Current speed (Mbps)<input type="number" value={currentSpeed} onChange={e=>setCurrentSpeed(e.target.value)}/></label><label>Current price (R)<input type="number" value={currentPrice} onChange={e=>setCurrentPrice(e.target.value)}/></label></div></details><button className="primary" onClick={findMatch}>Find my best match</button></section>

      {results?.best_match && <section id="compare" className="results"><p className="eyebrow">Your FibreFit</p><h2>Three useful options. No package overload.</h2><div className="cards">{[['Best match',results.best_match],['Best value',results.best_value],['Fastest',results.fastest]].map(([label,item])=><article key={label} className={label==='Best match'?'card featured':'card'}><span>{label}</span><h3>{item.package.isp}</h3><p>{item.package.network} network</p><div className="speed">{item.package.download_mbps}<small> Mbps</small></div><strong>R{item.package.price}/month</strong><p className="match">{item.match_percentage}% match</p><ul>{item.reasons.map(x=><li key={x}>{x}</li>)}</ul></article>)}</div>{results.current_comparison && <div className="comparison"><h3>Switching comparison</h3><p>Your current plan: <b>{results.current_comparison.current_speed} Mbps at R{results.current_comparison.current_price}</b></p><p>Best match: <b>{results.current_comparison.recommended_speed} Mbps at R{results.current_comparison.recommended_price}</b></p><p>{results.current_comparison.monthly_saving>0?`Potential saving: R${results.current_comparison.monthly_saving}/month (R${results.current_comparison.annual_saving}/year).`:'This option costs more, so the value comes from speed/reliability rather than savings.'}</p></div>}</section>}

      <section id="community" className="community"><div><p className="eyebrow">Community connectivity</p><h2>Is it only you?</h2><p>Recent reports from people in the selected demo area.</p></div><div>{reports.length?reports.map(r=><article className="report" key={r.id}><b>{r.issue_type}</b><span>{r.area} · {r.network||'Network not supplied'}</span><p>{r.note}</p></article>):<p>No reports yet for this area.</p>}</div></section>
    </main>

    <button className="assistantBtn" onClick={()=>setShowAssistant(!showAssistant)}>?</button>
    {showAssistant&&<aside className="assistant"><button className="close" onClick={()=>setShowAssistant(false)}>×</button><h3>FibreFit assistant</h3><p>Ask about the recommendation FibreFit calculated.</p><textarea value={question} onChange={e=>setQuestion(e.target.value)}/><button className="primary" onClick={ask}>Ask</button>{answer&&<div className="answer">{answer}</div>}</aside>}
    {showReport&&<ReportModal area={area} onClose={()=>setShowReport(false)} onCreated={r=>setReports([r,...reports])}/>} 
  </div>
}

function ReportModal({area,onClose,onCreated}){const [issue,setIssue]=useState('Slow internet');const [network,setNetwork]=useState('');const [note,setNote]=useState('');async function submit(){const r=await fetch(`${API}/reports`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({area,issue_type:issue,network:network||null,note:note||null})});onCreated(await r.json());onClose();}return <div className="modalBack"><div className="modal"><button className="close" onClick={onClose}>×</button><h2>Report a connectivity issue</h2><label>What is happening?<select value={issue} onChange={e=>setIssue(e.target.value)}>{['No internet','Slow internet','Unstable connection','Outage','Poor service'].map(x=><option key={x}>{x}</option>)}</select></label><label>Network (optional)<input value={network} onChange={e=>setNetwork(e.target.value)} placeholder="e.g. Vuma"/></label><label>Short note (optional)<textarea value={note} onChange={e=>setNote(e.target.value)}/></label><button className="primary" onClick={submit}>Report issue</button></div></div>}

createRoot(document.getElementById('root')).render(<App/>);
