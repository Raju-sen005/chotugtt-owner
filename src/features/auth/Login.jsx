import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AuthShell, { AuthField, authInputClass } from "./AuthShell";
import {
  buildWelcomePayloadFromPendingResponse,
  clearPendingRegistration,
  writeWelcomePayload,
} from "./pendingRegistration";
import { resolveMerchantHomePath } from "../../components/sidebarHotelNav";

export default function Login({ onSwitchToSignup }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const goToWelcome = (responseData) => {
    const welcome = buildWelcomePayloadFromPendingResponse(
      responseData,
      email,
    );
    if (welcome) {
      writeWelcomePayload(welcome);
    } else {
      writeWelcomePayload({
        approvalStatus: "PENDING_APPROVAL",
        ownerEmail: email,
      });
    }
    navigate("/registration-success", { replace: true });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    try {
      setAuthError("");
      setIsLoggingIn(true);

      const response = await login(email, password);

      if (response && response.requiresApproval) {
        goToWelcome(response);
        return;
      }

      clearPendingRegistration();

      if (response && response.requiresSubscription) {
        navigate("/subscription-checkout", {
          state: {
            restaurantId: response.restaurantId || response.tenantId,
          },
        });
        return;
      }

      // Hotel-only plans land on /rooms; others Overview; SUPERADMIN /super-admin.
      const authenticatedUser = response?.data || null;
      navigate(resolveMerchantHomePath(authenticatedUser), { replace: true });
    } catch (err) {
      const responseData = err.response?.data;

      if (responseData?.requiresApproval || responseData?.code === "PENDING_APPROVAL") {
        goToWelcome(responseData);
        return;
      }

      if (responseData && responseData.requiresSubscription) {
        navigate("/subscription-checkout", {
          state: {
            restaurantId: responseData.restaurantId || responseData.tenantId,
          },
        });
        return;
      }

      setAuthError(responseData?.message || "Invalid Email or Password");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use the email and password of your restaurant account."
      panelTitle="Run the floor from one screen."
      panelPoints={[
        "Live orders, KOT, and bills",
        "Menu, offers, and table QR",
        "Payments, staff, and captains",
      ]}
      footer={
        <>
          New to Transserve?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-bold text-[var(--primary)] hover:underline"
          >
            Create account
          </button>
        </>
      }
    >
      {authError ? (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700">
          {authError}
        </div>
      ) : null}

      <form onSubmit={handleLoginSubmit} className="space-y-4">
        <AuthField label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            placeholder="owner@restaurant.com"
          />
        </AuthField>

        <AuthField label="Password">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pr-11`}
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((open) => !open)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </AuthField>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <button
          type="submit"
          disabled={isLoggingIn}
          className="gtt-btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoggingIn ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
