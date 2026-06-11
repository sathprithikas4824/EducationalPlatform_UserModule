"use client";

import React, { useState, useEffect, useLayoutEffect } from "react";
import Image from "next/image";
import { useAnnotation } from "./AnnotationProvider";
import { useRouter } from "next/navigation";
import DemoLoginModal from "./DemoLoginModal";
import { supabase } from "../../lib/supabase";

// useLayoutEffect fires before the browser paints — eliminates the "S" flash
// On the server it falls back to useEffect (no-op) to avoid hydration warnings
const useSafeLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const AVATAR_KEY = "edu_avatar_url";

export const UserProfileButton: React.FC = () => {
  const { user, isLoggedIn, highlights } = useAnnotation();
  const [showModal, setShowModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const router = useRouter();

  // Read cached URL from localStorage BEFORE first paint — no flash on repeated visits
  useSafeLayoutEffect(() => {
    const cached = localStorage.getItem(AVATAR_KEY);
    if (cached) setAvatarUrl(cached);
  }, []);

  // When user loads, refresh URL from Supabase Storage and cache it
  useEffect(() => {
    if (!user?.id || !supabase) return;
    setImgError(false);
    setImageLoaded(false);
    const { data } = supabase.storage.from("avatars").getPublicUrl(`${user.id}/avatar.jpg`);
    const url = data.publicUrl;
    setAvatarUrl(url);
    localStorage.setItem(AVATAR_KEY, url);
  }, [user?.id]);

  if (!isLoggedIn) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Login</span>
        </button>
        <DemoLoginModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  const initial = user?.name?.charAt(0).toUpperCase() || "U";

  return (
    <button
      onClick={() => router.push("/profile")}
      className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
    >
      {/* Avatar: S letter underneath, image fades in on top — no flash */}
      <div className="relative w-8 h-8 flex-shrink-0">
        <div className="absolute inset-0 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
          {initial}
        </div>
        {avatarUrl && !imgError && (
          <Image
            src={avatarUrl}
            alt={user?.name || "User"}
            width={32}
            height={32}
            unoptimized
            className={`absolute inset-0 w-full h-full rounded-full object-cover transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="text-left hidden sm:block">
        <p className="text-sm font-medium text-gray-800">{user?.name}</p>
        <p className="text-xs text-gray-500">{highlights.length} highlights</p>
      </div>
    </button>
  );
};

export default UserProfileButton;
