"use client";

import { useEffect, useState } from "react";
import { supabase, getSurveyResponses } from "../../lib/supabase";

interface SurveyAnswers {
  education_level?: string;
  career_goal?: string;
  field_of_study?: string;
  subject_taught?: string;
  teaching_level?: string;
  experience_years?: string;
  industry?: string;
  job_role?: string;
  platform_use?: string;
  target_role?: string;
  other_description?: string;
  topics_interested: string[];
  weekly_hours: string;
  primary_goal: string;
}

interface SurveyRow {
  id: string;
  user_id: string;
  email: string;
  profession: string;
  answers: SurveyAnswers;
  created_at: string;
}

const PROFESSION_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher / Educator",
  professional: "Working Professional",
  jobseeker: "Job Seeker",
  other: "Other",
};

function getProfessionDetail(row: SurveyRow): string {
  const a: SurveyAnswers = row.answers ?? {} as SurveyAnswers;
  if (row.profession === "student") return a.career_goal || a.education_level || "—";
  if (row.profession === "teacher") return a.subject_taught || "—";
  if (row.profession === "professional") return a.job_role || a.industry || "—";
  if (row.profession === "jobseeker") return a.target_role || "—";
  return a.other_description?.slice(0, 60) || "—";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function exportCSV(rows: SurveyRow[]) {
  const headers = [
    "Email",
    "Profession",
    "Detail",
    "Education Level",
    "Career Goal",
    "Field of Study",
    "Subject Taught",
    "Teaching Level",
    "Experience Years",
    "Industry",
    "Job Role",
    "Platform Use",
    "Target Role",
    "Topics",
    "Weekly Hours",
    "Primary Goal",
    "Date",
  ];

  const csvRows = rows.map((r) =>
    [
      r.email,
      PROFESSION_LABELS[r.profession] || r.profession,
      getProfessionDetail(r),
      r.answers?.education_level || "",
      r.answers?.career_goal || "",
      r.answers?.field_of_study || "",
      r.answers?.subject_taught || "",
      r.answers?.teaching_level || "",
      r.answers?.experience_years || "",
      r.answers?.industry || "",
      r.answers?.job_role || "",
      r.answers?.platform_use || "",
      r.answers?.target_role || "",
      (r.answers?.topics_interested || []).join("; "),
      r.answers?.weekly_hours || "",
      r.answers?.primary_goal || "",
      formatDate(r.created_at),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `survey-responses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminSurveysPage() {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      if (!supabase) { setAccessDenied(true); setLoading(false); return; }

      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccessDenied(true); setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const data = await getSurveyResponses();
      setRows(data);
      setLoading(false);
    };

    load();
  }, []);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.profession === filter);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}
      >
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#7a12fa", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500 text-sm">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Survey Responses</h1>
            <p className="text-gray-500 text-sm mt-1">{rows.length} total responses</p>
          </div>
          <button
            type="button"
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-opacity"
            style={{
              backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)",
              boxShadow: "0 2px 8px 0 rgba(122, 18, 250, 0.3)",
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Students", value: "student" },
            { label: "Teachers", value: "teacher" },
            { label: "Professionals", value: "professional" },
            { label: "Job Seekers", value: "jobseeker" },
            { label: "Other", value: "other" },
          ].map((s) => (
            <div
              key={s.value}
              className="bg-white rounded-xl p-4 text-center"
              style={{ border: "1px solid rgba(140,140,170,0.2)", boxShadow: "0 2px 8px 0 rgba(124,58,237,0.06)" }}
            >
              <p className="text-2xl font-bold text-gray-900">
                {rows.filter((r) => r.profession === s.value).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { label: "All", value: "all" },
            { label: "Students", value: "student" },
            { label: "Teachers", value: "teacher" },
            { label: "Professionals", value: "professional" },
            { label: "Job Seekers", value: "jobseeker" },
            { label: "Other", value: "other" },
          ].map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: filter === f.value ? "linear-gradient(90deg, #7a12fa, #b614ef)" : "white",
                color: filter === f.value ? "white" : "#374151",
                border: `1px solid ${filter === f.value ? "transparent" : "#e5e7eb"}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(140,140,170,0.2)", boxShadow: "0 4px 24px 0 rgba(124,58,237,0.08)" }}
        >
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-lg">No responses yet</p>
              <p className="text-sm mt-1">Responses will appear here after users complete the survey.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(122,18,250,0.04)", borderBottom: "1px solid rgba(140,140,170,0.15)" }}>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Profession</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Detail</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Topics</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Weekly Time</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Goal</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? "1px solid rgba(140,140,170,0.1)" : "none",
                      }}
                      className="hover:bg-purple-50/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-800 font-medium max-w-[180px] truncate">
                        {row.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(122,18,250,0.08)",
                            color: "#7a12fa",
                          }}
                        >
                          {PROFESSION_LABELS[row.profession] || row.profession}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">
                        {getProfessionDetail(row)}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {(row.answers?.topics_interested || []).slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="inline-block px-2 py-0.5 rounded text-xs"
                              style={{ background: "#f3f4f6", color: "#374151" }}
                            >
                              {t}
                            </span>
                          ))}
                          {(row.answers?.topics_interested || []).length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{(row.answers?.topics_interested || []).length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {row.answers?.weekly_hours || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">
                        {row.answers?.primary_goal || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
