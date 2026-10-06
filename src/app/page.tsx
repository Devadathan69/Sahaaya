"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, Ambulance, ArrowDownRight, ArrowRight, BarChart3, Check, ChevronDown, Download,
  CircleHelp, CloudRain, Cross, GitBranch, MapPin, Menu, Radio, RefreshCw,
  Route, ShieldCheck, Sparkles, Waves, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type NodeInfo = { x: number; y: number; label: string; kind: string };
type Zone = {
  id: string; name: string; node: string; severity: string; population: number;
  vulnerable: number; injuries: number; rising: boolean; flooded: boolean;
  priority: number; reasons: string[]; assigned_count: number;
};
type Road = { a: string; b: string; cost: number; key: string; blocked: boolean };
type Assignment = {
  resource_id: string; resource_label: string; resource_type: "boat" | "team" | "ambulance";
  resource_start: string; zone_id: string; zone_name: string; zone_node: string; priority: number;
  route: string[]; route_cost: number; route_hops: number; route_expanded: number; value: number;
};
type Simulation = {
  scenario_id: string; scenario_label: string; scenario_description: string; blocked_roads: string[];
  nodes: Record<string, NodeInfo>; roads: Road[]; zones: Zone[];
  assignments: Assignment[]; baseline_assignments: Assignment[];
  metrics: {
    assigned_count: number; total_resources: number; coverage_percent: number; baseline_coverage_percent: number; plain_csp_states: number;
    route_cost: number; baseline_score: number; csp_score: number; states: number; bound_prunes: number;
    forward_prunes: number; closure_count: number;
  };
  algorithm_trace: {
    rules_fired: number; route_rows: Array<Record<string, string | number>>;
    astar_expanded: number; bfs_expanded: number; astar_cost: number; bfs_cost: number;
    astar_routes_no_more_costly: number;
  };
};

const SCENARIOS = [
  { id: "balanced", label: "Balanced flood", icon: CloudRain },
  { id: "north", label: "Severe northern flood", icon: Waves },
  { id: "medical", label: "Medical surge", icon: Cross },
];
const COLORS = { boat: "#398b9a", team: "#558d68", ambulance: "#d17a58" };
const MAP_LABELS: Record<string, string> = { base: "Base", j1: "North junction", j2: "South junction", j3: "Central junction", a: "Northbank", b: "Riverside", c: "Market ward", d: "South fields", e: "East colony", shelter1: "Shelter 1", shelter2: "Shelter 2", hospital: "Field clinic" };

function formatNumber(value: number) { return new Intl.NumberFormat("en-IN").format(value); }
function ResourceGlyph({ type, size = 16 }: { type: Assignment["resource_type"]; size?: number }) {
  if (type === "boat") return <Waves size={size} strokeWidth={1.8} />;
  if (type === "ambulance") return <Ambulance size={size} strokeWidth={1.8} />;
  return <ShieldCheck size={size} strokeWidth={1.8} />;
}

