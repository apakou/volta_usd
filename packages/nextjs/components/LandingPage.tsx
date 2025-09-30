"use client";

import Image from "next/image";
import Link from "next/link";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-volta-dark text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center space-x-2">
          <Image
            src="/volta-logo.png"
            alt="VOLTA Logo"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-xl font-semibold">VOLTA</span>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <a
            href="#how-it-works"
            className="text-gray-300 hover:text-white transition-colors"
          >
            How it Works
          </a>
          <a
            href="#features"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Features
          </a>
          <a
            href="#about"
            className="text-gray-300 hover:text-white transition-colors"
          >
            About
          </a>
          <Link
            href="/exchange"
            className="bg-volta-primary hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-8 py-20 text-center max-w-6xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Seamless Bitcoin to <br />
          <span className="text-volta-primary">Lightning Payments</span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Convert your Bitcoin to VUSD tokens and unlock instant, low-cost
          Lightning Network payments. Bridge the gap between Bitcoin holding and
          everyday digital transactions.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/exchange"
            className="bg-volta-primary hover:bg-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
          >
            Start Trading
          </Link>
          <button className="border border-gray-600 hover:border-gray-400 px-8 py-4 rounded-lg text-lg font-semibold transition-colors">
            Learn More
          </button>
        </div>

        {/* Hero Cards Preview */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="bg-volta-card rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Exchange</h3>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-400 mb-1">BTC → VUSD</div>
              <div className="text-2xl font-bold text-green-400">
                0.00234 BTC
              </div>
              <div className="text-sm text-gray-400">≈ $100.45 VUSD</div>
            </div>
          </div>

          <div className="bg-volta-card rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Lightning</h3>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-400 mb-1">
                Lightning Payment
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                ⚡ Instant
              </div>
              <div className="text-sm text-gray-400">Network Fee: 0.001%</div>
            </div>
          </div>

          <div className="bg-volta-card rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Balance</h3>
              <div className="w-3 h-3 bg-volta-primary rounded-full"></div>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-400 mb-1">VUSD Balance</div>
              <div className="text-2xl font-bold text-volta-primary">
                $1,234.56
              </div>
              <div className="text-sm text-gray-400">
                Available for payments
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-8 py-20 bg-volta-darker">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-300">
              Simple steps to convert your Bitcoin to Lightning-compatible VUSD
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-volta-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect Wallet</h3>
              <p className="text-gray-400">
                Connect your Bitcoin wallet to the VOLTA protocol
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Deposit BTC</h3>
              <p className="text-gray-400">
                Securely deposit your Bitcoin into the protocol vault
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Mint VUSD</h3>
              <p className="text-gray-400">
                Receive VUSD tokens backed by your Bitcoin collateral
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Pay</h3>
              <p className="text-gray-400">
                Use VUSD for instant Lightning Network payments
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">VOLTA Features</h2>
            <p className="text-xl text-gray-300">
              Discover all the features that make Lightning payments accessible
              and efficient
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-volta-card rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-volta-primary rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Conversion</h3>
              <p className="text-gray-400">
                Convert BTC to VUSD instantly with real-time exchange rates and
                minimal slippage
              </p>
            </div>

            <div className="bg-volta-card rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Audited</h3>
              <p className="text-gray-400">
                Built on battle-tested smart contracts with comprehensive
                security audits
              </p>
            </div>

            <div className="bg-volta-card rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-400">
                Leverage Lightning Network for near-instant, low-cost
                transactions worldwide
              </p>
            </div>

            <div className="bg-volta-card rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">No KYC Required</h3>
              <p className="text-gray-400">
                Maintain your privacy with decentralized, permissionless access
              </p>
            </div>

            <div className="bg-volta-card rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Auto-Rebalancing</h3>
              <p className="text-gray-400">
                Automatic liquidity management ensures optimal trading
                conditions
              </p>
            </div>

            <div className="bg-volta-card rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Cross-Platform</h3>
              <p className="text-gray-400">
                Compatible with all major Lightning wallets and Bitcoin
                applications
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-8 py-20 bg-volta-darker">
        <div className="max-w-4xl mx-auto text-center">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold text-volta-primary mb-2">
                $2.5M+
              </div>
              <div className="text-gray-400">Total Volume Locked</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">10K+</div>
              <div className="text-gray-400">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-400 mb-2">
                50K+
              </div>
              <div className="text-gray-400">Transactions</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">
                99.9%
              </div>
              <div className="text-gray-400">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-volta-gradient rounded-3xl p-12">
            <h2 className="text-4xl font-bold mb-4 text-white">
              Ready to Start Using Lightning?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join the VOLTA movement and unlock the full potential of your
              Bitcoin with instant Lightning Network payments.
            </p>
            <Link
              href="/exchange"
              className="bg-white text-volta-primary hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-block"
            >
              Launch App Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-12 bg-volta-darker border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Image
                  src="/volta-logo.png"
                  alt="VOLTA Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <span className="text-xl font-semibold">VOLTA</span>
              </div>
              <p className="text-gray-400">
                Bridging Bitcoin and Lightning Network for seamless digital
                payments.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="/exchange"
                    className="hover:text-white transition-colors"
                  >
                    Exchange
                  </a>
                </li>
                <li>
                  <a
                    href="/lightning"
                    className="hover:text-white transition-colors"
                  >
                    Lightning
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Whitepaper
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Security Audit
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Telegram
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 VOLTA Protocol. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
