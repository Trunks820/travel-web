import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CitySelect } from "@/components/input/CitySelect";
import { DaysSlider } from "@/components/input/DaysSlider";
import { PeopleCounter } from "@/components/input/PeopleCounter";
import { PaceSelect } from "@/components/input/PaceSelect";
import { PreferenceTags } from "@/components/input/PreferenceTags";
import { AvoidTags } from "@/components/input/AvoidTags";
import { NotesInput } from "@/components/input/NotesInput";
import { useTripStore } from "@/stores/tripStore";
import { submitTrip, ApiRequestError } from "@/services/api";
import type { TripFormData } from "@/types/form";
import { DEFAULT_FORM } from "@/types/form";
import { CloudDecor } from "@/components/layout/CloudDecor";

interface FormErrors {
  to_city?: string;
  submit?: string;
}

export default function InputPage() {
  const navigate = useNavigate();
  const setFormData = useTripStore((s) => s.setFormData);
  const setJob = useTripStore((s) => s.setJob);

  const [form, setForm] = useState<TripFormData>({ ...DEFAULT_FORM });
  const [pace, setPace] = useState("moderate");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof TripFormData>(
    key: K,
    value: TripFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "to_city") setErrors((prev) => ({ ...prev, to_city: undefined }));
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.to_city) next.to_city = "请选择目的地";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || submitting) return;

    const finalForm: TripFormData = {
      ...form,
      preferences:
        pace === "relaxed"
          ? [...form.preferences.filter((p) => p !== "轻松"), "轻松"]
          : form.preferences.filter((p) => p !== "轻松"),
    };

    setSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: undefined }));

    try {
      setFormData(finalForm);
      const { job_id } = await submitTrip(finalForm);
      setJob(job_id, "QUEUED", null);
      navigate(`/planning/${job_id}`);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "提交失败，请稍后重试";
      setErrors((prev) => ({ ...prev, submit: message }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-start lg:gap-16">
      <CloudDecor intensity="normal" />

      {/* Hero — 桌面端左侧，移动端顶部 */}
      <div className="w-full shrink-0 text-center animate-fade-in lg:sticky lg:top-24 lg:w-[380px] lg:text-left">
        <h1 className="font-display text-2xl font-bold tracking-tight text-primary-800 sm:text-3xl lg:text-4xl">
          规划你的
          <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
            完美旅行
          </span>
        </h1>
        <p className="mt-3 text-sand-500 lg:text-base">
          AI 驱动 · 个性化定制 · 智能行程规划
        </p>

        {/* 卖点列表 — 仅桌面端显示 */}
        <ul className="mt-8 hidden space-y-5 lg:block">
          {[
            { icon: "🗺️", title: "智能行程规划", desc: "根据你的偏好生成多套方案，轻松对比选择" },
            { icon: "⏱️", title: "节奏自由把控", desc: "从轻松到紧凑，AI 帮你合理安排每一天" },
            { icon: "📍", title: "实时地图导览", desc: "每个景点清晰标注，通勤路线一目了然" },
          ].map((item) => (
            <li key={item.title} className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-lg shadow-sm">
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-primary-800">{item.title}</p>
                <p className="mt-0.5 text-sm text-sand-500">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 表单 */}
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-form space-y-7 p-6 sm:p-8 animate-slide-up lg:max-w-none"
      >
        <CitySelect
          value={form.to_city}
          onChange={(v) => updateField("to_city", v)}
          error={errors.to_city}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <DaysSlider
            value={form.days}
            onChange={(v) => updateField("days", v)}
          />
          <PeopleCounter
            value={form.people_count}
            onChange={(v) => updateField("people_count", v)}
          />
        </div>

        <PaceSelect value={pace} onChange={setPace} />

        <PreferenceTags
          value={form.preferences}
          onChange={(v) => updateField("preferences", v)}
        />

        <AvoidTags
          value={form.avoid}
          onChange={(v) => updateField("avoid", v)}
        />

        <NotesInput
          value={form.notes}
          onChange={(v) => updateField("notes", v)}
        />

        {errors.submit && (
          <div className="error-banner">{errors.submit}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? "正在提交..." : "开始规划"}
        </button>
      </form>
    </div>
  );
}
