export enum ProcessingStatus {
  PROCESSING = "processing",
  PROCESSED = "processed",
  FAILED = "failed",
}

export type NotificationStatus = "sent" | "failed" | "skipped";

export interface ProcessedAttachment {
  filename: string;
  contentType: string;
  size: number;
}

export interface EmailRecord {
  id: string;
  messageId: string;
  from: string;
  subject: string;
  bodyText: string;
  processingStatus: ProcessingStatus;
  rawS3Key?: string;
  attachments: ProcessedAttachment[];
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFileRecord {
  id: string;
  emailId: string;
  messageId: string;
  filename: string;
  storedAt: "s3" | "local";
  storedKey: string;
  matchingSheet: string;
  columnMapping: Record<string, string>;
  rowCount: number;
  previewRows: Array<Record<string, string | number | null>>;
  createdAt: string;
}

export interface DealQuestionRecord {
  id: string;
  emailId: string;
  sender: string;
  subject: string;
  bodyText: string;
  notificationStatus: NotificationStatus;
  notificationError?: string;
  notifiedAt?: string;
  createdAt: string;
}

export interface HealthResponse {
  appEnv: string;
  serverTimeUtc: string;
  database: {
    enabled: boolean;
    connected: boolean;
    error?: string;
  };
}

export interface DashboardData {
  emails: EmailRecord[];
  supplierFiles: SupplierFileRecord[];
  dealQuestions: DealQuestionRecord[];
  health: HealthResponse;
}

export interface SessionTokenPayload {
  sub: string;
  env: string;
  iat: number;
  exp: number;
}