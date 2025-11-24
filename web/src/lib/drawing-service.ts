// Drawing service to handle chart drawing operations
export class DrawingService {
  private container: HTMLElement | null = null;
  private activeTool: string | null = null;
  private isDrawing = false;
  private startPoint: { x: number; y: number } | null = null;
  private currentElement: SVGElement | null = null;
  private svgOverlay: SVGSVGElement | null = null;
  private drawings: Map<string, SVGElement> = new Map();
  private selectedElement: SVGElement | null = null;
  private isDragging = false;
  private dragOffset: { x: number; y: number } | null = null;
  private polygonPoints: { x: number; y: number }[] = [];
  private isMultiPointDrawing = false;
  private cursorType: 'diagonal' | 'dot' | 'arrow' | 'illustration' = 'arrow';

  constructor() {
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  initialize(container: HTMLElement) {
    this.container = container;
    this.createSVGOverlay();
    this.container.addEventListener('mousedown', this.handleMouseDown);
    this.container.addEventListener('mousemove', this.handleMouseMove);
    this.container.addEventListener('mouseup', this.handleMouseUp);
    
    // Add keyboard event listener for delete key
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  destroy() {
    if (this.container) {
      this.container.removeEventListener('mousedown', this.handleMouseDown);
      this.container.removeEventListener('mousemove', this.handleMouseMove);
      this.container.removeEventListener('mouseup', this.handleMouseUp);
    }
    if (this.svgOverlay) {
      this.svgOverlay.remove();
      this.svgOverlay = null;
    }
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Delete key to remove selected drawing
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedElement) {
        this.deleteSelectedDrawing();
      }
    }
    // Escape key to deselect
    if (e.key === 'Escape') {
      this.deselectElement();
    }
  }

  setActiveTool(tool: string | null) {
    this.activeTool = tool;
    this.updateCursor();
  }

  setCursorType(cursorType: 'diagonal' | 'dot' | 'arrow' | 'illustration') {
    console.log('DrawingService: Setting cursor type:', cursorType);
    this.cursorType = cursorType;
    // Force update cursor immediately
    this.updateCursor();
    // Also update after a small delay to ensure it sticks
    setTimeout(() => {
      this.updateCursor();
    }, 50);
  }

  // Force refresh cursor - useful for debugging
  refreshCursor() {
    console.log('Force refreshing cursor...');
    this.updateCursor();
  }

  private updateCursor() {
    if (!this.container) return;

    if (this.activeTool === 'selection') {
      const cursorStyle = this.getCursorStyle();
      console.log('Updating cursor to:', cursorStyle, 'for tool:', this.activeTool, 'cursorType:', this.cursorType);
      this.container.style.cursor = cursorStyle;
      
      // Also update document body cursor for immediate feedback
      document.body.style.cursor = cursorStyle;
    } else if (this.activeTool) {
      this.container.style.cursor = 'crosshair';
      document.body.style.cursor = 'crosshair';
    } else {
      this.container.style.cursor = 'default';
      document.body.style.cursor = 'default';
    }
  }

  private getCursorStyle(): string {
    switch (this.cursorType) {
      case 'diagonal':
        return 'crosshair';
      case 'dot':
        // Create a custom dot cursor using data URL
        return 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\'%3E%3Ccircle cx=\'8\' cy=\'8\' r=\'4\' fill=\'%23000000\'/%3E%3C/svg%3E") 8 8, default';
      case 'arrow':
        return 'default';
      case 'illustration':
        return 'move';
      default:
        return 'default';
    }
  }

