import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { showToast } from "@/stores/toastStore";
import {
  sendClosureCode,
  confirmClosure,
  updateDisplayName,
  ApiRequestError,
} from "@/services/api";

function formatCooldownTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const quota = useAuthStore((s) => s.quota);
  const activeTrip = useAuthStore((s) => s.activeTrip);
  const logout = useAuthStore((s) => s.logout);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [modalOpen, setModalOpen] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Display Name 编辑状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (status === "anonymous") {
      navigate("/login", { replace: true });
    }
  }, [status, navigate]);

  // 冷却判断与实时倒计时
  const availableAt = user?.display_name_change_available_at;
  const cooldownTime = availableAt ? new Date(availableAt).getTime() : 0;
  const isCooldown = cooldownTime > 0 && cooldownTime > now;

  useEffect(() => {
    if (!isCooldown) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isCooldown]);

  // 60s 注销验证码倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(
      () => setCountdown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [countdown]);

  if (status === "anonymous" || !user) {
    return null;
  }

  const handleStartEdit = () => {
    if (isCooldown) return;
    setEditName(user.display_name || "");
    setNameError(null);
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    if (savingName) return;
    setIsEditingName(false);
    setNameError(null);
  };

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (savingName) return;

    const normalized = editName.normalize("NFKC");

    // 规范化后与当前名称一致（无修改）
    if (normalized === user.display_name) {
      setIsEditingName(false);
      setNameError(null);
      return;
    }

    // 基础前端校验
    const charLength = [...normalized].length;
    const isValidChars = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(normalized);
    const isAllDigits = /^\d+$/.test(normalized);

    if (charLength < 2 || charLength > 24 || !isValidChars || isAllDigits) {
      setNameError(
        "请输入 2–24 个中文、英文字母、数字或下划线，且不能全部为数字。",
      );
      return;
    }

    setNameError(null);
    setSavingName(true);

    try {
      const res = await updateDisplayName(normalized);
      if (res.ok && res.user) {
        updateUser(res.user);
        setIsEditingName(false);
        showToast("显示名称已更新", "success");
      }
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.code === "DISPLAY_NAME_UNAVAILABLE") {
          setNameError("该显示名称暂不可用，请换一个。");
        } else if (err.code === "DISPLAY_NAME_INVALID") {
          setNameError(
            "请输入 2–24 个中文、英文字母、数字或下划线，且不能全部为数字。",
          );
        } else if (err.code === "DISPLAY_NAME_RESERVED") {
          setNameError("该名称为系统保留名称，请换一个。");
        } else if (err.code === "DISPLAY_NAME_CHANGE_COOLDOWN") {
          setNameError("显示名称修改仍在冷却期，请在可修改时间后重试。");
        } else if (err.code === "NETWORK_ERROR") {
          setNameError("网络连接失败，请稍后重试。");
        } else if (err.status === 409) {
          setNameError("该显示名称暂不可用，请换一个。");
        } else if (err.status === 422) {
          setNameError(
            "请输入 2–24 个中文、英文字母、数字或下划线，且不能全部为数字。",
          );
        } else if (err.status === 429) {
          setNameError("显示名称修改仍在冷却期，请在可修改时间后重试。");
        } else {
          setNameError(err.message || "网络连接失败，请稍后重试。");
        }
      } else {
        setNameError("网络连接失败，请稍后重试。");
      }
    } finally {
      setSavingName(false);
    }
  };

  const handleSendCode = async () => {
    if (sending || countdown > 0) return;
    setErrorMsg(null);
    setSending(true);
    try {
      const res = await sendClosureCode();
      setChallengeId(res.challenge_id);
      setCountdown(res.resend_after_seconds || 60);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiRequestError ? err.message : "验证码发送失败";
      setErrorMsg(msg);
    } finally {
      setSending(false);
    }
  };

  const handleConfirmClosure = async () => {
    if (!challengeId || confirming) return;
    if (!code || code.trim().length < 4) {
      setErrorMsg("请输入正确的 6 位验证码");
      return;
    }

    setErrorMsg(null);
    setConfirming(true);
    try {
      await confirmClosure(challengeId, code.trim());
      await logout();
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409 && err.code === "ACTIVE_TRIP_IN_PROGRESS") {
          setErrorMsg(
            "已有行程正在规划中，无法注销账号。请等待规划完成后重试。",
          );
        } else {
          setErrorMsg(err.message || "注销失败，请重试");
        }
      } else {
        setErrorMsg("请求失败，请检查网络设置");
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 pb-16 pt-6 font-body text-gray-800">
      <main className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-gray-800 sm:text-3xl">
          个人设置
        </h1>

        <div className="space-y-6">
          {/* Section 1: 账号信息 */}
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-gray-800">账号信息</h2>
            <div className="space-y-4 text-sm">
              {/* 显示名称 Row */}
              <div className="border-b border-gray-50 pb-4">
                {!isEditingName ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="min-w-[70px] text-gray-500">
                        显示名称
                      </span>
                      <span className="text-base font-bold text-gray-900">
                        {user.display_name || "未设置"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      {isCooldown && availableAt && (
                        <span className="text-xs text-amber-600">
                          可修改时间：{formatCooldownTime(availableAt)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        disabled={isCooldown}
                        className="self-start rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                      >
                        修改
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveName} className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="display-name-input"
                        className="text-xs font-bold text-gray-700"
                      >
                        显示名称
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          id="display-name-input"
                          type="text"
                          autoFocus
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            setNameError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          disabled={savingName}
                          aria-describedby="display-name-hint"
                          className="h-10 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-60"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={savingName}
                            className="min-w-[70px] rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                          >
                            {savingName ? "保存中…" : "保存"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={savingName}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    </div>
                    <p
                      id="display-name-hint"
                      className="text-[11px] text-gray-400"
                    >
                      NFKC 处理后 2–24
                      个字符，支持中文、拉丁字母、数字、下划线，不能全数字。
                    </p>
                    {nameError && (
                      <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600"
                      >
                        {nameError}
                      </div>
                    )}
                  </form>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <span className="text-gray-500">绑定邮箱</span>
                <span className="font-mono font-medium text-gray-800">
                  {user.masked_email || "未绑定"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">登录方式</span>
                <span className="font-medium text-gray-700">
                  邮箱验证码登录
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: 额度与公测 */}
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">公测额度</h2>
              <span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                Beta 公测模式
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center sm:gap-4">
              <div className="rounded-2xl border border-sand-100 bg-sand-50 p-4">
                <p className="text-2xl font-bold text-gray-800">
                  {quota ? quota.limit : "-"}
                </p>
                <p className="mt-1 text-xs text-gray-500">总额度</p>
              </div>
              <div className="rounded-2xl border border-sand-100 bg-sand-50 p-4">
                <p className="text-2xl font-bold text-primary-600">
                  {quota ? quota.consumed : "-"}
                </p>
                <p className="mt-1 text-xs text-gray-500">已使用</p>
              </div>
              <div className="rounded-2xl border border-sand-100 bg-sand-50 p-4">
                <p className="text-2xl font-bold text-accent-500">
                  {quota ? quota.remaining : "-"}
                </p>
                <p className="mt-1 text-xs text-gray-500">剩余可用</p>
              </div>
            </div>

            {activeTrip && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-accent-100 bg-accent-50 p-3 text-xs text-accent-800">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-400 border-t-accent-700" />
                <span>你当前有一个行程正在生成中 ({activeTrip.job_id})</span>
              </div>
            )}

            <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
              <i className="fas fa-circle-info text-gray-300" />
              公测免费额度：成功生成扣减 1 次，失败/超时自动退还。
            </p>
          </section>

          {/* Section 3: 危险区 */}
          <section className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-base font-bold text-red-600">危险区域</h2>
            <p className="mb-4 text-xs leading-relaxed text-gray-500">
              注销账号后将立即清除登录 Session
              会话与账户绑定。历史生成的行程草稿将进行去标识化脱敏保留。
            </p>
            <button
              onClick={() => {
                setModalOpen(true);
                setErrorMsg(null);
                setCode("");
              }}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
            >
              注销账号...
            </button>
          </section>
        </div>
      </main>

      {/* 注销风险 Modal */}
      {modalOpen && (
        <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-fade-in w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-600">确认注销账号？</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-xmark text-lg" />
              </button>
            </div>

            {/* Risk Warnings */}
            <div className="mb-5 space-y-2.5 rounded-2xl border border-red-100 bg-red-50/70 p-4 text-xs text-red-700">
              <p className="font-bold">🚨 请注意以下注销须知：</p>
              <ul className="list-disc space-y-1 pl-4 leading-relaxed text-red-800">
                <li>v0.1 不提供单条行程删除。</li>
                <li>
                  账号注销会删除登录身份和会话，并解除历史行程与账号的关联。
                </li>
                <li>去标识化的行程内容和质量数据将继续保留。</li>
              </ul>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700">
                  验证码二次确认
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="请输入 6 位验证码"
                    className="h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 font-mono text-sm tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sending || countdown > 0}
                    className="min-w-[108px] rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                  >
                    {sending ? (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-red-700" />
                    ) : countdown > 0 ? (
                      `${countdown}s 后重发`
                    ) : (
                      "发送验证码"
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClosure}
                  disabled={confirming || !challengeId}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-xs font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50"
                >
                  {confirming ? "正在注销…" : "确认永久注销"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
