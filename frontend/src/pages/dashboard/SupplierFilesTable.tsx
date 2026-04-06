import type { SupplierFileRecord } from "../../types";
import { formatNumber, formatDate } from "./utils";
import { mutedTextClass, panelLabelClass, chipClass, preCardClass } from "./constants";

export function SupplierFilesTable({ records }: { records: SupplierFileRecord[] }) {
  if (records.length === 0) {
    return <p className={mutedTextClass}>No supplier files have been detected yet.</p>;
  }

  return (
    <div className="grid gap-3.5">
      {records.map((record) => (
        <article className="rounded-3xl border border-slate-200 bg-white p-5" key={record.id}>
          <div className="mb-2 flex flex-col items-start justify-between gap-3 lg:flex-row">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{record.filename}</h3>
              <p className={mutedTextClass}>
                {record.matchingSheet} · {formatNumber(record.rowCount)} row(s)
              </p>
            </div>
          </div>
          <dl className="mt-3 grid gap-3.5 sm:grid-cols-2">
            <div className="grid gap-1">
              <dt className={mutedTextClass}>Stored key</dt>
              <dd className="break-all font-semibold text-slate-900">{record.storedKey}</dd>
            </div>
            <div className="grid gap-1">
              <dt className={mutedTextClass}>Created</dt>
              <dd className="font-semibold text-slate-900">{formatDate(record.createdAt)}</dd>
            </div>
          </dl>
          <section>
            <p className={`${panelLabelClass} mt-3`}>Column mapping</p>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {Object.entries(record.columnMapping).map(([field, header]) => (
                <span className={chipClass} key={`${record.id}-${field}`}>
                  {field}: {header}
                </span>
              ))}
            </div>
          </section>
          {record.previewRows.length > 0 ? (
            <section>
              <p className={`${panelLabelClass} mt-3`}>Preview rows</p>
              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {record.previewRows.slice(0, 3).map((row, index) => (
                  <pre className={preCardClass} key={`${record.id}-${index}`}>
                    {JSON.stringify(row, null, 2)}
                  </pre>
                ))}
              </div>
            </section>
          ) : null}
        </article>
      ))}
    </div>
  );
}
