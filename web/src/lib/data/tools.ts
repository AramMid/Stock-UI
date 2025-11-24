import {
  Menu,
  TrendingUp,
  Square,
  Circle,
  Triangle,
  Type,
  Minus,
  Ruler,
  ZoomIn,
  BarChart3,
  Shapes,
  Lock,
  Trash2,
  Eye,
  Settings,
  Move,
  Pencil,
  Hash,
  Columns,
  ArrowRight,
  Hexagon,
} from "lucide-react";

export interface ToolItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type: "menu" | "tool" | "group" | "settings";
  hotkey?: string;
  description?: string;
  submenu?: ToolItem[];
  active?: boolean;
}

export const tools: ToolItem[] = [
  { 
    id: "menu", 
    icon: Menu, 
    label: "Menu Hamburger", 
    type: "menu",
    description: "Open main menu, navigation\nPurpose: Quick access to main TradingView features"
  },
  { 
    id: "selection", 
    icon: Circle, 
    label: "Cursor / Selection Tool", 
    type: "tool",
    hotkey: "ESC",
    description: "Selection mode and move objects on chart\nDefault operation when not drawing\nMove created drawings, indicators\nClick to choose cursor style",
    active: true
  },
  { 
    id: "trendline", 
    icon: TrendingUp, 
    label: "Trendline", 
    type: "tool",
    description: "Draw trendlines to identify price trends\nConnect 2 or more high/low points\nUptrend Line: Connect rising lows\nDowntrend Line: Connect falling highs\nSideways: Horizontal trendline"
  },
  { 
    id: "extended-line", 
    icon: Move, 
    label: "Extended Line", 
    type: "tool",
    description: "Extended line in both directions\nConnect 2 points, automatically extend both ends\nUseful for long-term S/R levels"
  },
  { 
    id: "ray", 
    icon: ArrowRight, 
    label: "Ray", 
    type: "tool",
    description: "Ray with starting point, extends infinitely in one direction\nRight Ray: Extends to future\nLeft Ray: Extends to past\nUse cases: Dynamic S/R, Gann Angles, Projection lines"
  },
  { 
    id: "horizontal-line", 
    icon: Minus, 
    label: "Horizontal Line", 
    type: "tool",
    description: "Draw horizontal lines\nMark Support/Resistance levels\nDraw Price Target, Stop Loss"
  },
  { 
    id: "vertical-line", 
    icon: Columns, 
    label: "Vertical Line", 
    type: "tool",
    description: "Draw vertical lines over time\nMark important events\nCountdown to event\nTime Cycle Analysis"
  },
  { 
    id: "trend-channel", 
    icon: Columns, 
    label: "Trend Channel", 
    type: "tool",
    description: "Create parallel lines forming a channel\nPrice oscillates within the channel\nAscending Channel: Uptrend\nDescending Channel: Downtrend\nHorizontal Channel: Range"
  },
  { 
    id: "parallel-channel", 
    icon: Columns, 
    label: "Parallel Channel", 
    type: "tool",
    description: "Create parallel channel from existing line\nClone trendline and move parallel\nQuick channel creation"
  },
  { 
    id: "fibonacci", 
    icon: Hash, 
    label: "Fibonacci Tools", 
    type: "group",
    description: "Fibonacci analysis tools\nRetracement, Extension, Time Zones, Fan, Arc\nUse case: Find entry/exit points by Fibonacci",
    submenu: [
      { id: "fib-retracement", icon: Hash, label: "Fibonacci Retracement", type: "tool" },
      { id: "fib-extension", icon: Hash, label: "Fibonacci Extension", type: "tool" },
      { id: "fib-time-zones", icon: Hash, label: "Fibonacci Time Zones", type: "tool" },
      { id: "fib-fan", icon: Hash, label: "Fibonacci Fan", type: "tool" },
      { id: "fib-arc", icon: Hash, label: "Fibonacci Arc", type: "tool" },
    ]
  },
  { 
    id: "shapes", 
    icon: Shapes, 
    label: "Shape Tools", 
    type: "group",
    description: "Draw geometric shapes\nHighlight price action areas\nAccumulation/distribution zones",
    submenu: [
      { id: "rectangle", icon: Square, label: "Rectangle", type: "tool", description: "Draw rectangular shapes\nHighlight support/resistance zones\nMark accumulation/distribution areas" },
      { id: "ellipse", icon: Circle, label: "Ellipse", type: "tool", description: "Draw elliptical shapes\nHighlight price action zones\nMark important areas" },
      { id: "triangle", icon: Triangle, label: "Triangle", type: "tool", description: "Draw triangular shapes\nMark consolidation patterns\nHighlight breakout zones" },
      { id: "polygon", icon: Hexagon, label: "Polygon", type: "tool", description: "Draw custom polygons\nCreate complex shapes\nMark irregular zones" },
      { id: "arrow", icon: ArrowRight, label: "Arrow", type: "tool", description: "Draw directional arrows\nPoint to important areas\nShow trend direction" },
      { id: "pitchfork", icon: Hash, label: "Pitchfork", type: "tool", description: "Draw pitchfork patterns\nMark trend channels\nIdentify support/resistance" },
    ]
  },
  { 
    id: "brush", 
    icon: Pencil, 
    label: "Brush / Drawing Tool", 
    type: "tool",
    description: "Free drawing on chart\nHighlight important areas\nMark patterns\nUse case: Visual notes, highlighting"
  },
  { 
    id: "text", 
    icon: Type, 
    label: "Text Tool", 
    type: "tool",
    description: "Add text/notes to chart\nMark important price areas\nRecord observations, reasons for entry/exit\nCustomize: font, size, colors\nUse case: Trading journal notes, marking S/R"
  },
  { 
    id: "measure", 
    icon: Ruler, 
    label: "Measure Tool", 
    type: "tool",
    description: "Measure price and time distance\nCalculate % change between 2 points\nCount candles between 2 marks\nDisplay: Price change, %, Bars, Date range\nUse case: Measure wave length, calculate R:R ratio"
  },
  { 
    id: "zoom", 
    icon: ZoomIn, 
    label: "Magnifying Glass / Zoom", 
    type: "tool",
    description: "Zoom in/out on chart\nZoom in on specific area\nFocus on area of interest\nUse case: Detailed price action analysis"
  },
  { 
    id: "bar-pattern", 
    icon: BarChart3, 
    label: "Bar Pattern Tool", 
    type: "tool",
    description: "Automatic pattern recognition\nMark candlestick patterns\nHead & Shoulders, Double Top/Bottom\nTriangle, Wedge patterns\nUse case: Find trading setups"
  },
  { 
    id: "lock", 
    icon: Lock, 
    label: "Lock Tool", 
    type: "tool",
    description: "Lock all drawing objects\nPrevent accidental editing/deletion\nProtect completed analysis\nUse case: Protect chart template after completion"
  },
  { 
    id: "delete", 
    icon: Trash2, 
    label: "Delete / Remove All", 
    type: "tool",
    description: "Delete selected drawing object\nDelete all drawings\nClear chart\nUse case: Clean up chart, start new analysis"
  },
  { 
    id: "visibility", 
    icon: Eye, 
    label: "Hide/Show Drawings", 
    type: "tool",
    description: "Hide/show all drawings\nToggle visibility of objects\nManage layers\nUse case: Focus on pure price action, hide clutter"
  },
  { 
    id: "settings", 
    icon: Settings, 
    label: "Preferences / Settings", 
    type: "settings",
    description: "Drawing tools settings\nMagnet mode (snap to price/time)\nStay in drawing mode\nDefault colors and styles\nUse case: Customize drawing workflow"
  },
];
