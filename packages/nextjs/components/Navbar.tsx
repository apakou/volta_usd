"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ConnectWallet from "~~/components/ConnectWallet";

const Navbar = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50">
      <div className="flex justify-center px-6 py-4">
        {/* Desktop Layout - Kreedia Style with contained background */}
        <div className="hidden md:flex items-center justify-between bg-slate-900/95 backdrop-blur-md border border-slate-800/50 rounded-full px-8 py-3 shadow-lg">
          {/* Left - Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-20 h-10 flex items-center justify-center">
                <Image
                  src="/volta.png"
                  alt="VOLTA Logo"
                  width={80}
                  height={60}
                />
              </div>
            </Link>
          </div>

          {/* Center - Navigation Items */}
          <div className="flex items-center space-x-8 px-8">
            <Link
              href="/#features"
              className="text-sm font-satoshi font-medium text-gray-300 hover:text-white transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              href="/exchange"
              className="text-sm font-satoshi font-medium text-gray-300 hover:text-white transition-colors duration-200"
            >
              Exchange
            </Link>
            <Link
              href="/lightning"
              className="text-sm font-satoshi font-medium text-gray-300 hover:text-white transition-colors duration-200"
            >
              Lightning 2025
            </Link>
          </div>

          {/* Right - App Button */}
          <div className="flex items-center">
            <ConnectWallet />
          </div>
        </div>

        {/* Mobile/Tablet Layout */}
        <div className="md:hidden">
          <div className="flex items-center justify-between bg-slate-900/95 backdrop-blur-md border border-slate-800/50 rounded-2xl px-6 py-3 shadow-lg mx-4">
            {/* Logo */}
            <Link href="/" onClick={closeMobileMenu} className="flex items-center">
              <div className="w-16 h-10 flex items-center justify-center">
                <Image src="/volta.png" alt="VOLTA Logo" width={64} height={40} />
              </div>
            </Link>

            {/* Mobile Navigation Toggle */}
            <div className="flex items-center space-x-4">
              <ConnectWallet />
              <button 
                onClick={toggleMobileMenu}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="mt-2 mx-4">
              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800/50 rounded-2xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 space-y-4">
                  <Link
                    href="/#features"
                    onClick={closeMobileMenu}
                    className={`block text-base font-satoshi font-medium transition-colors duration-200 ${
                      pathname === "/#features" ? "text-white" : "text-gray-300 hover:text-white"
                    }`}
                  >
                    Features
                  </Link>
                  <Link
                    href="/exchange"
                    onClick={closeMobileMenu}
                    className={`block text-base font-satoshi font-medium transition-colors duration-200 ${
                      pathname === "/exchange" ? "text-white" : "text-gray-300 hover:text-white"
                    }`}
                  >
                    Exchange
                  </Link>
                  <Link
                    href="/lightning"
                    onClick={closeMobileMenu}
                    className={`block text-base font-satoshi font-medium transition-colors duration-200 ${
                      pathname === "/lightning" ? "text-white" : "text-gray-300 hover:text-white"
                    }`}
                  >
                    Lightning 2025
                  </Link>
                  <div className="pt-4 border-t border-slate-700/50">
                    <Link
                      href="/"
                      onClick={closeMobileMenu}
                      className="block text-base font-satoshi font-medium text-gray-300 hover:text-white transition-colors duration-200"
                    >
                      Home
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
