import React, { useEffect, useState } from "react";

const dateString = (d) => d.toISOString().slice(0, 10);
function KpiCard({ label, value, detail }) {
  return <article className="kpi"><h3>{label}</h3><strong>{value.toLocaleString()}</strong><p>{detail}</p></article>;
}
function TrendChart({ series }) {
  const maximum = Math.max(1, ...series.map(d => d.count));
  return <figure className="trend"><figcaption><h3>Documents uploaded by day</h3><p>Compare daily upload volume to plan time for organizing submissions. UTC dates; counts start at zero.</p></figcaption>
    <div className="chart-scroll"><svg viewBox="0 0 900 240" role="img" aria-label={`Daily document uploads, from zero to ${maximum}. Exact dates and counts are available in the table below.`}>
      <text x="5" y="18">Documents</text><text x="5" y="42">{maximum}</text><text x="22" y="205">0</text>
      <line x1="50" y1="200" x2="890" y2="200" stroke="currentColor"/>
      {series.map((d, i) => <rect key={d.date} x={50 + i * 840 / series.length} y={200 - d.count / maximum * 150} width={Math.max(1, 840 / series.length - 2)} height={d.count / maximum * 150} fill="#226345"><title>{d.date}: {d.count} documents</title></rect>)}
      <text x="50" y="225">{series[0].date}</text><text x="890" y="225" textAnchor="end">{series.at(-1).date}</text>
    </svg></div>
    <details><summary>View exact daily counts</summary><div className="daily-table"><table><caption>Daily uploads (UTC)</caption><thead><tr><th scope="col">Date</th><th scope="col">Documents</th></tr></thead><tbody>{series.map(d => <tr key={d.date}><th scope="row">{d.date}</th><td>{d.count}</td></tr>)}</tbody></table></div></details>
  </figure>;
}
export default function Dashboard({ revision, onExpired }) {
  const [from, setFrom] = useState(() => dateString(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(() => dateString(new Date()));
  const [query, setQuery] = useState({ from, to, refresh: 0 });
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    (async () => {
      try {
        const r = await fetch(`/api/reports/documents?from=${query.from}&to=${query.to}`, { signal: controller.signal });
        if (r.status === 401) { onExpired(); return; }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Report unavailable. Try again.");
        if (!controller.signal.aborted) setState({ status: data.totalDocuments === 0 ? "empty" : "ready", data });
      } catch (e) { if (!controller.signal.aborted) setState({ status: "error", message: e.message }); }
    })();
    return () => controller.abort();
  }, [query, revision, onExpired]);
  const data = state.data;
  return <section className="dashboard" aria-labelledby="report-heading" aria-busy={state.status === "loading"}>
    <span className="step">03 / DOCUMENT REPORTING</span><h2 id="report-heading">Your document overview</h2><p>Saved documents in your account, grouped by upload date.</p>
    <form className="report-filters" onSubmit={e => { e.preventDefault(); setQuery({ from, to, refresh: query.refresh + 1 }); }}>
      <label>From (UTC)<input type="date" required value={from} onChange={e => setFrom(e.target.value)}/></label>
      <label>To (UTC)<input type="date" required value={to} min={from} onChange={e => setTo(e.target.value)}/></label>
      <button className="primary">Update report</button>
    </form>
    {state.status === "loading" && <p role="status">Loading document report…</p>}
    {state.status === "error" && <div role="alert"><p>{state.message}</p><button onClick={() => setQuery({ ...query, refresh: query.refresh + 1 })}>Retry report</button></div>}
    {data && <><p className="report-context">Data range: {data.from} through {data.to} (UTC, inclusive). Updated <time dateTime={data.generatedAtUtc}>{new Date(data.generatedAtUtc).toLocaleString("en-PH", { timeZone: "UTC" })} UTC</time>.</p>
      {state.status === "empty" ? <div className="empty" role="status"><h3>No documents in this date range</h3><p>Choose another range or upload a document below.</p></div> : <><div className="kpi-grid">
        <KpiCard label="Documents" value={data.totalDocuments} detail="Saved uploads in this range"/>
        <KpiCard label="PDF documents" value={data.pdfDocuments} detail="Validated PDF uploads"/>
        <KpiCard label="Images" value={data.imageDocuments} detail="PNG and JPEG uploads"/>
        <KpiCard label="Stored bytes" value={data.storedBytes} detail="Total bytes of these uploads"/>
      </div><TrendChart series={data.uploadsByDay}/></>}
    </>}
  </section>;
}
