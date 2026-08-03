import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { sendEmailCode, verifyEmailCode, ApiRequestError } from "@/services/api";
import { useAuthStore, broadcastAuthEvent } from "@/stores/authStore";
import { sanitizeReturnTo } from "@/utils/url";
import { YuntuFlightCanvas } from "../../components/common/YuntuFlightCanvas";
import { Card3D } from "../../components/common/Card3D";
import type { AuthMode } from "@/types/auth";

export default function LoginPageBoardingPass() {
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
        setInfoNotice("机票登机凭证已签发（测试环境自动回填：123456）");
      } else {
        setCode("");
        setInfoNotice("登机凭证已发送至你的邮箱，请在 10 分钟内核验。");
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
    <div className="relative flex min-h-screen w-full flex-col bg-[#f7f4ed] font-body text-teal-950 overflow-hidden select-none">
      {/* 航班穿梭航迹 Canvas Engine */}
      <YuntuFlightCanvas interactive={true} />

      {/* 极简页头 */}
      <header className="relative z-20 flex h-20 items-center justify-between px-8">
        <Link to="/" className="flex items-center space-x-2.5">
          <img src="/logo.svg" alt="云途" className="h-6 w-6" />
          <span className="font-display text-sm font-bold tracking-[0.2em] text-teal-900">YUNTU AIRWAYS</span>
        </Link>
        <Link to="/" className="text-xs font-bold tracking-wider text-teal-700 hover:text-teal-950 transition-colors">
          INDEX →
        </Link>
      </header>

      {/* 居中 3D 登机牌通行证 */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4">
        <Card3D maxTilt={10} scale={1.02} className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-teal-800/20 bg-white/90 p-8 shadow-2xl shadow-teal-950/10 backdrop-blur-xl md:p-10">
            
            {/* 登机牌虚线与齿口凹槽 */}
            <div className="pointer-events-none absolute -left-4 top-1/2 -mt-4 h-8 w-8 rounded-full bg-[#f7f4ed] border border-teal-800/10" />
            <div className="pointer-events-none absolute -right-4 top-1/2 -mt-4 h-8 w-8 rounded-full bg-[#f7f4ed] border border-teal-800/10" />

            {/* 顶端航班元数据刻度 */}
            <div className="mb-6 flex items-center justify-between border-b border-dashed border-teal-800/20 pb-4 text-[10px] font-mono font-bold tracking-wider text-teal-700">
              <div>FLIGHT: YU-2026</div>
              <div>CLASS: FIRST</div>
              <div>GATE: B07</div>
            </div>

            <div className="mb-6 text-center">
              <span className="text-[10px] font-mono tracking-[0.25em] text-teal-600 uppercase">BOARDING PASS</span>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-teal-950 sm:text-3xl">
                {mode === "login" ? "核验登机牌" : "申领通行机票"}
              </h1>
              <p className="mt-1.5 text-xs text-teal-700/80">
                {mode === "login" ? "扫描身份通行证，进入你的专属智囊行程" : "凭公测邀请码，开据第一张智能路书机票"}
              </p>
            </div>

            {/* Mode Switch Tabs */}
            <div className="mb-6 flex rounded-2xl bg-teal-900/5 p-1 border border-teal-900/10">
              <button
                type="button"
                onClick={() => handleTabSwitch("login")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "login"
                    ? "bg-teal-900 text-white shadow-md scale-[1.02]"
                    : "text-teal-700 hover:text-teal-950"
                }`}
              >
                机票登录
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch("register")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "register"
                    ? "bg-teal-900 text-white shadow-md scale-[1.02]"
                    : "text-teal-700 hover:text-teal-950"
                }`}
              >
                邀请码注册
              </button>
            </div>

            {infoNotice && (
              <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-800">
                {infoNotice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === "register" && (
                <div>
                  <label className="mb-1 block text-[10px] font-mono font-bold tracking-widest text-teal-800" htmlFor="inv-code">
                    INVITATION CODE
                  </label>
                  <input
                    id="inv-code"
                    ref={invitationInputRef}
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="输入公测邀请码"
                    className={`h-12 w-full rounded-xl border bg-teal-50/50 px-4 font-mono text-sm tracking-wider text-teal-950 transition-all placeholder:text-teal-400 focus:bg-white focus:outline-none focus:ring-2 ${
                      invitationError ? "border-red-400 focus:ring-red-200" : "border-teal-200 focus:border-teal-800 focus:ring-teal-100"
                    }`}
                  />
                  {invitationError && <p className="mt-1 text-xs text-red-500">{invitationError}</p>}
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] font-mono font-bold tracking-widest text-teal-800" htmlFor="user-email">
                  PASSENGER EMAIL
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`h-12 w-full rounded-xl border bg-teal-50/50 px-4 text-sm text-teal-950 transition-all placeholder:text-teal-400 focus:bg-white focus:outline-none focus:ring-2 ${
                    emailError ? "border-red-400 focus:ring-red-200" : "border-teal-200 focus:border-teal-800 focus:ring-teal-100"
                  }`}
                />
                {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-mono font-bold tracking-widest text-teal-800" htmlFor="otp-code">
                  VERIFICATION OTP
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
                    className={`h-12 flex-1 rounded-xl border bg-teal-50/50 px-4 font-mono text-sm tracking-widest text-teal-950 transition-all placeholder:text-teal-400 focus:bg-white focus:outline-none focus:ring-2 ${
                      otpError ? "border-red-400 focus:ring-red-200" : "border-teal-200 focus:border-teal-800 focus:ring-teal-100"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sending || countdown > 0}
                    className="min-w-[110px] rounded-xl border border-teal-800/30 bg-teal-900/10 px-4 text-xs font-bold text-teal-900 transition-all hover:bg-teal-900/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-800 border-t-transparent" />
                    ) : countdown > 0 ? (
                      `${countdown}s`
                    ) : (
                      "签发验证码"
                    )}
                  </button>
                </div>
                {otpError && <p className="mt-1 text-xs text-red-500">{otpError}</p>}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={verifying}
                  className="group relative flex h-13 w-full items-center justify-center overflow-hidden rounded-xl bg-teal-900 py-3.5 text-xs font-bold tracking-[0.2em] text-white shadow-xl transition-all duration-300 hover:bg-teal-950 hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                >
                  {verifying ? (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : mode === "login" ? (
                    "扫描登机 (SCAN & BOARD)"
                  ) : (
                    "签发机票 (REGISTER & BOARD)"
                  )}
                </button>
              </div>
            </form>

            {/* 登机牌底部防伪条形码图形 */}
            <div className="mt-6 flex items-center justify-between border-t border-dashed border-teal-800/20 pt-4">
              <div className="font-mono text-[10px] tracking-[0.4em] text-teal-800/40">
                |||||| | ||||| |||| || |||||||
              </div>
              <div className="text-[10px] font-mono text-teal-700">YUNTU-PASS-2026</div>
            </div>
          </div>
        </Card3D>
      </main>
    </div>
  );
}
