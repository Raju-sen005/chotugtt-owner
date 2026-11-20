import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Clock3, Loader2, ShieldCheck } from "lucide-react";
import {
  WELCOME_STORAGE_KEY,
  buildWelcomePayloadFromPendingResponse,
  clearPendingRegistration,
  readCachedWelcomePayload,
  readPendingEmail,
  writeWelcomePayload,
} from "./pendingRegistration";

export { WELCOME_STORAGE_KEY };

export default function RegistrationSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const cached = readCachedWelcomePayload(location.state);
  const [payload, setPayload] = useState(cached);
  const [status, setStatus] = useState(
    cached?.approvalStatus === "ACTIVE" ? "ACTIVE" : "PENDING_APPROVAL",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const resolveStatus = async () => {
      const email =
        readPendingEmail() ||
        cached?.ownerEmail ||
        cached?.email ||
        null;

      if (!email) {
        if (!cancelled) {
          setLoading(false);
          setStatus(cached ? "PENDING_APPROVAL" : "UNKNOWN");
        }
        return;
      }

      try {
        const res = await axios.post("/auth/registration-status", { email });
        if (cancelled) return;

        const data = res.data?.data;
        if (!data) {
          setLoading(false);
          return;
        }

        if (data.approvalStatus === "ACTIVE") {
          clearPendingRegistration();
          setStatus("ACTIVE");
          setPayload(
            buildWelcomePayloadFromPendingResponse(data, email) || payload,
          );
          setLoading(false);
          return;
        }

        if (data.approvalStatus === "PENDING_APPROVAL") {
          const next = buildWelcomePayloadFromPendingResponse(data, email);
          writeWelcomePayload(next);
          setPayload(next);
          setStatus("PENDING_APPROVAL");
          setLoading(false);
          return;
        }

        setStatus("UNKNOWN");
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err?.response?.data?.message ||
            "Unable to refresh approval status right now.",
        );
        setStatus(cached ? "PENDING_APPROVAL" : "UNKNOWN");
        setLoading(false);
      }
    };

    resolveStatus();
    return () => {
      cancelled = true;
    };
    // Resolve once on mount / soft navigation into this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const businessName = payload?.businessName || null;
  const planName = payload?.planName || payload?.planCode || null;
  const category = payload?.businessCategory || null;
  const planAmount =
    typeof payload?.planAmount === "number" ? payload.planAmount : null;

  const isPending = status === "PENDING_APPROVAL";
  const isActive = status === "ACTIVE";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <img
            src="/Untitled.svg"
            alt="Transserve"
            className="h-11 w-11"
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Transserve
            </p>
            <p className="text-sm font-semibold text-slate-700">
              Business registration
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-10">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            {loading ? (
              <Loader2 size={30} className="animate-spin" />
            ) : isActive ? (
              <ShieldCheck size={30} />
            ) : (
              <CheckCircle2 size={30} />
            )}
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
            Registration Successful
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Welcome to Transserve!
          </h1>

          {isActive ? (
            <>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                Great news — your account
                {businessName ? ` for ${businessName}` : ""} has been activated.
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                You can now sign in and open your merchant dashboard.
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                Your registration has been completed successfully.
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Thank you for choosing Transserve to manage your business.
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Our team has received your registration details and will contact
                you shortly regarding your account activation and payment
                formalities.
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Login and dashboard access become available only after your
                account is activated by the Transserve team. You will receive a
                confirmation email when that happens.
              </p>
            </>
          )}

          <div
            className={`mt-8 rounded-2xl border px-4 py-4 ${
              isActive
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <Clock3
                className={`mt-0.5 shrink-0 ${
                  isActive ? "text-emerald-600" : "text-amber-600"
                }`}
                size={18}
              />
              <div>
                <p
                  className={`text-sm font-black ${
                    isActive ? "text-emerald-900" : "text-amber-950"
                  }`}
                >
                  {isActive
                    ? "Your account status: Active"
                    : "Your account status: Awaiting Approval"}
                </p>
                <p
                  className={`mt-1 text-xs leading-5 ${
                    isActive ? "text-emerald-800/80" : "text-amber-900/75"
                  }`}
                >
                  {isActive
                    ? "ACTIVE — Sign in to continue to your dashboard."
                    : "PENDING APPROVAL — Status is verified from the Transserve server on each visit."}
                </p>
              </div>
            </div>
          </div>

          {error ? (
            <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>
          ) : null}

          {(businessName || planName || category) && (
            <dl className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
              {businessName ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Business
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {businessName}
                  </dd>
                </div>
              ) : null}
              {category ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Category
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {category}
                  </dd>
                </div>
              ) : null}
              {planName ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Selected plan
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {planName}
                  </dd>
                </div>
              ) : null}
              {planAmount != null ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Annual price
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    ₹{Number(planAmount).toLocaleString("en-IN")}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {isActive ? (
              <button
                type="button"
                onClick={() => {
                  clearPendingRegistration();
                  navigate("/?auth=login");
                }}
                className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-500"
              >
                Sign in to dashboard
              </button>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Back to Home
              </Link>
            )}
            {isPending ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Refresh status
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
