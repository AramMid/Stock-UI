// File: components/trading/BrushCanvas.tsx
'use client';

import { useEffect, useRef, useState, RefObject, MutableRefObject } from 'react';

interface BrushCanvasProps {
  isEnabled: boolean;
  onDrawingComplete?: () => void;
  color?: string;
  lineWidth?: number;
  chartContainerRef?: RefObject<HTMLDivElement> | MutableRefObject<HTMLDivElement | null>; // FIX: Accept both types
}

export default function BrushCanvas({ 
  isEnabled, 
  onDrawingComplete,
  color = '#87CEEB',
  lineWidth = 2,
  chartContainerRef
}: BrushCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parentElement = canvas.parentElement;
    if (!parentElement) return;

    canvas.width = parentElement.offsetWidth;
    canvas.height = parentElement.offsetHeight;

    const handleResize = () => {
      const ctx = canvas.getContext('2d');
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      
      canvas.width = parentElement.offsetWidth;
      canvas.height = parentElement.offsetHeight;
      
      if (ctx && imageData) {
        ctx.putImageData(imageData, 0, 0);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(parentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Block chart interactions when brush is enabled
  useEffect(() => {
    if (!isEnabled || !chartContainerRef?.current) return;

    const chartContainer = chartContainerRef.current;
    
    // Function to prevent all chart interactions
    const blockInteraction = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
    };

    // Add listeners with capture phase to intercept before chart handlers
    const events = ['mousedown', 'mousemove', 'mouseup', 'wheel', 'touchstart', 'touchmove', 'touchend', 'click', 'dblclick'];
    
    events.forEach(eventType => {
      chartContainer.addEventListener(eventType, blockInteraction, { 
        capture: true, 
        passive: false 
      });
    });

    // Store original pointer events style
    const originalPointerEvents = chartContainer.style.pointerEvents;
    chartContainer.style.pointerEvents = 'none';

    return () => {
      // Cleanup: remove all event listeners
      events.forEach(eventType => {
        chartContainer.removeEventListener(eventType, blockInteraction, { capture: true });
      });
      
      // Restore original pointer events
      chartContainer.style.pointerEvents = originalPointerEvents;
    };
  }, [isEnabled, chartContainerRef]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEnabled) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEnabled) return;
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
    }
    
    if (onDrawingComplete) {
      onDrawingComplete();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEnabled) return;
    
    // Only draw when we're actually drawing
    if (!isDrawing) return;
    
    e.stopPropagation();
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // Clear canvas when disabled
  useEffect(() => {
    if (!isEnabled) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setIsDrawing(false);
    }
  }, [isEnabled]);

  if (!isEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      className="absolute inset-0 cursor-crosshair z-[9999]"
      style={{ 
        pointerEvents: 'auto',
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    />
  );
}