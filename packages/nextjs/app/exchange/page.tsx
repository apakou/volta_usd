import ExchangeComponent from "~~/components/Exchange/ExchangeComponent";

const ExchangePage = () => {
  return (
    <div className="min-h-screen bg-volta-dark text-white">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Exchange</h1>
          <p className="text-gray-400">Convert your Bitcoin to VUSD and vice versa</p>
        </div>
        <ExchangeComponent />
      </div>
    </div>
  );
};

export default ExchangePage;
