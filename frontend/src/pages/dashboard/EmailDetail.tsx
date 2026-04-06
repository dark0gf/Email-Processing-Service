import type { EmailRecord } from "../../types";
import { formatDate, formatAttachmentSize } from "./utils";
import { mutedTextClass, panelLabelClass, preCardClass, chipClass } from "./constants";

export function EmailDetail({ email }: { email: EmailRecord }) {
  return (
    <div className="grid gap-3.5">
      <dl className="grid gap-3.5 sm:grid-cols-2">
        <div className="grid gap-1">
          <dt className={mutedTextClass}>Sender</dt>
          <dd className="font-semibold text-slate-900">{email.from}</dd>
        </div>
        <div className="grid gap-1">
          <dt className={mutedTextClass}>Received</dt>
          <dd className="font-semibold text-slate-900">{formatDate(email.receivedAt)}</dd>
        </div>
        <div className="grid gap-1">
          <dt className={mutedTextClass}>Status</dt>
          <dd className="font-semibold text-slate-900">{email.processingStatus}</dd>
        </div>
        <div className="grid gap-1">
          <dt className={mutedTextClass}>Message ID</dt>
          <dd className="break-all font-semibold text-slate-900">{email.messageId}</dd>
        </div>
        <div className="grid gap-1">
          <dt className={mutedTextClass}>Raw S3 key</dt>
          <dd className="break-all font-semibold text-slate-900">{email.rawS3Key ?? "-"}</dd>
        </div>
      </dl>

      <section>
        <p className={panelLabelClass}>Body</p>
        <pre className={preCardClass}>{email.bodyText || "(empty body)"}</pre>
      </section>

      <section>
        <p className={panelLabelClass}>Attachments</p>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {email.attachments.length > 0 ? (
            email.attachments.map((attachment) => (
              <span className={chipClass} key={`${attachment.filename}-${attachment.size}`}>
                {attachment.filename} · {formatAttachmentSize(attachment.size)}
              </span>
            ))
          ) : (
            <span className={mutedTextClass}>No attachments</span>
          )}
        </div>
      </section>
    </div>
  );
}
