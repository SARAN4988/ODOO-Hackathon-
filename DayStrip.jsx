import React from "react";

// Signature element: a 7-day strip showing attendance status as dots.
// Ties back to the product idea "every workday, perfectly aligned."
const STATUS_COLOR = {
  Present: "bg-accent",
  Absent: "bg-danger",
  "Half-day": "bg-warn",
  Leave: "bg-primary-light",
  None: "bg-border",
};

function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function DayStrip({ records = [] }) {
  const days = lastNDays(7);
  const byDate = Object.fromEntries(records.map((r) => [r.date, r.status]));

  return (
    <div className="flex items-end gap-3">
      {days.map((date) => {
        const status = byDate[date] || "None";
        const dayLabel = new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
        return (
          <div key={date} className="flex flex-col items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLOR[status]}`} title={status} />
            <span className="text-[10px] font-mono text-ink/40 uppercase">{dayLabel[0]}</span>
          </div>
        );
      })}
    </div>
  );
}
