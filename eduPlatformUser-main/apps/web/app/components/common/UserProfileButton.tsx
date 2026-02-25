"use client";

import React, { useState } from "react";
import { useAnnotation } from "./AnnotationProvider";
import { useRouter } from "next/navigation";
import DemoLoginModal from "./DemoLoginModal";

export const UserProfileButton: React.FC = () => {
  const { user, isLoggedIn, highlights } = useAnnotation();
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

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

  return (
    <button
      onClick={() => router.push("/profile")}
      className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
    >
      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
        {user?.name?.charAt(0).toUpperCase() || "U"}
      </div>
      <div className="text-left hidden sm:block">
        <p className="text-sm font-medium text-gray-800">{user?.name}</p>
        <p className="text-xs text-gray-500">{highlights.length} highlights</p>
      </div>
    </button>
  );
};

export default UserProfileButton;
