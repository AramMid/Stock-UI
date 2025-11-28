import {
  Menu,
  TrendingUp,
  Circle,
  Type,
  Minus,
  Trash2,
  Eye,
  Settings,
  Move,
  Pencil,
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
