import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
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

export default function RestaurantProfile() {
  const queryClient = useQueryClient();

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
  
  // Logo Upload State
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  // Staff Management Local States
//   const [staffList, setStaffList] = useState([]);
//   const [newStaffName, setNewStaffName] = useState("");
//   const [newStaffEmail, setNewStaffEmail] = useState("");
//   const [newStaffPassword, setNewStaffPassword] = useState("");
//   const [newStaffRole, setNewStaffRole] = useState("WAITER");

  // 1. Fetch Restaurant Profile Data
  const { data: restaurant, isLoading, isError } = useQuery({
    queryKey: ["restaurant-profile"],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/restaurant/profile`,
        { withCredentials: true }
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });

  // Fetch Staff Members (Mock or Dedicated API endpoint)
//   const { data: staffData } = useQuery({
//     queryKey: ["restaurant-staff"],
//     queryFn: async () => {
//       try {
//         const res = await axios.get(
//           `${import.meta.env.VITE_APP_API_BASE}/restaurant/staff`,
//           { withCredentials: true }
//         );
//         return res.data.data || [];
//       } catch {
//         return [];
//       }
//     },
//   });

  // Populate form state when data is fetched
  useEffect(() => {
    if (restaurant) {
      // Avoid synchronous cascading renders by only updating when values change
      setName((prev) => (prev !== (restaurant.name || "") ? restaurant.name || "" : prev));
      setSlug((prev) => (prev !== (restaurant.slug || "") ? restaurant.slug || "" : prev));
      setPhone((prev) => (prev !== (restaurant.phone || "") ? restaurant.phone || "" : prev));
      setEmail((prev) => (prev !== (restaurant.email || "") ? restaurant.email || "" : prev));
      setThemeColor((prev) => (prev !== (restaurant.themeColor || "#EF4444") ? restaurant.themeColor || "#EF4444" : prev));
      setStreet((prev) => (prev !== (restaurant.address?.street || "") ? restaurant.address?.street || "" : prev));
      setCity((prev) => (prev !== (restaurant.address?.city || "") ? restaurant.address?.city || "" : prev));
      setState((prev) => (prev !== (restaurant.address?.state || "") ? restaurant.address?.state || "" : prev));
      setZip((prev) => (prev !== (restaurant.address?.zip || "") ? restaurant.address?.zip || "" : prev));
      setUpiId((prev) => (prev !== (restaurant.upiId || "") ? restaurant.upiId || "" : prev));
      setUpiQrCode((prev) => (prev !== (restaurant.upiQrCode || "") ? restaurant.upiQrCode || "" : prev));
      setLogoPreview((prev) => (prev !== (restaurant.logo || "") ? restaurant.logo || "" : prev));
    }
    // if (staffData) {
    //   setStaffList(staffData);
    // }
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
        }
      );
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["restaurant-profile"]);
      setLogoFile(null);
      if (res.data?.upiQrCode) setUpiQrCode(res.data.upiQrCode);
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to update restaurant profile.");
    },
  });

  // Add Staff Mutation
//   const addStaffMutation = useMutation({
//     mutationFn: async (staffPayload) => {
//       const res = await axios.post(
//         `${import.meta.env.VITE_APP_API_BASE}/restaurant/staff`,
//         staffPayload,
//         { withCredentials: true }
//       );
//       return res.data;
//     },
//     onSuccess: (res) => {
//       queryClient.invalidateQueries(["restaurant-staff"]);
//       setNewStaffName("");
//       setNewStaffEmail("");
//       setNewStaffPassword("");
//       alert("Staff member added successfully!");
//     },
//     onError: (err) => {
//       alert(err.response?.data?.message || "Failed to add staff member.");
//     },
    
//   });

  // Handle Logo File Selection
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Handle Form Submission
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append("name", name);
      formData.append("slug", slug);
      formData.append("phone", phone);
      formData.append("email", email);
      formData.append("themeColor", themeColor);
      formData.append("upiId", upiId);
      
      formData.append("address[street]", street);
      formData.append("address[city]", city);
      formData.append("address[state]", state);
      formData.append("address[zip]", zip);

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      updateProfileMutation.mutate(formData);
    },
    [name, slug, phone, email, themeColor, upiId, street, city, state, zip, logoFile, updateProfileMutation]
  );

//   const handleAddStaffSubmit = (e) => {
//     e.preventDefault();
//     if (!newStaffName || !newStaffEmail || !newStaffPassword) {
//       alert("Please fill all staff fields");
//       return;
//     }
//     addStaffMutation.mutate({
//       name: newStaffName,
//       email: newStaffEmail,
//       password: newStaffPassword,
//       role: newStaffRole,
//     });
//   };

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
        <h3 className="text-base font-black text-slate-900">Failed to Load Profile</h3>
        <p className="text-xs text-slate-500">Could not retrieve your restaurant details.</p>
      </div>
    );
  }

  return (
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
              Configure your business metadata, UPI payment QR, and control staff member access.
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
                <span className="text-[10px] text-slate-400 font-semibold">Max 5MB</span>
              </div>

              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-28 h-28 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden relative flex items-center justify-center text-slate-400 shadow-inner group">
                  {logoPreview ? (
                    <img
                      src={
                        logoPreview.startsWith("http") || logoPreview.startsWith("blob:")
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
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              </div>

              {/* UPI QR Display Card */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <QrCode size={14} className="text-emerald-500" /> Active UPI Payment QR
                </h3>
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  {upiQrCode ? (
                    <img src={upiQrCode} alt="UPI QR Code" className="w-32 h-32 object-contain rounded-xl shadow-sm bg-white p-1.5" />
                  ) : (
                    <div className="w-32 h-32 flex items-center text-center justify-center text-[11px] text-slate-400 font-medium">
                      Save UPI ID below to generate QR
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500 mt-2 font-mono">{upiId || "No UPI ID Configured"}</span>
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
                  <Globe size={16} className="absolute left-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="spice-garden"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Contact Phone Number
                </label>
                <div className="relative flex items-center">
                  <Phone size={16} className="absolute left-4 text-slate-400" />
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
                  <Mail size={16} className="absolute left-4 text-slate-400" />
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Restaurant UPI ID (for Customer Payments & Orders)
                </label>
                <div className="relative flex items-center">
                  <CreditCard size={16} className="absolute left-4 text-emerald-500" />
                  <input
                    type="text"
                    placeholder="restaurantname@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Address Location Section */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <MapPin size={16} className="text-red-500" /> Physical Branch Location
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
            <Input label="City" placeholder="Jaipur" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label="State / Province" placeholder="Rajasthan" value={state} onChange={(e) => setState(e.target.value)} />
            <Input label="Zip / Postal Code" placeholder="302001" value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
        </div>

        {/* Sticky Action Footer Bar */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 shadow-lg flex items-center justify-between gap-4">
          <div className="hidden sm:block text-xs text-slate-500 font-medium pl-2">
            Changes apply instantly across online menus and payment gateways.
          </div>
          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-8 py-4 rounded-2xl transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save size={16} strokeWidth={2.5} />
            <span>{updateProfileMutation.isPending ? "Saving..." : "Save Profile & UPI Details"}</span>
          </button>
        </div>
      </form>

      {/* 👥 STAFF MANAGEMENT SECTION */}
      {/* <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Users size={16} className="text-red-500" /> Staff & Team Access Management
          </h2>
          <span className="text-[10px] text-slate-400 font-semibold">{staffList.length} Active Staff Members</span>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase">Add New Staff Member</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Staff Name"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900"
            />
            <input
              type="email"
              placeholder="staff@email.com"
              value={newStaffEmail}
              onChange={(e) => setNewStaffEmail(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900"
            />
            <input
              type="password"
              placeholder="Secure Password"
              value={newStaffPassword}
              onChange={(e) => setNewStaffPassword(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900"
            />
            <div className="flex gap-2">
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-medium"
              >
                <option value="WAITER">Waiter</option>
                <option value="CASHIER">Cashier</option>
                <option value="KITCHEN">Kitchen Staff</option>
              </select>
              <button
                type="button"
                onClick={handleAddStaffSubmit}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer"
              >
                <UserPlus size={14} /> Add
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {staffList.length > 0 ? (
                staffList.map((staff) => (
                  <tr key={staff._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{staff.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{staff.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => alert("Delete staff endpoint integration ready")}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400 font-medium text-xs">
                    No staff accounts registered yet. Use the form above to add members.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div> */}

    </div>
  );
}