function ResponseMap({ data, baseline = false, focusedResourceId, focusedZoneId }: { data: Simulation; baseline?: boolean; focusedResourceId: string | null; focusedZoneId: string | null }) {
  const routes = baseline ? data.baseline_assignments : data.assignments;
  const zoneColor = (severity: string) => severity === "critical" ? "#cf6854" : severity === "high" ? "#d2a04a" : severity === "moderate" ? "#73967c" : "#71919a";
  return <div className="map-canvas">
    <div className="map-water" />
    <svg className="map-svg" viewBox="0 0 220 100" preserveAspectRatio="none" aria-label="Sahaaya response network map">
      <defs>
        <pattern id="waterLines" width="6" height="4" patternUnits="userSpaceOnUse"><path d="M0 2 Q1.5 0.5 3 2 T6 2" fill="none" stroke="#d9ebed" strokeWidth=".28" /></pattern>
        <filter id="zoneGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="1.2" /></filter>
      </defs>
        <path d="M82 0 C91 9 79 17 94 27 C106 35 94 42 110 51 C121 60 106 69 125 77 C141 84 126 93 145 100 L220 100 L220 0Z" fill="url(#waterLines)" opacity=".95" />
      {data.roads.map((road) => {
        const a = data.nodes[road.a], b = data.nodes[road.b];
        return <g key={road.key}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={road.blocked ? "road road-blocked" : "road"} />
          {road.blocked && <g transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}><circle r="2.3" fill="#fff2ed" /><path d="M-.8-.8L.8.8M.8-.8L-.8.8" stroke="#c95443" strokeWidth=".45" /></g>}
        </g>;
      })}
      {routes.map((route, index) => {
        const points = route.route.map((node) => `${data.nodes[node].x},${data.nodes[node].y}`).join(" ");
        const isFocused = focusedResourceId ? route.resource_id === focusedResourceId : focusedZoneId ? route.zone_id === focusedZoneId : true;
        return <polyline key={`${route.resource_id}-${index}`} points={points} className={`route-line ${isFocused ? "route-selected" : "route-muted"}`} style={{ stroke: COLORS[route.resource_type] }} />;
      })}
      {Object.entries(data.nodes).map(([id, node]) => {
        if (node.kind === "junction") return <g key={id}><circle cx={node.x} cy={node.y} r=".9" fill="#9aa99e" stroke="white" strokeWidth=".45" /></g>;
        if (node.kind === "base") return <g key={id}><circle cx={node.x} cy={node.y} r="4.1" fill="#e0efe4" /><circle cx={node.x} cy={node.y} r="2.45" fill="#276b4c" /><path d={`M${node.x - 1.2} ${node.y}h2.4M${node.x} ${node.y - 1.2}v2.4`} stroke="white" strokeWidth=".45" /><text x={node.x} y={node.y + 6.4} className="map-place-label" textAnchor="middle">Response base</text></g>;
        if (node.kind === "shelter" || node.kind === "hospital") return <g key={id}><rect x={node.x - 2} y={node.y - 2} width="4" height="4" rx="1" fill="#f8fcfd" stroke="#83a9b4" strokeWidth=".45" /><text x={node.x} y={node.y + .85} className="map-site-mark" textAnchor="middle">{node.kind === "hospital" ? "+" : "⌂"}</text><text x={node.x} y={node.y + 4.2} className="map-small-label" textAnchor="middle">{node.label}</text></g>;
        return null;
      })}
      {data.zones.map((zone) => {
        const node = data.nodes[zone.node], color = zoneColor(zone.severity);
        const selected = zone.id === focusedZoneId;
        const routeCount = routes.filter((route) => route.zone_id === zone.id).length;
        return <g key={zone.id} className={selected ? "map-zone-focused" : ""}>
          <circle cx={node.x} cy={node.y} r={selected ? "7" : "5.4"} fill={color} opacity={selected ? ".22" : ".13"} filter="url(#zoneGlow)" />
          <circle cx={node.x} cy={node.y} r="3.25" fill="white" stroke={color} strokeWidth=".55" />
          <circle cx={node.x} cy={node.y} r="1.85" fill={color} />
          <text x={node.x} y={node.y - 5.2} className="map-zone-label" textAnchor="middle">{zone.name}</text>
          <text x={node.x} y={node.y + 7.4} className="map-priority-label" textAnchor="middle">P{zone.priority}{routeCount ? ` · ${routeCount} units` : ""}</text>
        </g>;
      })}
    </svg>
    <div className="map-compass"><span>N</span><ArrowDownRight size={12} /></div>
    <div className="map-scale">NETWORK VIEW <span>·</span> FICTIONAL DISTRICT</div>
  </div>;
}

