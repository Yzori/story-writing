"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useToast } from "@/components/shared/Toast";
import { compressImage } from "@/lib/images";

const ROLES = ["writer", "illustrator", "editor", "worldbuilder", "reader"] as const;

const ROLE_COLORS: Record<string, string> = {
  writer: "text-amber border-amber/25 bg-amber/5",
  illustrator: "text-lavender border-lavender/25 bg-lavender/5",
  editor: "text-teal border-teal/25 bg-teal/5",
  worldbuilder: "text-sage border-sage/25 bg-sage/5",
  reader: "text-text-secondary border-border bg-surface/50",
};

interface ProfileData {
  displayName: string;
  bio: string;
  role: string;
  avatarUrl: string;
}

export default function EditProfilePage() {
  const { username: userId } = useParams<{ username: string }>();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("writer");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Auth check — redirect if not the profile owner
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.id !== userId) {
      toast("You can only edit your own profile", "error");
      router.push(`/profile/${userId}`);
    }
  }, [session, sessionStatus, userId, router, toast]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) throw new Error("Failed to load profile");
        const json = await res.json();
        const data: ProfileData = json.data;
        setDisplayName(data.displayName ?? "");
        setBio(data.bio ?? "");
        setRole(data.role ?? "writer");
        setAvatarUrl(data.avatarUrl ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [userId]);

  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file", "error");
      return;
    }
    try {
      const dataUrl = await compressImage(file, 256, 0.8);
      setAvatarPreview(dataUrl);
      setAvatarUrl(dataUrl);
    } catch {
      toast("Couldn\u2019t process image", "error");
    }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim() || undefined,
          role,
          ...(avatarUrl ? { avatarUrl } : {}),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to save");
      }

      toast("Profile saved", "success");
      router.push(`/profile/${userId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  if (loading || sessionStatus === "loading") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-40 bg-elevated rounded" />
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-elevated" />
            <div className="h-9 w-32 bg-elevated rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 bg-elevated rounded" />
            <div className="h-10 w-full bg-elevated rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-12 bg-elevated rounded" />
            <div className="h-24 w-full bg-elevated rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (session?.user?.id !== userId) {
    return null;
  }

  const inputClass =
    "bg-elevated/80 border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-text outline-none focus:border-amber/25 focus:shadow-sm focus:shadow-amber/5 transition-all w-full";
  const labelClass =
    "text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block";

  const currentAvatar = avatarPreview || avatarUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-6 py-10"
    >
      <h1 className="font-display text-2xl text-paper mb-8">Edit Profile</h1>

      {error && (
        <div className="bg-rose/10 border border-rose/20 rounded-lg px-4 py-3 mb-6">
          <p className="text-rose text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar */}
        <div>
          <label className={labelClass}>Avatar</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border-2 border-amber/15 flex items-center justify-center text-amber text-2xl font-display font-semibold overflow-hidden flex-shrink-0">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={displayName || "Avatar"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                (displayName || "?").charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarFile(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-surface border border-border text-text-secondary text-[12px] font-medium rounded-full hover:border-amber/25 hover:text-paper transition-all"
              >
                Upload Photo
              </button>
              {currentAvatar && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarUrl("");
                    setAvatarPreview(null);
                  }}
                  className="text-text-ghost text-[11px] hover:text-rose transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className={labelClass}>
            Display Name <span className="text-rose">*</span>
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            maxLength={100}
            required
            className={inputClass}
          />
          <div className="flex justify-end mt-1">
            <span className="text-[11px] text-text-ghost">{displayName.length}/100</span>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className={labelClass}>
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
            maxLength={500}
            className={`${inputClass} resize-none`}
          />
          <div className="flex justify-end mt-1">
            <span className={`text-[11px] ${bio.length > 450 ? "text-rose" : "text-text-ghost"}`}>
              {bio.length}/500
            </span>
          </div>
        </div>

        {/* Role */}
        <div>
          <label className={labelClass}>Role</label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-4 py-2 rounded-full border text-[13px] font-medium transition-all duration-200 ${
                  role === r
                    ? ROLE_COLORS[r]
                    : "border-border text-text-ghost hover:text-text-secondary hover:border-border-active"
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="bg-amber text-void font-semibold px-6 py-2.5 rounded-full text-sm transition-all duration-200 hover:bg-amber-light hover:shadow-md hover:shadow-amber/15 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/profile/${userId}`)}
            className="bg-surface/80 border border-border text-text-secondary px-6 py-2.5 rounded-full text-sm font-medium transition-colors hover:text-paper hover:border-border-active"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
}
