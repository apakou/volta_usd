"use client";

import Image from "next/image";
import Link from "next/link";

const LandingPage = () => {
  return (
    <div className="bg-volta-dark text-white">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center px-8 text-center">
        <div className="max-w-6xl mx-auto w-full">
          <h1 className="text-5xl md:text-7xl font-bold mb-8">
            Bitcoin-Collateralized <br />
            <span className="text-volta-primary">Stablecoin Protocol</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto">
            Mint VUSD, where{" "}
            <strong className="text-green-400">1 VUSD = 1 USD</strong> always. A
            Bitcoin-backed stablecoin that unlocks the purchasing power of your
            Bitcoin while maintaining exposure to its upside potential. Enhanced
            with Lightning Network integration for instant payments.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
          <Link
            href="/exchange"
            className="bg-volta-primary hover:bg-blue-600 px-10 py-5 rounded-lg text-xl font-semibold transition-colors shadow-lg"
          >
            Mint VUSD
          </Link>
          <button className="border-2 border-gray-600 hover:border-gray-400 px-10 py-5 rounded-lg text-xl font-semibold transition-colors">
            Learn Protocol
          </button>
        </div>

        {/* Hero Cards Preview */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-volta-card rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Collateral</h3>
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-400 mb-1">BTC Deposited</div>
              <div className="text-2xl font-bold text-orange-400">1.5 BTC</div>
              <div className="text-sm text-gray-400">≈ $150k Collateral</div>
            </div>
          </div>

          <div className="bg-volta-card rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">VUSD Minted</h3>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-400 mb-1">
                Stablecoin Balance
              </div>
              <div className="text-2xl font-bold text-green-400">
                50,000 VUSD
              </div>
              <div className="text-sm text-gray-400">= $50,000 USD (1:1)</div>
            </div>
          </div>

          <div className="bg-volta-card rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Lightning Ready</h3>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-400 mb-1">Payment Network</div>
              <div className="text-2xl font-bold text-yellow-400">
                ⚡ Active
              </div>
              <div className="text-sm text-gray-400">Instant Payments</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-8 py-20 bg-volta-darker">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How VUSD Works</h2>
            <p className="text-xl text-gray-300">
              Create a Bitcoin-backed stablecoin that maintains $1 parity while
              preserving your Bitcoin exposure
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Deposit Bitcoin</h3>
              <p className="text-gray-400">
                Lock your Bitcoin as collateral in VOLTA's secure smart contract
                vault
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Mint VUSD</h3>
              <p className="text-gray-400">
                Generate VUSD stablecoins where 1 VUSD = 1 USD, backed by
                Bitcoin at 150% collateral ratio
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-volta-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Spend & Save</h3>
              <p className="text-gray-400">
                Use VUSD (always 1:1 with USD) for stable payments, DeFi, or
                hold while Bitcoin appreciates
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Boost</h3>
              <p className="text-gray-400">
                Optional: Enable instant Lightning payments for near-zero fees
                worldwide
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose VUSD</h2>
            <p className="text-xl text-gray-300">
              The first Bitcoin-collateralized stablecoin with Lightning Network
              integration
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-volta-card rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
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
              <h3 className="text-xl font-semibold mb-2">
                Bitcoin-Backed Stability
              </h3>
              <p className="text-gray-400">
                VUSD maintains strict 1:1 USD parity through
                over-collateralization with Bitcoin, combining dollar stability
                with Bitcoin upside exposure
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
              <h3 className="text-xl font-semibold mb-2">
                Self-Sovereign Finance
              </h3>
              <p className="text-gray-400">
                Maintain full control of your assets with non-custodial smart
                contracts and transparent on-chain operations
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
              <h3 className="text-xl font-semibold mb-2">
                Lightning Integration
              </h3>
              <p className="text-gray-400">
                Optional Lightning Network integration enables instant global
                payments with near-zero fees
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

      {/* 1:1 Parity Section */}
      <section className="px-8 py-20 bg-volta-darker">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-green-500/10 to-volta-primary/10 rounded-3xl p-12 border border-green-500/20">
            <div className="text-6xl font-bold text-green-400 mb-4">
              1 VUSD = 1 USD
            </div>
            <h2 className="text-3xl font-bold mb-6">Always. Guaranteed.</h2>
            <p className="text-xl text-gray-300 mb-8">
              VUSD maintains perfect 1:1 parity with the US Dollar through
              algorithmic stabilization and Bitcoin over-collateralization. Your
              purchasing power remains constant while your Bitcoin collateral
              can appreciate.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-volta-card/50 rounded-xl p-6">
                <div className="text-2xl font-bold text-green-400 mb-2">
                  150%+
                </div>
                <div className="text-sm text-gray-400">Collateral Ratio</div>
              </div>
              <div className="bg-volta-card/50 rounded-xl p-6">
                <div className="text-2xl font-bold text-volta-primary mb-2">
                  100%
                </div>
                <div className="text-sm text-gray-400">
                  USD Parity Maintained
                </div>
              </div>
              <div className="bg-volta-card/50 rounded-xl p-6">
                <div className="text-2xl font-bold text-yellow-400 mb-2">
                  24/7
                </div>
                <div className="text-sm text-gray-400">Price Stability</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-8 py-20">
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
