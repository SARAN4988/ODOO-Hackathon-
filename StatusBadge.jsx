import React from "react";

const MAP = {
  Present: "badge-present",
  Absent: "badge-absent",
  "Half-day": "badge-half",
  Leave: "badge-leave",
  Pending: "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
};

export default function StatusBadge({ status }) {
  return <span className={MAP[status] || "badge bg-border text-ink/60"}>{status}</span>;
}
