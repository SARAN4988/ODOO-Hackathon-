import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout.jsx";

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/employees").then((r) => setRows(r.data.employees));
  }, []);

  const filtered = rows.filter((e) =>
    `${e.full_name} ${e.employee_code} ${e.department}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-ink/50 text-sm mt-1">{rows.length} people across the organization.</p>
          </div>
          <input
            className="input w-56"
            placeholder="Search by name, ID, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-border">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">ID</th>
                <th className="py-2 pr-4 font-medium">Department</th>
                <th className="py-2 pr-4 font-medium">Job title</th>
                <th className="py-2 pr-4 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-canvas">
                  <td className="py-2 pr-4">
                    <Link to={`/profile`} className="text-primary font-medium">{e.full_name}</Link>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{e.employee_code}</td>
                  <td className="py-2 pr-4">{e.department}</td>
                  <td className="py-2 pr-4">{e.job_title}</td>
                  <td className="py-2 pr-4 capitalize">{e.role === "admin" ? "HR" : "Employee"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-ink/40">No employees match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
