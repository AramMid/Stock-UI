import { useState } from "react";
import { BlackSwanService } from "@/lib/services/blackSwanService";

export default function BlackSwanTest() {
  const [symbol, setSymbol] = useState("VIC.VN");
  const [status, setStatus] = useState("");

  const handleTriggerEvent = () => {
    const blackSwanService = BlackSwanService.getInstance();
    const event = blackSwanService.triggerTestEvent(symbol);
    setStatus(
      `Triggered ${event.type} event for ${symbol} with ${Math.round(
        (1 - event.severity) * 100
      )}% loss`
    );
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Black Swan Event Test</h3>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="px-3 py-2 bg-gray-700 text-white rounded"
          placeholder="Symbol (e.g., VIC.VN)"
        />
        <button
          onClick={handleTriggerEvent}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          Trigger Event
        </button>
      </div>
      {status && (
        <div className="mt-4 p-3 bg-red-900 text-red-100 rounded">{status}</div>
      )}
    </div>
  );
}
