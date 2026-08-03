import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { sendEmailCode, verifyEmailCode, ApiRequestError } from "@/services/api";
import { useAuthStore, broadcastAuthEvent } from "@/stores/authStore";
import { sanitizeReturnTo } from "@/utils/url";
import { YuntuCloudCanvas } from "../../components/common/YuntuCloudCanvas";
import { Card3D } from "../../components/common/Card3D";
import type { AuthMode } from "@/types/auth";

export default function LoginPageObservatory() {
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
  const [currentTime, setCurrentTime] = useState("");
  const [oceanTheme, setOceanTheme] = useState<"night" | "dusk" | "day">("night");

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const invitationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(" ")[0]);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

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
        setInfoNotice("信号已连接（测试环境已回填：123456）");
      } else {
        setCode("");
        setInfoNotice("信号已发送至你的邮箱，请在 10 分钟内接收。");
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
    <div className="relative flex min-h-screen w-full flex-col bg-[#0a1830] font-body text-slate-100 overflow-hidden select-none">
      {/* 云途专属三维云海与星轨航线 Engine */}
      <YuntuCloudCanvas interactive={true} />

      {/* 顶部 Galok 风格 HUD 航行仪表盘 */}
      <header className="relative z-30 flex h-20 items-center justify-between px-6 md:px-12 backdrop-blur-md border-b border-white/10">
        <Link to="/" className="flex items-center space-x-3 transition-opacity hover:opacity-80">
          <span className="text-teal-400 text-xl animate-pulse">≋</span>
          <span className="font-serif text-lg font-bold tracking-widest text-white">YUNTU SKY PORT</span>
        </Link>

        <div className="flex items-center space-x-6 text-xs text-teal-300/80 font-mono">
          <span className="hidden md:inline-block">OBSERVATORY · 30.27°N 120.15°E</span>
          <div className="h-3 w-px bg-white/20 hidden md:block" />
          <span>{currentTime || "00:00:00"}</span>
          
          {/* 海天时段切换 Pill */}
          <div className="flex items-center rounded-full bg-black/40 border border-white/15 p-1">
            <button
              onClick={() => setOceanTheme(oceanTheme === 'night' ? 'dusk' : oceanTheme === 'dusk' ? 'day' : 'night')}
              className="px-2.5 py-1 text-[10px] font-bold text-teal-200 transition-colors hover:text-white"
              title="切换极光/天空时段"
            >
              {oceanTheme === 'night' ? '🌙 深夜' : oceanTheme === 'dusk' ? '🌆 黄昏' : '☀️ 晴空'}
            </button>
          </div>
        </div>
      </header>

      {/* 浮岛居中表单 - 带真实 3D 悬浮视差与海浪浮动 (Bobbing Motion) */}
      <main className="relative z-20 flex flex-1 items-center justify-center p-4">
        <Card3D maxTilt={8} scale={1.02} className="w-full max-w-md">
          <div className="w-full rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl shadow-teal-950/60 backdrop-blur-xl md:p-10 animate-[bounce_8s_ease-in-out_infinite]">
            
            <div className="mb-8 text-center">
              <span className="text-[10px] font-mono tracking-widest text-teal-300 uppercase animate-pulse">ACCESS PORTAL</span>
              <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-white md:text-4xl">
                {mode === "login" ? "漂浮的入口" : "点亮专属浮岛"}
              </h1>
              <p className="mt-2 text-xs text-slate-300/90">
                {mode === "login" ? "连接云途航线网络，继续未完的行程" : "凭公测邀请码，开辟你的第一座行程浮岛"}
              </p>
            </div>

            {/* Mode Switch Tabs - Glass style */}
            <div className="mb-8 flex rounded-2xl bg-black/40 p-1 border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => handleTabSwitch("login")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "login"
                    ? "bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/40 scale-[1.02]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                邮箱登录
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch("register")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "register"
                    ? "bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/40 scale-[1.02]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                邀请码注册
              </button>
            </div>

            {infoNotice && (
              <div className="mb-6 rounded-xl border border-teal-400/40 bg-teal-500/20 px-4 py-3 text-xs text-teal-200 backdrop-blur-md">
                {infoNotice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {mode === "register" && (
                <div>
                  <label className="mb-1.5 block text-[10px] font-mono tracking-widest text-teal-300/90" htmlFor="inv-code">
                    INVITATION CODE
                  </label>
                  <input
                    id="inv-code"
                    ref={invitationInputRef}
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="输入邀请码"
                    className={`h-12 w-full rounded-xl border bg-black/50 px-4 font-mono text-sm tracking-wider text-white transition-all placeholder:text-slate-500 focus:bg-black/70 focus:outline-none ${
                      invitationError ? "border-red-400 focus:ring-1 focus:ring-red-400" : "border-white/20 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    }`}
                  />
                  {invitationError && <p className="mt-1 text-xs text-red-400">{invitationError}</p>}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[10px] font-mono tracking-widest text-teal-300/90" htmlFor="user-email">
                  EMAIL ADDRESS
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`h-12 w-full rounded-xl border bg-black/50 px-4 text-sm text-white transition-all placeholder:text-slate-500 focus:bg-black/70 focus:outline-none ${
                    emailError ? "border-red-400 focus:ring-1 focus:ring-red-400" : "border-white/20 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  }`}
                />
                {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-mono tracking-widest text-teal-300/90" htmlFor="otp-code">
                  VERIFICATION CODE
                </label>
                <div className="flex gap-3">
                  <input
                    id="otp-code"
                    ref={otpInputRef}
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="6位数验证码"
                    className={`h-12 flex-1 rounded-xl border bg-black/50 px-4 font-mono text-sm tracking-widest text-white transition-all placeholder:text-slate-500 focus:bg-black/70 focus:outline-none ${
                      otpError ? "border-red-400 focus:ring-1 focus:ring-red-400" : "border-white/20 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sending || countdown > 0}
                    className="min-w-[100px] rounded-xl border border-teal-400/30 bg-teal-500/20 px-3 text-xs font-bold text-teal-200 transition-all hover:bg-teal-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-300 border-t-transparent" />
                    ) : countdown > 0 ? (
                      `${countdown}s`
                    ) : (
                      "发送信号"
                    )}
                  </button>
                </div>
                {otpError && <p className="mt-1 text-xs text-red-400">{otpError}</p>}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-teal-400 text-sm font-bold text-slate-950 shadow-lg shadow-teal-400/40 transition-all duration-300 hover:bg-teal-300 hover:shadow-teal-400/60 active:scale-95 disabled:opacity-60"
                >
                  {verifying ? (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  ) : mode === "login" ? (
                    "扬帆登录"
                  ) : (
                    "点亮岛屿并登录"
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
