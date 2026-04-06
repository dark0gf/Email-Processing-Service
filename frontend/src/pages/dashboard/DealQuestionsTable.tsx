import type { DealQuestionRecord } from "../../types";
import { formatDate } from "./utils";
import { mutedTextClass, panelLabelClass, preCardClass } from "./constants";

export function DealQuestionsTable({ records }: { records: DealQuestionRecord[] }) {
  if (records.length === 0) {
    return <p className={mutedTextClass}>No deal questions have been recorded yet.</p>;
  }

  return (
    <div className="grid gap-3.5">
      {records.map((record) => (
        <article className="rounded-3xl border border-slate-200 bg-white p-5" key={record.id}>
          <div className="mb-2 flex flex-col items-start justify-between gap-3 lg:flex-row">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{record.subject || "(no subject)"}</h3>
              <p className={mutedTextClass}>{record.sender}</p>
            </div>
            <span
              className={
                record.notificationStatus === "failed"
                  ? "inline-flex items-center rounded-full bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800"
                  : "inline-flex items-center rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
              }
            >
              {record.notificationStatus}
            </span>
          </div>
          <dl className="mt-3 grid gap-3.5 sm:grid-cols-2">
            <div className="grid gap-1">
              <dt className={mutedTextClass}>Created</dt>
              <dd className="font-semibold text-slate-900">{formatDate(record.createdAt)}</dd>
            </div>
            <div className="grid gap-1">
              <dt className={mutedTextClass}>Notified at</dt>
              <dd className="font-semibold text-slate-900">{formatDate(record.notifiedAt)}</dd>
            </div>
          </dl>
          <section>
            <p className={`${panelLabelClass} mt-3`}>Question body</p>
            <pre className={`${preCardClass} p-3.5`}>{record.bodyText}</pre>
          </section>
          {record.notificationError ? (
            <section>
              <p className={`${panelLabelClass} mt-3`}>Notification error</p>
              <pre className={`${preCardClass} p-3.5 text-rose-700`}>{record.notificationError}</pre>
            </section>
          ) : null}
        </article>
      ))}
    </div>
  );
}
