
import { useState, useEffect } from "react";

const SYSTEM_PROMPT = `You are a B2B commercial intelligence analyst specializing in identifying buying signals and priming windows — the period before a company actively begins a vendor search or major purchase.

Given a company name and optional context, analyze and return ONLY a valid JSON object with this exact structure:
{
  "companySnapshot": {
    "estimatedRevenue": "string",
    "employeeRange": "string", 
    "industry": "string",
    "businessModel": "string",
    "knownFor": "string"
  },
  "primingScore": number between 0-100,
  "primingWindow": "Immediate (0-3mo)" | "Near-term (3-6mo)" | "Developing (6-12mo)" | "Early (12-24mo)",
  "signals": [
    {
      "category": "Leadership Change" | "Growth Signal" | "Tech Stack" | "Funding/M&A" | "Pain Indicator" | "Competitive Pressure",
      "signal": "specific signal description",
      "strength": "High" | "Medium" | "Low",
      "implication": "what this means for timing"
    }
  ],
  "firstMoverAdvantage": "string describing the specific priming window insight",
  "recommendedAngle": "string — the single best opening move for outreach",
  "watchSignals": ["array of 3 things to monitor that would accelerate or confirm the window"]
}

Be specific and commercially intelligent. If you don't recognize the company, make reasonable inferences based on industry patterns. Do not include any text outside the JSON.`;

const categoryColors = {
  "Leadership Change": "#E85D26",
  "Growth Signal": "#2EC27E",
  "Tech Stack": "#3B82F6",
  "Funding/M&A": "#A855F7",
  "Pain Indicator": "#EAB308",
  "Competitive Pressure": "#EC4899"
};

const strengthDot = { High: "#2EC27E", Medium: "#EAB308", Low: "#94A3B8" };

function ScoreRing({ score }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#2EC27E" : score >= 45 ? "#EAB308" : "#E85D26";

  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e2530" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center"
      }}>
        <span style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>priming</span>
      </div>
    </div>
  );
}

function SignalCard({ signal, delay }) {
  const color = categoryColors[signal.category] || "#64748b";
  return (
    <div style={{
      background: "#0f1419",
      border: `1px solid #1e2530`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: "14px 16px",
      animation: `fadeUp 0.4s ease both`,
      animationDelay: `${delay}ms`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color, fontFamily: "'DM Mono', monospace"
        }}>{signal.category}</span>
        <span style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 11, color: "#64748b"
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: strengthDot[signal.strength], display: "inline-block"
          }} />
          {signal.strength}
        </span>
      </div>
      <p style={{ margin: "0 0 6px", color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{signal.signal}</p>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12, lineHeight: 1.4, fontStyle: "italic" }}>{signal.implication}</p>
    </div>
  );
}

