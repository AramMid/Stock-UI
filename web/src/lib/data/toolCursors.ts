// Tool-specific cursor configurations
export const toolCursors: Record<string, string> = {
  // Selection tool uses dynamic cursors based on user selection
  'selection': 'dynamic',
  
  // Drawing tools
  'trendline': 'crosshair',
  'brush': 'crosshair',
  'horizontal-line': 'ns-resize',
  'vertical-line': 'ew-resize',
  'rectangle': 'crosshair',
  'ellipse': 'crosshair',
  'polygon': 'crosshair',
  'triangle': 'crosshair',
  'arrow': 'crosshair',
  'text': 'text',
  
  // Action tools
  'delete': 'pointer',
  'visibility': 'pointer',
  
  // Default fallback
  'default': 'default'
};

// Initialize tool cursors globally when the module loads
if (typeof window !== 'undefined') {
  (window as any).toolCursors = toolCursors;
}