import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { sendClosureCode, confirmClosure, ApiRequestError } from "@/services/api";

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const quota = useAuthStore((s) => s.quota);
  const activeTrip = useAuthStore((s) => s.activeTrip);
  const logout = useAuthStore((s) => s.logout);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  const [modalOpen, setModalOpen] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  // 60s 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (sending || countdown > 0) return;
    setErrorMsg(null);
    setSending(true);
    try {
      const res = await sendClosureCode();
      setChallengeId(res.challenge_id);
      setCountdown(res.resend_after_seconds || 60);
    } catch (err: unknown) {
      const msg = err instanceof ApiRequestError ? err.message : "验证码发送失败";
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
          setErrorMsg("已有行程正在规划中，无法注销账号。请等待规划完成后重试。");
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
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <span className="text-gray-500">绑定邮箱</span>
                <span className="font-mono font-medium text-gray-800">
                  {user?.masked_email || "未绑定"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">登录方式</span>
                <span className="font-medium text-gray-700">邮箱验证码登录</span>
              </div>
            </div>
          </section>

          {/* Section 2: 额度与公测 */}
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">公测额度</h2>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 border border-primary-100">
                Beta 公测模式
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center sm:gap-4">
              <div className="rounded-2xl bg-sand-50 p-4 border border-sand-100">
                <p className="text-2xl font-bold text-gray-800">{quota?.limit ?? 3}</p>
                <p className="mt-1 text-xs text-gray-500">总额度</p>
              </div>
              <div className="rounded-2xl bg-sand-50 p-4 border border-sand-100">
                <p className="text-2xl font-bold text-primary-600">{quota?.consumed ?? 0}</p>
                <p className="mt-1 text-xs text-gray-500">已使用</p>
              </div>
              <div className="rounded-2xl bg-sand-50 p-4 border border-sand-100">
                <p className="text-2xl font-bold text-accent-500">{quota?.remaining ?? 3}</p>
                <p className="mt-1 text-xs text-gray-500">剩余可用</p>
              </div>
            </div>

            {activeTrip && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-accent-50 border border-accent-100 p-3 text-xs text-accent-800">
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
            <p className="mb-4 text-xs text-gray-500 leading-relaxed">
              注销账号后将立即清除登录 Session 会话与账户绑定。历史生成的行程草稿将进行去标识化脱敏保留。
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl animate-fade-in">
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
            <div className="mb-5 space-y-2.5 rounded-2xl bg-red-50/70 p-4 border border-red-100 text-xs text-red-700">
              <p className="font-bold">🚨 请注意以下注销须知：</p>
              <ul className="list-disc space-y-1 pl-4 leading-relaxed text-red-800">
                <li>v0.1 不提供单条行程删除。</li>
                <li>账号注销会删除登录身份和会话，并解除历史行程与账号的关联。</li>
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
                    className="h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-mono tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
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
