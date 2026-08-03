import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { sendEmailCode, verifyEmailCode, ApiRequestError } from "@/services/api";
import { useAuthStore, broadcastAuthEvent } from "@/stores/authStore";
import { sanitizeReturnTo } from "@/utils/url";
import { YuntuTopoCanvas } from "../../components/common/YuntuTopoCanvas";
import { Card3D } from "../../components/common/Card3D";
import type { AuthMode } from "@/types/auth";

export default function LoginPageTopoCompass() {
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
        setInfoNotice("罗盘方照已锁定（测试环境自动回填：123456）");
      } else {
        setCode("");
        setInfoNotice("航向验证码已发送至你的邮箱，请在 10 分钟内接收。");
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
    <div className="relative flex min-h-screen w-full flex-col bg-[#051110] font-body text-teal-100 overflow-hidden select-none">
      {/* 2D/3D 动态重力等高线与风向罗盘 Canvas Engine */}
      <YuntuTopoCanvas interactive={true} />

      {/* 极简页头 */}
      <header className="relative z-20 flex h-20 items-center justify-between px-8 backdrop-blur-md border-b border-teal-500/10">
        <Link to="/" className="flex items-center space-x-2.5">
          <span className="h-2 w-2 animate-ping rounded-full bg-teal-400" />
          <span className="font-display text-sm font-bold tracking-[0.2em] text-teal-300">YUNTU TOPO OBSERVATORY</span>
        </Link>
        <div className="flex items-center space-x-4 text-xs font-mono text-teal-400/70">
          <span>ELEV: 1280M</span>
          <span>LAT: 30°27'N</span>
        </div>
      </header>

      {/* 居中等高线罗盘卡片 */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4">
        <Card3D maxTilt={8} scale={1.02} className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-teal-500/20 bg-[#091c1a]/80 p-8 shadow-2xl shadow-teal-950/80 backdrop-blur-xl md:p-10">
            
            <div className="mb-6 text-center">
              <span className="text-[10px] font-mono tracking-[0.3em] text-teal-400 uppercase">COMPASS & NAVIGATION</span>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {mode === "login" ? "定位旅程方向" : "初始化地图罗盘"}
              </h1>
              <p className="mt-1.5 text-xs text-teal-300/70">
                {mode === "login" ? "连接云途地形智囊，获取专属旅行规划" : "凭公测邀请码，开辟你的第一张等高线路书"}
              </p>
            </div>

            {/* Mode Switch Tabs */}
            <div className="mb-6 flex rounded-2xl bg-black/40 p-1 border border-teal-500/20">
              <button
                type="button"
                onClick={() => handleTabSwitch("login")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "login"
                    ? "bg-teal-500 text-teal-950 shadow-md shadow-teal-500/30 scale-[1.02]"
                    : "text-teal-400/60 hover:text-teal-200"
                }`}
              >
                航向登录
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch("register")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "register"
                    ? "bg-teal-500 text-teal-950 shadow-md shadow-teal-500/30 scale-[1.02]"
                    : "text-teal-400/60 hover:text-teal-200"
                }`}
              >
                邀请码注册
              </button>
            </div>

            {infoNotice && (
              <div className="mb-5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-xs text-teal-300">
                {infoNotice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === "register" && (
                <div>
                  <label className="mb-1 block text-[10px] font-mono font-bold tracking-widest text-teal-400" htmlFor="inv-code">
                    INVITATION CODE
                  </label>
                  <input
                    id="inv-code"
                    ref={invitationInputRef}
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="输入公测邀请码"
                    className={`h-12 w-full rounded-xl border bg-black/50 px-4 font-mono text-sm tracking-wider text-white transition-all placeholder:text-teal-700 focus:bg-black/80 focus:outline-none focus:ring-1 ${
                      invitationError ? "border-red-400 focus:ring-red-400" : "border-teal-500/30 focus:border-teal-400 focus:ring-teal-400"
                    }`}
                  />
                  {invitationError && <p className="mt-1 text-xs text-red-400">{invitationError}</p>}
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] font-mono font-bold tracking-widest text-teal-400" htmlFor="user-email">
                  NAVIGATOR EMAIL
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`h-12 w-full rounded-xl border bg-black/50 px-4 text-sm text-white transition-all placeholder:text-teal-700 focus:bg-black/80 focus:outline-none focus:ring-1 ${
                    emailError ? "border-red-400 focus:ring-red-400" : "border-teal-500/30 focus:border-teal-400 focus:ring-teal-400"
                  }`}
                />
                {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-mono font-bold tracking-widest text-teal-400" htmlFor="otp-code">
                  COMPASS OTP CODE
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
                    className={`h-12 flex-1 rounded-xl border bg-black/50 px-4 font-mono text-sm tracking-widest text-white transition-all placeholder:text-teal-700 focus:bg-black/80 focus:outline-none focus:ring-1 ${
                      otpError ? "border-red-400 focus:ring-red-400" : "border-teal-500/30 focus:border-teal-400 focus:ring-teal-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sending || countdown > 0}
                    className="min-w-[110px] rounded-xl border border-teal-500/30 bg-teal-500/15 px-4 text-xs font-bold text-teal-300 transition-all hover:bg-teal-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                    ) : countdown > 0 ? (
                      `${countdown}s`
                    ) : (
                      "锁定罗盘"
                    )}
                  </button>
                </div>
                {otpError && <p className="mt-1 text-xs text-red-400">{otpError}</p>}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex h-13 w-full items-center justify-center rounded-xl bg-teal-400 text-xs font-bold tracking-[0.2em] text-teal-950 shadow-xl shadow-teal-500/20 transition-all duration-300 hover:bg-teal-300 hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                >
                  {verifying ? (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-950 border-t-transparent" />
                  ) : mode === "login" ? (
                    "开启罗盘导航 (START NAVIGATING)"
                  ) : (
                    "校验并登录 (CONFIRM & NAVIGATE)"
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
