import { useMemo } from 'react';
import { useState,useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useCustomerConfig } from '../../components/ThemeWrapper';
import { Plus, Minus } from 'lucide-react';

export default function CustomerMenu({ onUpdateCart, cart }) {
  const restaurant = useCustomerConfig();
  const restaurantId = restaurant?._id;

  const { data: catalog = { categories: {}, combos: [] }, isLoading, isError } = useQuery({
    queryKey: ['public-catalog', restaurantId],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/menu/public/catalog/${restaurantId}`
      );
      return res.data.data;
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60_000, // 5 min tak fresh — menu 
  });

  const categoryNames = useMemo(
    () => Object.keys(catalog.categories || {}),
    [catalog.categories]
  );

  // useState ke  derived value — first category jab catalog load ho
  const [activeCategory, setActiveCategory] = useState('');
  useEffect(() => {
    if (categoryNames.length > 0 && !activeCategory) {
      setActiveCategory(categoryNames[0]);
    }
  }, [categoryNames, activeCategory]);

  const activeItems = useMemo(
    () => catalog.categories?.[activeCategory] || [],
    [catalog.categories, activeCategory]
  );

  const updateQuantity = (item, delta) => {
    const currentQty = cart[item._id]?.quantity || 0;
    onUpdateCart(item, currentQty + delta);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-sm font-bold text-slate-400">Menu could not be loaded. Please refresh and try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-24 shadow-sm">
      <div className="relative h-40 bg-slate-900 flex items-end p-4 text-white">
        {restaurant.logo && (
          <img
            src={restaurant.logo}
            alt="logo"
            className="w-16 h-16 rounded-xl border-2 border-white object-cover shadow-md absolute -bottom-4 left-4"
          />
        )}
        <div className="ml-24 mb-1">
          <h1 className="text-xl font-bold tracking-tight">{restaurant.name}</h1>
          <p className="text-xs text-slate-300">Fresh and quick direct table ordering</p>
        </div>
      </div>

      <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 flex gap-2 p-4 overflow-x-auto scrollbar-none z-40 mt-6">
        {categoryNames.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              backgroundColor: activeCategory === cat ? 'var(--accent-color)' : '',
              color: activeCategory === cat ? '#fff' : '',
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border border-slate-100 transition-all ${
              activeCategory === cat ? '' : 'bg-slate-50 text-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeItems.map((item) => {
          const qty = cart[item._id]?.quantity || 0;
          return (
            <div key={item._id} className="flex gap-4 p-3 rounded-xl border border-slate-100 shadow-xs items-center">
              {item.image && (
                <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover bg-slate-100" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 text-sm">{item.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{item.description}</p>
                <p className="font-bold text-sm text-slate-900 mt-1">₹{item.price}</p>
              </div>
              <div className="flex items-center gap-2">
                {qty > 0 ? (
                  <div className="flex items-center gap-2 border border-slate-200 rounded-full p-1 bg-slate-50">
                    <button onClick={() => updateQuantity(item, -1)} className="w-6 h-6 rounded-full flex items-center justify-center bg-white text-slate-600 shadow-xs cursor-pointer">
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{qty}</span>
                    <button onClick={() => updateQuantity(item, 1)} className="w-6 h-6 rounded-full flex items-center justify-center bg-white text-slate-600 shadow-xs cursor-pointer">
                      <Plus size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => updateQuantity(item, 1)}
                    style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
                    className="flex items-center gap-1 border px-3 py-1 rounded-full text-xs font-bold bg-white transition-all cursor-pointer"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}