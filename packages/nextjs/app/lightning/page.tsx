import LightningComponent from "~~/components/Lightning/LightningComponent";

const LightningPage = () => {
  return (
    <div className="min-h-screen bg-volta-dark text-white">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Lightning Payments</h1>
          <p className="text-gray-400">Send and receive instant Lightning Network payments with VUSD</p>
        </div>
        <LightningComponent />
      </div>
    </div>
  );
};

export default LightningPage;
