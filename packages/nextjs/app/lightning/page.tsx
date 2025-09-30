import { ConnectedAddress } from "../../components/ConnectedAddress";
import LightningComponent from "../../components/Lightning/LightningComponent";

const LightningPage = () => {
  return (
    <div className="min-h-screen bg-volta-dark text-white">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-volta-primary">VOLTA Lightning</h1>
          <ConnectedAddress />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-8">
        <LightningComponent />
      </div>
    </div>
  );
};

export default LightningPage;