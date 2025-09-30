"use client";

import { useState } from "react";

const LightningComponent = () => {
  const [activeTab, setActiveTab] = useState<"send" | "receive">("send");
  const [sendAmount, setSendAmount] = useState("");
  const [lightningInvoice, setLightningInvoice] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [generatedInvoice, setGeneratedInvoice] = useState("");

  const handleSendPayment = () => {
    // Placeholder for send payment functionality
    console.log("Sending payment:", {
      amount: sendAmount,
      invoice: lightningInvoice,
    });
  };

  const handleGenerateInvoice = () => {
    // Placeholder for generating invoice
    if (receiveAmount) {
      const mockInvoice = "lnbc" + Math.random().toString(36).substring(2, 15);
      setGeneratedInvoice(mockInvoice);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-volta-card rounded-2xl p-6 border border-gray-700">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Lightning Payments</h2>
          <p className="text-gray-400">
            Send and receive instant Lightning Network payments with VUSD
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-volta-darker rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab("send")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === "send"
                ? "bg-volta-primary text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Send Payment
          </button>
          <button
            onClick={() => setActiveTab("receive")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === "receive"
                ? "bg-volta-primary text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Receive Payment
          </button>
        </div>

        {/* Send Payment Tab */}
        {activeTab === "send" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Amount (VUSD)
              </label>
              <div className="bg-volta-darker rounded-xl p-4">
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-xl font-semibold w-full outline-none"
                />
                <div className="text-sm text-gray-400 mt-1">
                  Available: 1,234.56 VUSD
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Lightning Invoice
              </label>
              <textarea
                value={lightningInvoice}
                onChange={(e) => setLightningInvoice(e.target.value)}
                placeholder="lnbc1..."
                rows={3}
                className="w-full bg-volta-darker rounded-xl p-4 text-sm outline-none resize-none"
              />
            </div>

            <div className="bg-volta-darker rounded-xl p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Network Fee</span>
                <span>~0.001 VUSD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total</span>
                <span className="font-semibold">
                  {sendAmount
                    ? (Number(sendAmount) + 0.001).toFixed(3)
                    : "0.000"}{" "}
                  VUSD
                </span>
              </div>
            </div>

            <button
              onClick={handleSendPayment}
              disabled={!sendAmount || !lightningInvoice}
              className="w-full bg-volta-primary hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              ⚡ Send Lightning Payment
            </button>
          </div>
        )}

        {/* Receive Payment Tab */}
        {activeTab === "receive" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Amount (VUSD)
              </label>
              <div className="bg-volta-darker rounded-xl p-4">
                <input
                  type="number"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-xl font-semibold w-full outline-none"
                />
                <div className="text-sm text-gray-400 mt-1">
                  Enter amount to receive
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateInvoice}
              disabled={!receiveAmount}
              className="w-full bg-volta-primary hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              Generate Invoice
            </button>

            {generatedInvoice && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Generated Lightning Invoice
                </label>
                <div className="bg-volta-darker rounded-xl p-4">
                  <div className="text-sm font-mono break-all mb-3">
                    {generatedInvoice}
                  </div>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(generatedInvoice)
                    }
                    className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightning Network Info */}
      <div className="mt-8 bg-volta-card rounded-2xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          ⚡ Lightning Network Benefits
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">~1s</div>
            <div className="text-sm text-gray-400">Transaction Speed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              ~$0.001
            </div>
            <div className="text-sm text-gray-400">Network Fee</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">24/7</div>
            <div className="text-sm text-gray-400">Availability</div>
          </div>
        </div>
      </div>

      {/* Recent Lightning Transactions */}
      <div className="mt-8 bg-volta-card rounded-2xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">
          Recent Lightning Transactions
        </h3>
        <div className="space-y-3">
          <div className="text-center text-gray-400 py-8">
            No recent Lightning transactions
          </div>
        </div>
      </div>
    </div>
  );
};

export default LightningComponent;
