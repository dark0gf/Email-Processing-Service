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

export interface AppState {
  emails: EmailRecord[];
  supplierFiles: SupplierFileRecord[];
  dealQuestions: DealQuestionRecord[];
}

export interface ParsedAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
  size: number;
}

export interface ParsedEmail {
  messageId: string;
  from?: string;
  subject: string;
  bodyText: string;
  html?: string;
  attachments: ParsedAttachment[];
}

export interface SupplierDetectionResult {
  isSupplierFile: boolean;
  filename?: string;
  storedBuffer?: Buffer;
  matchingSheet?: string;
  columnMapping?: Record<string, string>;
  rowCount?: number;
  previewRows?: Array<Record<string, string | number | null>>;
  notes: string[];
}

export interface ManualAttachmentInput {
  filename: string;
  contentType?: string;
  contentBase64: string;
}

export interface ManualEmailInput {
  messageId?: string;
  from: string;
  subject: string;
  bodyText: string;
  attachments?: ManualAttachmentInput[];
}
