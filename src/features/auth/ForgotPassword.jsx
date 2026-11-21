
import { useState } from "react";
import {  useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AuthShell, { AuthField, authInputClass } from "./AuthShell";

export default function ForgotPassword() {
  const {
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPassword,
  } = useAuth();

  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getErrorMessage = (err, fallback) =>
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await requestPasswordResetOtp(normalizedEmail);

      setEmail(normalizedEmail);
      setStep("otp");
      setMessage(
        "If an eligible account exists for this email, a verification code will be sent."
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to request a verification code. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await verifyPasswordResetOtp(email, otp);

      const token =
        result?.resetToken ||
        result?.data?.resetToken ||
        result?.data?.data?.resetToken;

      if (!token) {
        throw new Error(
          "OTP verification response did not include a reset token. Please check the backend response."
        );
      }

      setResetToken(token);
      setStep("password");
      setMessage("Email verified. You can now create a new password.");
    } catch (err) {
      setError(
        getErrorMessage(err, "Invalid or expired verification code.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await requestPasswordResetOtp(email);
      setOtp("");
      setMessage(
        "If an eligible account exists for this email, a new verification code will be sent."
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to resend the code. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Password must contain at least 12characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!resetToken) {
      setError("Your verification session is missing. Please verify your OTP again.");
      setStep("otp");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword(email, resetToken, newPassword);

      if (result?.success === false) {
        throw new Error(result.message || "Unable to reset your password.");
      }

      setResetToken("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setStep("success");
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to reset your password. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setError("");
    setMessage("");

    if (step === "password") {
      setResetToken("");
      setStep("otp");
      return;
    }

    if (step === "otp") {
      setOtp("");
      setStep("email");
      return;
    }

    navigate("/login");
  };

  return (
    <AuthShell
      title={
        step === "email"
          ? "Forgot password?"
          : step === "otp"
            ? "Verify your email"
            : step === "password"
              ? "Create new password"
              : "Password updated"
      }
      subtitle={
        step === "email"
          ? "Enter your registered email to start recovering your account."
          : step === "otp"
            ? "Enter the 6-digit verification code sent to your email."
            : step === "password"
              ? "Choose a strong password for your restaurant account."
              : "Your password has been changed successfully."
      }
      panelTitle="Your restaurant. Your control."
      panelPoints={[
        "Secure account recovery",
        "Manage orders and billing",
        "Get back to business quickly",
      ]}
      footer={
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="inline-flex items-center gap-2 font-bold text-[var(--primary)] hover:underline"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </button>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700"
        >
          {error}
        </div>
      )}

      {message && step !== "success" && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700"
        >
          {message}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <AuthField label="Registered email">
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${authInputClass} pl-10`}
                placeholder="owner@restaurant.com"
              />
            </div>
          </AuthField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="gtt-btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Sending code..." : "Send verification code"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <AuthField label="Verification code">
            <div className="relative">
              <KeyRound
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className={`${authInputClass} pl-10 tracking-[0.3em]`}
                placeholder="000000"
                aria-label="6-digit verification code"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Code sent to {email}
            </p>
          </AuthField>

          <button
            type="submit"
            disabled={isSubmitting || otp.length !== 6}
            className="gtt-btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Verifying..." : "Verify code"}
          </button>

          <div className="flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={goBack}
              disabled={isSubmitting}
              className="font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              Change email
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isSubmitting}
              className="font-semibold text-[var(--primary)] hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <AuthField label="New password">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${authInputClass} pr-11`}
                placeholder="At least 12characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </AuthField>

          <AuthField label="Confirm new password">
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${authInputClass} pr-11`}
                placeholder="Enter password again"
              />
              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((value) => !value)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </AuthField>

          <p className="text-xs text-slate-500">
            Use at least 12characters. Your backend must enforce its own password policy.
          </p>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              newPassword.length < 12||
              !confirmPassword ||
              newPassword !== confirmPassword
            }
            className="gtt-btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Updating password..." : "Reset password"}
          </button>

          <button
            type="button"
            onClick={goBack}
            disabled={isSubmitting}
            className="w-full text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            Back to verification
          </button>
        </form>
      )}

      {step === "success" && (
        <div className="py-4 text-center">
          <CheckCircle2
            size={56}
            className="mx-auto mb-4 text-emerald-600"
            aria-hidden="true"
          />

          <p className="mb-6 text-sm leading-6 text-slate-600">
            Your password has been updated. Sign in using your new password.
          </p>

          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="gtt-btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70"
          >
            Go to sign in
          </button>
        </div>
      )}
    </AuthShell>
  );
}
