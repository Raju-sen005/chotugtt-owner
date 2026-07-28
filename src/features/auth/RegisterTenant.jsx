import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ImagePlus } from 'lucide-react';
import logoImage from '../../assets/cho.png';

export default function RegisterTenant({ onSwitchToLogin }) {
  const { registerTenant } = useAuth();
  
  // Registration States
  const [restaurantName, setRestaurantName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Automatic unique URL generator logic
  const generatedSlug = restaurantName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

  // Handle Logo Selection & Preview
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setError('');
      
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        setError('Mobile number exactly 10 digits ka hona chahiye.');
        return;
      }

      // 🚀 FormData ka use karein kyunki file upload ho rahi hai
      const formData = new FormData();
      formData.append('restaurantName', restaurantName);
      formData.append('slug', generatedSlug);
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('phone', phone);
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await registerTenant(formData);
      
      if (response && response.success) {
        const liveMenuUrl = `${import.meta.env.VITE_APP_API_BASE || window.location.origin}/?store=${generatedSlug}`;
        const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(liveMenuUrl)}`;
        
        setSuccessData({
          url: liveMenuUrl,
          qr: qrCodeApiUrl,
          slug: generatedSlug
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    }
  };

  if (successData) {
    return (
      <div className="h-screen bg-[#F8F9FA] flex items-center justify-center p-6 font-sans overflow-hidden">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6 border border-slate-100 animate-fade-in">
          <div>
            <span className="text-4xl">🎉</span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">Registration Live!</h2>
            <p className="text-xs text-slate-500 mt-1">Aapka multi-tenant storefront setup allocate ho gaya hai.</p>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 inline-block shadow-inner">
            <img src={successData.qr} alt="Restaurant QR" className="mx-auto rounded-lg shadow-xs h-36 w-36 object-contain" />
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aapka Live Menu Sub-URL:</label>
            <a href={successData.url} target="_blank" rel="noreferrer" className="block p-3 rounded-xl bg-red-50 text-red-600 font-mono text-xs font-bold break-all border border-red-100 hover:bg-red-100 transition-all">
              {successData.url}
            </a>
          </div>

          <button 
            onClick={onSwitchToLogin} 
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-3.5 rounded-xl font-bold hover:opacity-95 active:scale-[0.99] transition-all shadow-md shadow-red-500/20 text-sm cursor-pointer"
          >
            Proceed to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen grid lg:grid-cols-12 bg-[#F8F9FA] font-sans overflow-hidden">
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-rose-500 via-red-500 to-amber-500 p-8 xl:p-12 flex-col justify-between relative overflow-hidden h-full">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
        <div className="relative z-10 text-center">
          <img src={logoImage} alt="Chotu" className="h-44 xl:h-52 m-auto object-contain brightness-0 invert" />
          <p className="text-white/80 font-medium text-sm mt-1">Partner Network Management</p>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-7 flex items-center justify-center p-6 lg:p-8 h-full overflow-y-auto">
        <div className="max-w-xl w-full space-y-4 my-auto">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Register Your Restaurant</h2>
            <p className="text-slate-500 text-xs">Create your automated digital menu SaaS portal</p>
          </div>

          {error && (
            <div className="bg-rose-50/80 text-rose-600 p-3 rounded-xl text-xs font-semibold border border-rose-100 flex items-center gap-2">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3">
            
            {/* 🖼️ Restaurant Logo Upload Section */}
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="relative h-14 w-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="text-slate-400" size={24} />
                )}
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Restaurant Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-600 hover:file:bg-red-100 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Restaurant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Haveli Foods"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Auto Generated Slug/URL</label>
                <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs font-mono font-bold truncate">
                  /{generatedSlug || 'your-url'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Raju Sen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Contact Mobile</label>
                <input
                  type="text"
                  required
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Business Email Address</label>
              <input
                type="email"
                required
                placeholder="owner@haveli.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Secure Dashboard Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 rounded-xl font-bold hover:opacity-95 active:scale-[0.99] transition-all shadow-md shadow-red-500/20 text-xs mt-1 cursor-pointer"
            >
              Register & Generate Live QR Menu
            </button>
          </form>

          <div className="text-center pt-1">
            <p className="text-xs text-slate-500">
              Already have a store account?{' '}
              <button onClick={onSwitchToLogin} className="text-red-500 font-extrabold hover:underline cursor-pointer">
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}