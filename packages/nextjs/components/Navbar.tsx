"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectWallet from "~~/components/ConnectWallet";

const Navbar = () => {
  const pathname = usePathname();

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
        <div className="md:hidden flex items-center justify-between bg-slate-900/95 backdrop-blur-md border border-slate-800/50 rounded-2xl px-6 py-3 shadow-lg mx-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-15">
            <div className="w-15 h-8 flex items-center justify-center">
              <Image src="/volta.png" alt="VOLTA Logo" width={60} height={32} />
            </div>
          </Link>

          {/* Mobile Navigation */}
          <div className="flex items-center space-x-4">
            <ConnectWallet />
            <button className="p-2 text-gray-300 hover:text-white transition-colors">
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
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