export default function AccountSignalTool() {
  const [query, setQuery] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    return () => clearInterval(iv);
  }, [loading]);

  const analyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
     const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: `Company: ${query}${context ? `\nContext: ${context}` : ""}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult(parsed);
    } catch (e) {
      setError("Analysis failed — check company name and try again.");
    }
    setLoading(false);
  };

  const windowColor = (w) => {
    if (w?.includes("Immediate")) return "#E85D26";
    if (w?.includes("Near-term")) return "#EAB308";
    if (w?.includes("Developing")) return "#3B82F6";
    return "#64748b";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c10",
      fontFamily: "'Inter', sans-serif",
      color: "#e2e8f0",
      padding: "0 0 80px"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
        ::placeholder { color: #334155 !important; }
        textarea:focus, input:focus { outline: none; border-color: #E85D26 !important; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0f1419; } ::-webkit-scrollbar-thumb { background: #1e2530; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #0f1419",
        padding: "28px 40px 24px",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        background: "linear-gradient(180deg, #0a0e14 0%, #080c10 100%)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#E85D26",
              animation: "pulse 2s infinite"
            }} />
            <span style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#E85D26", fontFamily: "'DM Mono', monospace" }}>
              Commercial Signal Engine
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "#f1f5f9" }}>
            Account Priming Intelligence
          </h1>
          <p style={{ margin: "4px 0 0", color: "#475569", fontSize: 13 }}>
            Identify the window before companies know they're buying
          </p>
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          color: "#1e2530", letterSpacing: "0.1em", textAlign: "right"
        }}>
          v1.0 · BETA<br />
          <span style={{ color: "#E85D26" }}>◆</span> LIVE
        </div>
      </div>

      {/* Input */}
      <div style={{ maxWidth: 860, margin: "40px auto 0", padding: "0 40px" }}>
        <div style={{
          background: "#0a0e14",
          border: "1px solid #1e2530",
          borderRadius: 12,
          padding: 24,
          display: "flex", flexDirection: "column", gap: 16
        }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 8 }}>
                Company Name
              </label>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && analyze()}
                placeholder="e.g. Acme Logistics, Flock Safety, Schneider Electric"
                style={{
                  width: "100%", background: "#080c10", border: "1px solid #1e2530",
                  borderRadius: 8, padding: "12px 14px", color: "#e2e8f0",
                  fontSize: 14, fontFamily: "'Inter', sans-serif", transition: "border 0.2s"
                }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 8 }}>
              Context <span style={{ color: "#1e2530", fontWeight: 400 }}>(optional — industry, what you sell, relationship)</span>
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="e.g. We sell CS operations software. They recently acquired a competitor and have a new VP of Customer Success."
              rows={2}
              style={{
                width: "100%", background: "#080c10", border: "1px solid #1e2530",
                borderRadius: 8, padding: "12px 14px", color: "#e2e8f0",
                fontSize: 14, fontFamily: "'Inter', sans-serif", resize: "vertical",
                lineHeight: 1.5, transition: "border 0.2s"
              }}
            />
          </div>
          <button
            onClick={analyze}
            disabled={loading || !query.trim()}
            style={{
              alignSelf: "flex-start",
              background: loading || !query.trim() ? "#1e2530" : "#E85D26",
              color: loading || !query.trim() ? "#475569" : "#fff",
              border: "none", borderRadius: 8, padding: "12px 28px",
              fontSize: 13, fontWeight: 700, letterSpacing: "0.05em",
              cursor: loading || !query.trim() ? "not-allowed" : "pointer",
              transition: "all 0.2s", fontFamily: "'Inter', sans-serif"
            }}
          >
            {loading ? `Analyzing${dots}` : "Run Signal Analysis →"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 20, padding: "14px 18px", background: "#1a0a0a", border: "1px solid #E85D26", borderRadius: 8, color: "#E85D26", fontSize: 13 }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 32, animation: "fadeUp 0.5s ease both" }}>
            {/* Top row */}
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 20, marginBottom: 20, alignItems: "center" }}>
              <ScoreRing score={result.primingScore} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>Priming Window</div>
                  <span style={{
                    display: "inline-block",
                    background: windowColor(result.primingWindow) + "22",
                    color: windowColor(result.primingWindow),
                    border: `1px solid ${windowColor(result.primingWindow)}44`,
                    borderRadius: 6, padding: "5px 12px",
                    fontSize: 13, fontWeight: 700, letterSpacing: "0.04em"
                  }}>{result.primingWindow}</span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {[
                    ["Industry", result.companySnapshot?.industry],
                    ["Revenue", result.companySnapshot?.estimatedRevenue],
                    ["Size", result.companySnapshot?.employeeRange],
                    ["Model", result.companySnapshot?.businessModel],
                  ].map(([label, val]) => val && (
                    <div key={label}>
                      <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{label}</div>
                      <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Priming insight */}
            <div style={{
              background: "#0a0e14", border: "1px solid #1e2530",
              borderLeft: "3px solid #E85D26", borderRadius: 8,
              padding: "16px 18px", marginBottom: 20
            }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E85D26", fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>First-Mover Advantage</div>
              <p style={{ margin: 0, color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>{result.firstMoverAdvantage}</p>
            </div>

            {/* Signals */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>
                Detected Signals ({result.signals?.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.signals?.map((s, i) => <SignalCard key={i} signal={s} delay={i * 80} />)}
              </div>
            </div>

            {/* Bottom row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{
                background: "#0a0e14", border: "1px solid #1e2530",
                borderRadius: 8, padding: "16px 18px"
              }}>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#3B82F6", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>Recommended Opening Move</div>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>{result.recommendedAngle}</p>
              </div>
              <div style={{
                background: "#0a0e14", border: "1px solid #1e2530",
                borderRadius: 8, padding: "16px 18px"
              }}>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A855F7", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>Watch Signals</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.watchSignals?.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: "#A855F7", fontSize: 11, marginTop: 2, flexShrink: 0, fontFamily: "'DM Mono', monospace" }}>0{i + 1}</span>
                      <span style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: "10px 14px", background: "#0a0e14", border: "1px solid #1e2530", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#334155", fontFamily: "'DM Mono', monospace" }}>
                Analysis powered by Claude · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <button
                onClick={() => { setResult(null); setQuery(""); setContext(""); }}
                style={{ background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", padding: 0 }}
              >
                New analysis →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
