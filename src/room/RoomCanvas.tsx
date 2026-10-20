import { createRoot, events, extend, type ReconcilerRoot, type RenderProps, type Size } from '@react-three/fiber';
import { Component, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { CATALOGUE } from './catalogue';

// Only the classes the room uses (see catalogue.ts), not the whole three namespace.
extend(CATALOGUE);

/** Re-throws errors from the R3F tree into this React tree, as <Canvas> does. */
class Rethrow extends Component<{ onError: (error: unknown) => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface Props
  extends Pick<RenderProps<HTMLCanvasElement>, 'dpr' | 'gl' | 'camera'> {
  onPointerMissed?: (event: MouseEvent) => void;
  children: ReactNode;
}

function measure(el: HTMLElement): Size {
  const { width, height, top, left } = el.getBoundingClientRect();
  return { width, height, top, left };
}

/**
 * R3F's <Canvas>, cut down to what the room needs: R3F's createRoot with our own catalogue
 * (so three tree-shakes), sized to its container with a ResizeObserver, pointer events
 * connected to the container (where drei's <Html> also renders), errors re-thrown here (so
 * mount.tsx's onUncaughtError restores the page), and the root unmounted with the component
 * (which disposes the renderer and forces the WebGL context loss).
 */
export function RoomCanvas({ dpr, gl, camera, onPointerMissed, children }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<ReconcilerRoot<HTMLCanvasElement> | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [error, setError] = useState<unknown>(null);
  const missed = useRef(onPointerMissed);
  missed.current = onPointerMissed;
  if (error) throw error;

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const update = () => {
      const next = measure(el);
      setSize((prev) =>
        prev && prev.width === next.width && prev.height === next.height && prev.top === next.top && prev.left === next.left
          ? prev
          : next,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el || !size || size.width === 0 || size.height === 0) return;
    if (!root.current) root.current = createRoot(el);
    root.current
      .configure({
        gl,
        dpr,
        camera,
        size,
        events,
        onPointerMissed: (event) => missed.current?.(event),
        onCreated: (state) => {
          if (container.current) state.events.connect?.(container.current);
        },
      })
      .catch(setError);
    root.current.render(<Rethrow onError={setError}>{children}</Rethrow>);
  });

  useEffect(
    () => () => {
      root.current?.unmount();
      root.current = null;
    },
    [],
  );

  return (
    <div ref={container} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={canvas} style={{ display: 'block' }} />
    </div>
  );
}
