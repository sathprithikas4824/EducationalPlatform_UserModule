"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveSurveyResponse } from "../lib/supabase";

const TOPICS = [
  "Programming & Development",
  "Data Science & AI",
  "Design & UX",
  "Business & Management",
  "Science & Engineering",
  "Languages & Communication",
  "Arts & Humanities",
  "Other",
];

const PROFESSIONS = [
  { value: "student", label: "Student", icon: "🎓" },
  { value: "teacher", label: "Teacher / Educator", icon: "📚" },
  { value: "professional", label: "Working Professional", icon: "💼" },
  { value: "jobseeker", label: "Job Seeker", icon: "🔍" },
  { value: "other", label: "Other", icon: "✨" },
];

const inputClass =
  "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-shadow";
const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.boxShadow = "0 0 0 3px rgba(122, 18, 250, 0.15)";
    e.target.style.borderColor = "#7a12fa";
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.boxShadow = "";
    e.target.style.borderColor = "";
  },
};

export default function SurveyPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [profession, setProfession] = useState("");
  // Student
  const [educationLevel, setEducationLevel] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  // Teacher
  const [subjectTaught, setSubjectTaught] = useState("");
  const [teachingLevel, setTeachingLevel] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  // Professional
  const [industry, setIndustry] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [platformUse, setPlatformUse] = useState("");
  // Job seeker
  const [targetRole, setTargetRole] = useState("");
  const [seekerEducation, setSeekerEducation] = useState("");
  // Other
  const [otherDescription, setOtherDescription] = useState("");
  // Common
  const [topicsInterested, setTopicsInterested] = useState<string[]>([]);
  const [weeklyHours, setWeeklyHours] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");

  const totalSteps = 4;

  const toggleTopic = (topic: string) => {
    setTopicsInterested((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const canProceedStep1 = profession !== "";
  const canProceedStep2 = (() => {
    if (profession === "student") return educationLevel && careerGoal;
    if (profession === "teacher") return subjectTaught && teachingLevel;
    if (profession === "professional") return industry && platformUse;
    if (profession === "jobseeker") return targetRole;
    if (profession === "other") return otherDescription;
    return false;
  })();
  const canProceedStep3 = topicsInterested.length > 0;
  const canSubmit = weeklyHours && primaryGoal;

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      const ok = await saveSurveyResponse({
        profession,
        education_level: educationLevel || undefined,
        career_goal: careerGoal || undefined,
        field_of_study: fieldOfStudy || undefined,
        subject_taught: subjectTaught || undefined,
        teaching_level: teachingLevel || undefined,
        experience_years: experienceYears || undefined,
        industry: industry || undefined,
        job_role: jobRole || undefined,
        platform_use: platformUse || undefined,
        target_role: targetRole || (seekerEducation ? undefined : undefined),
        other_description: otherDescription || undefined,
        topics_interested: topicsInterested,
        weekly_hours: weeklyHours,
        primary_goal: primaryGoal,
      });
      if (ok) {
        router.push("/");
      } else {
        setError("Failed to save your responses. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #f0f9ff 100%)" }}
    >
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
            >
              <img src="/logo.svg" alt="Logo" className="w-5 h-5 brightness-0 invert" />
            </div>
            <span className="text-xl font-bold text-gray-900">EduPlatform</span>
          </Link>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% complete</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(step / totalSteps) * 100}%`,
                backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)",
              }}
            />
          </div>
        </div>

        <div
          className="bg-white rounded-2xl p-8"
          style={{
            boxShadow: "0 4px 24px 0 rgba(124, 58, 237, 0.08), 0 1px 4px 0 rgba(0,0,0,0.06)",
            border: "1px solid rgba(140, 140, 170, 0.2)",
          }}
        >
          {/* Step 1: Profession */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Tell us about yourself</h1>
              <p className="text-gray-500 text-sm mb-6">
                Help us personalise your learning experience
              </p>
              <p className="text-sm font-medium text-gray-700 mb-3">
                What best describes you?
              </p>
              <div className="space-y-3">
                {PROFESSIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setProfession(p.value)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all text-left"
                    style={{
                      borderColor: profession === p.value ? "#7a12fa" : "#e5e7eb",
                      background: profession === p.value ? "rgba(122, 18, 250, 0.05)" : "white",
                      color: profession === p.value ? "#7a12fa" : "#374151",
                      boxShadow:
                        profession === p.value
                          ? "0 0 0 3px rgba(122, 18, 250, 0.12)"
                          : "none",
                    }}
                  >
                    <span className="text-lg">{p.icon}</span>
                    {p.label}
                    {profession === p.value && (
                      <span className="ml-auto">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Conditional questions */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">A bit more detail</h1>
              <p className="text-gray-500 text-sm mb-6">
                These help us recommend the right content for you
              </p>

              {/* Student */}
              {profession === "student" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Current education level
                    </label>
                    <select
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value)}
                      className={inputClass}
                      {...focusHandlers}
                    >
                      <option value="">Select level</option>
                      <option>High School</option>
                      <option>Undergraduate</option>
                      <option>Graduate / Masters</option>
                      <option>PhD / Doctorate</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Field of study <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={fieldOfStudy}
                      onChange={(e) => setFieldOfStudy(e.target.value)}
                      placeholder="e.g. Computer Science, Business..."
                      className={inputClass}
                      {...focusHandlers}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Career goal
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Software Engineering",
                        "Data Science",
                        "Design & UX",
                        "Business / Management",
                        "Research / Academia",
                        "Other",
                      ].map((goal) => (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => setCareerGoal(goal)}
                          className="px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left"
                          style={{
                            borderColor: careerGoal === goal ? "#7a12fa" : "#e5e7eb",
                            background:
                              careerGoal === goal ? "rgba(122, 18, 250, 0.05)" : "white",
                            color: careerGoal === goal ? "#7a12fa" : "#374151",
                          }}
                        >
                          {goal}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Teacher */}
              {profession === "teacher" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Subject(s) you teach
                    </label>
                    <input
                      type="text"
                      value={subjectTaught}
                      onChange={(e) => setSubjectTaught(e.target.value)}
                      placeholder="e.g. Mathematics, History, Python..."
                      className={inputClass}
                      {...focusHandlers}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Teaching level
                    </label>
                    <select
                      value={teachingLevel}
                      onChange={(e) => setTeachingLevel(e.target.value)}
                      className={inputClass}
                      {...focusHandlers}
                    >
                      <option value="">Select level</option>
                      <option>Primary / Elementary</option>
                      <option>Secondary / High School</option>
                      <option>Higher Education / University</option>
                      <option>Professional Training</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of experience <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {["0–2 years", "3–5 years", "6–10 years", "10+ years"].map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => setExperienceYears(y)}
                          className="px-4 py-2 rounded-xl border text-xs font-medium transition-all"
                          style={{
                            borderColor: experienceYears === y ? "#7a12fa" : "#e5e7eb",
                            background:
                              experienceYears === y ? "rgba(122, 18, 250, 0.05)" : "white",
                            color: experienceYears === y ? "#7a12fa" : "#374151",
                          }}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Professional */}
              {profession === "professional" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Industry
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className={inputClass}
                      {...focusHandlers}
                    >
                      <option value="">Select industry</option>
                      <option>Technology</option>
                      <option>Healthcare</option>
                      <option>Finance / Banking</option>
                      <option>Education</option>
                      <option>Manufacturing</option>
                      <option>Retail / E-commerce</option>
                      <option>Media / Entertainment</option>
                      <option>Government / Non-profit</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Current role / title <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      placeholder="e.g. Software Engineer, Product Manager..."
                      className={inputClass}
                      {...focusHandlers}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Why are you using this platform?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Upskilling / Learning new skills",
                        "Career change",
                        "Staying current in my field",
                        "Leading / teaching a team",
                      ].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setPlatformUse(u)}
                          className="px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left"
                          style={{
                            borderColor: platformUse === u ? "#7a12fa" : "#e5e7eb",
                            background:
                              platformUse === u ? "rgba(122, 18, 250, 0.05)" : "white",
                            color: platformUse === u ? "#7a12fa" : "#374151",
                          }}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Job seeker */}
              {profession === "jobseeker" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      What role are you targeting?
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Frontend Developer, Data Analyst..."
                      className={inputClass}
                      {...focusHandlers}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Highest education level <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <select
                      value={seekerEducation}
                      onChange={(e) => setSeekerEducation(e.target.value)}
                      className={inputClass}
                      {...focusHandlers}
                    >
                      <option value="">Select level</option>
                      <option>High School</option>
                      <option>Undergraduate</option>
                      <option>Graduate / Masters</option>
                      <option>PhD / Doctorate</option>
                      <option>Self-taught / Bootcamp</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Other */}
              {profession === "other" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tell us a bit about yourself
                  </label>
                  <textarea
                    value={otherDescription}
                    onChange={(e) => setOtherDescription(e.target.value)}
                    placeholder="What brings you to EduPlatform?"
                    rows={4}
                    className={inputClass + " resize-none"}
                    onFocus={(e) => {
                      e.target.style.boxShadow = "0 0 0 3px rgba(122, 18, 250, 0.15)";
                      e.target.style.borderColor = "#7a12fa";
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = "";
                      e.target.style.borderColor = "";
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Topics */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Topics you&apos;re interested in</h1>
              <p className="text-gray-500 text-sm mb-6">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => {
                  const selected = topicsInterested.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className="px-4 py-2.5 rounded-full border text-sm font-medium transition-all"
                      style={{
                        borderColor: selected ? "#7a12fa" : "#e5e7eb",
                        background: selected
                          ? "linear-gradient(90deg, #7a12fa, #b614ef)"
                          : "white",
                        color: selected ? "white" : "#374151",
                        boxShadow: selected ? "0 2px 8px 0 rgba(122, 18, 250, 0.25)" : "none",
                      }}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
              {topicsInterested.length === 0 && (
                <p className="text-xs text-gray-400 mt-3">Select at least one topic to continue</p>
              )}
            </div>
          )}

          {/* Step 4: Learning preferences */}
          {step === 4 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Your learning preferences</h1>
              <p className="text-gray-500 text-sm mb-6">Almost done!</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How much time can you dedicate per week?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Less than 1 hour", "1–3 hours", "3–5 hours", "5+ hours"].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setWeeklyHours(h)}
                        className="px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-center"
                        style={{
                          borderColor: weeklyHours === h ? "#7a12fa" : "#e5e7eb",
                          background: weeklyHours === h ? "rgba(122, 18, 250, 0.05)" : "white",
                          color: weeklyHours === h ? "#7a12fa" : "#374151",
                        }}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What&apos;s your primary learning goal?
                  </label>
                  <div className="space-y-2">
                    {[
                      "Get a job / land my first role",
                      "Advance in my current career",
                      "Personal growth & curiosity",
                      "Academic requirement / coursework",
                      "Build a business or side project",
                    ].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setPrimaryGoal(g)}
                        className="w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left"
                        style={{
                          borderColor: primaryGoal === g ? "#7a12fa" : "#e5e7eb",
                          background:
                            primaryGoal === g ? "rgba(122, 18, 250, 0.05)" : "white",
                          color: primaryGoal === g ? "#7a12fa" : "#374151",
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-3 px-4 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
            )}
            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
                className="flex-1 py-3 px-4 text-white text-sm font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                style={{
                  backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)",
                  boxShadow: "0 2px 8px 0 rgba(122, 18, 250, 0.35)",
                }}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || saving}
                className="flex-1 py-3 px-4 text-white text-sm font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                style={{
                  backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)",
                  boxShadow: "0 2px 8px 0 rgba(122, 18, 250, 0.35)",
                }}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Start learning →"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        <p className="text-center text-xs text-gray-400 mt-4">
          <Link href="/" className="hover:text-gray-600 underline underline-offset-2">
            Skip for now
          </Link>
          {" "}— you can always update this later
        </p>
      </div>
    </div>
  );
}
