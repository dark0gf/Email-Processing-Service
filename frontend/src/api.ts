import type { DashboardData, DealQuestionRecord, EmailRecord, HealthResponse, SupplierFileRecord } from "./types";
import { clearAuthTokens, readAccessToken, refreshSessionTokens } from "./auth";
import { frontendEnv } from "./env";

const apiBaseUrl = frontendEnv.backendUrl;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetchWithAuth(path);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function fetchWithAuth(path: string): Promise<Response> {
  const initialToken = readAccessToken();
  const initialResponse = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Accept: "application/json",
      ...(initialToken ? { Authorization: `Bearer ${initialToken}` } : {}),
    },
  });

  if (initialResponse.status !== 401) {
    return initialResponse;
  }

  const refreshedToken = await refreshSessionTokens();

  if (!refreshedToken) {
    clearAuthTokens();
    return initialResponse;
  }

  return fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${refreshedToken}`,
    },
  });
}

export const apiClient = {
  baseUrl: apiBaseUrl,
  async getHealth(): Promise<HealthResponse> {
    return fetchJson<HealthResponse>("/health");
  },
  async listEmails(): Promise<EmailRecord[]> {
    return fetchJson<EmailRecord[]>("/emails");
  },
  async getEmail(id: string): Promise<EmailRecord> {
    return fetchJson<EmailRecord>(`/emails/${id}`);
  },
  async listSupplierFiles(): Promise<SupplierFileRecord[]> {
    return fetchJson<SupplierFileRecord[]>("/supplier-files");
  },
  async listDealQuestions(): Promise<DealQuestionRecord[]> {
    return fetchJson<DealQuestionRecord[]>("/deal-questions");
  },
  async getDashboardData(): Promise<DashboardData> {
    const [health, emails, supplierFiles, dealQuestions] = await Promise.all([
      this.getHealth(),
      this.listEmails(),
      this.listSupplierFiles(),
      this.listDealQuestions(),
    ]);

    return {
      health,
      emails,
      supplierFiles,
      dealQuestions,
    };
  },
};