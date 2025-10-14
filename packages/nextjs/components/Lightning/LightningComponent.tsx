"use client";

import { useState } from "react";

const LightningComponent = () => {
  const [amount, setAmount] = useState("");
  const [invoice, setInvoice] = useState("");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Send Payment */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Send Lightning Payment</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Lightning Invoice
            </label>
            <textarea
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              placeholder="Paste lightning invoice here..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            disabled={!amount || !invoice}
          >
            Send Payment
          </button>
        </div>
      </div>

      {/* Receive Payment */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          Receive Lightning Payment
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="What's this payment for?"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
            Generate Invoice
          </button>
        </div>
      </div>

      {/* Lightning Network Status */}
      <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Lightning Network Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">Online</div>
            <div className="text-sm text-gray-400">Node Status</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">₿0.00</div>
            <div className="text-sm text-gray-400">Channel Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">5</div>
            <div className="text-sm text-gray-400">Active Channels</div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center">
            <div className="text-yellow-400 mr-2">⚠️</div>
            <div className="text-sm">
              <strong>Development Mode:</strong> Lightning features are
              currently in development. Real Lightning Network integration
              coming soon.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LightningComponent;
