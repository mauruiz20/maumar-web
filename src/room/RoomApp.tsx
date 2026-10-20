import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Content } from '../content/profile';
import { CameraRig, FOV } from './CameraRig';
import { HOTSPOTS, OVERVIEW, OVERVIEW_PORTRAIT, hotspotById, type HotspotId, type ProjectId } from './hotspots';
import { PanelBody, panelTitle } from './panels';
import { Scene, type TargetId } from './Scene';

export interface RoomAppProps {
  content: Content;
  /** Touch-first device: markers, larger hit areas, bottom sheet, lower dpr. */
  coarse: boolean;
  reducedMotion: boolean;
  onReady: () => void;
}

export function RoomApp({ content, coarse, reducedMotion, onReady }: RoomAppProps) {
  const { room } = content;
  const [active, setActive] = useState<HotspotId | null>(null);
  const [hovered, setHovered] = useState<TargetId | null>(null);
  const [book, setBook] = useState<ProjectId>('turnero');
  const [lampOn, setLampOn] = useState(true);
  const [portrait] = useState(() => window.innerWidth < window.innerHeight);

  const menuButtons = useRef(new Map<HotspotId, HTMLButtonElement>());
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const lastActive = useRef<HotspotId | null>(null);

  const select = useCallback((id: HotspotId) => setActive(id), []);
  const back = useCallback(() => setActive(null), []);
  const selectBook = useCallback((id: ProjectId) => {
    setBook(id);
    setActive('bookshelf');
  }, []);

  // Escape returns to the overview (it never closes the room).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus follows the view: into the content when it opens, back to its menu item after.
  useEffect(() => {
    if (active) {
      lastActive.current = active;
      // The monitor screen focuses itself when it mounts (see Scene).
      panelHeading.current?.focus({ preventScroll: true });
      return;
    }
    const previous = lastActive.current;
    if (previous) menuButtons.current.get(previous)?.focus({ preventScroll: true });
  }, [active]);

  const hotspot = active ? hotspotById(active) : null;
  const showPanel = hotspot && (coarse || hotspot.id !== 'monitor');
  const overview = portrait ? OVERVIEW_PORTRAIT : OVERVIEW;

  return (
    <div className={`room-app${coarse ? ' is-coarse' : ''}`}>
      <div className="room-stage">
        <Canvas
          dpr={coarse ? [1, 1.5] : [1, 2]}
          // The view out of the window is drawn through a stencil mask (Outside.tsx).
          gl={{ stencil: true }}
          camera={{
            fov: portrait ? FOV.portrait : FOV.landscape,
            near: 0.05,
            // The sky outside the window has a 150 m radius.
            far: 180,
            position: [...overview.position],
          }}
          onCreated={() => onReady()}
          onPointerMissed={() => setHovered(null)}
        >
          <color attach="background" args={['#ece9e1']} />
          <Scene
            content={content}
            coarse={coarse}
            active={active}
            hovered={hovered}
            lampOn={lampOn}
            onHover={setHovered}
            onSelect={select}
            onBook={selectBook}
            onLamp={() => setLampOn((on) => !on)}
          />
          <CameraRig
            view={hotspot?.view ?? null}
            reducedMotion={reducedMotion}
            panel={showPanel ? (coarse ? 'sheet' : 'side') : null}
          />
        </Canvas>
      </div>

      <nav className="room-menu" aria-label={room.menu}>
        <p className="room-hint">{room.hint}</p>
        <ul>
          {HOTSPOTS.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                ref={(el) => {
                  if (el) menuButtons.current.set(h.id, el);
                  else menuButtons.current.delete(h.id);
                }}
                aria-current={active === h.id ? 'true' : undefined}
                onClick={() => select(h.id)}
              >
                {room.hotspots[h.id]}
              </button>
            </li>
          ))}
          <li>
            <button type="button" aria-pressed={lampOn} onClick={() => setLampOn((on) => !on)}>
              {room.lamp}
            </button>
          </li>
        </ul>
      </nav>

      {hotspot && (
        <button type="button" className="room-back" onClick={back}>
          <span aria-hidden="true">←</span> {room.back}
        </button>
      )}

      {showPanel && hotspot && (
        <section
          className={`room-panel${coarse ? ' is-sheet' : ''}`}
          aria-labelledby="room-panel-title"
          key={hotspot.id}
        >
          <h2 id="room-panel-title" ref={panelHeading} tabIndex={-1}>
            {panelTitle(content, hotspot.content)}
          </h2>
          <div className="room-panel-body">
            <PanelBody content={content} what={hotspot.content} book={book} onBook={selectBook} />
          </div>
        </section>
      )}
    </div>
  );
}
