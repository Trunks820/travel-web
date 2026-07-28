import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { sendEmailCode, verifyEmailCode, ApiRequestError } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { sanitizeReturnTo } from "@/utils/url";
import type { AuthMode } from "@/types/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  const authStatus = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [code, setCode] = useState("");

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const invitationInputRef = useRef<HTMLInputElement>(null);

  // 若已登录，直接跳转 returnTo
  useEffect(() => {
    if (authStatus === "authenticated") {
      navigate(returnTo, { replace: true });
    }
  }, [authStatus, navigate, returnTo]);

  // 60 秒倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleTabSwitch = (targetMode: AuthMode) => {
    if (targetMode === mode) return;
    setMode(targetMode);
    setOtpError(null);
    setInfoNotice(null);
    setEmailError(null);
    setInvitationError(null);
    // 切换 Tab 重置 challenge，防止跨模式复用
    setChallengeId(null);
    setCountdown(0);
  };

  const handleSendCode = async () => {
    if (sending || countdown > 0) return;
    setEmailError(null);
    setInvitationError(null);
    setOtpError(null);
    setInfoNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setEmailError("请输入有效的邮箱地址");
      return;
    }

    if (mode === "register" && !invitationCode.trim()) {
      setInvitationError("请输入邀请码");
      invitationInputRef.current?.focus();
      return;
    }

    setSending(true);
    try {
      const res = await sendEmailCode(
        mode,
        cleanEmail,
        mode === "register" ? invitationCode.trim() : null,
      );
      setChallengeId(res.challenge_id);
      setCountdown(res.resend_after_seconds || 60);
      setCode("123456");
      setInfoNotice("验证码已发送至你的邮箱（测试环境已为你自动回填：123456）");
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.code === "INVITATION_INVALID" || err.code === "INVITATION_EXHAUSTED") {
          setInvitationError(err.message || "邀请码无效或已超限");
          invitationInputRef.current?.focus();
        } else if (err.code === "INVALID_EMAIL" || err.code === "EMAIL_FORMAT_INVALID") {
          setEmailError(err.message || "邮箱格式不正确");
        } else {
          setOtpError(err.message || "验证码发送失败，请稍后重试");
        }
      } else {
        setOtpError("发送失败，请检查网络设置");
      }
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifying) return;
    setOtpError(null);
    setInfoNotice(null);

    if (!challengeId) {
      setOtpError("请先获取邮箱验证码");
      return;
    }

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 4) {
      setOtpError("请输入正确的验证码");
      otpInputRef.current?.focus();
      return;
    }

    setVerifying(true);
    try {
      await verifyEmailCode(challengeId, cleanCode);
      // 校验成功后 bootstrap 更新全局用户与额度状态
      await bootstrap();
      navigate(returnTo, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        // 409 模式纠偏
        if (err.status === 409 && err.code === "REGISTRATION_REQUIRED") {
          setMode("register");
          setChallengeId(null);
          setCountdown(0);
          setInfoNotice("该邮箱尚未注册，已为你自动切至注册模式，请输入邀请码并重新获取验证码。");
          setTimeout(() => invitationInputRef.current?.focus(), 100);
        } else if (err.status === 409 && err.code === "LOGIN_REQUIRED") {
          setMode("login");
          setChallengeId(null);
          setCountdown(0);
          setInfoNotice("该邮箱已注册，已自动切至登录模式，请重新获取验证码。");
        } else if (err.code === "OTP_INVALID" || err.code === "OTP_EXPIRED") {
          setOtpError(err.message || "验证码错误或已失效");
          setCode("");
          otpInputRef.current?.focus();
        } else {
          setOtpError(err.message || "验证失败，请重试");
        }
      } else {
        setOtpError("验证失败，请检查网络");
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-sand-50 font-body text-gray-800">
      {/* 极简页头 */}
      <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur-md">
        <Link to="/" className="flex items-center space-x-2">
          <img src="/logo.svg" alt="云途 YunTu" className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight text-gray-800">
            云途 <span className="font-normal text-primary-500">YunTu</span>
          </span>
        </Link>
        <Link to="/" className="text-xs text-gray-500 hover:text-gray-800">
          返回首页 →
        </Link>
      </header>

      {/* 居中 Single-Card 表单 */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-teal-900/5 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-gray-800 sm:text-3xl">
              {mode === "login" ? "欢迎回来" : "加入云途公测"}
            </h1>
            <p className="mt-1.5 text-xs text-gray-500">
              {mode === "login"
                ? "输入注册邮箱快速登录账号"
                : "凭公测邀请码开启智能行程规划"}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => handleTabSwitch("login")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              邮箱登录
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch("register")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                mode === "register"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              邀请码注册
            </button>
          </div>

          {infoNotice && (
            <div className="mb-5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-xs text-primary-700">
              {infoNotice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* 邀请码 (仅注册模式) */}
            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700" htmlFor="invitation-code">
                  邀请码
                </label>
                <input
                  id="invitation-code"
                  ref={invitationInputRef}
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  placeholder="请输入公测邀请码"
                  className={`h-11 w-full rounded-xl border bg-gray-50 px-4 text-sm font-mono tracking-wider focus:bg-white focus:outline-none focus:ring-2 ${
                    invitationError
                      ? "border-red-300 focus:ring-red-200"
                      : "border-gray-200 focus:border-primary-500 focus:ring-primary-100"
                  }`}
                />
                {invitationError && (
                  <p className="mt-1 text-xs text-red-500">{invitationError}</p>
                )}
              </div>
            )}

            {/* 邮箱 */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700" htmlFor="login-email">
                电子邮箱
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@example.com"
                className={`h-11 w-full rounded-xl border bg-gray-50 px-4 text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                  emailError
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:border-primary-500 focus:ring-primary-100"
                }`}
              />
              {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
            </div>

            {/* 验证码 */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700" htmlFor="otp-code">
                邮箱验证码
              </label>
              <div className="flex gap-2">
                <input
                  id="otp-code"
                  ref={otpInputRef}
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6位数字验证码"
                  className={`h-11 flex-1 rounded-xl border bg-gray-50 px-4 text-sm font-mono tracking-widest focus:bg-white focus:outline-none focus:ring-2 ${
                    otpError
                      ? "border-red-300 focus:ring-red-200"
                      : "border-gray-200 focus:border-primary-500 focus:ring-primary-100"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sending || countdown > 0}
                  className="min-w-[108px] rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-300 border-t-primary-700" />
                  ) : countdown > 0 ? (
                    `${countdown}s 后重新发`
                  ) : (
                    "发送验证码"
                  )}
                </button>
              </div>
              {otpError && <p className="mt-1.5 text-xs text-red-500">{otpError}</p>}
            </div>

            {/* 提交按钮 */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={verifying}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-accent-500 text-sm font-bold text-white shadow-lg shadow-accent-200 transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
              >
                {verifying ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    正在验证…
                  </>
                ) : mode === "login" ? (
                  "立即登录"
                ) : (
                  "完成注册并登录"
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 flex items-center justify-center gap-1 text-center text-xs text-gray-400">
            <i className="fas fa-shield-alt" aria-hidden="true" />
            7 天固定 Session 会话 · Cookie 安全传输
          </p>
        </div>
      </main>
    </div>
  );
}
