import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw } from "lucide-react";

/** Shows the live Square config + connectivity check so the operator can see
 *  whether orders are flowing into the correct Square account & location. */
export default function SquareStatusCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get("/admin/square/status");
      setStatus(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
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

  if (loadError) {
    return (
      <div className="border border-chaioz-line bg-white rounded-2xl p-6" data-testid="square-status-error">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-serif text-xl text-chaioz-teal">Square POS sync</h3>
            <p className="text-xs text-red-500 mt-1">Could not load Square status — is the backend running?</p>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="mt-3 rounded-full h-8">
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Retry
            </Button>
          </div>
        </div>
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
              ✓ Ready — new orders are being pushed to <strong>{status.location_name}</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
