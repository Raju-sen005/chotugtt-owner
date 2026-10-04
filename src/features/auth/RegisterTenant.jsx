import { useState } from "react";
import { Eye, EyeOff, ImagePlus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AuthShell, { AuthField, authInputClass } from "./AuthShell";

export default function RegisterTenant({ onSwitchToLogin }) {
  const { registerTenant } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const isValidPhone = /^[0-9]{10}$/.test(phone.trim());

  const isValidRestaurantName = restaurantName.trim().length >= 2;

  const isValidOwnerName = name.trim().length >= 2;

  const isValidPassword = password.length >= 8;

  const isFormValid =
    isValidRestaurantName &&
    isValidOwnerName &&
    isValidEmail &&
    isValidPhone &&
    isValidPassword &&
    legalAccepted;

  const generatedSlug = restaurantName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!restaurantName.trim()) {
      setError("Restaurant name is required.");
      return;
    }

    if (!name.trim()) {
      setError("Owner full name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Business email address is required.");
      return;
    }

    if (!isValidEmail) {
      setError("Please enter a valid business email address.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (!isValidPhone) {
      setError("The mobile number must be exactly 10 digits long.");
      return;
    }

    if (!legalAccepted) {
      setError(
        "Please read and agree to the Terms & Conditions, Privacy Policy, and Owner Agreement.",
      );
      return;
    }

    setError("");
    setIsRegistering(true);

    try {
      const formData = new FormData();

      formData.append("restaurantName", restaurantName.trim());
      formData.append("slug", generatedSlug);
      formData.append("name", name.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("password", password);
      formData.append("phone", phone);

      formData.append(
        "legalAgreement",
        JSON.stringify({
          termsAccepted: legalAccepted,
          privacyPolicyAccepted: legalAccepted,
          ownerAgreementAccepted: legalAccepted,
        }),
      );

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await registerTenant(formData);

      if (response && response.success) {
        const liveMenuUrl = `${
          import.meta.env.VITE_APP_API_BASE || window.location.origin
        }/?store=${generatedSlug}`;

        const qrCodeApiUrl =
          `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=` +
          encodeURIComponent(liveMenuUrl);

        setSuccessData({
          url: liveMenuUrl,
          qr: qrCodeApiUrl,
          slug: generatedSlug,
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Try again.",
      );
    } finally {
      setIsRegistering(false);
    }
  };

  if (successData) {
    return (
      <AuthShell
        title="Restaurant is ready"
        subtitle="Save this link. Sign in next to open your dashboard."
        panelTitle="Your restaurant is on ChotuGTT."
        panelPoints={[
          "Menu and QR are tied to this account",
          "Sign in to add dishes and tables",
          "Staff can join after you create them",
        ]}
      >
        <div className="space-y-5">
          <div className="flex justify-center rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <img
              src={successData.qr}
              alt="Restaurant QR"
              className="h-36 w-36 rounded-lg bg-white object-contain"
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700">
              Menu link
            </p>
            <a
              href={successData.url}
              target="_blank"
              rel="noreferrer"
              className="block break-all rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 font-mono text-xs font-semibold text-[var(--primary)]"
            >
              {successData.url}
            </a>
          </div>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full rounded-xl bg-[var(--primary)] py-3.5 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
          >
            Proceed to sign in
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      wide
      title="Create your restaurant"
      subtitle="This account is the owner login for your menu, orders, and bills."
      panelTitle="Open your restaurant on ChotuGTT."
      panelPoints={[
        "QR menu for every table",
        "Counter, captain, and kitchen",
        "Offers, bills, and staff in one place",
      ]}
      footer={
        <>
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold text-[var(--primary)] hover:underline"
          >
            Sign in
          </button>
        </>
      }
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus className="text-slate-400" size={22} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-700">
              Logo <span className="font-normal text-slate-400">optional</span>
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="mt-1 w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[var(--primary)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AuthField label="Restaurant name">
            <input
              type="text"
              required
              placeholder="Spice Garden"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className={authInputClass}
            />
          </AuthField>
          <AuthField label="Menu link" hint="Created from the restaurant name">
            <div className="truncate rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-sm font-semibold text-slate-500">
              /{generatedSlug || "your-restaurant"}
            </div>
          </AuthField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AuthField label="Owner name">
            <input
              type="text"
              required
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={authInputClass}
            />
          </AuthField>
          <AuthField label="Mobile" hint="10 digits">
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="9876543210"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              className={authInputClass}
            />
          </AuthField>
        </div>

        <AuthField label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="owner@restaurant.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
        </AuthField>

        <AuthField label="Password" hint="At least 8 characters">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pr-11`}
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

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
          />
          <span className="text-sm leading-5 text-slate-600">
            I have read and agree to the{" "}
            <a
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Terms & Conditions
            </a>
            ,{" "}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Privacy Policy
            </a>
            , and{" "}
            <a
              href="/owner-agreement"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Owner Agreement
            </a>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={isRegistering || !isFormValid}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isRegistering ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
