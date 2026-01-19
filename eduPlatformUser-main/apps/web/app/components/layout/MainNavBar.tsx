"use client";

import { useState } from 'react';
import Link from "next/link";

const HamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const MobileMenu = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] sm:hidden"
        onClick={onClose}
      />

      <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto sm:hidden shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <img src="/logo.svg" alt="Logo" className="w-6 h-6" />
            <span className="text-lg font-bold text-gray-900">Logo</span>
          </Link>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="py-4">
          <Link
            href="/topic"
            className="block w-full px-6 py-4 text-left text-gray-900 hover:bg-gray-50 border-b border-gray-100"
            onClick={onClose}
          >
            <span className="text-base font-medium">Topic</span>
          </Link>
          <Link
            href="/pathways"
            className="block w-full px-6 py-4 text-left text-gray-900 hover:bg-gray-50 border-b border-gray-100"
            onClick={onClose}
          >
            <span className="text-base font-medium">Pathways</span>
          </Link>
          <Link
            href="/resources"
            className="block w-full px-6 py-4 text-left text-gray-900 hover:bg-gray-50 border-b border-gray-100"
            onClick={onClose}
          >
            <span className="text-base font-medium">Resources</span>
          </Link>
          <Link
            href="/pricing"
            className="block w-full px-6 py-4 text-left text-gray-900 hover:bg-gray-50 border-b border-gray-100"
            onClick={onClose}
          >
            <span className="text-base font-medium">Pricing</span>
          </Link>
          <Link
            href="/enterprise"
            className="block w-full px-6 py-4 text-left text-gray-900 hover:bg-gray-50 border-b border-gray-100"
            onClick={onClose}
          >
            <span className="text-base font-medium">Enterprise</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default function MainNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <MobileMenu isOpen={mobileMenuOpen} onClose={closeMobileMenu} />

      <header className="w-full sticky top-0 z-50 bg-transparent py-3">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-50">
          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <Link href="/" className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                <div className="w-5 h-5">
                  <img
                    src="/logo.svg"
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-gray-900">Logo</span>
              </Link>
            </div>

            <div
              className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-visible backdrop-blur-md"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
            >
              <Link
                href="/topic"
                className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Topic
              </Link>

              <Link
                href="/pathways"
                className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Pathways
              </Link>

              <Link
                href="/resources"
                className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Resources
              </Link>

              <Link
                href="/pricing"
                className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Pricing
              </Link>
              <Link
                href="/enterprise"
                className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Enterprise
              </Link>
            </div>

          {/* Auth Section */}
          <div className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 -my-1 text-sm font-black text-white rounded-lg shadow-sm relative overflow-hidden border gradient-wave"
              style={{ backgroundImage: 'linear-gradient(90deg, #7a12fa, #b614ef, #7a12fa)', borderColor: '#9513f4' }}
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Tablet Layout */}
        <div className="hidden sm:flex lg:hidden items-center justify-between gap-2">
          {/* Logo Section */}
          <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <Link href="/" className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
              <div className="w-5 h-5">
                <img src="/logo.svg" alt="Logo" className="w-full h-full" />
              </div>
              <span className="text-gray-900">
                Logo
              </span>
            </Link>
          </div>

          {/* Navigation Menu - Compact */}
          <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <Link
              href="/topic"
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              Topic
            </Link>
            <Link
              href="/pathways"
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              Pathways
            </Link>
            <Link
              href="/resources"
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              Resources
            </Link>
            <Link
              href="/pricing"
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              Pricing
            </Link>
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2.5 -my-1 text-xs font-black text-white rounded-lg shadow-sm relative overflow-hidden border gradient-wave"
              style={{ backgroundImage: 'linear-gradient(90deg, #7a12fa, #b614ef, #7a12fa)', borderColor: '#9513f4' }}
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Hamburger Menu Pill */}
            <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <button
                onClick={toggleMobileMenu}
                className="px-2 py-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <HamburgerIcon />
              </button>
            </div>

            {/* Logo Pill */}
            <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <Link href="/" className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
                <img src="/logo.svg" alt="Logo" className="w-5 h-5" />
                <span className="text-gray-900">Logo</span>
              </Link>
            </div>
          </div>

          {/* Login/Signup Pill */}
          <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(140, 140, 170, 0.4)', boxShadow: '0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <Link
              href="/login"
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-3.5 py-2.5 -my-1 text-xs font-black text-white rounded-lg shadow-sm relative overflow-hidden border gradient-wave"
              style={{ backgroundImage: 'linear-gradient(90deg, #7a12fa, #b614ef, #7a12fa)', borderColor: '#9513f4' }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>
    </header>
    </>
  );
}
