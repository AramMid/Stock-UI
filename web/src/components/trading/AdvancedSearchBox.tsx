"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, TrendingUp, TrendingDown } from "lucide-react";
import { useDebounce } from "@/lib/hooks";

interface StockSuggestion {
  symbol: string;
  name: string;
  exchange?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  category?: "STOCKS" | "FOREX" | "CRYPTO" | "INDICES";
  isVN?: boolean;
}

interface AdvancedSearchBoxProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  isDarkMode?: boolean;
  className?: string;
}

/**
 * Advanced Search Box with API Integration and Real-time Suggestions
 * Task #1: Ô tìm kiếm mã cổ phiếu (SearchBox)
 */
export default function AdvancedSearchBox({
  selectedSymbol,
  onSymbolChange,
  isDarkMode = true,
  className = "",
}: AdvancedSearchBoxProps) {
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce search input to avoid excessive API calls
  const debouncedSearchValue = useDebounce(searchValue, 300);

  // Mock data for Vietnamese and international stocks
  const mockStockData: StockSuggestion[] = [
    // Vietnamese Stocks
    {
      symbol: "VIC.VN",
      name: "Vingroup JSC",
      exchange: "HOSE",
      price: 45200,
      change: 800,
      changePercent: 1.8,
      category: "STOCKS",
      isVN: true,
    },
    {
      symbol: "VHM.VN",
      name: "Vinhomes JSC",
      exchange: "HOSE",
      price: 55500,
      change: -500,
      changePercent: -0.89,
      category: "STOCKS",
      isVN: true,
    },
    {
      symbol: "VCB.VN",
      name: "Vietcombank",
      exchange: "HOSE",
      price: 82700,
      change: 1200,
      changePercent: 1.47,
      category: "STOCKS",
      isVN: true,
    },
    {
      symbol: "TCB.VN",
      name: "Techcombank",
      exchange: "HOSE",
      price: 22950,
      change: 350,
      changePercent: 1.55,
      category: "STOCKS",
      isVN: true,
    },
    {
      symbol: "FPT.VN",
      name: "FPT Corporation",
      exchange: "HOSE",
      price: 123500,
      change: -1500,
      changePercent: -1.2,
      category: "STOCKS",
      isVN: true,
    },
    {
      symbol: "VNM.VN",
      name: "Vietnam Dairy Products",
      exchange: "HOSE",
      price: 48200,
      change: 600,
      changePercent: 1.26,
      category: "STOCKS",
      isVN: true,
    },
    {
      symbol: "HPG.VN",
      name: "Hoa Phat Group",
      exchange: "HOSE",
      price: 18850,
      change: -250,
      changePercent: -1.31,
      category: "STOCKS",
      isVN: true,
    },
    {
      symbol: "MSN.VN",
      name: "Masan Group",
      exchange: "HOSE",
      price: 67800,
      change: 2100,
      changePercent: 3.2,
      category: "STOCKS",
      isVN: true,
    },

    // International Stocks
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ",
      price: 245.5,
      change: 7.62,
      changePercent: 3.2,
      category: "STOCKS",
      isVN: false,
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      exchange: "NASDAQ",
      price: 2850.2,
      change: 45.3,
      changePercent: 1.6,
      category: "STOCKS",
      isVN: false,
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      exchange: "NASDAQ",
      price: 415.8,
      change: -2.4,
      changePercent: -0.57,
      category: "STOCKS",
      isVN: false,
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      exchange: "NASDAQ",
      price: 248.7,
      change: 15.2,
      changePercent: 6.5,
      category: "STOCKS",
      isVN: false,
    },

    // Forex
    {
      symbol: "EURUSD",
      name: "Euro / US Dollar",
      price: 1.1744,
      change: -0.0041,
      changePercent: -0.35,
      category: "FOREX",
    },
    {
      symbol: "GBPUSD",
      name: "British Pound / US Dollar",
      price: 1.3461,
      change: 0.0023,
      changePercent: 0.17,
      category: "FOREX",
    },
    {
      symbol: "USDVND",
      name: "US Dollar / Vietnamese Dong",
      price: 24150,
      change: 25,
      changePercent: 0.1,
      category: "FOREX",
    },

    // Crypto
    {
      symbol: "BTCUSD",
      name: "Bitcoin",
      price: 42850,
      change: 1250,
      changePercent: 3.0,
      category: "CRYPTO",
    },
    {
      symbol: "ETHUSD",
      name: "Ethereum",
      price: 2650,
      change: -85,
      changePercent: -3.1,
      category: "CRYPTO",
    },
  ];

  // Search function that filters mock data
  const searchStocks = useCallback(
    async (query: string): Promise<StockSuggestion[]> => {
      if (!query.trim()) return [];

      const normalizedQuery = query.toLowerCase().trim();

      // Filter suggestions based on symbol or name
      const filtered = mockStockData.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(normalizedQuery) ||
          stock.name.toLowerCase().includes(normalizedQuery)
      );

      // Sort results: exact matches first, then partial matches
      return filtered
        .sort((a, b) => {
          const aSymbolExact = a.symbol.toLowerCase() === normalizedQuery;
          const bSymbolExact = b.symbol.toLowerCase() === normalizedQuery;

          if (aSymbolExact && !bSymbolExact) return -1;
          if (bSymbolExact && !aSymbolExact) return 1;

          const aSymbolStarts = a.symbol
            .toLowerCase()
            .startsWith(normalizedQuery);
          const bSymbolStarts = b.symbol
            .toLowerCase()
            .startsWith(normalizedQuery);

          if (aSymbolStarts && !bSymbolStarts) return -1;
          if (bSymbolStarts && !aSymbolStarts) return 1;

          return a.symbol.localeCompare(b.symbol);
        })
        .slice(0, 10); // Limit to 10 results
    },
    []
  );

  // Effect to handle debounced search
  useEffect(() => {
    if (debouncedSearchValue) {
      setIsLoading(true);
      searchStocks(debouncedSearchValue)
        .then((results) => {
          setSuggestions(results);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        })
        .catch((error) => {
          console.error("Search error:", error);
          setSuggestions([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [debouncedSearchValue, searchStocks]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: StockSuggestion) => {
    onSymbolChange(suggestion.symbol);
    setSearchValue("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          handleSuggestionSelect(suggestions[0]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  // Clear search
  const handleClear = () => {
    setSearchValue("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    searchInputRef.current?.focus();
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format price based on region
  const formatPrice = (price: number, isVN?: boolean) => {
    if (isVN) {
      return new Intl.NumberFormat("vi-VN").format(price);
    }
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Get category badge color
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "STOCKS":
        return isDarkMode ? "bg-blue-600" : "bg-blue-500";
      case "FOREX":
        return isDarkMode ? "bg-green-600" : "bg-green-500";
      case "CRYPTO":
        return isDarkMode ? "bg-orange-600" : "bg-orange-500";
      case "INDICES":
        return isDarkMode ? "bg-purple-600" : "bg-purple-500";
      default:
        return isDarkMode ? "bg-gray-600" : "bg-gray-500";
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search
          className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search symbols... (VIC, AAPL, EURUSD)"
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (debouncedSearchValue && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className={`w-full pl-10 pr-10 py-1.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
            isDarkMode
              ? "bg-[#1e222d] border-[#2a2e39] text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
              : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
          }`}
        />

        {/* Clear button */}
        {searchValue && (
          <button
            onClick={handleClear}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
              isDarkMode
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div
              className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                isDarkMode ? "border-gray-400" : "border-gray-500"
              }`}
            />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className={`absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto border rounded-lg shadow-xl z-50 ${
            isDarkMode
              ? "bg-[#1e222d] border-[#2a2e39]"
              : "bg-white border-gray-200"
          }`}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.symbol}-${index}`}
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`px-4 py-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                selectedIndex === index
                  ? isDarkMode
                    ? "bg-blue-600/20"
                    : "bg-blue-50"
                  : isDarkMode
                  ? "hover:bg-gray-700/50 border-[#2a2e39]"
                  : "hover:bg-gray-50 border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-semibold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {suggestion.symbol}
                    </span>
                    {suggestion.exchange && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          isDarkMode
                            ? "bg-gray-700 text-gray-300"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {suggestion.exchange}
                      </span>
                    )}
                    {suggestion.category && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded text-white ${getCategoryColor(
                          suggestion.category
                        )}`}
                      >
                        {suggestion.category}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-sm mt-1 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {suggestion.name}
                  </div>
                </div>

                {/* Price and Change Info */}
                {suggestion.price !== undefined && (
                  <div className="text-right ml-4">
                    <div
                      className={`text-sm font-medium ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {formatPrice(suggestion.price, suggestion.isVN)}
                    </div>
                    {suggestion.change !== undefined && (
                      <div className="flex items-center justify-end space-x-1 text-xs">
                        {suggestion.change >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        )}
                        <span
                          className={
                            suggestion.change >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {suggestion.change >= 0 ? "+" : ""}
                          {formatPrice(
                            Math.abs(suggestion.change),
                            suggestion.isVN
                          )}
                          ({suggestion.changePercent?.toFixed(2)}%)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions &&
        !isLoading &&
        searchValue &&
        suggestions.length === 0 && (
          <div
            className={`absolute top-full left-0 right-0 mt-1 px-4 py-8 text-center border rounded-lg shadow-xl z-50 ${
              isDarkMode
                ? "bg-[#1e222d] border-[#2a2e39] text-gray-400"
                : "bg-white border-gray-200 text-gray-500"
            }`}
          >
            <Search className="w-8 h-8 mx-auto mb-2" />
            <p>No symbols found for "{searchValue}"</p>
            <p className="text-xs mt-1">
              Try searching for VIC, AAPL, EURUSD, or BTC
            </p>
          </div>
        )}
    </div>
  );
}
