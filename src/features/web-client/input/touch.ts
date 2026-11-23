import type { hbb } from '../protocol';
import { type RemoteDisplay, remotePoint } from './input';

export type TouchMode = 'pointer' | 'scroll' | 'zoom' | 'mouse';
export interface Viewport {
  scale: number;
  x: number;
  y: number;
}
interface Point {
  x: number;
  y: number;
}
export class RemoteTouch {
  private points = new Map<number, Point>();
  private origin?: Point;
  private last?: Point;
  private dragging = false;
  private suppressClick = false;
  private distance = 0;
  private midpoint?: Point;
  private hold?: ReturnType<typeof setTimeout>;
  private cursor?: Point;
  private pinchStart = 0;
  private pinchOrigin?: Map<number, Point>;
  private pinchMoved = 0;
  private cursorEl?: HTMLDivElement;
  private abort = new AbortController();
  constructor(
    private canvas: HTMLCanvasElement,
    private display: RemoteDisplay,
    private send: (input: { mouseEvent: hbb.IMouseEvent }) => void,
    private mode: TouchMode,
    private viewport: Viewport,
    private changed: (viewport: Viewport) => void,
  ) {
    const options = { signal: this.abort.signal, passive: false };
    canvas.addEventListener('pointerdown', this.down, options);
    canvas.addEventListener('pointermove', this.move, options);
    canvas.addEventListener('pointerup', this.up, options);
    canvas.addEventListener('pointercancel', this.cancel, options);
    canvas.addEventListener('lostpointercapture', this.cancel, options);
    window.addEventListener('blur', this.cancel, options);
    window.addEventListener('orientationchange', this.cancel, options);
    document.addEventListener('visibilitychange', this.visibility, options);
    if (mode === 'mouse') this.createCursor();
  }
  private visibility = () => {
    if (document.hidden) this.cancel();
  };
  private point(event: PointerEvent) {
    return { x: event.clientX, y: event.clientY };
  }
  private position(point: Point) {
    const remote = remotePoint(
      point.x,
      point.y,
      this.canvas.getBoundingClientRect(),
      this.display,
    );
    if (remote) this.send({ mouseEvent: { mask: 0, ...remote } });
  }
  private clamp(point: Point) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.max(rect.left, Math.min(rect.left + rect.width, point.x)),
      y: Math.max(rect.top, Math.min(rect.top + rect.height, point.y)),
    };
  }
  private createCursor() {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;left:0;top:0;width:20px;height:20px;margin:-2px 0 0 -2px;' +
      'pointer-events:none;z-index:9999;display:none;' +
      'filter:drop-shadow(0 1px 2px rgba(0,0,0,.65))';
    el.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24">' +
      '<path d="M4 2l15 9-6.4 1.6L9 21z" fill="#fff" stroke="#111" ' +
      'stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(el);
    this.cursorEl = el;
  }
  private showCursor(point: Point) {
    const el = this.cursorEl;
    if (!el) return;
    el.style.display = 'block';
    el.style.left = `${point.x}px`;
    el.style.top = `${point.y}px`;
  }
  private click(button = 1) {
    this.send({ mouseEvent: { mask: 1 | (button << 3) } });
    this.send({ mouseEvent: { mask: 2 | (button << 3) } });
  }
  private pair() {
    const [a, b] = [...this.points.values()];
    return {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }
  private down = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    if (this.points.size >= 2) {
      this.cancel();
      return;
    }
    this.canvas.setPointerCapture(event.pointerId);
    const point = this.point(event);
    this.points.set(event.pointerId, point);
    if (this.points.size === 2) {
      clearTimeout(this.hold);
      this.releaseDrag();
      this.suppressClick = true;
      const pair = this.pair();
      this.distance = pair.distance;
      this.midpoint = pair.midpoint;
      if (this.mode === 'mouse') {
        this.pinchStart = Date.now();
        this.pinchOrigin = new Map(this.points);
        this.pinchMoved = 0;
      }
      return;
    }
    this.origin = this.last = point;
    this.suppressClick = false;
    if (this.mode === 'mouse') {
      if (!this.cursor) this.cursor = { ...point };
      this.showCursor(this.cursor);
      this.position(this.cursor);
      this.hold = setTimeout(() => {
        if (this.points.size === 1 && !this.dragging && !this.suppressClick) {
          this.position(this.cursor ?? point);
          this.click(2);
          this.suppressClick = true;
        }
      }, 500);
    } else if (this.mode === 'pointer') {
      this.position(point);
      this.hold = setTimeout(() => {
        if (this.points.size === 1 && !this.dragging && !this.suppressClick) {
          this.click(2);
          this.suppressClick = true;
        }
      }, 500);
    }
  };
  private move = (event: PointerEvent) => {
    if (!this.points.has(event.pointerId)) return;
    event.preventDefault();
    const point = this.point(event);
    this.points.set(event.pointerId, point);
    if (this.points.size === 2) {
      const pair = this.pair();
      if (this.mode === 'mouse') {
        if (this.pinchOrigin) {
          for (const [id, current] of this.points) {
            const start = this.pinchOrigin.get(id);
            if (start)
              this.pinchMoved = Math.max(
                this.pinchMoved,
                Math.hypot(current.x - start.x, current.y - start.y),
              );
          }
        }
        const dx = pair.midpoint.x - (this.midpoint?.x ?? pair.midpoint.x);
        const dy = pair.midpoint.y - (this.midpoint?.y ?? pair.midpoint.y);
        if (Math.abs(dx) >= 24 || Math.abs(dy) >= 24) {
          this.send({
            mouseEvent: {
              mask: 3,
              x: Math.trunc(dx / 24),
              y: Math.trunc(dy / 24),
            },
          });
          this.midpoint = pair.midpoint;
        }
        this.distance = pair.distance;
        return;
      }
      const scale = Math.max(
        1,
        Math.min(
          3,
          this.viewport.scale *
            (this.distance > 0 ? pair.distance / this.distance : 1),
        ),
      );
      this.viewport = {
        scale,
        x:
          scale === 1
            ? 0
            : Math.max(
                -2000,
                Math.min(
                  2000,
                  this.viewport.x +
                    pair.midpoint.x -
                    (this.midpoint?.x ?? pair.midpoint.x),
                ),
              ),
        y:
          scale === 1
            ? 0
            : Math.max(
                -2000,
                Math.min(
                  2000,
                  this.viewport.y +
                    pair.midpoint.y -
                    (this.midpoint?.y ?? pair.midpoint.y),
                ),
              ),
      };
      this.distance = pair.distance;
      this.midpoint = pair.midpoint;
      this.changed(this.viewport);
      return;
    }
    if (this.suppressClick || !this.last || !this.origin) return;
    const dx = point.x - this.last.x;
    const dy = point.y - this.last.y;
    if (this.mode === 'mouse') {
      const distance = Math.hypot(
        point.x - this.origin.x,
        point.y - this.origin.y,
      );
      if (distance > 6) clearTimeout(this.hold);
      this.cursor = this.clamp({
        x: (this.cursor?.x ?? this.origin.x) + dx,
        y: (this.cursor?.y ?? this.origin.y) + dy,
      });
      this.position(this.cursor);
      this.showCursor(this.cursor);
      this.last = point;
    } else if (this.mode === 'zoom') {
      this.viewport = {
        ...this.viewport,
        x:
          this.viewport.scale === 1
            ? 0
            : Math.max(-2000, Math.min(2000, this.viewport.x + dx)),
        y:
          this.viewport.scale === 1
            ? 0
            : Math.max(-2000, Math.min(2000, this.viewport.y + dy)),
      };
      this.changed(this.viewport);
      this.last = point;
    } else if (this.mode === 'scroll') {
      if (Math.abs(dx) >= 24 || Math.abs(dy) >= 24) {
        this.send({
          mouseEvent: {
            mask: 3,
            x: Math.trunc(dx / 24),
            y: Math.trunc(dy / 24),
          },
        });
        this.last = point;
      }
    } else if (
      Math.hypot(point.x - this.origin.x, point.y - this.origin.y) > 6 ||
      this.dragging
    ) {
      clearTimeout(this.hold);
      if (!this.dragging) {
        this.dragging = true;
        this.send({ mouseEvent: { mask: 9 } });
      }
      this.position(point);
      this.last = point;
    }
  };
  private up = (event: PointerEvent) => {
    if (!this.points.has(event.pointerId)) return;
    event.preventDefault();
    clearTimeout(this.hold);
    const point = this.point(event);
    if (this.mode === 'mouse' && this.points.size === 2) {
      this.points.set(event.pointerId, point);
      if (Date.now() - this.pinchStart < 300 && this.pinchMoved < 10) {
        this.cursor = this.cursor ?? { ...point };
        this.position(this.cursor);
        this.showCursor(this.cursor);
        this.click(2);
      }
      this.points.delete(event.pointerId);
      this.pinchOrigin = undefined;
      this.suppressClick = true;
      return;
    }
    if (
      this.points.size === 1 &&
      !this.suppressClick &&
      this.mode === 'pointer'
    ) {
      if (this.dragging) this.releaseDrag();
      else {
        this.position(point);
        this.click();
      }
    } else if (
      this.mode === 'mouse' &&
      this.points.size === 1 &&
      !this.suppressClick &&
      this.origin &&
      Math.hypot(point.x - this.origin.x, point.y - this.origin.y) < 6
    ) {
      this.cursor = this.cursor ?? { ...point };
      this.position(this.cursor);
      this.showCursor(this.cursor);
      this.click();
    }
    this.points.delete(event.pointerId);
    if (!this.points.size) {
      this.origin = this.last = undefined;
      this.suppressClick = false;
      this.pinchOrigin = undefined;
    }
  };
  private releaseDrag() {
    if (this.dragging) this.send({ mouseEvent: { mask: 10 } });
    this.dragging = false;
  }
  setViewport(viewport: Viewport) {
    this.cancel();
    this.viewport = viewport;
  }
  cancel = () => {
    clearTimeout(this.hold);
    this.releaseDrag();
    this.points.clear();
    this.origin = this.last = undefined;
    this.suppressClick = true;
    this.pinchOrigin = undefined;
    this.pinchMoved = 0;
    this.pinchStart = 0;
  };
  dispose() {
    this.cancel();
    this.cursorEl?.remove();
    this.cursorEl = undefined;
    this.abort.abort();
  }
}
