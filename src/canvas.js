export class PaintCanvas {
  constructor(canvasElement, onStrokeEmit, onClearEmit) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.onStrokeEmit = onStrokeEmit;
    this.onClearEmit = onClearEmit;

    this.isDrawing = false;
    this.canDraw = false;
    this.currentColor = '#1e1e24';
    this.currentSize = 6;
    this.isEraser = false;
    this.strokeHistory = [];

    this.initCanvasSize();
    this.bindEvents();

    window.addEventListener('resize', () => this.handleResize());
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  loadStrokeHistory(strokes) {
    if (!Array.isArray(strokes)) return;
    this.strokeHistory = strokes.map(s => (typeof s === 'string' ? JSON.parse(s) : s)).filter(Boolean);
    this.initCanvasSize();
    this.redrawAll();
  }

  redrawAll() {
    if (!this.width || !this.height || !this.strokeHistory || !this.strokeHistory.length) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const stroke of this.strokeHistory) {
      if (!stroke) continue;
      const s = typeof stroke === 'string' ? JSON.parse(stroke) : stroke;
      if (!s) continue;
      const x0 = s.x0 * this.width;
      const y0 = s.y0 * this.height;
      const x1 = s.x1 * this.width;
      const y1 = s.y1 * this.height;
      this.drawSegment(x0, y0, x1, y1, s.color, s.size);
    }
  }

  setCanDraw(canDraw) {
    this.canDraw = !!canDraw;
    if (!this.canDraw) {
      this.isDrawing = false;
      this.canvas.style.cursor = 'default';
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  initCanvasSize() {
    if (!this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Scale for crisp high DPI screens
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;

    if (this.ctx.resetTransform) {
      this.ctx.resetTransform();
    }
    this.ctx.scale(dpr, dpr);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.redrawAll();
  }

  handleResize() {
    this.initCanvasSize();
  }

  bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startDraw(this.getCoords(e)));
    this.canvas.addEventListener('mousemove', (e) => this.draw(this.getCoords(e)));
    window.addEventListener('mouseup', () => this.stopDraw());

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        this.startDraw(this.getTouchCoords(e.touches[0]));
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        this.draw(this.getTouchCoords(e.touches[0]));
      }
    }, { passive: false });

    window.addEventListener('touchend', () => this.stopDraw());
  }

  getCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  getTouchCoords(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  startDraw({ x, y }) {
    if (!this.canDraw) return;
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;

    // Dot on single tap
    this.drawSegment(x, y, x + 0.1, y + 0.1, this.getColor(), this.currentSize);

    const strokeItem = {
      type: 'start',
      x0: x / this.width,
      y0: y / this.height,
      x1: (x + 0.1) / this.width,
      y1: (y + 0.1) / this.height,
      color: this.getColor(),
      size: this.currentSize
    };
    this.strokeHistory.push(strokeItem);

    if (this.onStrokeEmit) {
      this.onStrokeEmit(strokeItem);
    }
  }

  draw({ x, y }) {
    if (!this.canDraw || !this.isDrawing) return;

    const color = this.getColor();
    const size = this.currentSize;

    this.drawSegment(this.lastX, this.lastY, x, y, color, size);

    const strokeItem = {
      type: 'draw',
      x0: this.lastX / this.width,
      y0: this.lastY / this.height,
      x1: x / this.width,
      y1: y / this.height,
      color: color,
      size: size
    };
    this.strokeHistory.push(strokeItem);

    if (this.onStrokeEmit) {
      this.onStrokeEmit(strokeItem);
    }

    this.lastX = x;
    this.lastY = y;
  }

  stopDraw() {
    this.isDrawing = false;
  }

  getColor() {
    return this.isEraser ? '#ffffff' : this.currentColor;
  }

  drawSegment(x0, y0, x1, y1, color, size) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.moveTo(x0, y0);
    this.ctx.lineTo(x1, y1);
    this.ctx.stroke();
    this.ctx.closePath();
  }

  // Draw remote stroke from other players
  drawRemoteStroke(stroke) {
    if (!stroke) return;
    const s = typeof stroke === 'string' ? JSON.parse(stroke) : stroke;
    this.strokeHistory.push(s);

    if (!this.width || !this.height || this.width === 0 || this.height === 0) {
      this.initCanvasSize();
    }
    const x0 = s.x0 * this.width;
    const y0 = s.y0 * this.height;
    const x1 = s.x1 * this.width;
    const y1 = s.y1 * this.height;

    this.drawSegment(x0, y0, x1, y1, s.color, s.size);
  }

  clear(emit = true) {
    this.strokeHistory = [];
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (emit && this.onClearEmit) {
      this.onClearEmit();
    }
  }

  setColor(hex) {
    this.currentColor = hex;
    this.isEraser = false;
  }

  setSize(size) {
    this.currentSize = size;
  }

  setEraser(active) {
    this.isEraser = active;
  }
}
