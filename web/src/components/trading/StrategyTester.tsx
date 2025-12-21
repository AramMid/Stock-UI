"use client";

import { useState, useRef, ReactNode, useMemo, useEffect } from "react";
import { formatVND, formatVNDCurrency } from "@/lib/order-management";
import { MarketSimulationService } from "@/lib/services/marketSimulationService";
import { TradingPosition } from "@/lib/types";
import { BacktestTrade } from "@/lib/services/backtestService";
import { rsiStrategy } from "@/lib/strategies/rsiStrategy";
import { movingAverageCrossoverStrategy } from "@/lib/strategies/movingAverageCrossover";

// ICONS
import {
  FiCpu,
  FiBox,
  FiSliders,
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
  FiHash,
  FiArrowUpRight,
  FiArrowDownRight,
  FiArrowUp,
  FiArrowDown,
  FiZap,
  FiBarChart2,
  FiLayers,
  FiDollarSign,
  FiTrash2,
  FiRotateCw,
  FiPlay,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiArrowRightCircle,
  FiArrowLeft,
  FiDownload,
} from "react-icons/fi";

// Block types for the strategy builder
type BlockType =
  | "rsi"
  | "macd"
  | "ema"
  | "sma"
  | "bollinger"
  | "price_open"
  | "price_close"
  | "price_high"
  | "price_low"
  | "volume"
  | "cross_over"
  | "cross_under"
  | "greater_than"
  | "less_than"
  | "buy"
  | "sell"
  | "close_position"
  | "number";

interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  value?: number; // For number blocks
  period?: number; // For indicator blocks
}

interface Connection {
  from: string;
  to: string;
}

interface BacktestResult {
  netProfit: number;
  winRate: number;
  maxDrawdown: number;
  profitFactor: number;
  totalTrades: number;
  equityCurve: { time: number; value: number }[];
  underwater: { time: number; value: number }[];
  trades: BacktestTrade[];
}

interface BacktestParams {
  initialCapital: number;
  startDate: Date;
  endDate: Date;
  symbol: string;
  feeRate: number;
  taxRate: number;
  priceSource: "HISTORICAL" | "LIVE";
  stopLoss: number; // 0.05 -> 5%
  takeProfit: number; // 0.1  -> 10%
}

interface StrategyTesterProps {
  isDarkMode: boolean;
  tradingPosition: TradingPosition;
  selectedSymbol: string;
  marketSimulation: MarketSimulationService | null;
  isAuthenticated?: () => boolean;
  showAuthModal?: (message?: string) => void;
}

interface BacktestJobSummary {
  id: number;
  symbol: string;
  status: string;
  data_from: string;
  data_to: string;
  initial_capital: string;
  created_at: string;
}

// Kích thước block (khớp với Tailwind w-28 h-12)
const BLOCK_WIDTH = 112;
const BLOCK_HEIGHT = 48;

type SidebarTab = "toolbox" | "stats" | "params";

