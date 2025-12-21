import { Time } from "lightweight-charts";
import { CandlestickWithVolume } from "./types";

// Cấu trúc cho trạng thái thị trường
interface MarketState {
  trend: 'bullish' | 'bearish' | 'sideways' | 'volatile';
  strength: number; // 0-1
  volatility: number; // 0-1
  volumeMultiplier: number; // 0.5-2
}

// Cấu hình thị trường
const MARKET_CONFIGS = {
  bullish: {
    drift: 0.0008, 
    reversalProb: 0.05,
    volatilityBase: 0.012, 
  },
  bearish: {
    drift: -0.0012, 
    reversalProb: 0.03,
    volatilityBase: 0.015,
  },
  sideways: {
    drift: 0,
    reversalProb: 0.08,
    volatilityBase: 0.008,
  },
  volatile: {
    drift: 0,
    reversalProb: 0.12,
    volatilityBase: 0.025,
  },
} as const;

// Helper: Random Normal Distribution
export function randomNormal(mean = 0, stdDev = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// 1. Hàm tính trạng thái thị trường
export function calculateMarketState(closes: number[], volumes: number[]): MarketState {
  // Nếu dữ liệu ít, force biến động để tránh đi ngang lúc đầu
  if (closes.length < 20) {
    return {
      trend: Math.random() > 0.5 ? 'bullish' : 'bearish',
      strength: 0.8,
      volatility: 0.8, // Volatility cao lúc đầu
      volumeMultiplier: 1.2,
    };
  }

  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  
  let trend: MarketState['trend'];
  let strength = 0;
  
  // So sánh SMA để xác định trend
  const diffPercent = (sma20 - sma50) / sma50;
  
  if (diffPercent > 0.002) { // Ngưỡng nhạy hơn
    trend = 'bullish';
    strength = Math.min(1, diffPercent * 50);
  } else if (diffPercent < -0.002) {
    trend = 'bearish';
    strength = Math.min(1, -diffPercent * 50);
  } else {
    // Sideways nhưng vẫn có thể bias nhẹ
    trend = Math.random() > 0.7 ? (Math.random() > 0.5 ? 'bullish' : 'bearish') : 'sideways';
    strength = Math.random() * 0.4;
  }

  // Tính volatility dựa trên độ lệch chuẩn (Standard Deviation)
  // Logic cũ dùng avgReturn có thể bị triệt tiêu nếu giá lên xuống đều
  let variance = 0;
  const mean = closes.slice(-20).reduce((a,b)=>a+b,0)/20;
  for(let i=closes.length-20; i<closes.length; i++) {
      if(closes[i]) variance += Math.pow(closes[i] - mean, 2);
  }
  const stdDev = Math.sqrt(variance / 20);
  // Normalized volatility
  let volatility = Math.min(1, (stdDev / mean) * 100); 

  // ĐẢM BẢO KHÔNG BAO GIỜ VỀ 0
  volatility = Math.max(0.1, volatility); 

  if (volatility > 0.8) trend = 'volatile';

  return { trend, strength, volatility, volumeMultiplier: 1.0 + strength };
}

// 2. Hàm tạo nến tiếp theo (Đã sửa logic làm tròn và wicks)
export function generateNextBarRealistic(
  last: CandlestickWithVolume,
  closes: number[],
  volumes: number[]
): CandlestickWithVolume {
  if (!last) {
     // Fallback nến đầu
     return { time: Math.floor(Date.now()/1000) as Time, open: 100, high: 101, low: 99, close: 100, volume: 1000 };
  }

  const marketState = calculateMarketState(closes, volumes);
  const config = MARKET_CONFIGS[marketState.trend];

  // --- LOGIC GIÁ ---
  
  // 1. Base Drift (Xu hướng chủ đạo)
  let changePercent = config.drift * (1 + marketState.strength);

  // 2. Random Walk (Cốt lõi của biến động)
  // Luôn đảm bảo có noise tối thiểu (10% của base)
  const noise = randomNormal(0, config.volatilityBase);
  changePercent += noise;

  // 3. Momentum (Quán tính)
  // Nếu nến trước tăng mạnh, nến này có xác suất tăng tiếp
  if (closes.length > 2) {
      const prevReturn = (closes[closes.length-1] - closes[closes.length-2]) / closes[closes.length-2];
      changePercent += prevReturn * 0.2; // 20% quán tính
  }

  // --- TÍNH TOÁN OHLC (KHÔNG DÙNG toFixed Ở ĐÂY) ---
  const open = last.close;
  let close = open * (1 + changePercent);

  // Ngăn chặn giá âm hoặc về 0
  if (close < 0.01) close = 0.01;

  // --- LOGIC HIGH / LOW (QUAN TRỌNG ĐỂ CÓ RÂU NẾN) ---
  
  // Tính biên độ dao động trong phiên (High-Low range)
  // Range ít nhất phải bằng độ thay đổi giá (Body), cộng thêm nhiễu
  const bodySize = Math.abs(close - open);
  // Wicks thường tỷ lệ thuận với volatility
  const volatilityFactor = Math.max(config.volatilityBase, marketState.volatility * 0.01);
  const wickSize = open * volatilityFactor * (0.5 + Math.random()); 

  // Phân bổ wick lên trên và dưới ngẫu nhiên
  const upperWick = wickSize * Math.random();
  const lowerWick = wickSize * Math.random();

  let high = Math.max(open, close) + upperWick;
  let low = Math.min(open, close) - lowerWick;

  // Bảo vệ logic
  high = Math.max(high, open, close);
  low = Math.min(low, open, close);
  
  // Chỉ làm tròn khi trả về kết quả cuối cùng để vẽ chart
  // Dùng Math.round nhân 100/100 để giữ 2 số thập phân chuẩn xác hơn toFixed string
  const precision = 100; // 2 số thập phân

  return {
    time: Math.floor(Date.now() / 1000) as Time,
    open: Math.round(open * precision) / precision,
    high: Math.round(high * precision) / precision,
    low: Math.round(low * precision) / precision,
    close: Math.round(close * precision) / precision,
    volume: Math.floor(last.volume * (0.8 + Math.random() * 0.4)), // Random volume +/- 20%
  };
}

// 3. Hàm tạo dữ liệu ban đầu (Đã sửa để tránh đường thẳng)
export function generateInitialData(
  basePrice: number,
  numBars: number = 100
): CandlestickWithVolume[] {
  const bars: CandlestickWithVolume[] = [];
  const currentPrice = basePrice;
  const closes: number[] = [basePrice];
  const volumes: number[] = [1000];

  const now = Math.floor(Date.now() / 1000);

  // Tạo một dummy bar đầu tiên
  bars.push({
      time: (now - numBars * 60) as Time,
      open: basePrice,
      high: basePrice * 1.002,
      low: basePrice * 0.998,
      close: basePrice,
      volume: 1000
  });

  for (let i = 1; i < numBars; i++) {
    const lastBar = bars[i-1];
    // Gọi đệ quy hàm generateNextBarRealistic để logic đồng nhất
    // Thay vì viết logic riêng cho initial data
    const newBar = generateNextBarRealistic(lastBar, closes, volumes);
    
    // Gán lại time cho đúng quá khứ
    newBar.time = (now - (numBars - i) * 60) as Time;
    
    bars.push(newBar);
    closes.push(newBar.close);
    volumes.push(newBar.volume);
  }

  return bars;
}