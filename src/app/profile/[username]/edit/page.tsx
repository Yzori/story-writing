"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const ROLES = ["writer", "illustrator", "editor", "worldbuilder", "reader"] as const;

interface ProfileData {
  displayName: string;
  bio: string;
  role: string;
  avatarUrl: string;
}

export default function EditProfilePage() {
  const { username: userId } = useParams<{ username: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("writer");
  const [avatarUrl, setAvatarUrl] = useState("");

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName || undefined,
          bio: bio || undefined,
          role,
          ...(avatarUrl ? { avatarUrl } : {}),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to save");
      }

      router.push(`/profile/${userId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-secondary text-sm animate-pulse">Loading profile...</p>
      </div>
    );
  }

  const inputClass =
    "bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text outline-none focus:border-amber/30 transition-colors w-full";
  const labelClass =
    "text-[11px] uppercase tracking-[0.12em] text-text-ghost mb-2 block";

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
        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className={labelClass}>
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className={inputClass}
          />
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
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className={labelClass}>
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-amber text-void px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/profile/${userId}`)}
            className="bg-surface border border-border text-paper px-5 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-elevated"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
}
