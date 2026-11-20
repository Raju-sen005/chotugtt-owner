import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import {
  Store,
  Save,
  Upload,
  Globe,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Building,
  //   ShieldCheck,
  CreditCard,
  //   Users,
  //   UserPlus,
  //   Trash2,
  Link2,
  Percent,
  Star,
  Printer,
  Palette,
} from "lucide-react";
import {
  BILL_TEMPLATES,
  getSelectedBillTemplate,
  isProBillTemplate,
  saveSelectedBillTemplate,
} from "../../constants/billTemplates";
import BillTemplatePaymentModal from "../../components/BillTemplatePaymentModal";
// 🔑 FIX: this import was missing — getBillReceiptCSS() was being called
// below without ever being imported, which throws a ReferenceError.
import { getBillReceiptCSS } from "../../constants/billReceiptStyles";

const THEME_SWATCHES = [
  "#EF4444",
  "#F43F5E",
  "#3B82F6",
  "#14B8A6",
  "#F97316",
  "#22C55E",
  "#EAB308",
  "#8B5CF6",
  "#0EA5E9",
];

function BillTemplatePreviewModal({ templateId, onClose }) {
  const sampleHtml = `
    <html><head><style>${getBillReceiptCSS()}</style></head>
    <body>
      <div class="receipt template-${templateId}">
        <div class="center"><p class="shop-name">Spice Garden</p></div>
        <div class="divider-solid"></div>
        <table><thead><tr><td>Item</td><td>Qty</td><td>Price</td><td>Amount</td></tr></thead>
        <tbody>
          <tr><td>Paneer Tikka</td><td>2</td><td>220.00</td><td>440.00</td></tr>
          <tr><td>Butter Naan</td><td>4</td><td>40.00</td><td>160.00</td></tr>
        </tbody></table>
        <div class="row grand-total"><span>Grand Total</span><span>₹600.00</span></div>
      </div>
    </body></html>`;

  return (
    <div
      className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-slate-500 hover:text-slate-800"
        >
          ×
        </button>
        <iframe
          title="Bill preview"
          srcDoc={sampleHtml}
          sandbox=""
          className="w-[340px] h-[520px]"
        />
      </div>
    </div>
  );
}

