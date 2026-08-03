import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { sendEmailCode, verifyEmailCode, ApiRequestError } from "@/services/api";
import { useAuthStore, broadcastAuthEvent } from "@/stores/authStore";
import { sanitizeReturnTo } from "@/utils/url";
import { Card3D } from "../../components/common/Card3D";
import { YuntuWindParticles } from "../../components/common/YuntuWindParticles";
import type { AuthMode } from "@/types/auth";

const PAPER_NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`;

export default function LoginPageEnvelope() {
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
        setInfoNotice("通行凭证已送达（测试环境自动回填：123456）");
      } else {
        setCode("");
        setInfoNotice("通行凭证已发送至你的邮箱，请在 10 分钟内查收。");
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
    <div className="relative flex min-h-screen w-full flex-col bg-[#f5f2ec] font-body text-gray-800 select-none">
      {/* 纹理底层与云途金色纸风粒子 */}
      <div className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_NOISE }} />
      <YuntuWindParticles interactive={true} />

      {/* 极简页头 */}
      <header className="relative z-20 flex h-20 items-center justify-between px-8">
        <Link to="/" className="flex items-center space-x-2">
          <img src="/logo.svg" alt="云途" className="h-6 w-6" />
          <span className="font-display text-sm font-bold tracking-[0.2em] text-gray-900">YUNTU</span>
        </Link>
        <Link to="/" className="text-xs font-bold tracking-wider text-gray-400 hover:text-gray-900 transition-colors">
          RETURN TO EXPLORE →
        </Link>
      </header>

      {/* 居中邀请函信封 - 带有 3D Mouse Parallax Tilt & 动效 */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4">
        <Card3D maxTilt={10} scale={1.02} className="w-full max-w-md">
          <div className="relative w-full rounded-[2.5rem] border border-[#e2dcd4] bg-[#faf8f5] p-8 shadow-2xl shadow-stone-900/10 md:p-10 transition-all duration-500">
            
            {/* 顶端物理火漆印章 - 带金芒旋转辉光 */}
            <div className="group/seal absolute -top-7 left-1/2 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-amber-100 shadow-xl shadow-amber-900/40 border-2 border-amber-500/50 cursor-pointer transition-transform duration-500 hover:scale-110 hover:rotate-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/40 group-hover/seal:border-amber-200">
                <span className="font-serif text-xs font-bold tracking-widest text-amber-100 drop-shadow">YT</span>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-full bg-amber-400/20 blur-md opacity-0 group-hover/seal:opacity-100 transition-opacity duration-300" />
            </div>

            <div className="mt-4 mb-8 text-center">
              <p className="text-[10px] font-bold tracking-[0.25em] text-amber-800/80 uppercase">INVITATION & ACCESS</p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                {mode === "login" ? "开启专属旅程" : "兑换通行邀请函"}
              </h1>
              <p className="mt-2 text-xs text-stone-500">
                {mode === "login" ? "验证云途通行身份，进入个人智囊局" : "凭公测邀请码，获取云途智能策划额度"}
              </p>
            </div>

            {/* 模式选择 - 信封封印式切换 */}
            <div className="mb-8 flex rounded-2xl bg-[#efeae1] p-1 shadow-inner">
              <button
                type="button"
                onClick={() => handleTabSwitch("login")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "login"
                    ? "bg-[#faf8f5] text-stone-900 shadow-md scale-[1.02]"
                    : "text-stone-400 hover:text-stone-700"
                }`}
              >
                邮箱登录
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch("register")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "register"
                    ? "bg-[#faf8f5] text-stone-900 shadow-md scale-[1.02]"
                    : "text-stone-400 hover:text-stone-700"
                }`}
              >
                邀请码注册
              </button>
            </div>

            {infoNotice && (
              <div className="mb-6 rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3 text-xs text-amber-900 animate-fade-in">
                {infoNotice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {mode === "register" && (
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-widest text-stone-500" htmlFor="inv-code">
                    INVITATION CODE / 邀请码
                  </label>
                  <input
                    id="inv-code"
                    ref={invitationInputRef}
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="输入公测邀请码"
                    className={`h-12 w-full rounded-xl border bg-[#f0ebe1] px-4 font-mono text-sm tracking-wider text-stone-900 shadow-inner transition-all placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 ${
                      invitationError ? "border-red-400 focus:ring-red-200" : "border-[#e0d9cd] focus:border-stone-800 focus:ring-stone-200"
                    }`}
                  />
                  {invitationError && <p className="mt-1 text-xs text-red-500">{invitationError}</p>}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-widest text-stone-500" htmlFor="user-email">
                  EMAIL ADDRESS / 电子邮箱
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`h-12 w-full rounded-xl border bg-[#f0ebe1] px-4 text-sm text-stone-900 shadow-inner transition-all placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 ${
                    emailError ? "border-red-400 focus:ring-red-200" : "border-[#e0d9cd] focus:border-stone-800 focus:ring-stone-200"
                  }`}
                />
                {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-widest text-stone-500" htmlFor="otp-code">
                  SECURITY CODE / 验证码
                </label>
                <div className="flex gap-3">
                  <input
                    id="otp-code"
                    ref={otpInputRef}
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="6位数字"
                    className={`h-12 flex-1 rounded-xl border bg-[#f0ebe1] px-4 font-mono text-sm tracking-widest text-stone-900 shadow-inner transition-all placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 ${
                      otpError ? "border-red-400 focus:ring-red-200" : "border-[#e0d9cd] focus:border-stone-800 focus:ring-stone-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sending || countdown > 0}
                    className="min-w-[110px] rounded-xl border border-amber-900/20 bg-amber-900/10 px-4 text-xs font-bold text-amber-900 transition-all hover:bg-amber-900/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
                    ) : countdown > 0 ? (
                      `${countdown}s`
                    ) : (
                      "盖印发送"
                    )}
                  </button>
                </div>
                {otpError && <p className="mt-1 text-xs text-red-500">{otpError}</p>}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex h-13 w-full items-center justify-center rounded-xl bg-stone-900 py-3.5 text-xs font-bold tracking-[0.2em] text-amber-50 shadow-xl transition-all duration-300 hover:bg-black hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                >
                  {verifying ? (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-100 border-t-transparent" />
                  ) : mode === "login" ? (
                    "拆封登录 (VERIFY & ENTER)"
                  ) : (
                    "激活凭证 (REGISTER & ENTER)"
                  )}
                </button>
              </div>
            </form>
          </div>
        </Card3D>
      </main>
    </div>
  );
}
