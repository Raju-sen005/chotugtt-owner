import { useState } from "react";
import { Sparkles, CheckCircle, Loader2 } from "lucide-react";

export default function AIMarketingDashboard() {
  const [contentType, setContentType] = useState("Weekend Offer");
  const [details, setDetails] = useState(
    "Flat 20% off on all Chinese items this Saturday & Sunday.",
  );
  const [loading, setLoading] = useState(false);
  const [generatedPost, setGeneratedPost] = useState(null);
  const [error, setError] = useState("");

  const handleGeneratePost = async () => {
    setLoading(true);
    setError("");
    try {
      // LocalStorage ya fallback valid MongoDB ID use ki gai hai
      const restaurantId =
        localStorage.getItem("restaurantId") || "6a62eeac1c1ecd9b010b8c13";

      const API_BASE = "http://localhost:5000";

      const response = await fetch(`${API_BASE}/marketing/social/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ restaurantId, contentType, details }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setGeneratedPost(data.data);
      } else {
        setError(data.message || "Failed to generate AI content.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndPublish = async () => {
    if (!generatedPost || !generatedPost._id) return;

    try {
      const API_BASE = "http://localhost:5000";

      const response = await fetch(
        `${API_BASE}/marketing/social/publish/${generatedPost._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        alert("🎉 Post Published Successfully!");
        setGeneratedPost((prev) => ({ ...prev, status: "Published" }));
      } else {
        alert(data.message || "Failed to publish post.");
      }
    } catch (err) {
      console.error("Publish error:", err);
      alert("Network error while publishing.");
    }
  };

  return (
    <div className="p-6 bg-[#151210] text-stone-100 min-h-screen font-sans">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="text-[#c9974c]" size={28} />
        <h1 className="text-xl font-bold">AI Marketing & Reputation Suite</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/25 text-red-400 p-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Social Content Generator Box */}
        <div className="bg-[#1c1815] border border-[#332c26] p-6 rounded-2xl shadow-xl">
          <h2 className="text-sm font-semibold text-[#c9974c] uppercase tracking-wider mb-4">
            AI Social Media Generator
          </h2>

          <label className="block text-xs text-stone-400 mb-1">
            Campaign / Content Type
          </label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full bg-[#151210] border border-[#332c26] rounded-xl p-3 text-xs text-stone-200 mb-4 focus:outline-none focus:border-[#c9974c]"
          >
            <option>Weekend Offer</option>
            <option>Festival Special</option>
            <option>New Dish Launch</option>
            <option>Customer Review Highlight</option>
          </select>

          <label className="block text-xs text-stone-400 mb-1">
            Details / Offer Info
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full bg-[#151210] border border-[#332c26] rounded-xl p-3 text-xs text-stone-200 mb-4 h-24 focus:outline-none focus:border-[#c9974c]"
          />

          <button
            onClick={handleGeneratePost}
            disabled={loading}
            className="w-full bg-[#c9974c] text-[#151210] font-bold py-3 rounded-xl text-xs hover:bg-[#d9a75c] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {loading ? "Gemini is thinking..." : "Generate AI Post & Caption"}
          </button>
        </div>

        {/* Generated Preview Box */}
        <div className="bg-[#1c1815] border border-[#332c26] p-6 rounded-2xl shadow-xl">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">
            Preview & Approval
          </h2>

          {generatedPost ? (
            <div className="space-y-3 bg-[#151210] p-4 rounded-xl border border-[#332c26]">
              <p className="text-xs text-stone-300 whitespace-pre-wrap">
                <strong>Caption:</strong> {generatedPost.caption}
              </p>

              <p className="text-xs text-[#c9974c]">
                <strong>Hashtags:</strong> {generatedPost.hashtags?.join(" ")}
              </p>

              <p className="text-xs text-stone-500">
                <strong>Image Prompt:</strong> {generatedPost.imagePrompt}
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 hover:bg-emerald-600/30"
                  onClick={handleApproveAndPublish}
                >
                  <CheckCircle size={14} /> Approve & Post
                </button>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-stone-600 text-xs border border-dashed border-[#332c26] rounded-xl">
              Generate a post to see Gemini's live preview here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}