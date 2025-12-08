  "use client";
  import { useState, useEffect } from "react";
  import { ChevronDown, X, Grid, MoreHorizontal, Plus } from "lucide-react";
  import { formatVND } from "@/lib/order-management";
  import { calculateMaxPositionSize, roundDownToLotSize, sharesToLots, getExchangeBySymbol, calculatePriceBands } from "@/lib/position-sizing";

  interface OrderPanelProps {
    symbol: string;
    currentPrice: number;
    onBuy: (quantity: number, price: number) => void;
    onSell: (quantity: number, price: number) => void;
    onClose?: () => void;
    isDarkMode?: boolean;
    side: "buy" | "sell"; // Required prop instead of defaultSide
    onSideChange: (side: "buy" | "sell") => void; // Callback to notify parent of side changes
  }

  type OrderType = "Market" | "Limit" | "Stop";

  export default function OrderPanel({
    symbol,
    currentPrice,
    onBuy,
    onSell,
    onClose,
    isDarkMode = true,
    side,
    onSideChange,
  }: OrderPanelProps) {
    const [activeTab, setActiveTab] = useState<"order" | "dom">("order");
    const [orderType, setOrderType] = useState<OrderType>("Market");
    const [quantity, setQuantity] = useState(100); // Default to 1 lot (100 shares)
    const [price, setPrice] = useState(currentPrice);
    
    // Exit states
    const [takeProfitEnabled, setTakeProfitEnabled] = useState(true);
    const [stopLossEnabled, setStopLossEnabled] = useState(false);
    const [exitsExpanded, setExitsExpanded] = useState(true);

    // Mock calculations for VND
    const priceStep = 100;
    const bidPrice = Math.floor((currentPrice - priceStep) / priceStep) * priceStep;
    const askPrice = Math.ceil((currentPrice + priceStep) / priceStep) * priceStep;
    
    // Calculate price bands
    const exchange = getExchangeBySymbol(symbol);
    const priceBands = calculatePriceBands(currentPrice, exchange);

    // Defaults for VND
    const defaultTP = 65100; 
    const defaultSL = 55700;

    const [takeProfitPrice, setTakeProfitPrice] = useState(defaultTP);
    const [takeProfitTicks, setTakeProfitTicks] = useState(76);
    const [stopLossPrice, setStopLossPrice] = useState(defaultSL);
    const [stopLossTicks, setStopLossTicks] = useState(17);

    // Ensure quantity is always a multiple of lot size (100 shares)
    const validQuantity = roundDownToLotSize(quantity);
    const tradeValue = validQuantity * currentPrice;

    const handleAction = () => {
      // Ensure quantity is always a multiple of lot size (100 shares)
      const validQuantity = roundDownToLotSize(quantity);
      const orderPrice = orderType === "Market" ? currentPrice : price;
      if (side === "buy") {
        onBuy(validQuantity, orderPrice);
      } else {
        onSell(validQuantity, orderPrice);
      }
    };

    const handleBuyClick = () => {
      onSideChange("buy");
    };

    const handleSellClick = () => {
      onSideChange("sell");
    };



    // Dynamic Theme Classes
    const bgClass = isDarkMode ? "bg-gray-900" : "bg-white";
    const textClass = isDarkMode ? "text-white" : "text-gray-900";
    const subTextClass = isDarkMode ? "text-gray-400" : "text-gray-500";
    const borderClass = isDarkMode ? "border-gray-700" : "border-gray-200";
    const inputBgClass = isDarkMode ? "bg-gray-800" : "bg-white";
    const inputBorderClass = isDarkMode ? "border-gray-600" : "border-gray-300";
    
    // Color Classes for Buy/Sell
    const buyColor = "bg-green-500";
    const buyHoverColor = "hover:bg-green-600";
    const sellColor = "bg-red-500";
    const sellHoverColor = "hover:bg-red-600";
    
    // Text colors for focused state
    const buyTextColor = "text-green-400";
    const sellTextColor = "text-red-400";
    
    // Input base styles
    const inputBaseClasses = `w-full ${inputBgClass} border ${inputBorderClass} ${textClass} text-sm rounded px-3 py-2 focus:outline-none transition-colors h-[38px]`;
    const labelClasses = `${subTextClass} text-[11px] mb-1 block font-medium`;

return (
    <div
      className={`w-full h-full flex flex-col font-sans ${bgClass} ${textClass} transition-colors duration-200`}
    >
      {/* --- HEADER --- */}
      <div className={`flex items-center justify-between px-5 py-3 border-b ${borderClass}`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-base">{symbol.split('.')[0]}</span>
          <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">D</span>
          </div>
        </div>

        <div className={`flex items-center gap-3 ${subTextClass}`}>
          <Grid size={18} className={`cursor-pointer hover:${textClass}`} />
          <MoreHorizontal size={18} className={`cursor-pointer hover:${textClass}`} />
          {onClose && <X size={18} className={`cursor-pointer hover:${textClass}`} onClick={onClose} />}
        </div>
      </div>

      {/* --- TOP TABS (Order / DOM) --- */}
      <div className="px-5 pt-3">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("order")}
            className={`pb-2 text-sm font-bold relative transition-colors ${
              activeTab === "order" ? textClass : `${subTextClass} hover:${textClass}`
            }`}
          >
            Order
            {activeTab === "order" && (
              <div className={`absolute bottom-0 left-0 w-full h-[3px] ${side === "buy" ? "bg-green-500" : "bg-red-500"} rounded-t-sm`} />
            )}
          </button>
        </div>
      </div>

      {/* Content Area - Đã tăng padding lên px-5 và py-4 để thoáng hơn */}
      <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
        {activeTab === "order" ? (
          <div className="space-y-5"> {/* Tăng khoảng cách giữa các khối lên 5 */}
            
            {/* --- BUY / SELL SWITCHER (STYLE: OUTLINE / TRANSPARENT) --- */}
            <div className="flex gap-3 h-[60px]">
              {/* NÚT SELL */}
              <button
                onClick={handleSellClick}
                className={`flex-1 flex flex-col items-center justify-center transition-all duration-200 border-2 rounded-lg ${
                  side === "sell" 
                    ? `bg-red-500/15 border-red-500` 
                    : `border-transparent ${isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"}`
                }`}
              >
                <span className={`text-sm font-bold transition-colors ${
                  side === "sell" ? sellTextColor : (side === "buy" ? subTextClass : sellTextColor)
                }`}>Sell</span>
                <span className={`text-lg font-bold transition-colors ${
                  side === "sell" ? sellTextColor : (side === "buy" ? subTextClass : sellTextColor)
                }`}>
                  {formatVND(bidPrice)}
                </span>
              </button>

              {/* NÚT BUY */}
              <button
                onClick={handleBuyClick}
                className={`flex-1 flex flex-col items-center justify-center transition-all duration-200 border-2 rounded-lg ${
                  side === "buy" 
                    ? `bg-green-500/15 border-green-500` 
                    : `border-transparent ${isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"}`
                }`}
              >
                <span className={`text-sm font-bold transition-colors ${
                  side === "buy" ? buyTextColor : (side === "sell" ? subTextClass : buyTextColor)
                }`}>Buy</span>
                <span className={`text-lg font-bold transition-colors ${
                  side === "buy" ? buyTextColor : (side === "sell" ? subTextClass : buyTextColor)
                }`}>
                  {formatVND(askPrice)}
                </span>
              </button>
            </div>

            {/* --- PRICE BANDS --- */}
            <div className={`flex justify-between text-xs px-2 py-1 rounded ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <div className="flex items-center">
                <span className={`mr-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>REF:</span>
                <span className="font-medium text-yellow-500">{formatVND(priceBands.reference)}</span>
              </div>
              <div className="flex items-center">
                <span className={`mr-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>CEIL:</span>
                <span className="font-medium text-purple-500">{formatVND(priceBands.ceiling)}</span>
              </div>
              <div className="flex items-center">
                <span className={`mr-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>FLOOR:</span>
                <span className="font-medium text-cyan-500">{formatVND(priceBands.floor)}</span>
              </div>
            </div>

            {/* --- ORDER TYPE TABS --- */}
            <div className={`flex gap-1 p-1 rounded-lg ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              {(["Market", "Limit", "Stop"] as OrderType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-[4px] transition-colors ${
                    orderType === type 
                      ? `${side === "buy" ? "bg-green-600 text-white shadow-sm" : "bg-red-600 text-white shadow-sm"}` 
                      : `${subTextClass} hover:${textClass}`
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* --- QUANTITY & AMOUNT INPUTS --- */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Shares</label>
                <div className="relative">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value))}
                    className={inputBaseClasses}
                    step="100"
                    min="100"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className={labelClasses}>VND</label>
                  <ChevronDown size={12} className={`${subTextClass} mb-0.5`} />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    readOnly
                    value={tradeValue.toFixed(0)}
                    className={`${inputBaseClasses} ${isDarkMode ? "bg-gray-700" : "bg-gray-200"} opacity-70 cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>
            
            {/* --- PRICE INPUT (for Limit/Stop orders) --- */}
            {orderType !== "Market" && (
              <div>
                <label className={labelClasses}>Price</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  className={inputBaseClasses}
                />
              </div>
            )}

            {/* --- EXITS SECTION --- */}
            <div className={`rounded-lg border ${borderClass} p-3 ${isDarkMode ? "bg-gray-800/30" : "bg-gray-50"}`}>
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExitsExpanded(!exitsExpanded)}
              >
                <span className="font-bold text-sm">Exits</span>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform duration-200 ${exitsExpanded ? 'rotate-180' : ''} ${subTextClass}`} 
                />
              </div>

              {exitsExpanded && (
                <div className="space-y-4 mt-3">
                  {/* Take Profit */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="checkbox" 
                        checked={takeProfitEnabled}
                        onChange={(e) => setTakeProfitEnabled(e.target.checked)}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                      <span className={`text-sm ${textClass}`}>Take profit</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <div>
                        <label className={labelClasses}>Price</label>
                        <input 
                          type="number"
                          disabled={!takeProfitEnabled}
                          value={takeProfitPrice}
                          onChange={(e) => setTakeProfitPrice(Number(e.target.value))}
                          className={`${inputBaseClasses} h-[34px] ${!takeProfitEnabled && 'opacity-40'}`} 
                        />
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <label className={labelClasses}>Ticks</label>
                        </div>
                        <input 
                          type="number"
                          disabled={!takeProfitEnabled}
                          value={takeProfitTicks}
                          onChange={(e) => setTakeProfitTicks(Number(e.target.value))}
                          className={`${inputBaseClasses} h-[34px] ${!takeProfitEnabled && 'opacity-40'}`} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stop Loss */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="checkbox" 
                        checked={stopLossEnabled}
                        onChange={(e) => setStopLossEnabled(e.target.checked)}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                      <span className={`text-sm ${textClass}`}>Stop loss</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <div>
                        <label className={labelClasses}>Price</label>
                        <input 
                          type="number"
                          disabled={!stopLossEnabled}
                          value={stopLossPrice}
                          onChange={(e) => setStopLossPrice(Number(e.target.value))}
                          className={`${inputBaseClasses} h-[34px] ${!stopLossEnabled && 'opacity-40'}`} 
                        />
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <label className={labelClasses}>Ticks</label>
                        </div>
                        <input 
                          type="number"
                          disabled={!stopLossEnabled}
                          value={stopLossTicks}
                          onChange={(e) => setStopLossTicks(Number(e.target.value))}
                          className={`${inputBaseClasses} h-[34px] ${!stopLossEnabled && 'opacity-40'}`} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- ORDER INFO --- */}
            <div className="space-y-1.5 pt-2 pb-2">
              <div className="flex justify-between text-[13px]">
                <span className={subTextClass}>Trade value</span>
                <span className={`${textClass} font-mono`}>{formatVND(tradeValue)} <span className="text-[10px] text-gray-500">VND</span></span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className={subTextClass}>Leverage</span>
                <span className={`${textClass} font-bold`}>1:1</span>
              </div>
            </div>

            {/* --- MAIN ACTION BUTTON (FIXED) --- */}
            {/* Sử dụng class trực tiếp thay vì biến để đảm bảo hiển thị đúng */}
            <button
              onClick={handleAction}
              className={`w-full py-3.5 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-[0.98] border-2 ${
                side === "buy"
                  ? "bg-green-600 hover:bg-green-500 border-green-500 shadow-green-900/20"
                  : "bg-red-600 hover:bg-red-500 border-red-500 shadow-red-900/20"
              }`}
            >
              <div className="text-[16px] uppercase tracking-wide">
                {side === "buy" ? "Buy" : "Sell"} {symbol.split('.')[0]}
              </div>
              <div className="text-[11px] font-normal opacity-90 mt-0.5">
                {validQuantity} @ {orderType === 'Market' ? 'MKT' : price}
              </div>
            </button>
            
          </div>
        ) : (
          <div className={`flex items-center justify-center h-40 ${subTextClass} text-sm`}>
            DOM View Not Available
          </div>
        )}
      </div>
    </div>
  );
  } 