export default function Home() {
  const [scenarioId, setScenarioId] = useState("balanced");
  const [blockedRoads, setBlockedRoads] = useState<string[]>([]);
  const [data, setData] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"allocation" | "baseline">("allocation");
  const [focusedResourceId, setFocusedResourceId] = useState<string | null>(null);
  const [focusedZoneId, setFocusedZoneId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const simulate = useCallback(async (scenario: string, blocked: string[]) => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/simulate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario_id: scenario, blocked_roads: blocked }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? "The simulation could not run.");
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong while running the simulation.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void simulate(scenarioId, blockedRoads); }, [simulate, scenarioId, blockedRoads]);

  const chartData = useMemo(() => data ? [
    { name: "A*", explored: data.algorithm_trace.astar_expanded, cost: data.algorithm_trace.astar_cost },
    { name: "BFS", explored: data.algorithm_trace.bfs_expanded, cost: data.algorithm_trace.bfs_cost },
  ] : [], [data]);

  const selectedScenario = SCENARIOS.find((item) => item.id === scenarioId)!;
  const ScenarioIcon = selectedScenario.icon;
  const allAssignments = data ? (tab === "allocation" ? data.assignments : data.baseline_assignments) : [];
  const assignments = focusedZoneId ? allAssignments.filter((item) => item.zone_id === focusedZoneId) : allAssignments;
  const toggleClosure = () => {
    const road = "d|j2";
    setFocusedResourceId(null); setFocusedZoneId(null);
    setBlockedRoads((current) => current.includes(road) ? current.filter((item) => item !== road) : [...current, road]);
  };

  const exportReport = () => {
    if (!data) return;
    const headers = ["Scenario", "Algorithm", "Resource", "Resource type", "Zone", "Zone priority", "Route", "Route cost", "Assignment score"];
    const rows = allAssignments.map((item) => [data.scenario_label, tab === "allocation" ? "CSP + A*" : "Priority-first + A*", item.resource_label, item.resource_type, item.zone_name, item.priority, item.route.map((node) => MAP_LABELS[node]).join(" > "), item.route_cost, item.value]);
    const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `sahaaya-${data.scenario_id}-${tab}-report.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="app-frame">
    <aside className="sidebar">
      <div className="brand"><div className="brand-symbol"><Waves size={19} /></div><div><strong>sahaaya</strong><span>RESPONSE LAB</span></div></div>
      <div className="sidebar-label">WORKSPACE</div>
      <button className="side-link selected"><MapPin size={16} /> Simulator</button>
      <button className="side-link" onClick={() => setGuideOpen(true)}><GitBranch size={16} /> Algorithm guide</button>
      <div className="sidebar-divider" />
      <div className="sidebar-label">COURSE CONNECTIONS</div>
      <div className="course-tags"><span>Intelligent agents</span><span>Informed search</span><span>CSP heuristics</span><span>Knowledge reasoning</span></div>
      <div className="sidebar-bottom"><div className="simulation-status"><i /><div><b>Simulation mode</b><small>Synthetic scenario data</small></div></div><div className="safety-note">A classroom AI microproject.<br />Not for real emergency response.</div></div>
    </aside>

    <main className="workspace">
      <header className="topbar"><div className="crumb"><span>Projects</span><span className="crumb-slash">/</span><b>Flood response</b></div><div className="topbar-right"><span className="connected-pill"><Radio size={12} /> LOCAL SIMULATION</span><button className="top-icon" onClick={() => setGuideOpen(true)} aria-label="Open project guide"><CircleHelp size={17} /></button><button className="mobile-menu" aria-label="Open navigation"><Menu size={18} /></button></div></header>

      <section className="hero"><div><div className="kicker"><span className="kicker-line" />AI MICROPROJECT <span className="kicker-dot">·</span> DECISION SUPPORT</div><h1>Flood response <em>simulator</em></h1><p>Allocate scarce resources. Find viable routes. Adapt as conditions change.</p></div><button className="run-button" disabled={loading} onClick={() => simulate(scenarioId, blockedRoads)}>{loading ? <RefreshCw size={15} className="spin" /> : <Sparkles size={15} />}{loading ? "Recalculating…" : "Run response plan"}<ArrowRight size={15} /></button></section>

      <section className="scenario-bar">
        <div className="scenario-choice"><span className="scenario-icon"><ScenarioIcon size={17} /></span><label htmlFor="scenario">ACTIVE SCENARIO</label><div className="select-wrap"><select id="scenario" value={scenarioId} onChange={(event) => { setFocusedZoneId(null); setFocusedResourceId(null); setBlockedRoads([]); setScenarioId(event.target.value); }} aria-label="Select flood scenario">{SCENARIOS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select><ChevronDown size={13} /></div></div>
        <div className="scenario-description"><span className="scenario-live-dot" />{data?.scenario_description ?? "Preparing the scenario…"}</div>
        <button className={`event-button ${blockedRoads.length ? "event-active" : ""}`} onClick={toggleClosure} disabled={loading}><span className="event-button-icon"><GitBranch size={14} /></span><span>{blockedRoads.length ? "Reopen south road" : "Simulate road closure"}</span><ArrowRight size={13} /></button>
      </section>

      {blockedRoads.length > 0 && <div className="replan-notice" role="status"><span className="replan-icon"><GitBranch size={14} /></span><span><b>{loading || !data?.blocked_roads.includes("d|j2") ? "Road closure set · replanning" : "Road closure applied"}</b><small>{loading || !data?.blocked_roads.includes("d|j2") ? "Updating feasible assignments and routes for the new network…" : "South junction → South fields is blocked. The agent has recalculated assignments and routes."}</small></span>{loading || !data?.blocked_roads.includes("d|j2") ? <RefreshCw size={14} className="spin replan-check" /> : <Check size={15} className="replan-check" />}</div>}

      {error && <div className="error-banner" role="alert"><Activity size={17} /><div><b>Python simulation API unavailable</b><span>{error}</span></div><button onClick={() => simulate(scenarioId, blockedRoads)}>Retry</button></div>}
      {loading && !data && <div className="loading-panel"><div className="loading-orbit" /><b>Preparing response environment</b><span>Evaluating zone priorities, assignments, and routes…</span></div>}
      {data && <>
        <section className="stat-grid">
          <article className="stat-card"><div className="stat-top"><span className="stat-label">UNITS DEPLOYED</span><span className="stat-icon mint"><ShieldCheck size={16} /></span></div><div className="stat-value">{data.metrics.assigned_count}<small> / {data.metrics.total_resources}</small></div><div className="stat-foot"><span className="stat-dot green" />Distinct resources assigned</div></article>
          <article className="stat-card"><div className="stat-top"><span className="stat-label">PRIORITY COVERAGE</span><span className="stat-icon blue"><Activity size={16} /></span></div><div className="stat-value">{data.metrics.coverage_percent}<small>%</small></div><div className="stat-foot">Greedy baseline <b>{data.metrics.baseline_coverage_percent}%</b><span className="coverage-delta">{data.metrics.coverage_percent >= data.metrics.baseline_coverage_percent ? <Check size={12} /> : <ArrowDownRight size={12} />}</span></div></article>
          <article className="stat-card"><div className="stat-top"><span className="stat-label">TOTAL ROUTE COST</span><span className="stat-icon orange"><Route size={16} /></span></div><div className="stat-value">{data.metrics.route_cost}<small> units</small></div><div className="stat-foot">A* weighted network distance</div></article>
          <article className="stat-card"><div className="stat-top"><span className="stat-label">CSP SEARCH EFFORT</span><span className="stat-icon purple"><GitBranch size={16} /></span></div><div className="stat-value">{formatNumber(data.metrics.states)}<small> states</small></div><div className="stat-foot">{formatNumber(data.metrics.bound_prunes + data.metrics.forward_prunes)} branches avoided</div></article>
        </section>

        <section className="primary-grid">
          <article className="surface map-surface">
            <div className="surface-head"><div><div className="section-eyebrow">LIVE ENVIRONMENT</div><h2>Response network</h2></div><div className="map-legend"><span><i className="legend-zone" />Affected zone</span><span><i className="legend-road" />Open road</span><span><i className="legend-blocked" />Closed</span></div></div>
            <ResponseMap data={data} baseline={tab === "baseline"} focusedResourceId={focusedResourceId} focusedZoneId={focusedZoneId} />
            <div className="map-footer"><div className="resource-legend"><span><i className="resource-dot boat" />Boat route</span><span><i className="resource-dot team" />Rescue route</span><span><i className="resource-dot ambulance" />Medical route</span></div><span className="map-disclaimer">{focusedZoneId ? `Focused: ${data.zones.find((zone) => zone.id === focusedZoneId)?.name}` : focusedResourceId ? `Focused: ${allAssignments.find((item) => item.resource_id === focusedResourceId)?.resource_label ?? "resource"}` : "Select a zone or unit to trace · map not to scale"}</span></div>
          </article>

          <article className="surface plan-surface">
            <div className="surface-head plan-head"><div><div className="section-eyebrow">AGENT DECISION</div><h2>Allocation plan</h2></div><span className="assigned-chip"><span />{assignments.length} ASSIGNED</span></div>
            <div className="plan-tabs"><button className={tab === "allocation" ? "active" : ""} onClick={() => { setTab("allocation"); setFocusedResourceId(null); }}>CSP agent <span className="tab-score">{data.metrics.csp_score.toFixed(0)}</span></button><button className={tab === "baseline" ? "active" : ""} onClick={() => { setTab("baseline"); setFocusedResourceId(null); }}>Priority-first <span className="tab-score baseline-score">{data.metrics.baseline_score.toFixed(0)}</span></button></div>
            {focusedZoneId && <div className="filter-notice"><span>Showing assignments for <b>{data.zones.find((zone) => zone.id === focusedZoneId)?.name}</b></span><button onClick={() => { setFocusedZoneId(null); setFocusedResourceId(null); }}>Clear filter <X size={12} /></button></div>}
            <div className="assignment-list">{assignments.length ? assignments.map((item) => <button type="button" className={`assignment-row ${focusedResourceId === item.resource_id ? "assignment-focused" : ""}`} key={item.resource_id} onClick={() => { setFocusedResourceId(focusedResourceId === item.resource_id ? null : item.resource_id); setFocusedZoneId(item.zone_id); }} aria-label={`Focus route for ${item.resource_label} to ${item.zone_name}`}><span className={`assignment-glyph ${item.resource_type}`}><ResourceGlyph type={item.resource_type} size={16} /></span><span className="assignment-copy"><b>{item.resource_label}<span className="assignment-arrow">→</span>{item.zone_name}</b><small><Route size={11} />{item.route.map((node) => MAP_LABELS[node]).join(" · ")}</small></span><span className="assignment-cost"><b>{item.route_cost}</b><small>cost</small></span></button>) : <div className="no-assignments">No units are assigned to this zone.</div>}</div>
            <div className="plan-summary"><div><span className="summary-mark"><Sparkles size={13} /></span><span><b>{tab === "allocation" ? "Constraint-optimized plan" : "Greedy priority baseline"}</b><small>{tab === "allocation" ? "Best feasible score found by CSP" : "Serves top-ranked zones first"}</small></span></div><button onClick={() => setGuideOpen(true)} aria-label="Explain allocation"><CircleHelp size={15} /></button></div>
          </article>
        </section>

        <section className="secondary-grid">
          <article className="surface zones-surface"><div className="surface-head"><div><div className="section-eyebrow">SITUATION AWARENESS</div><h2>Zone priorities</h2></div><div className="zone-head-actions"><span className="small-counter">{data.zones.length} INCIDENT ZONES</span><button className="export-button" onClick={exportReport} title="Download assignments as CSV"><Download size={13} />Export CSV</button></div></div>
            <div className="zone-table"><div className="zone-table-head"><span>AREA / RISK FACTORS</span><span>PEOPLE</span><span>PRIORITY</span></div>{data.zones.map((zone, index) => <button type="button" className={`zone-table-row ${focusedZoneId === zone.id ? "zone-row-focused" : ""}`} key={zone.id} onClick={() => { setFocusedZoneId(focusedZoneId === zone.id ? null : zone.id); setFocusedResourceId(null); }} aria-pressed={focusedZoneId === zone.id}><span className="zone-identity"><span className={`rank-number rank-${zone.severity}`}>{String(index + 1).padStart(2, "0")}</span><span><b>{zone.name}</b><small>{zone.reasons.slice(0, 2).join(" · ")}</small></span></span><span className="zone-people"><b>{formatNumber(zone.population)}</b><small>{zone.vulnerable} vulnerable</small></span><span className="zone-priority"><span className="priority-score"><b>{zone.priority}</b><span>/100</span></span><span className="priority-track"><i className={`priority-fill ${zone.severity}`} style={{ width: `${zone.priority}%` }} /></span></span></button>)}</div>
            <div className="rules-foot"><Sparkles size={13} /><span>Priority score comes from explainable rules for severity, vulnerability, injuries, rising water, and population exposure.</span></div>
          </article>

          <article className="surface analysis-surface"><div className="surface-head"><div><div className="section-eyebrow">ALGORITHM WORKBENCH</div><h2>Search comparison</h2></div><span className="workbench-icon"><BarChart3 size={16} /></span></div>
            <div className="algorithm-mini-cards"><div><span className="algo-chip astar-chip">A*</span><span><b>{formatNumber(data.algorithm_trace.astar_expanded)}</b><small>nodes expanded</small></span><strong>{data.algorithm_trace.astar_cost}<small> cost</small></strong></div><div><span className="algo-chip bfs-chip">BFS</span><span><b>{formatNumber(data.algorithm_trace.bfs_expanded)}</b><small>nodes expanded</small></span><strong>{data.algorithm_trace.bfs_cost}<small> cost</small></strong></div></div>
            <div className="chart-caption"><span>Expanded nodes across assigned routes</span><span className="chart-legend"><i className="astar-swatch" />Informed <i className="bfs-swatch" />Uninformed</span></div>
            <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 5, right: 8, left: -23, bottom: 0 }} barCategoryGap="42%"><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#edf0ec" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8b968e", fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#a1aaa4", fontSize: 9 }} /><Tooltip cursor={{ fill: "#f5f7f3" }} contentStyle={{ border: "1px solid #e5eae4", borderRadius: 8, fontSize: 11, boxShadow: "0 8px 24px #17281a12" }} /><Bar dataKey="explored" name="Nodes expanded" radius={[5, 5, 0, 0]} maxBarSize={40}>{chartData.map((entry) => <Cell key={entry.name} fill={entry.name === "A*" ? "#428a71" : "#b8c8bc"} />)}</Bar></BarChart></ResponsiveContainer></div>
            <div className="csp-comparison"><div><span className="csp-compare-label">CSP SEARCH · SAME CONSTRAINTS</span><span className="csp-compare-values"><b>{formatNumber(data.metrics.plain_csp_states)}</b><small>plain</small><ArrowRight size={12} /><strong>{formatNumber(data.metrics.states)}</strong><small>MRV + LCV</small></span></div><span className="search-saved">{data.metrics.plain_csp_states > 0 ? Math.max(0, Math.round((1 - data.metrics.states / data.metrics.plain_csp_states) * 100)) : 0}% fewer states</span></div>
            <div className="comparison-foot"><span><Check size={13} />A* found an equal-or-lower weighted cost on {data.algorithm_trace.astar_routes_no_more_costly}/{data.assignments.length} routes</span><button onClick={() => setGuideOpen(true)}>How to read this <ArrowRight size={12} /></button></div>
          </article>
        </section>
        <footer className="workspace-footer"><span><span className="footer-leaf">✳</span> Sahaaya · AI microproject</span><span><ShieldCheck size={12} /> Educational simulation only · all scenario data is synthetic</span></footer>
      </>}
    </main>

    {guideOpen && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setGuideOpen(false); }}><section className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title"><div className="guide-head"><div><div className="section-eyebrow">PROJECT GUIDE</div><h2 id="guide-title">How Sahaaya thinks</h2></div><button className="dialog-close" onClick={() => setGuideOpen(false)} aria-label="Close guide"><X size={18} /></button></div><p className="guide-intro">A model-based, goal-directed agent for a fictional flood-response network. Its decisions combine course algorithms that you can inspect and compare.</p><div className="guide-grid"><article><span>01 · KNOWLEDGE</span><h3>Forward-chaining rules</h3><p>Severity, vulnerability, injuries, rising water, and population facts add explainable points to each zone priority.</p><small>Knowledge representation · inference</small></article><article><span>02 · ALLOCATION</span><h3>CSP backtracking</h3><p>Resource variables choose an eligible zone or idle. MRV selects constrained variables, LCV orders values, and forward checking respects zone capacity.</p><small>Variables · domains · constraints</small></article><article><span>03 · ROUTING</span><h3>A* and BFS</h3><p>A* uses an admissible straight-line estimate for weighted routes. BFS is the uninformed baseline that minimizes the number of road edges.</p><small>Informed · uninformed search</small></article><article><span>04 · ADAPTATION</span><h3>Dynamic replanning</h3><p>Close a road to update the environment. The Python agent recomputes feasible allocations and routes from the new state.</p><small>Agents · task environments · planning</small></article></div><div className="next-steps"><b>Good next additions for the course demo</b><div><span><strong>Simulated annealing</strong> Compare a local-search allocation against the CSP on bigger maps.</span><span><strong>Q-learning</strong> Add a small discrete RL policy and compare its reward with the rule baseline.</span><span><strong>More scenario controls</strong> Change shelter capacity, flood intensity, or resource counts; export a run summary for your report.</span></div></div><div className="guide-note"><b>Model boundary:</b> Scores and constraints are simplified classroom assumptions, not validated emergency policy. The simulator must not be used for real-world response.</div><button className="guide-done" onClick={() => setGuideOpen(false)}>Back to simulator <ArrowRight size={14} /></button></section></div>}
  </div>;
}
