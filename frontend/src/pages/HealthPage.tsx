import { useEffect, useState } from "react";

import { apiClient } from "../api";
import type { HealthResponse } from "../types";

export function HealthPage() {
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadBackendHealth(): Promise<void> {
    setIsLoading(true);
    setBackendError(null);

    try {
      const response = await apiClient.getHealth();
      setBackendHealth(response);
    } catch (error) {
      setBackendHealth(null);
      setBackendError(error instanceof Error ? error.message : "Unknown backend health error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBackendHealth();
  }, []);

  const backendOutput = backendHealth
    ? {
        appEnv: backendHealth.appEnv,
        serverTimeUtc: backendHealth.serverTimeUtc,
        database: backendHealth.database,
      }
    : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-6">
      <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xl backdrop-blur sm:p-6">
        <h1 className="mb-3 text-balance font-['Fraunces','Georgia',serif] text-4xl leading-[0.95] sm:text-5xl">Health page</h1>
        <h3 className="text-base font-semibold text-slate-900">Frontend:</h3>
        <p className="text-slate-600">if you see this then frontend runs successulyy</p>

        <h3 className="mt-4 text-base font-semibold text-slate-900">Backend:</h3>
        {backendError ? <p className="text-rose-700">{backendError}</p> : null}

        {backendOutput ? (
          <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 leading-relaxed">
            {JSON.stringify(backendOutput, null, 2)}
          </pre>
        ) : (
          <p className="text-slate-600">{isLoading ? "Loading backend health..." : "No backend health response yet."}</p>
        )}
      </section>
    </main>
  );
}
