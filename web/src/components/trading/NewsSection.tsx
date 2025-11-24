"use client";

interface NewsSectionProps {
  isDarkMode: boolean;
}

export default function NewsSection({ isDarkMode }: NewsSectionProps) {
  const newsItems = [
    {
      time: "08:40 • Sep 20",
      source: "TradingView",
      title: "Nikkei Futures Gain in Holiday-Thinned Session vs Polls, Stocks",
      isBreaking: false,
    },
    {
      time: "07:30 • Sep 20",
      source: "Reuters",
      title: "Technology Stocks Rally as Federal Reserve Signals Rate Cuts",
      isBreaking: true,
    },
    {
      time: "06:15 • Sep 20",
      source: "MarketWatch",
      title: "Analysts Upgrade Apple Stock Following Strong Quarterly Results",
      isBreaking: false,
    },
    {
      time: "05:45 • Sep 20",
      source: "CNBC",
      title: "Market Opens Higher as Investors Digest Economic Data",
      isBreaking: false,
    },
    {
      time: "04:30 • Sep 20",
      source: "Bloomberg",
      title: "Fed Officials Signal Potential Policy Shift in Coming Months",
      isBreaking: false,
    },
  ];

  return (
    <div
      className={`border rounded overflow-hidden h-full transition-colors duration-200 ${
        isDarkMode
          ? "bg-[#131722] border-[#2a2e39]"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div
          className={`px-4 py-3 border-b transition-colors duration-200 ${
            isDarkMode ? "border-[#2a2e39]" : "border-gray-200"
          }`}
        >
          <h4
            className={`font-semibold text-sm transition-colors duration-200 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Top News Stories
          </h4>
        </div>

        {/* News List */}
        <div className="flex-1 overflow-y-auto right-section-scrollbar">
          {newsItems.map((item, index) => (
            <div
              key={index}
              className={`px-4 py-3 border-b cursor-pointer transition-colors duration-200 ${
                isDarkMode
                  ? "border-[#2a2e39] hover:bg-[#1e222d]"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              {/* Time and Source */}
              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`text-xs transition-colors duration-200 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {item.time}
                </span>
                <span
                  className={`text-xs transition-colors duration-200 ${
                    isDarkMode ? "text-gray-500" : "text-gray-500"
                  }`}
                >
                  •
                </span>
                <span
                  className={`text-xs transition-colors duration-200 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {item.source}
                </span>
                {item.isBreaking && (
                  <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                    BREAKING
                  </span>
                )}
              </div>

              {/* Title */}
              <p
                className={`text-sm leading-relaxed transition-colors duration-200 ${
                  isDarkMode
                    ? "text-white hover:text-blue-400"
                    : "text-gray-900 hover:text-blue-600"
                }`}
              >
                {item.title}
              </p>
            </div>
          ))}

          {/* Load more indicator */}
          <div className="px-4 py-3 text-center">
            <button
              className={`text-xs transition-colors ${
                isDarkMode
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Load more stories...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