export default function StrategyTester({
  isDarkMode,
  tradingPosition,
  selectedSymbol,
  marketSimulation,
}: StrategyTesterProps) {
  const [activeView, setActiveView] = useState<"builder" | "results">(
    "builder"
  );
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("toolbox");

  const [blocks, setBlocks] = useState<Block[]>([
    { id: "block-1", type: "rsi", x: 80, y: 80, period: 14 },
    { id: "block-2", type: "number", x: 260, y: 80, value: 30 },
    { id: "block-3", type: "less_than", x: 440, y: 80 },
    { id: "block-4", type: "buy", x: 620, y: 80 },
  ]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [backtestParams, setBacktestParams] = useState<BacktestParams>({
    initialCapital: 200_000_000, // 200M VND
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
    endDate: new Date(),
    symbol: selectedSymbol,
    feeRate: 0.0015, // 0.15%
    taxRate: 0.001, // 0.1% (sell only)
    priceSource: "HISTORICAL",
    stopLoss: 0.05,
    takeProfit: 0.1,
  });
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(
    null
  );

  // isRunning: dành cho POST tạo job
  const [isRunning, setIsRunning] = useState(false);

  // ----- danh sách backtest & trạng thái load -----
  const [jobList, setJobList] = useState<BacktestJobSummary[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);

  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Toolbox items (memo hóa để tránh re-create nhiều lần)
  const toolboxItems: { type: BlockType; label: string; icon: ReactNode }[] =
    useMemo(
      () => [
        // Indicators
        { type: "rsi", label: "RSI", icon: <FiActivity /> },
        { type: "macd", label: "MACD", icon: <FiBarChart2 /> },
        { type: "ema", label: "EMA", icon: <FiTrendingUp /> },
        { type: "sma", label: "SMA", icon: <FiTrendingDown /> },
        { type: "bollinger", label: "Bollinger Bands", icon: <FiLayers /> },

        // Price
        { type: "price_open", label: "Open Price", icon: <FiArrowUpRight /> },
        {
          type: "price_close",
          label: "Close Price",
          icon: <FiArrowDownRight />,
        },
        { type: "price_high", label: "High Price", icon: <FiArrowUp /> },
        { type: "price_low", label: "Low Price", icon: <FiArrowDown /> },
        { type: "volume", label: "Volume", icon: <FiZap /> },

        // Logic
        { type: "cross_over", label: "Cross Over", icon: <FiArrowUpRight /> },
        {
          type: "cross_under",
          label: "Cross Under",
          icon: <FiArrowDownRight />,
        },
        { type: "greater_than", label: "Greater Than", icon: <FiArrowUp /> },
        { type: "less_than", label: "Less Than", icon: <FiArrowDown /> },

        // Actions
        { type: "buy", label: "Buy", icon: <FiArrowUpRight /> },
        { type: "sell", label: "Sell", icon: <FiArrowDownRight /> },
        {
          type: "close_position",
          label: "Close Position",
          icon: <FiXCircle />,
        },

        // Values
        { type: "number", label: "Number", icon: <FiHash /> },
      ],
      []
    );

  // ====== API LOAD DANH SÁCH BACKTEST ======
  const fetchBacktestJobs = async () => {
    try {
      setIsLoadingJobs(true);

      // 1️⃣ Lấy token từ localStorage
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Không tìm thấy access token. Vui lòng đăng nhập lại.");
      }

      // 2️⃣ Gọi BE kèm Authorization header
      const res = await fetch("http://localhost:3001/api/backtests", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 3️⃣ Handle 401 rõ ràng
      if (res.status === 401) {
        throw new Error(
          "401 Unauthorized – token không hợp lệ hoặc đã hết hạn"
        );
      }

      if (!res.ok) {
        throw new Error(
          `Failed to fetch backtests: ${res.status} ${res.statusText}`
        );
      }

      // 4️⃣ Parse response
      const json = await res.json();
      const list = (json.data ?? json) as BacktestJobSummary[];

      setJobList(list);
    } catch (error) {
      console.error("Error fetching backtest list:", error);
      alert("Không tải được danh sách backtest: " + (error as Error).message);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Khi chuyển sang tab Results thì tự load danh sách backtest
  useEffect(() => {
    if (activeView === "results") {
      fetchBacktestJobs();
      setBacktestResult(null);
      setSelectedJobId(null);
    }
  }, [activeView]);

  // ====== chọn 1 backtest để xem chi tiết ======
  const handleSelectJob = async (jobId: number) => {
    setSelectedJobId(jobId);
    setIsLoadingResult(true);
    setBacktestResult(null);

    try {
      const res = await fetch(`http://localhost:3001/api/backtests/${jobId}`);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch backtest result: ${res.status} ${res.statusText}`
        );
      }

      const json = await res.json();
      const dataLevel = json.data ?? json;
      const status = dataLevel.status ?? dataLevel.jobStatus;

      if (status !== "COMPLETED") {
        alert(
          `Backtest #${jobId} hiện đang ở trạng thái ${status}, kết quả chưa sẵn sàng.`
        );
        return;
      }

      const transformedResult: BacktestResult = {
        netProfit: Number(dataLevel.netProfit ?? 0),
        winRate: Number(dataLevel.winRate ?? 0),
        maxDrawdown: Number(dataLevel.maxDrawdown ?? 0),
        profitFactor: Number(dataLevel.profitFactor ?? 0),
        totalTrades: Number(dataLevel.totalTrades ?? 0),
        equityCurve: dataLevel.equityCurve ?? [],
        underwater: dataLevel.underwater ?? [],
        trades: dataLevel.trades ?? [],
      };

      setBacktestResult(transformedResult);

      // Đồng bộ lại meta (symbol, date range, capital) từ job
      setBacktestParams((prev) => ({
        ...prev,
        symbol: dataLevel.symbol ?? prev.symbol,
        initialCapital: dataLevel.initialCapital
          ? Number(dataLevel.initialCapital)
          : prev.initialCapital,
        startDate: dataLevel.dataFrom
          ? new Date(dataLevel.dataFrom)
          : prev.startDate,
        endDate: dataLevel.dataTo ? new Date(dataLevel.dataTo) : prev.endDate,
      }));
    } catch (error) {
      console.error("Error fetching backtest result:", error);
      alert("Không tải được kết quả backtest: " + (error as Error).message);
    } finally {
      setIsLoadingResult(false);
    }
  };

  // Add a new block to the canvas
  const addBlock = (type: BlockType, x: number, y: number) => {
    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      x,
      y,
      value: type === "number" ? 0 : undefined,
      period: ["rsi", "ema", "sma", "bollinger"].includes(type)
        ? 14
        : undefined,
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  // Delete a block
  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    setConnections((prev) =>
      prev.filter((conn) => conn.from !== id && conn.to !== id)
    );
    if (selectedBlock === id) setSelectedBlock(null);
  };

  // Update block value
  const updateBlockValue = (id: string, value: number) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, value } : block))
    );
  };

  // Update block period
  const updateBlockPeriod = (id: string, period: number) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, period } : block))
    );
  };

  // Connect two blocks
  const connectBlocks = (from: string, to: string) => {
    if (from === to) return;
    setConnections((prev) => {
      const exists = prev.some((conn) => conn.from === from && conn.to === to);
      if (exists) return prev;
      return [...prev, { from, to }];
    });
  };

  // Validate strategy before running backtest
  const validateStrategy = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check if there's at least one buy or sell action
    const hasAction = blocks.some((block) =>
      ["buy", "sell"].includes(block.type)
    );
    if (!hasAction) {
      errors.push("Strategy must include at least one buy or sell action");
    }

    // Check if there are connections
    if (connections.length === 0) {
      errors.push("Strategy must have connections between blocks");
    }

    // Check if actions are connected to other blocks
    const actionBlocks = blocks.filter((block) =>
      ["buy", "sell"].includes(block.type)
    );
    for (const actionBlock of actionBlocks) {
      const isConnected = connections.some(
        (conn) => conn.to === actionBlock.id
      );
      if (!isConnected) {
        errors.push(
          `Action block '${actionBlock.type}' must be connected to other blocks`
        );
      }
    }

    // Check if indicators have proper periods
    const indicatorBlocks = blocks.filter((block) =>
      ["rsi", "ema", "sma", "bollinger"].includes(block.type)
    );
    for (const indicatorBlock of indicatorBlocks) {
      if (!indicatorBlock.period || indicatorBlock.period < 2) {
        errors.push(
          `${indicatorBlock.type.toUpperCase()} indicator must have a period of at least 2`
        );
      }
    }

    // Check if number blocks have values
    const numberBlocks = blocks.filter((block) => block.type === "number");
    for (const numberBlock of numberBlocks) {
      if (numberBlock.value === undefined) {
        errors.push("Number blocks must have a value");
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  // Enhanced validation with visualization
  const validateStrategyWithVisualization = (): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const { isValid, errors } = validateStrategy();
    const warnings: string[] = [];

    // Check for disconnected blocks
    const connectedBlockIds = new Set<string>();
    connections.forEach((conn) => {
      connectedBlockIds.add(conn.from);
      connectedBlockIds.add(conn.to);
    });

    const disconnectedBlocks = blocks.filter(
      (block) => !connectedBlockIds.has(block.id)
    );
    if (disconnectedBlocks.length > 0) {
      warnings.push(
        `Found ${disconnectedBlocks.length} disconnected blocks that won't affect the strategy`
      );
    }

    // Check for complex strategies
    if (blocks.length > 10) {
      warnings.push(
        "Complex strategy detected - consider simplifying for better performance"
      );
    }

    // Check for multiple actions
    const actionBlocks = blocks.filter((block) =>
      ["buy", "sell"].includes(block.type)
    );
    if (actionBlocks.length > 2) {
      warnings.push(
        `Multiple action blocks detected (${actionBlocks.length}) - ensure logic is correct`
      );
    }

    return { isValid, errors, warnings };
  };

  // Quick validation status cho UI header / panel (memo để tránh tính lại nhiều lần)
  const quickValidation = useMemo(() => {
    const hasAction = blocks.some((b) => ["buy", "sell"].includes(b.type));
    const hasConnections = connections.length > 0;
    const actionsConnected = blocks
      .filter((b) => ["buy", "sell"].includes(b.type))
      .every((ab) => connections.some((c) => c.to === ab.id));

    const level =
      hasAction && hasConnections && actionsConnected
        ? "ready"
        : hasAction || hasConnections
        ? "partial"
        : "empty";

    return { hasAction, hasConnections, actionsConnected, level };
  }, [blocks, connections]);

  // Thống kê riêng BUY / SELL để show bên Stats & Results
  const actionStats = useMemo(() => {
    const buyBlocks = blocks.filter((b) => b.type === "buy").length;
    const sellBlocks = blocks.filter((b) => b.type === "sell").length;
    const closeBlocks = blocks.filter(
      (b) => b.type === "close_position"
    ).length;
    return { buyBlocks, sellBlocks, closeBlocks };
  }, [blocks]);

  // ====== RUN BACKTEST (CHỈ TẠO JOB, KHÔNG LẤY KẾT QUẢ NGAY) ======
  const runBacktest = async () => {
    // 1) Validate strategy trước
    const validation = validateStrategyWithVisualization();
    if (!validation.isValid) {
      alert("Strategy validation failed:\n" + validation.errors.join("\n"));
      return;
    }

    if (validation.warnings.length > 0) {
      const warningMessage =
        "Strategy warnings:\n" +
        validation.warnings.join("\n") +
        "\n\nContinue with backtest?";
      if (!confirm(warningMessage)) {
        return;
      }
    }

    setIsRunning(true);
    setBacktestResult(null);

    try {
      // 2) Convert strategy sang JSON để gửi lên Nest
      const strategyData = convertToJSONStrategy();
      // Sending strategy data to backend
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Không tìm thấy access token. Vui lòng đăng nhập lại.");
      }

      // 3) Gọi POST /api/backtests
      const response = await fetch("http://localhost:3001/api/backtests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(strategyData),
      }).catch((error) => {
        console.error("Network error when sending strategy:", error);
        throw new Error(`Network error: ${error.message}`);
      });

      if (!response.ok) {
        throw new Error(
          `Failed to start backtest: ${response.status} ${response.statusText}`
        );
      }

      const startResult = await response.json();
      // Start backtest response received

      const startData = startResult.data ?? startResult;
      const jobId = startData.jobId ?? startData.job_id ?? startData.id;

      if (!jobId) {
        throw new Error("Cannot find jobId from backtest start response");
      }

      alert(
        `Backtest job #${jobId} đã được tạo, hãy mở tab Results để xem danh sách.`
      );
      setActiveView("results");
      // load lại list
      fetchBacktestJobs();
    } catch (error) {
      console.error("Backtest failed:", error);
      alert("Backtest failed: " + (error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  // Get block color class based on type
  const getBlockColorClass = (type: BlockType, isDarkMode: boolean): string => {
    if (["rsi", "macd", "ema", "sma", "bollinger"].includes(type)) {
      return isDarkMode
        ? "bg-purple-600/90 text-white"
        : "bg-purple-500 text-white";
    }
    if (
      [
        "price_open",
        "price_close",
        "price_high",
        "price_low",
        "volume",
      ].includes(type)
    ) {
      return isDarkMode
        ? "bg-green-600/90 text-white"
        : "bg-green-500 text-white";
    }
    if (
      ["cross_over", "cross_under", "greater_than", "less_than"].includes(type)
    ) {
      return isDarkMode
        ? "bg-yellow-600/90 text-white"
        : "bg-yellow-500 text-white";
    }
    if (["buy", "sell", "close_position"].includes(type)) {
      return type === "buy"
        ? isDarkMode
          ? "bg-emerald-600/90 text-white"
          : "bg-emerald-500 text-white"
        : type === "sell"
        ? isDarkMode
          ? "bg-red-600/90 text-white"
          : "bg-red-500 text-white"
        : isDarkMode
        ? "bg-gray-600/90 text-white"
        : "bg-gray-500 text-white";
    }
    if (type === "number") {
      return isDarkMode
        ? "bg-blue-600/90 text-white"
        : "bg-blue-500 text-white";
    }
    return isDarkMode ? "bg-blue-600/90 text-white" : "bg-blue-500 text-white";
  };

  // Get block tooltip based on type
  const getBlockTooltip = (type: BlockType): string => {
    const tooltips: Record<BlockType, string> = {
      rsi: "Relative Strength Index - Momentum indicator",
      macd: "Moving Average Convergence Divergence - Trend following momentum indicator",
      ema: "Exponential Moving Average - Smooths price data",
      sma: "Simple Moving Average - Average price over a period",
      bollinger:
        "Bollinger Bands - Volatility bands above and below a moving average",
      price_open: "Opening price of the current bar",
      price_close: "Closing price of the current bar",
      price_high: "Highest price of the current bar",
      price_low: "Lowest price of the current bar",
      volume: "Trading volume of the current bar",
      cross_over: "Detects when one value crosses above another",
      cross_under: "Detects when one value crosses below another",
      greater_than: "Checks if first value is greater than second value",
      less_than: "Checks if first value is less than second value",
      buy: "Generate a BUY signal",
      sell: "Generate a SELL signal",
      close_position: "Close any open position",
      number: "Numeric value for comparison",
    };
    return tooltips[type] || type;
  };

  // Load example strategy
  const loadExampleStrategy = (strategyName: string) => {
    if (strategyName === "rsi") {
      setBlocks(rsiStrategy.blocks as unknown as Block[]);
      setConnections(rsiStrategy.connections);
    } else if (strategyName === "ema") {
      setBlocks(movingAverageCrossoverStrategy.blocks as unknown as Block[]);
      setConnections(movingAverageCrossoverStrategy.connections);
    }
    setSelectedBlock(null);
  };

  // Convert blocks and connections to JSON strategy format
  const convertToJSONStrategy = () => {
    // Define types for our strategy structure
    interface StrategyRuleConditionCompareTo {
      indicator?: string;
      params?: { period?: number };
      value?: number;
    }

    interface StrategyRuleCondition {
      indicator?: string;
      params?: { period?: number };
      operator: string;
      compare_to?: StrategyRuleConditionCompareTo;
    }

    interface StrategyRule {
      ruleOrder: number;
      condition: StrategyRuleCondition;
      action: string;
    }

    interface StrategyDefinition {
      name: string;
      description: string;
      rules: StrategyRule[];
    }

    interface JobConfig {
      stop_loss: number;
      take_profit: number;
    }

    interface StrategyData {
      strategy: StrategyDefinition;
      symbol: string;
      dataFrom: string;
      dataTo: string;
      priceSource: string;
      sessionId: null;
      initialCapital: number;
      commissionRate: number;
      jobConfig: JobConfig;
    }

    // Create rules from connections
    const rules: StrategyRule[] = [];

    // Find buy and sell action blocks
    const buyBlocks = blocks.filter((block) => block.type === "buy");
    const sellBlocks = blocks.filter((block) => block.type === "sell");

    // Helper to map a block to indicator/value descriptor
    const mapBlockToConditionSide = (block: Block | undefined) => {
      if (!block) return undefined;

      if (["rsi", "macd", "ema", "sma", "bollinger"].includes(block.type)) {
        return {
          indicator: block.type.toUpperCase(),
          params: { period: block.period || 14 },
        };
      }

      if (
        ["price_open", "price_close", "price_high", "price_low"].includes(
          block.type
        )
      ) {
        return {
          indicator: block.type.replace("price_", "").toUpperCase(),
          params: {},
        };
      }

      if (block.type === "number") {
        return {
          value: block.value || 0,
        };
      }

      return undefined;
    };

    const processActionBlocks = (actionBlocks: Block[], actionName: string) => {
      actionBlocks.forEach((actionBlock) => {
        const connectedConditions = connections
          .filter((conn) => conn.to === actionBlock.id)
          .map((conn) => blocks.find((b) => b.id === conn.from))
          .filter(Boolean) as Block[];

        connectedConditions.forEach((conditionBlock) => {
          if (
            conditionBlock &&
            ["less_than", "greater_than", "cross_over", "cross_under"].includes(
              conditionBlock.type
            )
          ) {
            const conditionConnections = connections
              .filter((conn) => conn.to === conditionBlock.id)
              .map((conn) => blocks.find((b) => b.id === conn.from))
              .filter(Boolean) as Block[];

            if (conditionConnections.length >= 2) {
              const firstBlock = conditionConnections[0];
              const secondBlock = conditionConnections[1];

              const condition: StrategyRuleCondition = {
                operator: "",
              };

              if (conditionBlock.type === "less_than") condition.operator = "<";
              else if (conditionBlock.type === "greater_than")
                condition.operator = ">";
              else if (conditionBlock.type === "cross_over")
                condition.operator = "cross_over";
              else if (conditionBlock.type === "cross_under")
                condition.operator = "cross_under";

              const left = mapBlockToConditionSide(firstBlock);
              const right = mapBlockToConditionSide(secondBlock);

              if (left) {
                condition.indicator = left.indicator;
                condition.params = left.params;
              }
              if (right) {
                condition.compare_to = {
                  indicator: right.indicator,
                  params: right.params,
                  value: right.value,
                };
              }

              rules.push({
                ruleOrder: rules.length + 1,
                condition,
                action: actionName,
              });
            }
          }
        });
      });
    };

    processActionBlocks(buyBlocks, "BUY");
    processActionBlocks(sellBlocks, "SELL");

    // Create the complete strategy object
    const strategyData: StrategyData = {
      strategy: {
        name: "Custom Strategy",
        description: "Generated from visual strategy builder",
        rules,
      },
      symbol: backtestParams.symbol,
      dataFrom: backtestParams.startDate.toISOString().split("T")[0],
      dataTo: backtestParams.endDate.toISOString().split("T")[0],
      priceSource: backtestParams.priceSource,
      sessionId: null,
      initialCapital: backtestParams.initialCapital,
      commissionRate: backtestParams.feeRate,
      jobConfig: {
        stop_loss: backtestParams.stopLoss,
        take_profit: backtestParams.takeProfit,
      },
    };

    // Generated strategy data for backend
    return strategyData;
  };

  // Gửi thẳng JSON (nếu vẫn dùng nút Send JSON)
  const sendStrategyToBackend = async () => {
    try {
      const strategyData = convertToJSONStrategy();

      const response = await fetch("http://localhost:3001/api/backtests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(strategyData),
      }).catch((error) => {
        console.error("Network error when sending strategy:", error);
        throw new Error(`Network error: ${error.message}`);
      });

      if (!response.ok) {
        throw new Error(`Failed to send strategy: ${response.statusText}`);
      }

      const result = await response.json();
      alert("Strategy sent to backend successfully!");

      return result;
    } catch (error) {
      console.error("Error sending strategy to backend:", error);
      alert(`Error sending strategy: ${(error as Error).message}`);
      throw error;
    }
  };

  // Export results
  const exportResults = (format: "csv" | "pdf" = "csv") => {
    if (!backtestResult) return;

    if (format === "csv") {
      let csvContent = "data:text/csv;charset=utf-8,";

      csvContent +=
        "Entry Time,Exit Time,Entry Price,Exit Price,Quantity,Profit/Loss,Return %,Side\n";

      backtestResult.trades.forEach((trade: BacktestTrade) => {
        const investment = trade.entryPrice * trade.quantity;
        const returnPercent =
          investment > 0 ? (trade.profit / investment) * 100 : 0;
        csvContent += `${new Date(
          trade.entryTime * 1000
        ).toLocaleDateString()},${new Date(
          trade.exitTime * 1000
        ).toLocaleDateString()},${trade.entryPrice},${trade.exitPrice},${
          trade.quantity
        },${trade.profit >= 0 ? "+" : ""}${trade.profit},${
          returnPercent >= 0 ? "+" : ""
        }${returnPercent.toFixed(2)}%,${trade.side.toUpperCase()}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "backtest_results.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === "pdf") {
      alert("PDF export is not implemented yet");
    }
  };

  // Summary info cho header (memo)
  const headerSummary = useMemo(() => {
    const capital = formatVND(backtestParams.initialCapital);
    const range = `${backtestParams.startDate.toISOString().split("T")[0]} → ${
      backtestParams.endDate.toISOString().split("T")[0]
    }`;

    return { capital, range };
  }, [backtestParams]);

  return (
    <div
      className={`h-full flex flex-col ${
        isDarkMode ? "bg-gray-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Header */}
      <div
        className={`px-5 py-3 border-b ${
          isDarkMode
            ? "border-gray-800 bg-gray-950/90"
            : "border-slate-200 bg-white/80"
        } backdrop-blur-sm`}
      >
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                isDarkMode
                  ? "bg-blue-500/15 text-blue-300"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              <FiCpu className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                Strategy Tester
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    quickValidation.level === "ready"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                      : quickValidation.level === "partial"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                      : "bg-slate-500/10 text-slate-400 border-slate-500/40"
                  }`}
                >
                  <FiActivity className="w-3 h-3" />
                  {quickValidation.level === "ready"
                    ? "Ready to backtest"
                    : quickValidation.level === "partial"
                    ? "Need more wiring"
                    : "Start building"}
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 flex flex-wrap items-center gap-2">
                Kéo thả block để tạo chiến lược &amp; backtest nhanh
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-gray-600/40 text-[10px]">
                  <FiDollarSign className="w-3 h-3" />
                  {backtestParams.symbol || "VN30"}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-gray-600/40 text-[10px]">
                  {headerSummary.range}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-gray-600/40 text-[10px]">
                  Capital: {headerSummary.capital}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View switch */}
            <div
              className={`inline-flex p-1 rounded-full text-xs ${
                isDarkMode
                  ? "bg-gray-900 border border-gray-800"
                  : "bg-slate-100"
              }`}
            >
              <button
                onClick={() => setActiveView("builder")}
                className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition text-xs ${
                  activeView === "builder"
                    ? isDarkMode
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-blue-500 text-white shadow-sm"
                    : isDarkMode
                    ? "text-gray-300"
                    : "text-gray-700"
                }`}
              >
                <FiBox className="w-3.5 h-3.5" />
                Builder
              </button>
              <button
                onClick={() => setActiveView("results")}
                className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition text-xs ${
                  activeView === "results"
                    ? isDarkMode
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-blue-500 text-white shadow-sm"
                    : isDarkMode
                    ? "text-gray-300"
                    : "text-gray-700"
                }`}
              >
                <FiBarChart2 className="w-3.5 h-3.5" />
                Results
              </button>
            </div>

            {/* Fullscreen button */}
            <button
              onClick={() => {
                const event = new CustomEvent("toggleStrategyTesterFullscreen");
                window.dispatchEvent(event);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border ${
                isDarkMode
                  ? "border-gray-700 bg-gray-900 hover:bg-gray-800"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              } transition-colors`}
            >
              <FiMaximizeIcon />
              Fullscreen
            </button>
          </div>
        </div>
      </div>

      {activeView === "builder" ? (
        <div className="flex flex-1 overflow-hidden">
          {/* SIDEBAR với TAB */}
          <div
            className={`w-80 border-r flex flex-col ${
              isDarkMode
                ? "border-gray-800 bg-gray-950"
                : "border-slate-200 bg-white"
            }`}
          >
            {/* Tabs hàng ngang */}
            <div
              className={`px-4 pt-3 pb-3 border-b ${
                isDarkMode ? "border-gray-800" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500">
                  Strategy Panel
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => loadExampleStrategy("rsi")}
                    className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1 ${
                      isDarkMode
                        ? "border-gray-700 bg-gray-900 hover:bg-gray-800"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <FiActivity className="w-3 h-3" />
                    RSI
                  </button>
                  <button
                    onClick={() => loadExampleStrategy("ema")}
                    className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1 ${
                      isDarkMode
                        ? "border-gray-700 bg-gray-900 hover:bg-gray-800"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <FiTrendingUp className="w-3 h-3" />
                    EMA X
                  </button>
                </div>
              </div>

              <div
                className={`grid grid-cols-3 text-xs rounded-xl p-0.5 ${
                  isDarkMode ? "bg-gray-900/80" : "bg-slate-100"
                }`}
              >
                <SidebarTabButton
                  active={sidebarTab === "toolbox"}
                  onClick={() => setSidebarTab("toolbox")}
                  icon={<FiBox className="w-3.5 h-3.5" />}
                  label="Toolbox"
                  isDarkMode={isDarkMode}
                />
                <SidebarTabButton
                  active={sidebarTab === "stats"}
                  onClick={() => setSidebarTab("stats")}
                  icon={<FiActivity className="w-3.5 h-3.5" />}
                  label="Strategy Stat"
                  isDarkMode={isDarkMode}
                />
                <SidebarTabButton
                  active={sidebarTab === "params"}
                  onClick={() => setSidebarTab("params")}
                  icon={<FiSliders className="w-3.5 h-3.5" />}
                  label="Backtest Params"
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>

            {/* Nội dung theo TAB */}
            <div className="flex-1 overflow-auto px-4 py-4 space-y-4 text-xs">
              {sidebarTab === "toolbox" && (
                <>
                  {/* Legend */}
                  <div
                    className={`rounded-xl p-3 border text-[11px] ${
                      isDarkMode
                        ? "border-gray-800 bg-gray-900/90"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="font-semibold mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                        <FiLayers className="w-3 h-3" />
                        LEGEND
                      </span>
                      <span className="text-gray-400">Phân loại block</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <LegendDot color="bg-purple-500" label="Indicators" />
                      <LegendDot color="bg-green-500" label="Price / Volume" />
                      <LegendDot color="bg-yellow-500" label="Logic" />
                      <LegendDot color="bg-emerald-500" label="BUY action" />
                      <LegendDot color="bg-red-500" label="SELL action" />
                      <LegendDot color="bg-blue-500" label="Number" />
                    </div>
                  </div>

                  {/* Toolbox groups */}
                  <ToolboxGroup
                    title="Indicators"
                    items={toolboxItems.filter((item) =>
                      ["rsi", "macd", "ema", "sma", "bollinger"].includes(
                        item.type
                      )
                    )}
                    isDarkMode={isDarkMode}
                  />
                  <ToolboxGroup
                    title="Price"
                    items={toolboxItems.filter((item) =>
                      [
                        "price_open",
                        "price_close",
                        "price_high",
                        "price_low",
                        "volume",
                      ].includes(item.type)
                    )}
                    isDarkMode={isDarkMode}
                  />
                  <ToolboxGroup
                    title="Logic"
                    items={toolboxItems.filter((item) =>
                      [
                        "cross_over",
                        "cross_under",
                        "greater_than",
                        "less_than",
                      ].includes(item.type)
                    )}
                    isDarkMode={isDarkMode}
                  />
                  <ToolboxGroup
                    title="Actions (BUY / SELL)"
                    items={toolboxItems.filter((item) =>
                      ["buy", "sell", "close_position"].includes(item.type)
                    )}
                    isDarkMode={isDarkMode}
                  />
                  <ToolboxGroup
                    title="Values"
                    items={toolboxItems.filter(
                      (item) => item.type === "number"
                    )}
                    isDarkMode={isDarkMode}
                  />
                </>
              )}

              {sidebarTab === "stats" && (
                <>
                  {/* Strategy Stats */}
                  <div
                    className={`rounded-xl p-3 border space-y-3 ${
                      isDarkMode
                        ? "border-gray-800 bg-gray-900/90"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <FiBarChart2 className="w-4 h-4 text-blue-400" />
                        <h4 className="text-xs font-semibold tracking-wide">
                          Strategy Stats
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          quickValidation.level === "ready"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        <FiActivity className="w-3 h-3" />
                        {blocks.length} blocks
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[11px]">
                      <StatCard
                        label="Blocks"
                        value={blocks.length.toString()}
                        isDarkMode={isDarkMode}
                      />
                      <StatCard
                        label="Connections"
                        value={connections.length.toString()}
                        isDarkMode={isDarkMode}
                      />
                      <StatCard
                        label="BUY actions"
                        value={actionStats.buyBlocks.toString()}
                        isDarkMode={isDarkMode}
                      />
                      <StatCard
                        label="SELL actions"
                        value={actionStats.sellBlocks.toString()}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  </div>

                  {/* Strategy Validation */}
                  <div
                    className={`rounded-xl p-3 border space-y-3 ${
                      isDarkMode
                        ? "border-gray-800 bg-gray-900/90"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-semibold">
                          Strategy Validation
                        </h4>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            const validation = validateStrategy();
                            if (validation.isValid) {
                              const strategyData = convertToJSONStrategy();
                              const jsonData = JSON.stringify(
                                strategyData,
                                null,
                                2
                              );
                              alert(
                                `✅ Strategy is valid!\n\nJSON Strategy Data:\n${jsonData}`
                              );
                            } else {
                              alert(
                                "❌ Strategy validation failed:\n" +
                                  validation.errors.join("\n")
                              );
                            }
                          }}
                          className={`text-[11px] px-2 py-1 rounded-md inline-flex items-center gap-1 ${
                            isDarkMode
                              ? "bg-gray-800 hover:bg-gray-700"
                              : "bg-slate-200 hover:bg-slate-300"
                          }`}
                        >
                          <FiCheckCircle className="w-3 h-3" />
                          Validate
                        </button>
                        <button
                          onClick={sendStrategyToBackend}
                          className={`text-[11px] px-2 py-1 rounded-md inline-flex items-center gap-1 ${
                            isDarkMode
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-blue-500 hover:bg-blue-600 text-white"
                          }`}
                        >
                          <FiArrowRightCircle className="w-3 h-3" />
                          Send JSON
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <ValidationRow
                        ok={quickValidation.hasAction}
                        label="Has BUY / SELL action block"
                      />
                      <ValidationRow
                        ok={quickValidation.hasConnections}
                        label="Has connections"
                      />
                      <ValidationRow
                        ok={quickValidation.actionsConnected}
                        label="Action blocks connected to logic"
                      />
                    </div>
                  </div>
                </>
              )}

              {sidebarTab === "params" && (
                <>
                  {/* Backtest Parameters */}
                  <div
                    className={`rounded-xl p-3 border space-y-3 ${
                      isDarkMode
                        ? "border-gray-800 bg-gray-900/90"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FiSliders className="w-4 h-4 text-blue-400" />
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Backtest Parameters
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Initial Capital */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-gray-300">
                          Initial Capital (VND)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={backtestParams.initialCapital}
                            onChange={(e) =>
                              setBacktestParams((prev) => ({
                                ...prev,
                                initialCapital: Number(e.target.value),
                              }))
                            }
                            className={`flex-1 px-2 py-1.5 rounded-lg border text-xs ${
                              isDarkMode
                                ? "bg-gray-950 border-gray-700"
                                : "bg-white border-slate-300"
                            }`}
                          />
                          <div className="flex gap-1">
                            {[100, 200, 500].map((v) => (
                              <button
                                key={v}
                                onClick={() =>
                                  setBacktestParams((prev) => ({
                                    ...prev,
                                    initialCapital: v * 1_000_000,
                                  }))
                                }
                                className={`text-[11px] px-2 py-1 rounded-lg border whitespace-nowrap ${
                                  isDarkMode
                                    ? "border-gray-700 bg-gray-900 hover:bg-gray-800"
                                    : "border-slate-200 bg-white hover:bg-slate-100"
                                }`}
                              >
                                {v}M
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Date range */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="block text-[11px] text-gray-300">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={
                              backtestParams.startDate
                                .toISOString()
                                .split("T")[0]
                            }
                            onChange={(e) =>
                              setBacktestParams((prev) => ({
                                ...prev,
                                startDate: new Date(e.target.value),
                              }))
                            }
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs ${
                              isDarkMode
                                ? "bg-gray-950 border-gray-700"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[11px] text-gray-300">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={
                              backtestParams.endDate.toISOString().split("T")[0]
                            }
                            onChange={(e) =>
                              setBacktestParams((prev) => ({
                                ...prev,
                                endDate: new Date(e.target.value),
                              }))
                            }
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs ${
                              isDarkMode
                                ? "bg-gray-950 border-gray-700"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Symbol */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-gray-300">
                          Symbol
                        </label>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`px-2 py-1 rounded-lg text-[11px] inline-flex items-center gap-1 ${
                              isDarkMode
                                ? "bg-gray-900 border border-gray-700"
                                : "bg-slate-100 border border-slate-200"
                            }`}
                          >
                            <FiDollarSign className="w-3 h-3" />
                            VN30
                          </div>
                          <input
                            type="text"
                            value={backtestParams.symbol}
                            onChange={(e) =>
                              setBacktestParams((prev) => ({
                                ...prev,
                                symbol: e.target.value,
                              }))
                            }
                            className={`flex-1 px-2 py-1.5 rounded-lg border text-xs ${
                              isDarkMode
                                ? "bg-gray-950 border-gray-700"
                                : "bg-white border-slate-300"
                            }`}
                            placeholder="e.g. FPT.VN"
                          />
                        </div>
                      </div>

                      {/* Price source */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-gray-300">
                          Price Source
                        </label>
                        <select
                          value={backtestParams.priceSource}
                          onChange={(e) =>
                            setBacktestParams((prev) => ({
                              ...prev,
                              priceSource: e.target
                                .value as BacktestParams["priceSource"],
                            }))
                          }
                          className={`w-full px-2 py-1.5 rounded-lg border text-xs ${
                            isDarkMode
                              ? "bg-gray-950 border-gray-700"
                              : "bg-white border-slate-300"
                          }`}
                        >
                          <option value="HISTORICAL">HISTORICAL</option>
                          <option value="LIVE">LIVE (simulation)</option>
                        </select>
                      </div>

                      {/* Fee & Tax */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="block text-[11px] text-gray-300">
                            Fee Rate (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={backtestParams.feeRate * 100}
                            onChange={(e) =>
                              setBacktestParams((prev) => ({
                                ...prev,
                                feeRate: Number(e.target.value) / 100,
                              }))
                            }
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs ${
                              isDarkMode
                                ? "bg-gray-950 border-gray-700"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[11px] text-gray-300">
                            Tax Rate (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={backtestParams.taxRate * 100}
                            onChange={(e) =>
                              setBacktestParams((prev) => ({
                                ...prev,
                                taxRate: Number(e.target.value) / 100,
                              }))
                            }
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs ${
                              isDarkMode
                                ? "bg-gray-950 border-gray-700"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>

                      {/* JobConfig: SL/TP */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-gray-300">
                          Risk Management (SL / TP)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] w-16">Stop Loss</span>
                            <input
                              type="number"
                              step="0.1"
                              value={backtestParams.stopLoss * 100}
                              onChange={(e) =>
                                setBacktestParams((prev) => ({
                                  ...prev,
                                  stopLoss: Number(e.target.value) / 100,
                                }))
                              }
                              className={`flex-1 px-2 py-1.5 rounded-lg border text-xs ${
                                isDarkMode
                                  ? "bg-gray-950 border-gray-700"
                                  : "bg-white border-slate-300"
                              }`}
                            />
                            <span className="text-[11px] text-gray-400">%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] w-16">
                              Take Profit
                            </span>
                            <input
                              type="number"
                              step="0.1"
                              value={backtestParams.takeProfit * 100}
                              onChange={(e) =>
                                setBacktestParams((prev) => ({
                                  ...prev,
                                  takeProfit: Number(e.target.value) / 100,
                                }))
                              }
                              className={`flex-1 px-2 py-1.5 rounded-lg border text-xs ${
                                isDarkMode
                                  ? "bg-gray-950 border-gray-700"
                                  : "bg-white border-slate-300"
                              }`}
                            />
                            <span className="text-[11px] text-gray-400">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* BOTTOM BUTTONS: Clear / Reset RSI / Run Backtest */}
            <div
              className={`px-4 py-3 border-t ${
                isDarkMode
                  ? "border-gray-800 bg-gray-950/95"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex gap-1.5 mb-2">
                <button
                  onClick={() => {
                    setBlocks([]);
                    setConnections([]);
                    setSelectedBlock(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-semibold text-xs inline-flex items-center justify-center gap-1 ${
                    isDarkMode
                      ? "bg-gray-800 hover:bg-gray-700 text-slate-100"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
                <button
                  onClick={() => {
                    setBlocks([
                      { id: "block-1", type: "rsi", x: 80, y: 80, period: 14 },
                      {
                        id: "block-2",
                        type: "number",
                        x: 260,
                        y: 80,
                        value: 30,
                      },
                      { id: "block-3", type: "less_than", x: 440, y: 80 },
                      { id: "block-4", type: "buy", x: 620, y: 80 },
                    ]);
                    setConnections([]);
                    setSelectedBlock(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-semibold text-xs inline-flex items-center justify-center gap-1 ${
                    isDarkMode
                      ? "bg-blue-900/40 hover:bg-blue-800/60 text-blue-200"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-700"
                  }`}
                >
                  <FiRotateCw className="w-3.5 h-3.5" />
                  Reset RSI
                </button>
              </div>
              <button
                onClick={runBacktest}
                disabled={isRunning}
                className={`w-full py-1.5 rounded-lg font-bold flex items-center justify-center gap-2 text-xs ${
                  isRunning
                    ? "bg-gray-500 cursor-not-allowed"
                    : isDarkMode
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-emerald-500 hover:bg-emerald-600"
                } text-white transition-colors`}
              >
                {isRunning ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Running Backtest...
                  </>
                ) : (
                  <>
                    <FiPlay className="w-3.5 h-3.5" />
                    Run Backtest
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <div
              className={`absolute inset-0 ${
                isDarkMode ? "bg-gray-950" : "bg-slate-100"
              }`}
            >
              {/* Grid */}
              <div
                className="absolute inset-3 rounded-xl opacity-30 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              {/* Drop layer */}
              <div
                ref={canvasRef}
                className="absolute inset-3 rounded-xl"
                onDrop={(e) => {
                  e.preventDefault();
                  const blockType = e.dataTransfer.getData(
                    "blockType"
                  ) as BlockType;
                  const moveBlockId = e.dataTransfer.getData("moveBlockId");
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (!rect) return;

                  const dropX = e.clientX - rect.left;
                  const dropY = e.clientY - rect.top;

                  if (blockType) {
                    addBlock(
                      blockType,
                      dropX - BLOCK_WIDTH / 2,
                      dropY - BLOCK_HEIGHT / 2
                    );
                  } else if (moveBlockId) {
                    setBlocks((prev) =>
                      prev.map((b) =>
                        b.id === moveBlockId
                          ? {
                              ...b,
                              x: dropX - BLOCK_WIDTH / 2,
                              y: dropY - BLOCK_HEIGHT / 2,
                            }
                          : b
                      )
                    );
                  }
                  setConnectingFrom(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  const types = Array.from(e.dataTransfer.types);
                  if (types.includes("blockType"))
                    e.dataTransfer.dropEffect = "copy";
                  else if (types.includes("moveBlockId"))
                    e.dataTransfer.dropEffect = "move";
                }}
                onClick={() => setSelectedBlock(null)}
              >
                {/* Render connections */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width="100%"
                  height="100%"
                >
                  <defs>
                    <filter
                      id="lineGlow"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    <marker
                      id="arrowHead"
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="3"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <path d="M0 0 L6 3 L0 6 Z" fill="#22d3ee" />
                    </marker>
                  </defs>

                  {connections.map((conn, index) => {
                    const fromBlock = blocks.find((b) => b.id === conn.from);
                    const toBlock = blocks.find((b) => b.id === conn.to);
                    if (!fromBlock || !toBlock) return null;

                    const x1 = fromBlock.x + BLOCK_WIDTH;
                    const y1 = fromBlock.y + BLOCK_HEIGHT / 2;
                    const x2 = toBlock.x;
                    const y2 = toBlock.y + BLOCK_HEIGHT / 2;

                    return (
                      <g key={index} filter="url(#lineGlow)">
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#22d3ee"
                          strokeWidth={2}
                          strokeLinecap="round"
                          markerEnd="url(#arrowHead)"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Render blocks */}
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`absolute w-28 h-12 rounded-xl flex items-center justify-center cursor-move shadow-lg shadow-black/25 hover:shadow-2xl hover:scale-[1.03] transition-all duration-150 border ${
                      selectedBlock === block.id
                        ? isDarkMode
                          ? "ring-2 ring-blue-400 border-blue-400"
                          : "ring-2 ring-blue-500 border-blue-500"
                        : isDarkMode
                        ? "border-white/10"
                        : "border-black/5"
                    } ${
                      connectingFrom === block.id
                        ? "scale-105 ring-2 ring-cyan-400"
                        : ""
                    } ${getBlockColorClass(block.type, isDarkMode)}`}
                    style={{ left: block.x, top: block.y }}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData("moveBlockId", block.id);
                      e.dataTransfer.setData("blockId", block.id);
                      e.dataTransfer.effectAllowed = "copyMove";
                      setConnectingFrom(block.id);
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      setConnectingFrom(null);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const fromBlockId = e.dataTransfer.getData("blockId");
                      if (fromBlockId && fromBlockId !== block.id) {
                        connectBlocks(fromBlockId, block.id);
                      }
                      setConnectingFrom(null);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBlock(block.id);
                    }}
                    title={getBlockTooltip(block.type)}
                  >
                    <div className="text-center w-full px-1">
                      <div className="text-[11px] font-semibold truncate leading-tight flex items-center justify-center gap-1">
                        <span className="inline-flex items-center">
                          {toolboxItems.find((i) => i.type === block.type)
                            ?.icon ?? <FiBox className="w-3 h-3" />}
                        </span>
                        <span>
                          {block.type === "number"
                            ? block.value
                            : block.type.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      {block.period && (
                        <div className="text-[9px] opacity-80">
                          Period: {block.period}
                        </div>
                      )}
                    </div>

                    {/* delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBlock(block.id);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-black/80"
                    >
                      ×
                    </button>

                    {/* Number input */}
                    {block.type === "number" && (
                      <input
                        type="number"
                        value={block.value ?? 0}
                        onChange={(e) =>
                          updateBlockValue(block.id, Number(e.target.value))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-20 p-1 text-[10px] rounded-md border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                      />
                    )}

                    {/* Period input */}
                    {["rsi", "ema", "sma", "bollinger"].includes(
                      block.type
                    ) && (
                      <input
                        type="number"
                        value={block.period ?? 14}
                        onChange={(e) =>
                          updateBlockPeriod(block.id, Number(e.target.value))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-20 p-1 text-[10px] rounded-md border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom hint */}
              <div
                className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[11px] shadow-md border ${
                  isDarkMode
                    ? "bg-gray-950/90 border-gray-800 text-gray-300"
                    : "bg-white/95 border-slate-200 text-slate-600"
                } flex items-center gap-2`}
              >
                <span>🖱️</span>
                <span>
                  Drag block từ Toolbox vào canvas • Kéo block để di chuyển •
                  Kéo block này thả lên block khác để nối
                </span>
              </div>

              {/* Connection hint */}
              {blocks.length > 1 && connections.length === 0 && (
                <div
                  className={`absolute top-4 right-4 px-3 py-2 rounded-lg text-xs border ${
                    isDarkMode
                      ? "bg-blue-900/40 text-blue-100 border-blue-700/60"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  } shadow-sm flex items-center gap-2`}
                >
                  <FiAlertTriangle className="w-4 h-4" />
                  <span>
                    Hint: Kéo block này thả lên block khác để tạo connection
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ResultsView
          isDarkMode={isDarkMode}
          backtestResult={backtestResult}
          backtestParams={backtestParams}
          exportResults={exportResults}
          setActiveView={setActiveView}
          jobs={jobList}
          isLoadingJobs={isLoadingJobs}
          selectedJobId={selectedJobId}
          onSelectJob={handleSelectJob}
          onRefreshJobs={fetchBacktestJobs}
          isLoadingResult={isLoadingResult}
        />
      )}
    </div>
  );
}

/* ====== SUB COMPONENTS (UI nhỏ) ====== */

function SidebarTabButton({
  active,
  onClick,
  icon,
  label,
  isDarkMode,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  isDarkMode: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
        active
          ? isDarkMode
            ? "bg-blue-600 text-white shadow-sm"
            : "bg-white text-blue-600 shadow-sm"
          : isDarkMode
          ? "text-gray-400 hover:text-gray-200"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <span className="w-3.5 h-3.5 flex items-center justify-center">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-sm ${color}`}></span>
      <span>{label}</span>
    </div>
  );
}

function ToolboxGroup({
  title,
  items,
  isDarkMode,
}: {
  title: string;
  items: { type: BlockType; label: string; icon: ReactNode }[];
  isDarkMode: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="font-semibold text-gray-400 mb-0.5 uppercase tracking-wide text-[11px]">
        {title}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("blockType", item.type);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className={`px-2.5 py-2 rounded-lg cursor-move flex items-center gap-2 border text-xs shadow-sm ${
              isDarkMode
                ? "bg-gray-950 hover:bg-gray-900 border-gray-800"
                : "bg-white hover:bg-slate-100 border-slate-200"
            } transition`}
          >
            <span className="text-base flex items-center justify-center w-4 h-4">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  isDarkMode,
}: {
  label: string;
  value: string;
  isDarkMode: boolean;
}) {
  return (
    <div
      className={`${
        isDarkMode
          ? "bg-gray-900/80 border-gray-800"
          : "bg-slate-100 border-slate-200"
      } p-2.5 rounded-lg border`}
    >
      <div className="text-[10px] text-gray-400 mb-1">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}

function ValidationRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center ${
          ok
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-red-500/20 text-red-400"
        }`}
      >
        {ok ? (
          <FiCheckCircle className="w-3 h-3" />
        ) : (
          <FiXCircle className="w-3 h-3" />
        )}
      </div>
      <span>{label}</span>
    </div>
  );
}

/* ===== RESULTS VIEW ===== */

function ResultsView({
  isDarkMode,
  backtestResult,
  backtestParams,
  exportResults,
  setActiveView,
  jobs,
  isLoadingJobs,
  selectedJobId,
  onSelectJob,
  onRefreshJobs,
  isLoadingResult,
}: {
  isDarkMode: boolean;
  backtestResult: BacktestResult | null;
  backtestParams: BacktestParams;
  exportResults: (format: "csv" | "pdf") => void;
  setActiveView: (v: "builder" | "results") => void;
  jobs: BacktestJobSummary[];
  isLoadingJobs: boolean;
  selectedJobId: number | null;
  onSelectJob: (id: number) => void;
  onRefreshJobs: () => void;
  isLoadingResult: boolean;
}) {
  const hasResult = !!backtestResult && selectedJobId !== null;

  // Sparkline helper
  const renderSparkline = (
    data: { value: number }[],
    options?: {
      positiveColor?: string;
      negativeColor?: string;
      isUnderwater?: boolean;
    }
  ) => {
    if (!data.length) return null;

    const width = 260;
    const height = 80;
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = data
      .map((d, idx) => {
        const x = (idx / Math.max(data.length - 1, 1)) * width;
        const y = height - ((d.value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

    const isUp = data[data.length - 1].value >= data[0].value;
    const strokeColor = options?.isUnderwater
      ? "#f97316"
      : isUp
      ? options?.positiveColor || "#22c55e"
      : options?.negativeColor || "#ef4444";

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
        <defs>
          <linearGradient id="sparklineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          points={points}
        />
        <polygon
          points={`${points} ${width},${height} 0,${height}`}
          fill="url(#sparklineFill)"
        />
      </svg>
    );
  };

  // Status badge màu
  const statusBadge = (status: string) => {
    const st = status.toUpperCase();
    if (st === "COMPLETED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/40">
          <FiCheckCircle className="w-3 h-3 mr-1" />
          {st}
        </span>
      );
    }
    if (st === "PENDING") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/40">
          <FiActivity className="w-3 h-3 mr-1" />
          {st}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-slate-500/10 text-slate-300 border border-slate-500/40">
        {st}
      </span>
    );
  };

  // Nếu đã có kết quả, tính thêm các metric
  let summaryContent: ReactNode = null;
  if (hasResult && backtestResult) {
    const { netProfit, totalTrades, winRate, maxDrawdown, profitFactor } =
      backtestResult;

    const totalProfit = backtestResult.trades
      .filter((t) => t.profit > 0)
      .reduce((sum, t) => sum + t.profit, 0);

    const totalLoss = backtestResult.trades
      .filter((t) => t.profit < 0)
      .reduce((sum, t) => sum + t.profit, 0);

    const avgTrade = totalTrades > 0 ? netProfit / totalTrades : 0;

    const equityCurve = backtestResult.equityCurve || [];
    const underwater = backtestResult.underwater || [];

    const roi =
      backtestParams.initialCapital > 0
        ? (netProfit / backtestParams.initialCapital) * 100
        : 0;

    const buyTrades = backtestResult.trades.filter(
      (t) => t.side.toLowerCase() === "buy"
    );
    const sellTrades = backtestResult.trades.filter(
      (t) => t.side.toLowerCase() === "sell"
    );

    const buyWins = buyTrades.filter((t) => t.profit > 0).length;
    const sellWins = sellTrades.filter((t) => t.profit > 0).length;

    const buyWinRate = buyTrades.length
      ? (buyWins / buyTrades.length) * 100
      : 0;
    const sellWinRate = sellTrades.length
      ? (sellWins / sellTrades.length) * 100
      : 0;

    summaryContent = (
      <>
        {/* Top summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Net Profit + ROI */}
          <div
            className={`rounded-xl p-3 border ${
              isDarkMode
                ? "border-gray-800 bg-gradient-to-br from-emerald-900/40 to-emerald-700/20"
                : "border-emerald-100 bg-emerald-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                <FiTrendingUp className="w-3 h-3" />
                Net Profit
              </span>
              <span className="text-[10px] uppercase tracking-wide text-emerald-300/80">
                P&amp;L
              </span>
            </div>
            <div
              className={`text-lg font-semibold ${
                netProfit >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatVNDCurrency(netProfit)}
            </div>
            <div className="text-[11px] text-gray-300 mt-1 flex flex-col gap-0.5">
              <span>
                Initial capital: {formatVND(backtestParams.initialCapital)}
              </span>
              <span>
                ROI:{" "}
                <span className="font-semibold">
                  {roi >= 0 ? "+" : ""}
                  {roi.toFixed(2)}%
                </span>
              </span>
            </div>
          </div>

          {/* Win Rate / Avg trade */}
          <div
            className={`rounded-xl p-3 border ${
              isDarkMode
                ? "border-gray-800 bg-gray-900/80"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-blue-400">
                Win Rate
              </span>
              <span className="text-[10px] text-gray-500">
                {backtestResult.trades.length} trades
              </span>
            </div>
            <div className="text-lg font-semibold text-blue-400">
              {winRate.toFixed(1)}%
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Avg trade: {formatVNDCurrency(avgTrade)}
            </div>
          </div>

          {/* Risk / DD / PF */}
          <div
            className={`rounded-xl p-3 border ${
              isDarkMode
                ? "border-gray-800 bg-gray-900/80"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-amber-400">
                Max Drawdown
              </span>
              <span className="text-[10px] text-gray-500">Risk</span>
            </div>
            <div className="text-lg font-semibold text-amber-400">
              {maxDrawdown.toFixed(1)}%
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Profit factor: {profitFactor.toFixed(2)}
            </div>
          </div>

          {/* BUY / SELL action focus */}
          <div
            className={`rounded-xl p-3 border ${
              isDarkMode
                ? "border-gray-800 bg-gray-900/80"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-gray-300 flex items-center gap-1">
                <FiArrowUpRight className="w-3 h-3 text-emerald-400" />
                <FiArrowDownRight className="w-3 h-3 text-red-400" />
                BUY / SELL Stats
              </span>
              <span className="text-[10px] text-gray-500">Signal quality</span>
            </div>
            <div className="flex items-end gap-3 mt-1 text-[11px]">
              <div className="flex-1">
                <div className="text-emerald-400 flex items-center gap-1">
                  <span className="inline-flex items-center px-1 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px]">
                    BUY
                  </span>
                </div>
                <div className="mt-0.5 text-gray-300">
                  Trades:{" "}
                  <span className="font-semibold text-emerald-300">
                    {buyTrades.length}
                  </span>
                </div>
                <div className="text-gray-400">
                  Win rate:{" "}
                  <span className="font-semibold text-emerald-300">
                    {buyWinRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex-1 border-l border-gray-700/60 pl-3">
                <div className="text-red-400 flex items-center gap-1">
                  <span className="inline-flex items-center px-1 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-[10px]">
                    SELL
                  </span>
                </div>
                <div className="mt-0.5 text-gray-300">
                  Trades:{" "}
                  <span className="font-semibold text-red-300">
                    {sellTrades.length}
                  </span>
                </div>
                <div className="text-gray-400">
                  Win rate:{" "}
                  <span className="font-semibold text-red-300">
                    {sellWinRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profit/Loss Summary */}
        <div
          className={`rounded-xl p-3 border ${
            isDarkMode
              ? "border-gray-800 bg-gray-900/80"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-blue-400">
              Profit/Loss Summary
            </span>
            <span className="text-[10px] text-gray-500">
              Total gains/losses
            </span>
          </div>
          <div className="flex items-end gap-3 mt-1 text-[11px]">
            <div className="flex-1">
              <div className="text-emerald-400 flex items-center gap-1">
                <span className="inline-flex items-center px-1 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px]">
                  Total Profit
                </span>
              </div>
              <div className="mt-0.5 text-gray-300">
                Amount:
                <span className="font-semibold text-emerald-300">
                  {formatVNDCurrency(totalProfit)}
                </span>
              </div>
            </div>
            <div className="flex-1 border-l border-gray-700/60 pl-3">
              <div className="text-red-400 flex items-center gap-1">
                <span className="inline-flex items-center px-1 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-[10px]">
                  Total Loss
                </span>
              </div>
              <div className="mt-0.5 text-gray-300">
                Amount:
                <span className="font-semibold text-red-300">
                  {formatVNDCurrency(totalLoss)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Equity curve */}
          <div
            className={`rounded-xl p-3 border ${
              isDarkMode
                ? "border-gray-800 bg-gray-900/90"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FiTrendingUp className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold">Equity Curve</div>
                  <div className="text-[11px] text-gray-500">
                    {backtestParams.startDate.toISOString().split("T")[0]} →{" "}
                    {backtestParams.endDate.toISOString().split("T")[0]}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-gray-500">
                Final equity:{" "}
                <span className="font-semibold">
                  {formatVND(backtestParams.initialCapital + netProfit)}
                </span>
              </div>
            </div>
            <div className="mt-1">{renderSparkline(equityCurve)}</div>
          </div>

          {/* Drawdown / underwater */}
          <div
            className={`rounded-xl p-3 border ${
              isDarkMode
                ? "border-gray-800 bg-gray-900/90"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FiActivity className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold">
                    Drawdown (Underwater)
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Peak-to-trough equity declines
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-1">
              {renderSparkline(underwater, { isUnderwater: true })}
            </div>
          </div>
        </div>

        {/* Trades table */}
        <div
          className={`rounded-xl border ${
            isDarkMode
              ? "border-gray-800 bg-gray-900/90"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="px-3 py-2 border-b border-gray-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiBarChart2 className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs font-semibold">Trade History</div>
                <div className="text-[11px] text-gray-500">
                  {backtestResult.trades.length} closed trades • BUY / SELL
                  detail
                </div>
              </div>
            </div>
          </div>
          <div className="max-h-72 overflow-auto text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr
                  className={`text-[11px] ${
                    isDarkMode ? "bg-gray-900" : "bg-slate-100"
                  }`}
                >
                  <th className="px-3 py-2 text-left font-medium border-b border-gray-800/40">
                    Entry
                  </th>
                  <th className="px-3 py-2 text-left font-medium border-b border-gray-800/40">
                    Exit
                  </th>
                  <th className="px-3 py-2 text-right font-medium border-b border-gray-800/40">
                    Side
                  </th>
                  <th className="px-3 py-2 text-right font-medium border-b border-gray-800/40">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right font-medium border-b border-gray-800/40">
                    Entry Px
                  </th>
                  <th className="px-3 py-2 text-right font-medium border-b border-gray-800/40">
                    Exit Px
                  </th>
                  <th className="px-3 py-2 text-right font-medium border-b border-gray-800/40">
                    P&amp;L
                  </th>
                  <th className="px-3 py-2 text-right font-medium border-b border-gray-800/40">
                    Return %
                  </th>
                </tr>
              </thead>
              <tbody>
                {backtestResult.trades.map((trade, idx) => {
                  const investment = trade.entryPrice * trade.quantity;
                  const returnPercent =
                    investment > 0 ? (trade.profit / investment) * 100 : 0;
                  const isWin = trade.profit >= 0;

                  return (
                    <tr
                      key={idx}
                      className={`${
                        idx % 2 === 0
                          ? isDarkMode
                            ? "bg-gray-900/40"
                            : "bg-white"
                          : isDarkMode
                          ? "bg-gray-900/10"
                          : "bg-slate-50"
                      }`}
                    >
                      <td className="px-3 py-1.5 border-b border-gray-800/20">
                        {new Date(trade.entryTime * 1000).toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 border-b border-gray-800/20">
                        {new Date(trade.exitTime * 1000).toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 border-b border-gray-800/20 text-right">
                        <span
                          className={`inline-flex items-center justify-end gap-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                            trade.side.toLowerCase() === "buy"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 border-b border-gray-800/20 text-right">
                        {trade.quantity}
                      </td>
                      <td className="px-3 py-1.5 border-b border-gray-800/20 text-right">
                        {trade.entryPrice.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 border-b border-gray-800/20 text-right">
                        {trade.exitPrice.toFixed(2)}
                      </td>
                      <td
                        className={`px-3 py-1.5 border-b border-gray-800/20 text-right ${
                          isWin ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatVNDCurrency(trade.profit)}
                      </td>
                      <td
                        className={`px-3 py-1.5 border-b border-gray-800/20 text-right ${
                          isWin ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isWin ? "+" : ""}
                        {returnPercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {backtestResult.trades.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-xs">
                No trades generated by this strategy.
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      className={`flex-1 overflow-auto ${
        isDarkMode ? "bg-gray-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="px-4 py-3 border-b border-gray-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("builder")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs border ${
              isDarkMode
                ? "border-gray-700 bg-gray-900 hover:bg-gray-800"
                : "border-slate-200 bg-white hover:bg-slate-100"
            }`}
          >
            <FiArrowLeft className="w-3 h-3" />
            Builder
          </button>
          <div className="text-xs text-gray-400 ml-2">
            Backtest history • click 1 job để xem chi tiết
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onRefreshJobs}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 border ${
              isDarkMode
                ? "border-gray-700 bg-gray-900 hover:bg-gray-800"
                : "border-slate-200 bg-white hover:bg-slate-100"
            }`}
          >
            <FiRotateCw className="w-3 h-3" />
            Refresh list
          </button>
          <button
            onClick={() => exportResults("csv")}
            disabled={!hasResult}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 border ${
              hasResult
                ? isDarkMode
                  ? "border-gray-700 bg-gray-900 hover:bg-gray-800"
                  : "border-slate-200 bg-white hover:bg-slate-100"
                : "border-gray-800/60 bg-gray-900/70 text-gray-500 cursor-not-allowed"
            }`}
          >
            <FiDownload className="w-3 h-3" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* DANH SÁCH BACKTEST */}
        <div
          className={`rounded-xl border ${
            isDarkMode
              ? "border-gray-800 bg-gray-900/90"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="px-3 py-2 border-b border-gray-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiBarChart2 className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs font-semibold">Backtest History</div>
                <div className="text-[11px] text-gray-500">
                  {isLoadingJobs
                    ? "Đang tải danh sách..."
                    : `${jobs.length} jobs (mới nhất ở trên)`}
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-auto text-xs">
            {isLoadingJobs ? (
              <div className="p-4 text-center text-gray-400 text-xs">
                Đang tải danh sách backtest...
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-xs">
                Chưa có backtest nào. Hãy quay lại tab Builder và chạy backtest.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr
                    className={`text-[11px] ${
                      isDarkMode ? "bg-gray-900" : "bg-slate-100"
                    }`}
                  >
                    <th className="px-3 py-2 text-left font-medium border-b border-gray-800/40">
                      Job ID
                    </th>
                    <th className="px-3 py-2 text-left font-medium border-b border-gray-800/40">
                      Symbol
                    </th>
                    <th className="px-3 py-2 text-left font-medium border-b border-gray-800/40">
                      Date range
                    </th>
                    <th className="px-3 py-2 text-right font-medium border-b border-gray-800/40">
                      Capital
                    </th>
                    <th className="px-3 py-2 text-left font-medium border-b border-gray-800/40">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left font-medium border-b border-gray-800/40">
                      Created at
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const isSelected = selectedJobId === job.id;
                    return (
                      <tr
                        key={job.id}
                        onClick={() => onSelectJob(job.id)}
                        className={`cursor-pointer ${
                          isSelected
                            ? isDarkMode
                              ? "bg-blue-900/40"
                              : "bg-blue-50"
                            : isDarkMode
                            ? "hover:bg-gray-900/70"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-3 py-1.5 border-b border-gray-800/20 text-left">
                          <span className="font-semibold">#{job.id}</span>
                        </td>
                        <td className="px-3 py-1.5 border-b border-gray-800/20 text-left">
                          {job.symbol}
                        </td>
                        <td className="px-3 py-1.5 border-b border-gray-800/20 text-left">
                          {job.data_from?.slice(0, 10)} →{" "}
                          {job.data_to?.slice(0, 10)}
                        </td>
                        <td className="px-3 py-1.5 border-b border-gray-800/20 text-right">
                          {formatVND(Number(job.initial_capital))}
                        </td>
                        <td className="px-3 py-1.5 border-b border-gray-800/20 text-left">
                          {statusBadge(job.status)}
                        </td>
                        <td className="px-3 py-1.5 border-b border-gray-800/20 text-left">
                          {new Date(job.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {isLoadingResult && (
            <div className="px-3 py-2 border-t border-gray-800/60 text-[11px] text-blue-400 flex items-center gap-2">
              <div className="animate-spin h-3 w-3 border-t-2 border-b-2 border-blue-400 rounded-full" />
              Đang tải kết quả backtest...
            </div>
          )}
        </div>

        {/* VÙNG HIỂN THỊ CHI TIẾT BACKTEST ĐÃ CHỌN */}
        {!hasResult ? (
          <div
            className={`rounded-xl border text-center py-10 text-xs ${
              isDarkMode
                ? "border-gray-800 bg-gray-900/70"
                : "border-dashed border-slate-300 bg-white"
            }`}
          >
            <div className="text-4xl mb-3">📊</div>
            <div className="text-sm font-semibold mb-1">
              Chưa có kết quả để hiển thị
            </div>
            <div className="text-gray-400">
              Hãy chọn 1 backtest ở bảng phía trên (trạng thái COMPLETED) để xem
              chi tiết.
            </div>
          </div>
        ) : (
          summaryContent
        )}
      </div>
    </div>
  );
}

// Icon Maximize (tách ra cho gọn)
function FiMaximizeIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5"
      ></path>
    </svg>
  );
}
