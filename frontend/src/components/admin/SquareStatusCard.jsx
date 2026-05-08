import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw, Send, FileWarning } from "lucide-react";

/** Shows the live Square config + connectivity check so the operator can see
 *  whether orders are flowing into the correct Square account & location. */
export default function SquareStatusCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [failures, setFailures] = useState(null);
  const [loadingFailures, setLoadingFailures] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/square/status");
      setStatus(data);
    } catch (_) {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const runEndToEndTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post("/admin/square/test-order");
      setTestResult(data);
    } catch (e) {
      setTestResult({ ok: false, error: e.response?.data?.detail || "Request failed" });
    } finally {
      setTesting(false);
    }
  };

  const loadFailures = async () => {
    setLoadingFailures(true);
    try {
      const { data } = await api.get("/admin/square/recent-failures?limit=10");
      setFailures(data);
    } catch (_) {
      setFailures({ count: 0, items: [] });
    } finally {
      setLoadingFailures(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !status) {
    return (
      <div className="border border-chaioz-line bg-white rounded-2xl p-6 flex items-center gap-3 text-chaioz-teal/60">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking Square connection…
      </div>
    );
  }
  if (!status) return null;

  const connectivityOk = status.connectivity === "ok";
  const hasProblem = !connectivityOk || status.env_mismatch;
  const isProduction = status.environment === "production";

  return (
    <div className="border border-chaioz-line bg-white rounded-2xl p-6" data-testid="square-status-card">
      <div className="flex items-start gap-3">
        {connectivityOk && !status.env_mismatch ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
        ) : status.env_mismatch ? (
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-xl text-chaioz-teal">Square POS sync</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              data-testid="square-status-refresh"
              className="bg-white h-8 px-3"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Recheck
            </Button>
          </div>
          <p className="text-xs text-chaioz-teal/60 mt-1">
            Pushes every new website order into Square so staff see it on the tablet/KDS.
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-y-1 text-xs">
            <dt className="text-chaioz-teal/60">Environment</dt>
            <dd data-testid="square-env" className={`font-medium uppercase tracking-wider text-[11px] ${isProduction ? "text-emerald-600" : "text-amber-600"}`}>
              {status.environment}{!isProduction ? " (not live)" : ""}
            </dd>

            <dt className="text-chaioz-teal/60">Connectivity</dt>
            <dd className={`font-medium ${connectivityOk ? "text-emerald-600" : "text-red-500"}`}>
              {connectivityOk ? "Connected" : "Failed"}
            </dd>

            <dt className="text-chaioz-teal/60">Location</dt>
            <dd className="text-chaioz-teal font-medium" data-testid="square-location">
              {status.location_name || status.location_id || "—"}
            </dd>

            <dt className="text-chaioz-teal/60">App ID</dt>
            <dd className="text-chaioz-teal/80 font-mono text-[11px]">{status.application_id_prefix || "—"}</dd>

            <dt className="text-chaioz-teal/60">Access token</dt>
            <dd className="text-chaioz-teal/80">{status.access_token_present ? "Present" : "Missing"}</dd>
          </dl>

          {status.env_mismatch && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="square-mismatch-warning">
              <p className="text-xs font-semibold text-amber-900">⚠ Environment / App ID mismatch</p>
              <p className="text-xs text-amber-900 mt-1">
                Your <code>SQUARE_ENVIRONMENT</code> is <strong>{status.environment}</strong> but the <code>SQUARE_APPLICATION_ID</code> looks like the other environment. Update the env vars in production so they match — orders are currently pushing to the wrong Square account.
              </p>
            </div>
          )}

          {!isProduction && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="square-sandbox-warning">
              <p className="text-xs font-semibold text-amber-900">⚠ Running in sandbox</p>
              <p className="text-xs text-amber-900 mt-1">
                Orders are pushing to Square <strong>sandbox</strong>, not your live tablet. To flip production live, set <code>SQUARE_ENVIRONMENT=production</code> + production access token + production location ID in the deployment env and restart the backend.
              </p>
            </div>
          )}

          {!connectivityOk && status.error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3" data-testid="square-connection-error">
              <p className="text-xs font-semibold text-red-900">Connection error</p>
              <p className="text-[11px] text-red-900 mt-1 font-mono break-all">{status.error}</p>
            </div>
          )}

          {!hasProblem && (
            <p className="text-xs text-emerald-700 mt-4">
              ✓ Connection healthy — orders are being pushed to <strong>{status.location_name}</strong>.
            </p>
          )}

          {/* End-to-end test — far more reliable than the basic ping above.
              Actually creates a tiny test order in Square so failures that only
              surface at orders.create time (permissions, location config, bad
              fulfillment fields) are exposed verbatim. */}
          <div className="mt-5 pt-5 border-t border-chaioz-line">
            <h4 className="text-sm font-semibold text-chaioz-teal flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-chaioz-saffron" />
              End-to-end test
            </h4>
            <p className="text-[11px] text-chaioz-teal/60 mt-1">
              Creates a real $0.01 test order in your Square account, tagged "TEST — please void". Confirms orders are <em>actually</em> reaching Square (not just that the connection works). Void it from Square Dashboard after.
            </p>
            <Button
              onClick={runEndToEndTest}
              disabled={testing}
              data-testid="square-test-order"
              className="mt-2 rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal h-8 px-4 text-xs"
            >
              {testing ? (<><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pushing test order…</>) : (<><Send className="w-3 h-3 mr-1" /> Send test order to Square</>)}
            </Button>

            {testResult && testResult.ok && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3" data-testid="square-test-success">
                <p className="text-xs font-semibold text-emerald-900">✓ Test order created in Square</p>
                <p className="text-[11px] text-emerald-900 mt-1">{testResult.hint}</p>
                <p className="text-[10px] text-emerald-800/70 mt-2 font-mono break-all">Square order ID: {testResult.square_order_id}</p>
              </div>
            )}
            {testResult && !testResult.ok && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3" data-testid="square-test-error">
                <p className="text-xs font-semibold text-red-900">✕ Test order rejected by Square</p>
                <p className="text-[11px] text-red-900 mt-1">This is the exact reason real customer orders aren't reaching your tablet:</p>
                <pre className="mt-2 text-[10px] text-red-900 font-mono whitespace-pre-wrap break-all bg-white/60 rounded p-2 max-h-40 overflow-auto">{testResult.error}</pre>
              </div>
            )}
          </div>

          {/* Recent sync failures — for digging into past customer orders that
              didn't reach Square. */}
          <div className="mt-5 pt-5 border-t border-chaioz-line">
            <h4 className="text-sm font-semibold text-chaioz-teal flex items-center gap-1.5">
              <FileWarning className="w-3.5 h-3.5 text-amber-500" />
              Recent sync failures
            </h4>
            <Button
              variant="outline"
              onClick={loadFailures}
              disabled={loadingFailures}
              data-testid="square-load-failures"
              className="mt-2 bg-white h-8 px-3 text-xs"
            >
              {loadingFailures ? <Loader2 className="w-3 h-3 animate-spin" /> : "Show recent failures"}
            </Button>

            {failures && (
              failures.count === 0 ? (
                <p className="text-[11px] text-emerald-700 mt-2" data-testid="square-no-failures">No failed orders found 🎉</p>
              ) : (
                <div className="mt-3 space-y-2" data-testid="square-failures-list">
                  {failures.items.map((o) => (
                    <div key={o.id} className="bg-amber-50 border border-amber-200 rounded p-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-semibold text-amber-900">#{o.short_code}</span>
                        <span className="text-amber-700">{(o.created_at || "").slice(0, 16).replace("T", " ")}</span>
                      </div>
                      <p className="text-[11px] text-amber-900 mt-1">{o.customer_name} • ${o.total?.toFixed(2)} • {o.fulfillment}</p>
                      <pre className="text-[10px] text-amber-900/80 font-mono mt-1 whitespace-pre-wrap break-all">{o.square_sync_error}</pre>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
