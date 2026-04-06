import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { apiClient } from "../../api";
import { clearAuthTokens, logoutSession, parseSessionToken, readAccessToken, refreshSessionTokens } from "../../auth";
import type { DashboardData, EmailRecord, SessionTokenPayload } from "../../types";

import { SummaryCard } from "./SummaryCard";
import { EmailDetail } from "./EmailDetail";
import { SupplierFilesTable } from "./SupplierFilesTable";
import { DealQuestionsTable } from "./DealQuestionsTable";

import { formatDate } from "./utils";

import {
  shellClass,
  panelClass,
  panelStrongClass,
  compactPanelClass,
  panelLabelClass,
  mutedTextClass,
  secondaryButtonClass,
  tabBaseClass,
  tabActiveClass,
  tabInactiveClass,
  listItemClass,
  listItemActiveClass,
} from "./constants";

type DashboardTab = "emails" | "supplier-files" | "deal-questions";

export function DashboardPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [session, setSession] = useState<SessionTokenPayload | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const currentSession = parseSessionToken(readAccessToken());

      if (currentSession) {
        if (isMounted) {
          setSession(currentSession);
          setIsCheckingSession(false);
        }
        return;
      }

      const refreshedToken = await refreshSessionTokens();
      const refreshedSession = parseSessionToken(refreshedToken);

      if (!refreshedSession) {
        clearAuthTokens();
      }

      if (isMounted) {
        setSession(refreshedSession);
        setIsCheckingSession(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingSession) {
    return (
      <section className={`${compactPanelClass} mx-4 mt-4 text-slate-700`}>Checking session...</section>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardContent session={session} />;
}

function DashboardContent({ session }: { session: SessionTokenPayload }) {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("emails");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [selectedEmailError, setSelectedEmailError] = useState<string | null>(null);

  async function loadDashboard(mode: "initial" | "refresh"): Promise<void> {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setDashboardError(null);

    try {
      const data = await apiClient.getDashboardData();
      setDashboardData(data);

      const firstEmail = data.emails[0];

      if (!selectedEmailId && firstEmail) {
        setSelectedEmailId(firstEmail.id);
        setSelectedEmail(firstEmail);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown dashboard error";
      setDashboardError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard("initial");
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void (async () => {
        const validatedSession = parseSessionToken(readAccessToken());

        if (!validatedSession) {
          const refreshedToken = await refreshSessionTokens();

          if (!parseSessionToken(refreshedToken)) {
            clearAuthTokens();
            navigate("/login", { replace: true });
            return;
          }
        }

        await loadDashboard("refresh");
      })();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [navigate]);

  useEffect(() => {
    if (!selectedEmailId) {
      setSelectedEmail(null);
      return;
    }

    setSelectedEmailError(null);

    void apiClient
      .getEmail(selectedEmailId)
      .then((email) => {
        setSelectedEmail(email);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown email detail error";
        setSelectedEmailError(message);
      });
  }, [selectedEmailId]);

  const summary = useMemo(() => {
    const emails = dashboardData?.emails ?? [];

    return {
      totalEmails: emails.length,
      supplierFiles: dashboardData?.supplierFiles.length ?? 0,
      dealQuestions: dashboardData?.dealQuestions.length ?? 0,
      failedNotifications: (dashboardData?.dealQuestions ?? []).filter((question) => question.notificationStatus === "failed")
        .length,
    };
  }, [dashboardData]);

  const emails = dashboardData?.emails ?? [];

  async function handleLogout(): Promise<void> {
    await logoutSession();
    navigate("/login", { replace: true });
  }

  return (
    <main className={shellClass}>
      <section className={`${panelClass} flex flex-col justify-between gap-6 lg:flex-row`}>
        <div>
          <h1 className="mb-3 text-balance font-['Fraunces','Georgia',serif] text-4xl leading-[0.95] sm:text-5xl lg:text-6xl">
            Email processing dashboard
          </h1>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
            {session.env}
          </span>
          <button className={secondaryButtonClass} onClick={() => void loadDashboard("refresh")} type="button">
            {isRefreshing ? "Refreshing..." : "Refresh data"}
          </button>
          <button className={secondaryButtonClass} onClick={() => void handleLogout()} type="button">
            Sign out
          </button>
        </div>
      </section>

      {dashboardError ? (
        <section className={compactPanelClass}>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard unavailable</h2>
          <p className="text-rose-700">{dashboardError}</p>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <SummaryCard label="Processed emails" value={summary.totalEmails} />
        <SummaryCard label="Supplier files" value={summary.supplierFiles} />
        <SummaryCard label="Deal questions" value={summary.dealQuestions} />
        <SummaryCard label="Failed notifications" value={summary.failedNotifications} tone="warning" />
      </section>

      <section className="flex flex-wrap gap-3" aria-label="Dashboard views">
        <button
          className={`${tabBaseClass} ${activeTab === "emails" ? tabActiveClass : tabInactiveClass}`}
          onClick={() => setActiveTab("emails")}
          type="button"
        >
          Emails
        </button>
        <button
          className={`${tabBaseClass} ${activeTab === "supplier-files" ? tabActiveClass : tabInactiveClass}`}
          onClick={() => setActiveTab("supplier-files")}
          type="button"
        >
          Supplier files
        </button>
        <button
          className={`${tabBaseClass} ${activeTab === "deal-questions" ? tabActiveClass : tabInactiveClass}`}
          onClick={() => setActiveTab("deal-questions")}
          type="button"
        >
          Deal questions
        </button>
      </section>

      {isLoading ? <section className={`${compactPanelClass} ${mutedTextClass}`}>Loading dashboard...</section> : null}

      {!isLoading && activeTab === "emails" ? (
        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className={panelClass}>
            <div className="grid gap-3.5">
              {emails.map((email) => (
                <button
                  className={`${listItemClass} ${selectedEmailId === email.id ? listItemActiveClass : ""}`}
                  key={email.id}
                  onClick={() => setSelectedEmailId(email.id)}
                  type="button"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <strong>{email.subject || "(no subject)"}</strong>
                  </div>
                  <p className={mutedTextClass}>{email.from}</p>
                  <div className={`mt-3 flex justify-between gap-2 text-sm ${mutedTextClass}`}>
                    <span>{formatDate(email.receivedAt)}</span>
                    <span>{email.attachments.length} attachment(s)</span>
                  </div>
                </button>
              ))}
              {emails.length === 0 ? <p className={mutedTextClass}>No emails available.</p> : null}
            </div>
          </div>
          <div className={panelStrongClass}>
            <div className="mb-4">
              <p className={panelLabelClass}>Email detail</p>
              <h2 className="text-xl font-semibold text-slate-900">{selectedEmail?.subject || "Select an email"}</h2>
            </div>
            {selectedEmailError ? <p className="text-rose-700">{selectedEmailError}</p> : null}
            {selectedEmail ? <EmailDetail email={selectedEmail} /> : <p className={mutedTextClass}>Choose an email to inspect payload details.</p>}
          </div>
        </section>
      ) : null}

      {!isLoading && activeTab === "supplier-files" ? (
        <section className={panelClass}>
          <SupplierFilesTable records={dashboardData?.supplierFiles ?? []} />
        </section>
      ) : null}

      {!isLoading && activeTab === "deal-questions" ? (
        <section className={panelClass}>
          <DealQuestionsTable records={dashboardData?.dealQuestions ?? []} />
        </section>
      ) : null}
    </main>
  );
}
