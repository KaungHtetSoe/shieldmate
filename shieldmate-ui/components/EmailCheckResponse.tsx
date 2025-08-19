"use client";

import * as React from "react";
import type { EmailCheckResponse } from "@/lib/api";

export default function EmailCheckResult({ data }: { data: EmailCheckResponse }) {
  const rows = data.breaches || [];
  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: 700 }}>
        {rows.length
          ? `${data.count} breach(es) found for ${data.email}`
          : `No breaches found for ${data.email}.`}
      </div>

      {rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Breach</th>
                <th>Date</th>
                <th>Domain</th>
                <th>Data classes</th>
                <th>Verified</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((b) => (
                <tr key={`${b.Name}-${b.BreachDate}`}>
                  <td style={{ whiteSpace: "nowrap" }}>{b.Title || b.Name}</td>
                  <td>{b.BreachDate}</td>
                  <td>{b.Domain || "—"}</td>
                  <td className="data-classes">
                    {(b.DataClasses || []).slice(0, 4).join(", ") || "n/a"}
                  </td>
                  <td>
                    <span className="badge" aria-label={b.IsVerified ? "Verified" : "Unverified"}>
                      {b.IsVerified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.count > rows.length && (
            <div className="small" style={{ marginTop: 6 }}>
              Showing {rows.length} of {data.count}.
            </div>
          )}
        </div>
      )}

      {data.ai_summary && (
        <div style={{ marginTop: 12 }}>
          <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>Summary</div>
          <div className="result">{data.ai_summary}</div>
        </div>
      )}
    </div>
  );
}