export default function RestaurantProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Form States
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [themeColor, setThemeColor] = useState("#EF4444");
  const [automaticMode, setAutomaticMode] = useState(false);
  const [automaticModeSaving, setAutomaticModeSaving] = useState(false);
  const [automaticModeError, setAutomaticModeError] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiQrCode, setUpiQrCode] = useState("");
  const [fssaiNumber, setFssaiNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [taxRate, setTaxRate] = useState("");
  // Logo Upload State
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [googleReviewQrFile, setGoogleReviewQrFile] = useState(null);
  const [googleReviewQrPreview, setGoogleReviewQrPreview] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showUpiOtpModal, setShowUpiOtpModal] = useState(false);

  const [upiOtp, setUpiOtp] = useState("");

  const [upiVerificationToken, setUpiVerificationToken] = useState("");

  const [upiChangeMode, setUpiChangeMode] = useState(false);

  const [upiOtpLoading, setUpiOtpLoading] = useState(false);

  const [upiVerifyLoading, setUpiVerifyLoading] = useState(false);

  const [upiChangeLoading, setUpiChangeLoading] = useState(false);

  const [upiOtpError, setUpiOtpError] = useState("");

  const [upiOtpInfo, setUpiOtpInfo] = useState("");

  // 🔑 FIX: these two states were referenced in the JSX below but never
  // declared, which throws a ReferenceError as soon as this component renders.
  const [templateSaving, setTemplateSaving] = useState(null);
  const [templateError, setTemplateError] = useState("");

  const [deleteRestaurantOpen, setDeleteRestaurantOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteRestaurantLoading, setDeleteRestaurantLoading] = useState(false);
  const [deleteRestaurantError, setDeleteRestaurantError] = useState("");
  const restaurantId =
    typeof user?.restaurantId === "object"
      ? user.restaurantId?._id
      : user?.restaurantId || user?._id;
  const [selectedBillTemplate, setSelectedBillTemplate] = useState(() =>
    getSelectedBillTemplate(restaurantId),
  );
  const [paymentTemplate, setPaymentTemplate] = useState(null);
  const [previewTemplateId, setPreviewTemplateId] = useState(null);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // 🔑 FIX: restored rollback + error handling + query invalidation.
  // The version this reverted to applied the template optimistically with
  // zero error recovery — if the PATCH failed, the UI kept showing the new
  // template as "selected" even though the server never saved it, which is
  // exactly the "sometimes applies, sometimes doesn't" bug.
  const handleAutomaticModeToggle = async () => {
    if (automaticModeSaving) return;
    const previous = automaticMode;
    const next = !previous;
    setAutomaticModeError("");
    setAutomaticModeSaving(true);
    setAutomaticMode(next);

    try {
      await axios.patch(
        `${import.meta.env.VITE_APP_API_BASE}/restaurant/profile`,
        { automaticMode: next },
        { withCredentials: true },
      );
      queryClient.invalidateQueries({ queryKey: ["restaurant-profile"] });
      queryClient.invalidateQueries({
        queryKey: ["restaurant-profile-auto-mode"],
      });
    } catch (error) {
      setAutomaticMode(previous);
      setAutomaticModeError(
        error.response?.data?.message ||
          "Failed to update Automatic Mode. Please try again.",
      );
    } finally {
      setAutomaticModeSaving(false);
    }
  };

  const handleBillTemplateChange = async (template) => {
    if (isProBillTemplate(template.id)) {
      setPaymentTemplate(template);
      return;
    }
    if (templateSaving) return;

    const previous = selectedBillTemplate;
    setTemplateError("");
    setTemplateSaving(template.id);
    setSelectedBillTemplate(template.id); // optimistic

    try {
      await axios.patch(
        `${import.meta.env.VITE_APP_API_BASE}/restaurant/profile`,
        { billTemplate: template.id },
        { withCredentials: true },
      );
      saveSelectedBillTemplate(restaurantId, template.id);
      queryClient.invalidateQueries({ queryKey: ["restaurant-profile"] });
    } catch (error) {
      setSelectedBillTemplate(previous); // rollback on failure
      setTemplateError(
        error.response?.data?.message ||
          "Failed to apply bill template. Please try again.",
      );
    } finally {
      setTemplateSaving(null);
    }
  };

  const handleTemplatePaymentSuccess = (template) => {
    setSelectedBillTemplate(template.id);
    saveSelectedBillTemplate(restaurantId, template.id);
    queryClient.invalidateQueries({ queryKey: ["restaurant-profile"] });
    setPaymentTemplate(null);
  };

  // Staff Management Local States
  //   const [staffList, setStaffList] = useState([]);
  //   const [newStaffName, setNewStaffName] = useState("");
  //   const [newStaffEmail, setNewStaffEmail] = useState("");
  //   const [newStaffPassword, setNewStaffPassword] = useState("");
  //   const [newStaffRole, setNewStaffRole] = useState("WAITER");

  // 1. Fetch Restaurant Profile Data
  const {
    data: restaurant,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["restaurant-profile", restaurantId],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/restaurant/profile`,
        { withCredentials: true },
      );
      if (res.data.data.billTemplate) {
        setSelectedBillTemplate(res.data.data.billTemplate);
        saveSelectedBillTemplate(restaurantId, res.data.data.billTemplate);
      }
      return res.data.data;
    },
    staleTime: 60_000,
  });

  // Populate form state when data is fetched
  useEffect(() => {
    if (restaurant) {
      // Avoid synchronous cascading renders by only updating when values change
      setName((prev) =>
        prev !== (restaurant.name || "") ? restaurant.name || "" : prev,
      );
      setSlug((prev) =>
        prev !== (restaurant.slug || "") ? restaurant.slug || "" : prev,
      );
      setPhone((prev) =>
        prev !== (restaurant.phone || "") ? restaurant.phone || "" : prev,
      );
      setEmail((prev) =>
        prev !== (restaurant.email || "") ? restaurant.email || "" : prev,
      );
      setThemeColor((prev) =>
        prev !== (restaurant.themeColor || "#EF4444")
          ? restaurant.themeColor || "#EF4444"
          : prev,
      );
      setAutomaticMode(restaurant.automaticMode === true);
      setStreet((prev) =>
        prev !== (restaurant.address?.street || "")
          ? restaurant.address?.street || ""
          : prev,
      );
      setCity((prev) =>
        prev !== (restaurant.address?.city || "")
          ? restaurant.address?.city || ""
          : prev,
      );
      setState((prev) =>
        prev !== (restaurant.address?.state || "")
          ? restaurant.address?.state || ""
          : prev,
      );
      setZip((prev) =>
        prev !== (restaurant.address?.zip || "")
          ? restaurant.address?.zip || ""
          : prev,
      );
      setUpiId((prev) =>
        prev !== (restaurant.upiId || "") ? restaurant.upiId || "" : prev,
      );
      setUpiQrCode((prev) =>
        prev !== (restaurant.upiQrCode || "")
          ? restaurant.upiQrCode || ""
          : prev,
      );
      setFssaiNumber((prev) =>
        prev !== (restaurant.fssaiNumber || "")
          ? restaurant.fssaiNumber || ""
          : prev,
      );

      setGstNumber((prev) =>
        prev !== (restaurant.gstNumber || "")
          ? restaurant.gstNumber || ""
          : prev,
      );
      setTaxRate(
        restaurant.taxRate !== undefined && restaurant.taxRate !== null
          ? String(restaurant.taxRate)
          : "",
      );
      setLogoPreview((prev) =>
        prev !== (restaurant.logo || "") ? restaurant.logo || "" : prev,
      );
      setGoogleReviewQrPreview((prev) =>
        prev !== (restaurant.googleReviewQrCode || "")
          ? restaurant.googleReviewQrCode || ""
          : prev,
      );
    }
  }, [restaurant]);

  // 2. Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await axios.patch(
        `${import.meta.env.VITE_APP_API_BASE}/restaurant/profile`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return res.data;
    },

    onSuccess: (res) => {
      queryClient.invalidateQueries(["restaurant-profile"]);

      setLogoFile(null);
      setGoogleReviewQrFile(null);
      if (res.data?.upiQrCode) {
        setUpiQrCode(res.data.upiQrCode);
      }

      // ✅ Show success popup
      setShowSuccessPopup(true);

      // Auto close after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    },
    onError: (err) => {
      alert(
        err.response?.data?.message || "Failed to update restaurant profile.",
      );
    },
  });

  // Handle Logo File Selection
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleGoogleReviewQrChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload JPG, PNG or WebP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Google Review QR image must be smaller than 5MB.");
      e.target.value = "";
      return;
    }

    setGoogleReviewQrFile(file);
    setGoogleReviewQrPreview(URL.createObjectURL(file));
  };

  const handleRequestUpiOtp = async () => {
    try {
      setUpiOtpLoading(true);
      setUpiOtpError("");
      setUpiOtpInfo("");

      const res = await axios.post(
        `${import.meta.env.VITE_APP_API_BASE}/restaurant/profile/upi/request-otp`,
        {},
        {
          withCredentials: true,
        },
      );

      setUpiOtpInfo(res.data?.message || "OTP sent to your registered email.");

      setShowUpiOtpModal(true);
    } catch (error) {
      setUpiOtpError(error.response?.data?.message || "Unable to send OTP.");
    } finally {
      setUpiOtpLoading(false);
    }
  };

  const handleVerifyUpiOtp = async () => {
    if (!/^\d{6}$/.test(upiOtp)) {
      setUpiOtpError("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setUpiVerifyLoading(true);
      setUpiOtpError("");

      const res = await axios.post(
        `${import.meta.env.VITE_APP_API_BASE}/restaurant/profile/upi/verify-otp`,
        {
          otp: upiOtp,
        },
        {
          withCredentials: true,
        },
      );

      const token = res.data?.verificationToken;

      if (!token) {
        throw new Error("Verification token missing");
      }

      setUpiVerificationToken(token);

      setUpiChangeMode(true);

      setShowUpiOtpModal(false);
      setUpiOtp("");

      setUpiOtpInfo("OTP verified. You can now change your UPI ID.");
    } catch (error) {
      setUpiOtpError(error.response?.data?.message || "Invalid OTP.");
    } finally {
      setUpiVerifyLoading(false);
    }
  };

  // Handle Form Submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      const upiRegex = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

      if (upiId && !upiRegex.test(upiId.trim())) {
        alert("Please enter a valid UPI ID, e.g. restaurant@paytm");
        return;
      }

      if (restaurant?.upiId && upiChangeMode && upiVerificationToken) {
        try {
          setUpiChangeLoading(true);

          const response = await axios.patch(
            `${import.meta.env.VITE_APP_API_BASE}/restaurant/profile/upi`,
            {
              upiId: upiId.trim().toLowerCase(),
            },
            {
              withCredentials: true,
              headers: {
                "X-UPI-Verification-Token": upiVerificationToken,
              },
            },
          );

          const updatedUpi = response.data?.data?.upiId;
          const updatedQr = response.data?.data?.upiQrCode;

          if (updatedUpi) {
            setUpiId(updatedUpi);
          }

          if (updatedQr) {
            setUpiQrCode(updatedQr);
          }

          setUpiVerificationToken("");
          setUpiChangeMode(false);

          await queryClient.invalidateQueries({
            queryKey: ["restaurant-profile"],
          });

          setShowSuccessPopup(true);

          setTimeout(() => {
            setShowSuccessPopup(false);
          }, 3000);

          return;
        } catch (error) {
          alert(error.response?.data?.message || "Failed to update UPI ID.");
          return;
        } finally {
          setUpiChangeLoading(false);
        }
      }

      const formData = new FormData();

      formData.append("name", name);
      formData.append("slug", slug);
      formData.append("phone", phone);
      formData.append("email", email);
      formData.append("themeColor", themeColor);

      if (!restaurant?.upiId) {
        formData.append("upiId", upiId);
      }

      formData.append("fssaiNumber", fssaiNumber);
      formData.append("gstNumber", gstNumber);
      formData.append("taxRate", taxRate === "" ? "0" : taxRate);
      formData.append("address[street]", street);
      formData.append("address[city]", city);
      formData.append("address[state]", state);
      formData.append("address[zip]", zip);

      if (logoFile) {
        formData.append("logo", logoFile);
      }
      if (googleReviewQrFile) {
        formData.append("googleReviewQrCode", googleReviewQrFile);
      }
      updateProfileMutation.mutate(formData);
    },
    [
      restaurant,
      upiId,
      upiChangeMode,
      upiVerificationToken,
      name,
      slug,
      phone,
      email,
      themeColor,
      googleReviewQrFile,
      fssaiNumber,
      gstNumber,
      taxRate,
      street,
      city,
      state,
      zip,
      logoFile,
      queryClient,
      updateProfileMutation,
    ],
  );

  const handleDeleteRestaurant = async () => {
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      setDeleteRestaurantError(
        'Please type "DELETE" to permanently delete your restaurant.',
      );
      return;
    }

    if (deleteRestaurantLoading) return;

    try {
      setDeleteRestaurantLoading(true);
      setDeleteRestaurantError("");

      await axios.delete(
        `${import.meta.env.VITE_APP_API_BASE}/restaurant/profile`,
        {
          data: {
            confirmation: "DELETE",
          },
          withCredentials: true,
        },
      );

      /*
       * Clear tenant-specific local cache.
       */

      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(
            `food-saas-bill-template:${restaurantId || "default"}`,
          );
        } catch (storageError) {
          console.warn(
            "Unable to clear restaurant local cache:",
            storageError?.message,
          );
        }
      }

      /*
       * Clear React Query cache so deleted restaurant data
       * does not remain visible after deletion.
       */

      queryClient.clear();

      /*
       * Close modal before leaving.
       */

      setDeleteRestaurantOpen(false);
      setDeleteConfirmation("");

      /*
       * IMPORTANT:
       * We intentionally reload the application.
       *
       * Your existing AuthContext owns authentication state.
       * This avoids changing AuthContext/logout implementation
       * just for this destructive operation.
       */

      window.location.replace("/login");
    } catch (error) {
      console.error("Delete restaurant failed:", error);

      setDeleteRestaurantError(
        error.response?.data?.message ||
          "Unable to delete restaurant. Please try again.",
      );
    } finally {
      setDeleteRestaurantLoading(false);
    }
  };

  const logoSrc =
    logoPreview &&
    (logoPreview.startsWith("http") || logoPreview.startsWith("blob:")
      ? logoPreview
      : `${String(import.meta.env.VITE_APP_API_BASE || "").replace(/\/api(?:\/v1)?\/?$/, "")}${logoPreview}`);
  const publicMenuLink = restaurantId
    ? `${window.location.origin}/catalog/${restaurantId}`
    : "";
  const visibleTemplates = showAllTemplates
    ? BILL_TEMPLATES
    : BILL_TEMPLATES.slice(0, 4);
  const planExpiry = restaurant?.subscriptionExpiresAt
    ? new Date(restaurant.subscriptionExpiresAt)
    : null;
  const planExpiryLabel =
    planExpiry && !Number.isNaN(planExpiry.getTime())
      ? planExpiry.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";
  const planExpired = planExpiryLabel && planExpiry.getTime() <= Date.now();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin shadow-md" />
        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase animate-pulse">
          Loading Restaurant Configurations...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl border border-red-100 text-center shadow-lg space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle size={28} />
        </div>
        <h3 className="text-base font-black text-slate-900">
          Failed to Load Profile
        </h3>
        <p className="text-xs text-slate-500">
          Could not retrieve your restaurant details.
        </p>
      </div>
    );
  }

  return (
    <>
      {showSuccessPopup && (
        <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start gap-3 bg-white border border-emerald-200 shadow-2xl rounded-2xl px-5 py-4 w-[calc(100%-2rem)] max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} strokeWidth={2.5} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">
                Profile Updated Successfully
              </p>

              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your restaurant details have been saved successfully.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessPopup(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {deleteRestaurantOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => {
              if (!deleteRestaurantLoading) {
                setDeleteRestaurantOpen(false);
                setDeleteConfirmation("");
                setDeleteRestaurantError("");
              }
            }}
          />

          {/* Modal */}
          <div
            className="
        relative
        w-full
        max-w-lg
        bg-white
        rounded-3xl
        shadow-2xl
        border
        border-red-100
        overflow-hidden
      "
          >
            {/* Header */}
            <div className="p-6 sm:p-7 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Trash2 size={22} strokeWidth={2.5} />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Delete Restaurant
                    </h2>

                    <p className="text-xs text-slate-500 mt-1">
                      This action is permanent and cannot be undone.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={deleteRestaurantLoading}
                  onClick={() => {
                    setDeleteRestaurantOpen(false);
                    setDeleteConfirmation("");
                    setDeleteRestaurantError("");
                  }}
                  className="
              w-9
              h-9
              rounded-xl
              bg-slate-100
              hover:bg-slate-200
              text-slate-500
              hover:text-slate-800
              flex
              items-center
              justify-center
              text-xl
              transition
              disabled:opacity-50
            "
                >
                  ×
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-7 space-y-5">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-black text-red-700 uppercase tracking-wider">
                  Permanent deletion
                </p>

                <p className="mt-2 text-xs leading-5 text-red-600">
                  Your restaurant and its tenant data will be permanently
                  removed, including orders, payments, menu items, combos,
                  offers, tables, analysis data and other restaurant-specific
                  records.
                </p>
              </div>

              <div>
                <label
                  htmlFor="delete-restaurant-confirmation"
                  className="
              block
              text-[11px]
              font-black
              uppercase
              tracking-wider
              text-slate-600
              mb-2
            "
                >
                  Type DELETE to confirm
                </label>

                <input
                  id="delete-restaurant-confirmation"
                  type="text"
                  autoFocus
                  value={deleteConfirmation}
                  onChange={(e) => {
                    setDeleteConfirmation(e.target.value);
                    setDeleteRestaurantError("");
                  }}
                  disabled={deleteRestaurantLoading}
                  placeholder="DELETE"
                  autoComplete="off"
                  spellCheck={false}
                  className="
              w-full
              px-4
              py-3.5
              rounded-2xl
              border
              border-slate-200
              bg-white
              text-sm
              font-bold
              text-slate-900
              uppercase
              tracking-wider
              outline-none
              focus:border-red-500
              focus:ring-4
              focus:ring-red-500/10
              disabled:bg-slate-100
            "
                />
              </div>

              {deleteRestaurantError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs font-bold text-red-600">
                    {deleteRestaurantError}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  disabled={deleteRestaurantLoading}
                  onClick={() => {
                    setDeleteRestaurantOpen(false);
                    setDeleteConfirmation("");
                    setDeleteRestaurantError("");
                  }}
                  className="
              flex-1
              px-5
              py-3.5
              rounded-2xl
              border
              border-slate-200
              bg-white
              hover:bg-slate-50
              text-slate-700
              text-xs
              font-black
              transition
              disabled:opacity-50
            "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    deleteRestaurantLoading ||
                    deleteConfirmation.trim().toUpperCase() !== "DELETE"
                  }
                  onClick={handleDeleteRestaurant}
                  className="
              flex-1
              px-5
              py-3.5
              rounded-2xl
              bg-red-600
              hover:bg-red-700
              text-white
              text-xs
              font-black
              transition
              shadow-lg
              shadow-red-600/20
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
                >
                  {deleteRestaurantLoading
                    ? "Deleting Restaurant..."
                    : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showUpiOtpModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => {
              if (!upiVerifyLoading) {
                setShowUpiOtpModal(false);
              }
            }}
          />

          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                  <Mail size={22} />
                </div>

                <h2 className="text-lg font-black text-slate-900">
                  Verify UPI Change
                </h2>

                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  We've sent a 6-digit OTP to your registered owner email
                  address.
                </p>
              </div>

              <button
                type="button"
                disabled={upiVerifyLoading}
                onClick={() => setShowUpiOtpModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Verification OTP
              </label>

              <input
                autoFocus
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={upiOtp}
                onChange={(e) => {
                  setUpiOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setUpiOtpError("");
                }}
                placeholder="000000"
                className="
            w-full
            px-4
            py-4
            rounded-2xl
            border
            border-slate-200
            text-center
            text-2xl
            font-black
            tracking-[0.5em]
            focus:border-red-500
            focus:ring-4
            focus:ring-red-500/10
            outline-none
          "
              />
            </div>

            {upiOtpError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-semibold text-red-600">
                {upiOtpError}
              </div>
            )}

            {upiOtpInfo && !upiOtpError && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
                {upiOtpInfo}
              </div>
            )}

            <button
              type="button"
              onClick={handleVerifyUpiOtp}
              disabled={upiVerifyLoading || upiOtp.length !== 6}
              className="
          w-full
          mt-6
          py-3.5
          rounded-2xl
          bg-slate-900
          hover:bg-slate-800
          text-white
          text-xs
          font-bold
          disabled:opacity-50
          transition-all
        "
            >
              {upiVerifyLoading ? "Verifying..." : "Verify OTP & Unlock UPI"}
            </button>

            <p className="text-[10px] text-slate-400 text-center mt-4">
              OTP is valid for 10 minutes.
            </p>
          </div>
        </div>
      )}
      <div className="-m-4 bg-[var(--background)] p-4 font-sans text-slate-900 md:-m-6 md:p-5 lg:-m-8 lg:p-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500 via-rose-500 to-orange-400  p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Restaurant Profile</h1>
                <p className="mt-1 max-w-xl text-sm text-white/85">
                  Manage your restaurant details, branding, billing template and other settings.
                </p>
              </div>
            </div>
            <div className="min-w-[220px] rounded-2xl bg-white px-4 py-3 text-slate-800 shadow-sm">
              <p className="text-[11px] font-bold text-slate-400">Restaurant Status</p>
              <p className={`mt-1 flex items-center gap-2 text-sm font-black ${restaurant?.isApproved ? "text-emerald-600" : "text-amber-600"}`}>
                <span className={`h-2 w-2 rounded-full ${restaurant?.isApproved ? "bg-emerald-500" : "bg-amber-500"}`} />
                {restaurant?.isApproved ? "Approved" : "Pending"}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {restaurant?.isApproved ? "Your restaurant is live and active." : "Waiting for approval."}
                {planExpiryLabel ? ` Plan ${planExpired ? "expired" : "expires"} ${planExpiryLabel}.` : ""}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Store size={15} className="text-rose-500" /> Basic Information
                </h2>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  <Save size={13} />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-500">Restaurant Name *</span>
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Restaurant name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-500">Restaurant Slug *</span>
                  <div className="relative">
                    <Globe size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().trim())} placeholder="spice-garden" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white" />
                  </div>
                </label>
                {publicMenuLink && (
                  <p className="sm:col-span-2 text-[11px] font-semibold text-rose-500">
                    <Link2 size={12} className="mr-1 inline" />
                    Menu link: {publicMenuLink}
                  </p>
                )}
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-500">Phone Number *</span>
                  <div className="relative">
                    <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white" />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-500">Email Address *</span>
                  <div className="relative">
                    <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white" />
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
                Automatic Order Mode
              </h2>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    Auto-accept new orders and print KOT
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    When enabled, Table QR, Room QR, Captain and POS orders are
                    accepted immediately and the existing KOT print flow runs
                    without an Accept click. Items are never marked Ready or
                    Served automatically. Turn off to restore manual acceptance.
                  </p>
                  {automaticModeError ? (
                    <p className="mt-2 text-xs font-semibold text-rose-600">
                      {automaticModeError}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={automaticMode}
                  disabled={automaticModeSaving}
                  onClick={handleAutomaticModeToggle}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-60 ${
                    automaticMode ? "bg-rose-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                      automaticMode ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
                <Palette size={15} className="text-orange-500" /> Logo & Branding
              </h2>
              <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <p className="mb-1 text-[11px] font-bold text-slate-500">Restaurant Logo</p>
                  <div className="flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                    {logoSrc ? <img src={logoSrc} alt="Restaurant logo" className="h-full w-full object-cover" /> : <Building size={28} className="text-slate-300" />}
                  </div>
                  <label className="mt-2 flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-600">
                    <Upload size={13} /> Upload Logo
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                  <p className="mt-1 text-center text-[10px] font-medium text-slate-400">PNG, JPG</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold text-slate-500">Theme Color</p>
                  <div className="mb-2 flex items-center gap-2">
                    <input type="color" value={themeColor || "#EF4444"} onChange={(e) => setThemeColor(e.target.value)} aria-label="Theme color" className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
                    <input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold uppercase outline-none focus:border-rose-300" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {THEME_SWATCHES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setThemeColor(color)}
                        aria-label={color}
                        className={`h-6 w-6 rounded-full border-2 ${themeColor?.toLowerCase() === color.toLowerCase() ? "border-slate-900" : "border-white"}`}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
                <MapPin size={15} className="text-rose-500" /> Address Information
              </h2>
              <label className="mb-3 block">
                <span className="mb-1 block text-[11px] font-bold text-slate-500">Street Address</span>
                <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street address" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white" />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-500">City</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-500">State</span>
                  <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-500">PIN Code</span>
                  <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="PIN code" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white" />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
                <Building size={15} className="text-orange-500" /> Business Details
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-500">FSSAI Number</span>
                  <input inputMode="numeric" maxLength={14} value={fssaiNumber} onChange={(e) => setFssaiNumber(e.target.value.replace(/\D/g, "").slice(0, 14))} placeholder="14-digit FSSAI number" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-500">GST Number</span>
                  <input maxLength={15} value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 15))} placeholder="GST number" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-bold text-slate-500">Default Tax Rate (%)</span>
                  <div className="relative">
                    <Percent size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          setTaxRate("");
                          return;
                        }
                        const num = Number(value);
                        if (num >= 0 && num <= 100) setTaxRate(value);
                      }}
                      placeholder="5"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-sm font-semibold outline-none focus:border-rose-300 focus:bg-white"
                    />
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-slate-400">Applied on bills when tax is used.</p>
                </label>
              </div>
            </section>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-3">
            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                <CreditCard size={15} className="text-rose-500" /> Payment & UPI Details
              </h2>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500">UPI ID</span>
                {restaurant?.upiId && !upiChangeMode && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600">Verified</span>
                )}
              </div>
              <input
                value={upiId}
                disabled={Boolean(restaurant?.upiId) && !upiChangeMode}
                onChange={(e) => setUpiId(e.target.value.trim().toLowerCase())}
                placeholder="name@upi"
                className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-rose-300 disabled:cursor-not-allowed disabled:text-slate-500"
              />
              {restaurant?.upiId && !upiChangeMode && (
                <button type="button" onClick={handleRequestUpiOtp} disabled={upiOtpLoading} className="mb-3 rounded-xl bg-rose-500 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50">
                  {upiOtpLoading ? "Sending OTP..." : "Change UPI"}
                </button>
              )}
              {restaurant?.upiId && !upiChangeMode && (
                <p className="mb-2 text-[10px] font-semibold text-amber-600">UPI ID stays locked until the owner email OTP is verified.</p>
              )}
              {upiChangeMode && (
                <p className="mb-2 text-[10px] font-semibold text-emerald-600">Identity verified. Update the UPI ID, then save.</p>
              )}
              <p className="mb-1 text-[11px] font-bold text-slate-500">UPI QR Code</p>
              <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                {upiQrCode ? <img src={upiQrCode} alt="UPI QR code" className="h-24 w-24 object-contain" /> : <p className="px-4 text-center text-[11px] font-semibold text-slate-400">Save a UPI ID to generate this QR</p>}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                <Star size={15} className="text-amber-500" /> Google Review QR Code
              </h2>
              <div className="flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                {googleReviewQrPreview ? <img src={googleReviewQrPreview} alt="Google review QR" className="h-32 w-32 object-contain" /> : <p className="px-4 text-center text-[11px] font-semibold text-slate-400">Upload your Google review QR</p>}
              </div>
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-600">
                <Upload size={13} /> {googleReviewQrPreview ? "Replace QR Code" : "Upload QR Code"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleGoogleReviewQrChange} className="hidden" />
              </label>
              <p className="mt-2 text-center text-[10px] font-medium text-slate-400">PNG, JPG. Customers scan this to leave a review.</p>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Printer size={15} className="text-rose-500" /> Bill Template
                </h2>
                <button type="button" onClick={() => setShowAllTemplates((open) => !open)} className="text-[11px] font-black text-rose-500">
                  {showAllTemplates ? "Show Less" : "View All"}
                </button>
              </div>
              {templateError && <p className="mb-2 text-[11px] font-bold text-rose-600">{templateError}</p>}
              <div className="grid grid-cols-2 gap-2">
                {visibleTemplates.map((template) => {
                  const isSelected = selectedBillTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      disabled={Boolean(templateSaving)}
                      onClick={() => handleBillTemplateChange(template)}
                      className={`rounded-2xl border p-2 text-left ${isSelected ? "border-rose-400 ring-2 ring-rose-100" : "border-slate-100"} ${templateSaving && templateSaving !== template.id ? "opacity-50" : ""}`}
                    >
                      <span className="mb-1 block h-16 rounded-lg bg-slate-50 px-2 py-1">
                        <span className="block h-1.5 w-8 rounded bg-slate-300" />
                        <span className="mt-1 block h-1 w-full rounded bg-slate-200" />
                        <span className="mt-1 block h-1 w-2/3 rounded bg-slate-200" />
                      </span>
                      <span className="block truncate text-[11px] font-black text-slate-800">{template.name}</span>
                      <span className="mt-1 flex items-center justify-between">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${template.tier === "PRO" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{template.tier}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTemplateId(template.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              setPreviewTemplateId(template.id);
                            }
                          }}
                          className="text-[10px] font-black text-rose-500"
                        >
                          Preview
                        </span>
                      </span>
                      {templateSaving === template.id && <span className="text-[9px] font-bold text-slate-400">Applying…</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {paymentTemplate && (
            <BillTemplatePaymentModal template={paymentTemplate} onClose={() => setPaymentTemplate(null)} onSuccess={handleTemplatePaymentSuccess} />
          )}
          {previewTemplateId && (
            <BillTemplatePreviewModal templateId={previewTemplateId} onClose={() => setPreviewTemplateId(null)} />
          )}

          <div className="flex flex-col gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rose-600">
                <Trash2 size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-rose-700">Delete Restaurant</p>
                <p className="text-[11px] font-semibold text-rose-500">This permanently deletes the restaurant and its related data. This action cannot be undone.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteRestaurantError("");
                setDeleteConfirmation("");
                setDeleteRestaurantOpen(true);
              }}
              disabled={updateProfileMutation.isPending || deleteRestaurantLoading}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-black text-rose-600 disabled:opacity-50"
            >
              <Trash2 size={14} /> Delete Restaurant
            </button>
          </div>
        </form>
      </div>

    </>
  );
}
