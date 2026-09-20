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
  Sparkles,
  //   ShieldCheck,
  CreditCard,
  //   Users,
  //   UserPlus,
  //   Trash2,
  QrCode,
} from "lucide-react";
import Input from "../../components/ui/Input";
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

  // 🔑 FIX: restored rollback + error handling + query invalidation.
  // The version this reverted to applied the template optimistically with
  // zero error recovery — if the PATCH failed, the UI kept showing the new
  // template as "selected" even though the server never saved it, which is
  // exactly the "sometimes applies, sometimes doesn't" bug.
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
    queryKey: ["restaurant-profile"],
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
          <div className="flex items-start gap-3 bg-white border border-emerald-200 shadow-2xl rounded-2xl px-5 py-4 min-w-[320px] max-w-[400px]">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans bg-[#F9FAFB] min-h-screen">
        {/* Hero Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border border-slate-800">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-white/10 backdrop-blur-md text-red-400 rounded-2xl border border-white/10 shadow-inner">
              <Store size={32} />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold tracking-widest text-red-400 uppercase bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20">
                Workspace Hub
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Restaurant Profile & Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Configure your business metadata, UPI payment QR, and control
                staff member access.
              </p>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            {restaurant?.isApproved ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-2xl backdrop-blur-md shadow-sm">
                <CheckCircle2 size={16} /> Verified & Approved
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-2xl backdrop-blur-md shadow-sm">
                <AlertCircle size={16} /> Pending Verification
              </div>
            )}
          </div>
        </div>

        {/* Main Form Dashboard */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Logo & UPI QR Identity */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Sparkles size={14} className="text-red-500" /> Brand Logo
                  </h2>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Max 5MB
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-28 h-28 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden relative flex items-center justify-center text-slate-400 shadow-inner group">
                    {logoPreview ? (
                      <img
                        src={
                          logoPreview.startsWith("http") ||
                          logoPreview.startsWith("blob:")
                            ? logoPreview
                            : `${import.meta.env.VITE_APP_API_BASE.replace("/api", "")}${logoPreview}`
                        }
                        alt="Logo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Building size={36} className="text-slate-300" />
                    )}
                  </div>

                  <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition-all">
                    <Upload size={14} className="text-slate-500" />
                    <span>Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* UPI QR Display Card */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <QrCode size={14} className="text-emerald-500" /> Active UPI
                    Payment QR
                  </h3>
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    {upiQrCode ? (
                      <img
                        src={upiQrCode}
                        alt="UPI QR Code"
                        className="w-32 h-32 object-contain rounded-xl shadow-sm bg-white p-1.5"
                      />
                    ) : (
                      <div className="w-32 h-32 flex items-center text-center justify-center text-[11px] text-slate-400 font-medium">
                        Save UPI ID below to generate QR
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 mt-2 font-mono">
                      {upiId || "No UPI ID Configured"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: General Information & UPI ID */}
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-4">
                General Identity & Payment Configuration
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Restaurant Business Name"
                  required
                  placeholder="e.g., Spice Garden"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Custom Storefront URL Slug
                  </label>
                  <div className="relative flex items-center">
                    <Globe
                      size={16}
                      className="absolute left-4 text-slate-400"
                    />
                    <input
                      type="text"
                      required
                      placeholder="spice-garden"
                      value={slug}
                      onChange={(e) =>
                        setSlug(e.target.value.toLowerCase().trim())
                      }
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Contact Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <Phone
                      size={16}
                      className="absolute left-4 text-slate-400"
                    />
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Official Business Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail
                      size={16}
                      className="absolute left-4 text-slate-400"
                    />
                    <input
                      type="email"
                      required
                      placeholder="support@spicegarden.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Restaurant UPI ID
                    </label>

                    {restaurant?.upiId && !upiChangeMode && (
                      <button
                        type="button"
                        onClick={handleRequestUpiOtp}
                        disabled={upiOtpLoading}
                        className="
            text-[10px]
            font-bold
            text-red-600
            hover:text-red-700
            bg-red-50
            hover:bg-red-100
            border
            border-red-100
            px-3
            py-1.5
            rounded-xl
            transition-all
            disabled:opacity-50
          "
                      >
                        {upiOtpLoading ? "Sending OTP..." : "Change UPI"}
                      </button>
                    )}
                  </div>

                  {restaurant?.upiId && !upiChangeMode && (
                    <p className="text-[10px] text-amber-600 font-semibold">
                      🔒 UPI ID is locked. Verify your registered owner email to
                      change it.
                    </p>
                  )}

                  {upiChangeMode && (
                    <p className="text-[10px] text-emerald-600 font-semibold">
                      ✓ Identity verified. You can now change your UPI ID.
                    </p>
                  )}

                  <div className="relative flex items-center">
                    <CreditCard
                      size={16}
                      className="absolute left-4 text-emerald-500"
                    />

                    <input
                      type="text"
                      placeholder="restaurantname@okhdfcbank"
                      disabled={Boolean(restaurant?.upiId) && !upiChangeMode}
                      value={upiId}
                      onChange={(e) =>
                        setUpiId(e.target.value.trim().toLowerCase())
                      }
                      className="
        w-full
        pl-11
        pr-4
        py-3
        rounded-2xl
        border
        border-slate-200
        bg-white
        text-sm
        text-slate-900
        focus:border-red-500
        focus:ring-4
        focus:ring-red-500/10
        transition-all
        shadow-xs
        disabled:bg-slate-100
        disabled:text-slate-500
        disabled:cursor-not-allowed
      "
                    />
                  </div>
                </div>
                <div className="mt-4">
                  {(() => {
                    const expiryDate = restaurant?.subscriptionExpiresAt
                      ? new Date(restaurant.subscriptionExpiresAt)
                      : null;

                    if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
                      return (
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                            <AlertCircle size={18} strokeWidth={2.5} />
                          </div>

                          <div>
                            <p className="text-xs font-black text-slate-800">
                              Plan Expiry
                            </p>
                            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                              Plan expiry date unavailable
                            </p>
                          </div>
                        </div>
                      );
                    }

                    const isExpired = expiryDate.getTime() <= Date.now();

                    const formattedDate = expiryDate.toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });

                    return (
                      <div
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                          isExpired
                            ? "border-red-200 bg-red-50"
                            : "border-emerald-200 bg-emerald-50"
                        }`}
                      >
                        {/* Status Icon */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isExpired
                              ? "bg-red-100 text-red-600"
                              : "bg-emerald-100 text-emerald-600"
                          }`}
                        >
                          {isExpired ? (
                            <AlertCircle size={19} strokeWidth={2.5} />
                          ) : (
                            <CheckCircle2 size={19} strokeWidth={2.5} />
                          )}
                        </div>

                        {/* Status Content */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-xs font-black ${
                                isExpired ? "text-red-800" : "text-emerald-800"
                              }`}
                            >
                              {isExpired
                                ? "Subscription Expired"
                                : "Subscription Active"}
                            </p>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                isExpired
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isExpired ? "Expired" : "Active"}
                            </span>
                          </div>

                          <p
                            className={`mt-1 text-[11px] font-semibold ${
                              isExpired ? "text-red-600" : "text-emerald-600"
                            }`}
                          >
                            {isExpired
                              ? `Your plan expired on ${formattedDate}`
                              : `Your plan expires on ${formattedDate}`}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* GOOGLE REVIEW QR */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <QrCode size={14} className="text-blue-500" />
                  Google Review QR
                </h3>

                <span className="text-[9px] font-bold text-slate-400 uppercase">
                  Customer Reviews
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                {googleReviewQrPreview ? (
                  <img
                    src={googleReviewQrPreview}
                    alt="Google Review QR Code"
                    className="w-32 h-32 object-contain rounded-xl shadow-sm bg-white p-2"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-center text-[11px] text-slate-400 font-medium">
                    Upload your Google Review QR
                  </div>
                )}

                <p className="text-[10px] text-slate-500 text-center mt-2">
                  Customers can scan this QR to leave a Google review.
                </p>

                <label className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-blue-100 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 cursor-pointer transition-all">
                  <Upload size={14} />

                  <span>
                    {googleReviewQrPreview
                      ? "Replace Review QR"
                      : "Upload Review QR"}
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleGoogleReviewQrChange}
                    className="hidden"
                  />
                </label>

                <span className="text-[9px] text-slate-400 mt-2">
                  JPG, PNG or WebP • Max 5MB
                </span>
              </div>
            </div>

            <div className="sm:col-span-2 pt-4 mt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Building size={14} className="text-blue-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Business Compliance
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    FSSAI Number
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={14}
                    placeholder="e.g. 12345678901234"
                    value={fssaiNumber}
                    onChange={(e) =>
                      setFssaiNumber(
                        e.target.value.replace(/\D/g, "").slice(0, 14),
                      )
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-xs"
                  />

                  <p className="text-[10px] text-slate-400">
                    14-digit FSSAI license/registration number
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* GST NUMBER */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      GST Number
                    </label>

                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 08ABCDE1234F1Z5"
                      value={gstNumber}
                      onChange={(e) =>
                        setGstNumber(
                          e.target.value
                            .toUpperCase()
                            .replace(/\s/g, "")
                            .slice(0, 15),
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-400"
                    />
                  </div>

                  {/* TAX RATE */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      GST / Tax Rate
                    </label>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="e.g. 5"
                        value={taxRate}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (value === "") {
                            setTaxRate("");
                            return;
                          }

                          const num = Number(value);

                          if (num >= 0 && num <= 100) {
                            setTaxRate(value);
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm font-semibold outline-none focus:border-rose-400"
                      />

                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                        %
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      This tax rate will be automatically applied to bills.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Address Location Section */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <MapPin size={16} className="text-red-500" /> Physical Branch
                Location
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="sm:col-span-2 lg:col-span-4">
                <Input
                  label="Street Address & Landmark"
                  placeholder="Shop No. 4, Main Market Road"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
              <Input
                label="City"
                placeholder="Jaipur"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="State / Province"
                placeholder="Rajasthan"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <Input
                label="Zip / Postal Code"
                placeholder="302001"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">
                  Billing
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Bill template
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Select the design used when bills are generated and printed.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                {
                  BILL_TEMPLATES.find(
                    (template) => template.id === selectedBillTemplate,
                  )?.name
                }
              </span>
            </div>

            {templateError && (
              <p className="mt-3 text-xs font-bold text-rose-600">
                {templateError}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              {BILL_TEMPLATES.map((template) => {
                const isSelected = selectedBillTemplate === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    disabled={Boolean(templateSaving)}
                    onClick={() => handleBillTemplateChange(template)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-rose-500 bg-rose-50 ring-2 ring-rose-100"
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                    } cursor-pointer ${
                      templateSaving && templateSaving !== template.id
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black text-slate-900">
                        {template.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-black ${
                          template.tier === "PRO"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {template.tier}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                      {template.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      {templateSaving === template.id && (
                        <span className="text-[9px] font-bold text-slate-400">
                          Applying…
                        </span>
                      )}
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
                        className="ml-auto text-[10px] font-black text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Preview
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {paymentTemplate && (
            <BillTemplatePaymentModal
              template={paymentTemplate}
              onClose={() => setPaymentTemplate(null)}
              onSuccess={handleTemplatePaymentSuccess}
            />
          )}

          {previewTemplateId && (
            <BillTemplatePreviewModal
              templateId={previewTemplateId}
              onClose={() => setPreviewTemplateId(null)}
            />
          )}

          {/* Sticky Action Footer Bar */}
          {/* Sticky Action Footer Bar */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="hidden sm:block text-xs text-slate-500 font-medium pl-2">
                Changes apply instantly across online menus and payment
                gateways.
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                {/* DELETE RESTAURANT */}
                <button
                  type="button"
                  onClick={() => {
                    setDeleteRestaurantError("");
                    setDeleteConfirmation("");
                    setDeleteRestaurantOpen(true);
                  }}
                  disabled={
                    updateProfileMutation.isPending || deleteRestaurantLoading
                  }
                  className="
          w-full
          sm:w-auto
          flex
          items-center
          justify-center
          gap-2
          bg-red-50
          hover:bg-red-100
          text-red-600
          border
          border-red-200
          font-bold
          text-xs
          px-6
          py-4
          rounded-2xl
          transition-all
          shadow-sm
          cursor-pointer
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
                >
                  <Trash2 size={16} strokeWidth={2.5} />

                  <span>Delete Restaurant</span>
                </button>

                {/* SAVE PROFILE */}
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="
          w-full
          sm:w-auto
          flex
          items-center
          justify-center
          gap-2
          bg-slate-900
          hover:bg-slate-800
          text-white
          font-bold
          text-xs
          px-8
          py-4
          rounded-2xl
          transition-all
          shadow-md
          cursor-pointer
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
                >
                  <Save size={16} strokeWidth={2.5} />

                  <span>
                    {updateProfileMutation.isPending
                      ? "Saving..."
                      : "Save Profile & UPI Details"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
