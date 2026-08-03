import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { sendEmailCode, verifyEmailCode, ApiRequestError } from "@/services/api";
import { useAuthStore, broadcastAuthEvent } from "@/stores/authStore";
import { sanitizeReturnTo } from "@/utils/url";
import type { AuthMode } from "@/types/auth";
import { YuntuInkTrails } from "../../components/common/YuntuInkTrails";

export default function LoginPageFrontispiece() {
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

  useEffect(() => {
    if (authStatus === "authenticated") {
      navigate(returnTo, { replace: true });
    }
  }, [authStatus, navigate, returnTo]);

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
      if (import.meta.env.VITE_USE_MOCK === "true") {
        setCode("123456");
        setInfoNotice("验证码已发送（测试环境自动回填：123456）");
      } else {
        setCode("");
        setInfoNotice("验证码已发送至你的邮箱，请在 10 分钟内完成验证。");
      }
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.code === "INVITATION_INVALID" || err.code === "INVITATION_EXHAUSTED") {
          setInvitationError(err.message || "邀请码无效或已超限");
          invitationInputRef.current?.focus();
        } else if (err.code === "INVALID_EMAIL" || err.code === "EMAIL_FORMAT_INVALID") {
          setEmailError(err.message || "邮箱格式不正确");
        } else {
          setOtpError(err.message || "验证码发送失败");
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
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setOtpError("请输入 6 位数字验证码");
      otpInputRef.current?.focus();
      return;
    }

    setVerifying(true);
    try {
      await verifyEmailCode(challengeId, cleanCode);
      await bootstrap();
      broadcastAuthEvent("LOGIN");
      navigate(returnTo, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409 && err.code === "REGISTRATION_REQUIRED") {
          setMode("register");
          setChallengeId(null);
          setCountdown(0);
          setInfoNotice("该邮箱尚未注册，已自动切至注册模式。");
        } else if (err.status === 409 && err.code === "LOGIN_REQUIRED") {
          setMode("login");
          setChallengeId(null);
          setCountdown(0);
          setInfoNotice("该邮箱已注册，已自动切至登录模式。");
        } else if (err.code === "OTP_INVALID" || err.code === "OTP_EXPIRED") {
          setOtpError(err.message || "验证码错误或已失效");
          setCode("");
        } else {
          setOtpError(err.message || "验证失败");
        }
      } else {
        setOtpError("验证失败，请检查网络");
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f7f5f0] font-body text-gray-900 overflow-hidden">
      {/* 极细国际画册网格辅助线与云途墨迹航线 Canvas */}
      <YuntuInkTrails interactive={true} />
      <div className="pointer-events-none absolute inset-0 flex justify-between px-12 md:px-24">
        <div className="w-px h-full bg-stone-300/30" />
        <div className="w-px h-full bg-stone-300/30" />
        <div className="w-px h-full bg-stone-300/30 hidden md:block" />
      </div>

      {/* 极简页头 */}
      <header className="relative z-20 flex h-24 items-center justify-between px-8 md:px-16">
        <div className="flex items-center space-x-4">
          <Link to="/" className="font-serif text-xl font-bold tracking-widest text-stone-900">
            YUNTU
          </Link>
          <span className="text-[10px] font-bold tracking-[0.2em] text-stone-400">VOL.2026 / ISSUE 01</span>
        </div>
        <Link to="/" className="text-xs font-serif tracking-widest text-stone-500 hover:text-stone-900 transition-colors">
          INDEX →
        </Link>
      </header>

      {/* 扉页中心内容 */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm">
          
          <div className="mb-12">
            <p className="text-[10px] font-bold tracking-[0.3em] text-stone-400 uppercase">Chapter 00 — Sign In</p>
            <h1 className="mt-2 font-serif text-4xl font-normal tracking-tight text-stone-900 md:text-5xl">
              {mode === "login" ? "The Passage." : "The Invitation."}
            </h1>
            <p className="mt-3 text-xs font-light text-stone-500 tracking-wide">
              {mode === "login" ? "Enter your email to resume your journey." : "Enter your invitation code to begin."}
            </p>
          </div>

          {/* 模式选择 - 扉页下划线文字选框 */}
          <div className="mb-10 flex space-x-8 border-b border-stone-200 pb-3">
            <button
              type="button"
              onClick={() => handleTabSwitch("login")}
              className={`text-xs font-serif tracking-widest uppercase transition-all duration-300 ${
                mode === "login"
                  ? "font-bold text-stone-900 border-b-2 border-stone-900 pb-3 -mb-3.5"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              01. LOGIN
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch("register")}
              className={`text-xs font-serif tracking-widest uppercase transition-all duration-300 ${
                mode === "register"
                  ? "font-bold text-stone-900 border-b-2 border-stone-900 pb-3 -mb-3.5"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              02. REGISTER
            </button>
          </div>

          {infoNotice && (
            <div className="mb-6 rounded-lg border border-stone-300 bg-stone-100/60 px-4 py-3 text-xs text-stone-700">
              {infoNotice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {mode === "register" && (
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-stone-400 uppercase" htmlFor="inv-code">
                  Invitation Code
                </label>
                <input
                  id="inv-code"
                  ref={invitationInputRef}
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  placeholder="Enter code"
                  className={`h-12 w-full border-b bg-transparent text-sm font-mono tracking-widest text-stone-900 transition-all placeholder:text-stone-300 focus:border-stone-900 focus:outline-none ${
                    invitationError ? "border-red-500" : "border-stone-300"
                  }`}
                />
                {invitationError && <p className="mt-1 text-xs text-red-500">{invitationError}</p>}
              </div>
            )}

            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-stone-400 uppercase" htmlFor="user-email">
                Email Address
              </label>
              <input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className={`h-12 w-full border-b bg-transparent text-sm font-light text-stone-900 transition-all placeholder:text-stone-300 focus:border-stone-900 focus:outline-none ${
                  emailError ? "border-red-500" : "border-stone-300"
                }`}
              />
              {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-stone-400 uppercase" htmlFor="otp-code">
                Verification Code
              </label>
              <div className="flex gap-4">
                <input
                  id="otp-code"
                  ref={otpInputRef}
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6 Digits"
                  className={`h-12 flex-1 border-b bg-transparent text-sm font-mono tracking-widest text-stone-900 transition-all placeholder:text-stone-300 focus:border-stone-900 focus:outline-none ${
                    otpError ? "border-red-500" : "border-stone-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sending || countdown > 0}
                  className="mt-2 text-xs font-serif tracking-widest text-stone-600 underline hover:text-stone-900 disabled:opacity-40"
                >
                  {sending ? "SENDING..." : countdown > 0 ? `${countdown}S` : "GET CODE"}
                </button>
              </div>
              {otpError && <p className="mt-1 text-xs text-red-500">{otpError}</p>}
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={verifying}
                className="flex h-13 w-full items-center justify-center bg-stone-900 py-3.5 text-xs font-serif tracking-[0.25em] text-white transition-all duration-300 hover:bg-black active:scale-95 disabled:opacity-60 uppercase"
              >
                {verifying ? "VERIFYING..." : mode === "login" ? "PROCEED →" : "CREATE ACCOUNT →"}
              </button>
            </div>
          </form>

          {/* 页脚名言 */}
          <div className="mt-16 text-center">
            <p className="font-serif text-xs italic text-stone-400">
              “The world is a book, and those who do not travel read only one page.”
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