  private createSVGOverlay(): void {
    if (!this.container) return;
    
    // Remove existing overlay if any
    const existingOverlay = this.container.querySelector('.drawing-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create SVG overlay
    this.svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgOverlay.classList.add('drawing-overlay');
    this.svgOverlay.style.position = 'absolute';
    this.svgOverlay.style.top = '0';
    this.svgOverlay.style.left = '0';
    this.svgOverlay.style.width = '100%';
    this.svgOverlay.style.height = '100%';
    this.svgOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through to chart
    this.svgOverlay.style.zIndex = '1000'; // Ensure it's on top
    
    this.container.appendChild(this.svgOverlay);
  }

  private handleMouseDown(e: MouseEvent) {
    if (!this.svgOverlay) return;

    // Handle selection mode
    if (this.activeTool === 'selection') {
      this.handleSelection(e);
      return;
    }

    // Handle drawing mode
    if (!this.activeTool) return;

    const snappedPoint = this.snapToPricePoint(e.offsetX, e.offsetY);

    // Check if this is a multi-point drawing tool
    if (this.activeTool === 'polygon') {
      this.handleMultiPointDrawing(snappedPoint, e);
      return;
    }

    // Single-point drawing tools
    this.isDrawing = true;
    this.startPoint = snappedPoint;

    // Create drawing element
    this.currentElement = this.createDrawingElement(this.activeTool);
    if (this.currentElement && this.svgOverlay) {
      this.svgOverlay.appendChild(this.currentElement);
      // Store in drawings map
      this.drawings.set(this.currentElement.id, this.currentElement);
      // Enable pointer events for drawing
      this.svgOverlay.style.pointerEvents = 'auto';
    }
  }

  private handleMultiPointDrawing(point: { x: number; y: number }, e: MouseEvent) {
    if (!this.isMultiPointDrawing) {
      // Start new polygon
      this.isMultiPointDrawing = true;
      this.polygonPoints = [point];
      this.currentElement = this.createDrawingElement('polygon');
      if (this.currentElement && this.svgOverlay) {
        this.svgOverlay.appendChild(this.currentElement);
        this.drawings.set(this.currentElement.id, this.currentElement);
        this.svgOverlay.style.pointerEvents = 'auto';
      }
    } else {
      // Add point to existing polygon
      this.polygonPoints.push(point);
      this.updatePolygonPoints();
    }

    // Double-click to finish polygon
    if (e.detail === 2) {
      this.finishPolygon();
    }
  }

  private updatePolygonPoints() {
    if (!this.currentElement || this.polygonPoints.length < 2) return;
    
    const pointsString = this.polygonPoints.map(p => `${p.x},${p.y}`).join(' ');
    this.currentElement.setAttribute('points', pointsString);
  }

  private finishPolygon() {
    if (this.polygonPoints.length >= 3) {
      this.isMultiPointDrawing = false;
      this.polygonPoints = [];
      this.currentElement = null;
      if (this.svgOverlay) {
        this.svgOverlay.style.pointerEvents = 'none';
      }
    }
  }

  private handleSelection(e: MouseEvent) {
    const target = e.target as SVGElement;
    
    // If clicking on a drawing element, select it
    if (target && target.tagName && this.drawings.has(target.id)) {
      this.selectElement(target);
      this.isDragging = true;
      this.dragOffset = {
        x: e.offsetX - parseFloat(target.getAttribute('x1') || '0'),
        y: e.offsetY - parseFloat(target.getAttribute('y1') || '0')
      };
    } else {
      // Deselect current element
      this.deselectElement();
    }
  }

  private selectElement(element: SVGElement) {
    this.deselectElement();
    this.selectedElement = element;
    element.setAttribute('stroke-width', '3');
    element.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 0, 0.8))';
  }

  private deselectElement() {
    if (this.selectedElement) {
      this.selectedElement.setAttribute('stroke-width', '2');
      this.selectedElement.style.filter = 'drop-shadow(0 0 3px rgba(0, 255, 0, 0.5))';
      this.selectedElement = null;
    }
  }

  private handleMouseMove(e: MouseEvent) {
    // Handle dragging selected element
    if (this.isDragging && this.selectedElement && this.dragOffset) {
      const newX1 = e.offsetX - this.dragOffset.x;
      const newY1 = e.offsetY - this.dragOffset.y;
      const newX2 = e.offsetX - this.dragOffset.x + (parseFloat(this.selectedElement.getAttribute('x2') || '0') - parseFloat(this.selectedElement.getAttribute('x1') || '0'));
      const newY2 = e.offsetY - this.dragOffset.y + (parseFloat(this.selectedElement.getAttribute('y2') || '0') - parseFloat(this.selectedElement.getAttribute('y1') || '0'));
      
      this.selectedElement.setAttribute('x1', newX1.toString());
      this.selectedElement.setAttribute('y1', newY1.toString());
      this.selectedElement.setAttribute('x2', newX2.toString());
      this.selectedElement.setAttribute('y2', newY2.toString());
      return;
    }

    // Handle polygon preview
    if (this.isMultiPointDrawing && this.currentElement && this.polygonPoints.length > 0) {
      const snappedPoint = this.snapToPricePoint(e.offsetX, e.offsetY);
      const previewPoints = [...this.polygonPoints, snappedPoint];
      const pointsString = previewPoints.map(p => `${p.x},${p.y}`).join(' ');
      this.currentElement.setAttribute('points', pointsString);
      return;
    }

    // Handle drawing new element
    if (!this.isDrawing || !this.startPoint || !this.currentElement) return;

    const snappedPoint = this.snapToPricePoint(e.offsetX, e.offsetY);
    this.updateDrawingElement(this.currentElement, this.startPoint, snappedPoint);
  }

  private snapToPricePoint(x: number, y: number): { x: number; y: number } {
    if (!this.container) return { x, y };

    const snapThreshold = 10; // pixels

    // Snap to grid (every 20px for demo)
    const gridSize = 20;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;

    // Only snap if within threshold
    const deltaX = Math.abs(x - snappedX);
    const deltaY = Math.abs(y - snappedY);

    const snapped = deltaX < snapThreshold || deltaY < snapThreshold;
    
    // Show visual feedback for snapping
    if (snapped) {
      this.showSnapIndicator(snappedX, snappedY);
    }

    return {
      x: deltaX < snapThreshold ? snappedX : x,
      y: deltaY < snapThreshold ? snappedY : y
    };
  }

  private showSnapIndicator(x: number, y: number) {
    // Remove existing snap indicator
    const existingIndicator = this.svgOverlay?.querySelector('.snap-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create new snap indicator
    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    indicator.classList.add('snap-indicator');
    indicator.setAttribute('cx', x.toString());
    indicator.setAttribute('cy', y.toString());
    indicator.setAttribute('r', '3');
    indicator.setAttribute('fill', '#00ff00');
    indicator.setAttribute('opacity', '0.8');
    indicator.style.pointerEvents = 'none';
    
    if (this.svgOverlay) {
      this.svgOverlay.appendChild(indicator);
      
      // Remove indicator after short delay
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.remove();
        }
      }, 200);
    }
  }

  private handleMouseUp() {
    // Handle dragging end
    if (this.isDragging) {
      this.isDragging = false;
      this.dragOffset = null;
      return;
    }

    // Handle drawing end
    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.startPoint = null;
    
    // Reset pointer events after drawing
    if (this.svgOverlay) {
      this.svgOverlay.style.pointerEvents = 'none';
    }
    
    this.currentElement = null;
  }

  private createDrawingElement(tool: string): SVGElement | null {
    const id = `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    switch (tool) {
      case 'trendline':
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('id', id);
        line.setAttribute('stroke', '#00ff00');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('cursor', 'pointer');
        line.style.filter = 'drop-shadow(0 0 3px rgba(0, 255, 0, 0.5))';
        this.addHoverEffects(line);
        return line;
        
      case 'horizontal-line':
        const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hLine.setAttribute('id', id);
        hLine.setAttribute('stroke', '#ff0000');
        hLine.setAttribute('stroke-width', '2');
        hLine.setAttribute('stroke-dasharray', '5,5');
        hLine.setAttribute('cursor', 'pointer');
        this.addHoverEffects(hLine);
        return hLine;
        
      case 'vertical-line':
        const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vLine.setAttribute('id', id);
        vLine.setAttribute('stroke', '#0000ff');
        vLine.setAttribute('stroke-width', '2');
        vLine.setAttribute('stroke-dasharray', '5,5');
        vLine.setAttribute('cursor', 'pointer');
        this.addHoverEffects(vLine);
        return vLine;
        
      case 'rectangle':
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('id', id);
        rect.setAttribute('fill', 'rgba(255, 255, 0, 0.1)');
        rect.setAttribute('stroke', '#ffff00');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('cursor', 'pointer');
        rect.style.filter = 'drop-shadow(0 0 3px rgba(255, 255, 0, 0.5))';
        this.addHoverEffects(rect);
        return rect;
        
      case 'ellipse':
        const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ellipse.setAttribute('id', id);
        ellipse.setAttribute('fill', 'rgba(255, 0, 255, 0.1)');
        ellipse.setAttribute('stroke', '#ff00ff');
        ellipse.setAttribute('stroke-width', '2');
        ellipse.setAttribute('cursor', 'pointer');
        ellipse.style.filter = 'drop-shadow(0 0 3px rgba(255, 0, 255, 0.5))';
        this.addHoverEffects(ellipse);
        return ellipse;
        
      case 'polygon':
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('id', id);
        polygon.setAttribute('data-tool', 'polygon');
        polygon.setAttribute('fill', 'rgba(0, 255, 255, 0.1)');
        polygon.setAttribute('stroke', '#00ffff');
        polygon.setAttribute('stroke-width', '2');
        polygon.setAttribute('cursor', 'pointer');
        polygon.style.filter = 'drop-shadow(0 0 3px rgba(0, 255, 255, 0.5))';
        this.addHoverEffects(polygon);
        return polygon;
        
      case 'triangle':
        const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        triangle.setAttribute('id', id);
        triangle.setAttribute('data-tool', 'triangle');
        triangle.setAttribute('fill', 'rgba(255, 165, 0, 0.1)');
        triangle.setAttribute('stroke', '#ffa500');
        triangle.setAttribute('stroke-width', '2');
        triangle.setAttribute('cursor', 'pointer');
        triangle.style.filter = 'drop-shadow(0 0 3px rgba(255, 165, 0, 0.5))';
        this.addHoverEffects(triangle);
        return triangle;
        
      case 'arrow':
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        arrow.setAttribute('id', id);
        arrow.setAttribute('data-tool', 'arrow');
        arrow.setAttribute('fill', 'rgba(255, 0, 0, 0.1)');
        arrow.setAttribute('stroke', '#ff0000');
        arrow.setAttribute('stroke-width', '2');
        arrow.setAttribute('cursor', 'pointer');
        arrow.style.filter = 'drop-shadow(0 0 3px rgba(255, 0, 0, 0.5))';
        this.addHoverEffects(arrow);
        return arrow;
        
      case 'text':
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('id', id);
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-family', 'Arial');
        text.setAttribute('font-size', '14');
        text.setAttribute('cursor', 'pointer');
        text.textContent = 'Text';
        this.addHoverEffects(text);
        return text;
        
      default:
        return null;
    }
  }

  private addHoverEffects(element: SVGElement) {
    element.addEventListener('mouseenter', () => {
      const currentStrokeWidth = element.getAttribute('stroke-width') || '2';
      element.setAttribute('data-original-stroke-width', currentStrokeWidth);
      element.setAttribute('stroke-width', (parseInt(currentStrokeWidth) + 1).toString());
    });
    
    element.addEventListener('mouseleave', () => {
      const originalStrokeWidth = element.getAttribute('data-original-stroke-width') || '2';
      element.setAttribute('stroke-width', originalStrokeWidth);
    });
  }

  private updateDrawingElement(
    element: SVGElement,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) {
    switch (element.tagName.toLowerCase()) {
      case 'line':
        element.setAttribute('x1', start.x.toString());
        element.setAttribute('y1', start.y.toString());
        element.setAttribute('x2', end.x.toString());
        element.setAttribute('y2', end.y.toString());
        break;
        
      case 'rect':
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        element.setAttribute('x', x.toString());
        element.setAttribute('y', y.toString());
        element.setAttribute('width', width.toString());
        element.setAttribute('height', height.toString());
        break;
        
      case 'ellipse':
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        element.setAttribute('cx', cx.toString());
        element.setAttribute('cy', cy.toString());
        element.setAttribute('rx', rx.toString());
        element.setAttribute('ry', ry.toString());
        break;
        
      case 'polygon':
        const tool = element.getAttribute('data-tool') || 'polygon';
        if (tool === 'triangle') {
          // Create triangle: start point, end point, and calculated third point
          const midX = (start.x + end.x) / 2;
          const midY = start.y - Math.abs(end.y - start.y);
          element.setAttribute('points', `${start.x},${start.y} ${end.x},${end.y} ${midX},${midY}`);
        } else if (tool === 'arrow') {
          // Create arrow shape
          const headLength = Math.abs(end.x - start.x) * 0.3;
          const headWidth = Math.abs(end.y - start.y) * 0.2;
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          
          const arrowHeadX = end.x - headLength * Math.cos(angle);
          const arrowHeadY = end.y - headLength * Math.sin(angle);
          
          const leftWingX = arrowHeadX + headWidth * Math.cos(angle - Math.PI / 2);
          const leftWingY = arrowHeadY + headWidth * Math.sin(angle - Math.PI / 2);
          
          const rightWingX = arrowHeadX + headWidth * Math.cos(angle + Math.PI / 2);
          const rightWingY = arrowHeadY + headWidth * Math.sin(angle + Math.PI / 2);
          
          element.setAttribute('points', `${start.x},${start.y} ${arrowHeadX},${arrowHeadY} ${leftWingX},${leftWingY} ${end.x},${end.y} ${rightWingX},${rightWingY} ${arrowHeadX},${arrowHeadY}`);
        } else {
          // Regular polygon (rectangle for now)
          element.setAttribute('points', `${start.x},${start.y} ${end.x},${start.y} ${end.x},${end.y} ${start.x},${end.y}`);
        }
        break;
        
      case 'text':
        element.setAttribute('x', start.x.toString());
        element.setAttribute('y', start.y.toString());
        break;
    }
  }

  // Delete all drawings
  clearAllDrawings() {
    if (this.svgOverlay) {
      this.svgOverlay.innerHTML = '';
    }
    this.drawings.clear();
    this.selectedElement = null;
  }

  // Delete selected drawing
  deleteSelectedDrawing() {
    if (this.selectedElement) {
      this.selectedElement.remove();
      this.drawings.delete(this.selectedElement.id);
      this.selectedElement = null;
    }
  }

  // Delete drawing by ID
  deleteDrawing(id: string) {
    const element = this.drawings.get(id);
    if (element) {
      element.remove();
      this.drawings.delete(id);
      if (this.selectedElement && this.selectedElement.id === id) {
        this.selectedElement = null;
      }
    }
  }

  // Lock all drawings
  lockAllDrawings() {
    if (this.svgOverlay) {
      this.svgOverlay.style.pointerEvents = 'none';
    }
  }

  // Unlock all drawings
  unlockAllDrawings() {
    if (this.svgOverlay) {
      this.svgOverlay.style.pointerEvents = 'auto';
    }
  }

  // Toggle visibility of drawings
  toggleVisibility() {
    if (this.svgOverlay) {
      this.svgOverlay.style.display = this.svgOverlay.style.display === 'none' ? '' : 'none';
    }
  }
}

// Singleton instance
export const drawingService = new DrawingService();