import React, { useCallback, useEffect, useRef, useState } from "react";
import Dashboard from "./Dashboard.jsx";
import { createRoot } from "react-dom/client";
import "./style.css";
const size = (n) =>
  n < 1000
    ? `${n} bytes`
    : n < 1_000_000
      ? `${(n / 1000).toFixed(1)} KB`
      : `${(n / 1_000_000).toFixed(2)} MB`;
function App() {
  const [reportRevision, setReportRevision] = useState(0);
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [files, setFiles] = useState([]),
    [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(null);
  const picker = useRef(null),
    csrf = useRef("");
  const expireSession = useCallback(() => { setUser(null); setFiles([]); setMessage({ ok: false, text: "Your session expired. Sign in again." }); }, []);
  async function token() {
    const r = await fetch("/api/csrf");
    if (!r.ok) throw Error("Cannot connect to the server.");
    csrf.current = (await r.json()).token;
  }
  async function request(url, options = {}) {
    const r = await fetch(url, {
      ...options,
      headers: {
        ...(options.method ? { "X-CSRF-TOKEN": csrf.current } : {}),
        ...options.headers,
      },
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      if (r.status === 401 && user) {
        setUser(null);
        setFiles([]);
      }
      throw Error(
        data.error ||
          {
            401: "Please sign in to continue.",
            429: "Too many requests. Wait a minute and try again.",
            413: "File exceeds the request size limit.",
          }[r.status] ||
          "The request could not be completed.",
      );
    }
    return r.status === 204 ? null : r.json();
  }
  async function refresh() {
    setFiles(await request("/api/files"));
    setReportRevision(n => n + 1);
  }
  useEffect(() => {
    (async () => {
      try {
        await token();
        const s = await request("/api/session");
        setUser(s.username);
        if (s.username) setFiles(await request("/api/files"));
      } catch (e) {
        setMessage({ ok: false, text: e.message });
      } finally {
        setReady(true);
      }
    })();
  }, []);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const data = new FormData(e.currentTarget);
    try {
      await token();
      const s = await request("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      setUser(s.username);
      await token();
      await refresh();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await request("/api/logout", { method: "POST" });
      setUser(null);
      setFiles([]);
      setFile(null);
      setMessage(null);
      await token();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }
  async function upload(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const data = new FormData();
      data.append("file", file);
      await request("/api/files", { method: "POST", body: data });
      setMessage({
        ok: true,
        text: `${file.name} was uploaded. Only your account can download it.`,
      });
      setFile(null);
      picker.current.value = "";
      await refresh();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }
  async function download(record) {
    setBusy(true);
    try {
      const r = await fetch(`/api/files/${record.id}`);
      if (!r.ok)
        throw Error(
          r.status === 401
            ? "Your session expired. Sign in again."
            : "This document could not be downloaded.",
        );
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = record.originalName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header>
        <a className="brand" href="/" aria-label="Campus Document Hub home">
          <span className="brandmark">C</span>
          <span>
            CAMPUS<span className="brand-sub">DOCUMENT HUB</span>
          </span>
        </a>
        <div className="header-end">
          <span className="course">INTEGRATIVE PROGRAMMING 1 · WEEK 11</span>
          {user && (
            <>
              <span className="account">{user}</span>
              <button className="quiet" disabled={busy} onClick={logout}>
                Sign out
              </button>
            </>
          )}
        </div>
      </header>
      <main>
        <div className="eyebrow">YOUR CAMPUS. YOUR DOCUMENTS.</div>
        <h1>
          A safe place for
          <br />
          your next submission<span>.</span>
        </h1>
        <p className="intro">
          Keep your campus documents together, with access that stays yours.
        </p>
        {message && (
          <div
            role={message.ok ? "status" : "alert"}
            className={`notice ${message.ok ? "success" : "error"}`}
          >
            <strong>
              {message.ok ? "Upload complete" : "Request rejected"}
            </strong>
            <span>{message.text}</span>
          </div>
        )}
        {!ready ? (
          <p role="status">Connecting to your document hub…</p>
        ) : !user ? (
          <section className="login-panel">
            <div>
              <div className="eyebrow">STUDENT ACCESS</div>
              <h2>Sign in to your hub</h2>
              <p>Your documents are private to your account.</p>
              <p className="demo">
                Local classroom demo
                <br />
                <b>alice</b> / AliceDemo!2026
                <br />
                <b>bob</b> / BobDemo!2026
              </p>
            </div>
            <form onSubmit={login}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                maxLength="50"
                placeholder="e.g. alice"
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength="100"
              />
              <button className="primary" disabled={busy}>
                {busy ? "Signing in…" : "Sign in →"}
              </button>
            </form>
          </section>
        ) : (
          <><Dashboard key={user} revision={reportRevision} onExpired={expireSession}/><div className="workspace">
            <section className="upload-panel">
              <div className="section-top">
                <span className="step">01 / UPLOAD</span>
                <span className="private">PRIVATE TO YOU</span>
              </div>
              <h2>Add a document</h2>
              <p>One file at a time. Ready when you are.</p>
              <form onSubmit={upload}>
                <div className="file-zone">
                  <span className="file-symbol" aria-hidden="true">
                    ↥
                  </span>
                  <label htmlFor="file">Choose a PDF or image</label>
                  <span className="hint" id="file-hint">
                    PDF, PNG or JPEG · Maximum 5 MB
                  </span>
                  <input
                    ref={picker}
                    id="file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    aria-describedby="file-hint"
                    disabled={busy}
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                      setMessage(null);
                    }}
                  />
                </div>
                {file && (
                  <div className="selected" role="status">
                    <strong>{file.name}</strong>
                    <span>
                      {size(file.size)} · {file.size.toLocaleString()} bytes
                    </span>
                    {file.size > 5_000_000 && (
                      <span className="warning">
                        This file exceeds 5 MB. The server will reject it.
                      </span>
                    )}
                  </div>
                )}
                <button className="primary" disabled={!file || busy}>
                  {busy ? "Please wait…" : "Upload document ↑"}
                </button>
              </form>
              <div className="security-note">
                <b>Made for private submissions.</b>
                <p>
                  Files are checked before saving. Downloads require your
                  signed-in account.
                </p>
              </div>
            </section>
            <section className="documents">
              <div className="section-top">
                <span className="step">02 / YOUR LIBRARY</span>
                <span className="count">
                  {files.length} {files.length === 1 ? "DOCUMENT" : "DOCUMENTS"}
                </span>
              </div>
              <h2>Your documents</h2>
              <p>Saved securely. Available only to you.</p>
              {files.length === 0 ? (
                <div className="empty">
                  <span aria-hidden="true">▤</span>
                  <h3>Your library starts here</h3>
                  <p>Choose your first document to get started.</p>
                </div>
              ) : (
                <ul className="file-list">
                  {files.map((r) => (
                    <li key={r.id}>
                      <span className="type">
                        {r.contentType === "application/pdf" ? "PDF" : "IMG"}
                      </span>
                      <div className="file-info">
                        <strong>{r.originalName}</strong>
                        <span>
                          {size(r.sizeBytes)} ·{" "}
                          {new Date(r.createdAtUtc).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </span>
                        <span className="status">
                          ● {r.status} · Owner: {r.owner}
                        </span>
                      </div>
                      <button
                        className="download"
                        disabled={busy}
                        aria-label={`Download ${r.originalName}`}
                        onClick={() => download(r)}
                      >
                        Download ↓
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div></>
        )}
        <footer>
          <span>CAMPUS DOCUMENT HUB</span>
          <span>Week 11 · Document reporting dashboard</span>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
