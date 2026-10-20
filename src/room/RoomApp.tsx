import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { Content } from '../content/profile';
import { CameraRig } from './CameraRig';
import { RoomCanvas } from './RoomCanvas';
import { FOV, HOTSPOTS, OVERVIEW, OVERVIEW_PORTRAIT, hasPanel, hotspotById, type HotspotId, type ProjectId } from './hotspots';
import { MENU_COMPACT_WIDTH, menuLayout } from './menu';
import { DESK_VIEW, markerPosition, navigate, placeOf, visibleMarkers, type MarkerId, type NavAction, type NavStack } from './nav';
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
  // Back stack of places (see nav.ts): empty is the overview.
  const [stack, setStack] = useState<NavStack>([]);
  const place = placeOf(stack);
  const active: HotspotId | null = place === 'overview' || place === 'desk' ? null : place;
  const [hovered, setHovered] = useState<TargetId | null>(null);
  const [book, setBook] = useState<ProjectId>('turnero');
  const [lampOn, setLampOn] = useState(true);
  const [portrait] = useState(() => window.innerWidth < window.innerHeight);
  const [narrow, setNarrow] = useState(() => window.innerWidth < MENU_COMPACT_WIDTH);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuButtons = useRef(new Map<HotspotId, HTMLButtonElement>());
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const markerLayer = useRef<HTMLDivElement>(null);
  const lastActive = useRef<HotspotId | null>(null);

  const go = useCallback((action: NavAction) => {
    setMenuOpen(false);
    setStack((s) => navigate(s, action));
  }, []);
  /** From the object menu: always direct, so Back returns to the overview. */
  const select = useCallback((id: HotspotId) => go({ type: 'open', id, source: 'menu' }), [go]);
  /** From the scene or a tap marker: desk objects opened in the desk view go back to it. */
  const selectInScene = useCallback((id: HotspotId) => go({ type: 'open', id, source: 'scene' }), [go]);
  const onMarker = useCallback(
    (id: MarkerId) => (id === 'desk' ? go({ type: 'desk' }) : selectInScene(id)),
    [go, selectInScene],
  );
  const back = useCallback(() => go({ type: 'back' }), [go]);
  const selectBook = useCallback(
    (id: ProjectId) => {
      setBook(id);
      selectInScene('bookshelf');
    },
    [selectInScene],
  );

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MENU_COMPACT_WIDTH - 1}px)`);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Escape closes the open object list first, then goes Back one place (it never closes the
  // room).
  const menuOpenRef = useRef(menuOpen);
  menuOpenRef.current = menuOpen;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (menuOpenRef.current) {
        setMenuOpen(false);
        menuToggle.current?.focus({ preventScroll: true });
      } else setStack((s) => navigate(s, { type: 'back' }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus follows the view: into the content when it opens, back to its menu item after.
  useEffect(() => {
    if (place === 'desk') {
      backButton.current?.focus({ preventScroll: true });
      return;
    }
    if (active) {
      lastActive.current = active;
      // The monitor screen focuses itself when it mounts (see Scene). A view without a
      // panel (the window) has nothing to read, so focus waits on Back.
      if (hasPanel(hotspotById(active).content)) panelHeading.current?.focus({ preventScroll: true });
      else backButton.current?.focus({ preventScroll: true });
      return;
    }
    // Back in the overview: the menu item that opened the view, or the collapsed menu's button.
    const previous = lastActive.current;
    if (!previous) return;
    const item = menuButtons.current.get(previous);
    if (item && item.offsetParent !== null) item.focus({ preventScroll: true });
    else menuToggle.current?.focus({ preventScroll: true });
  }, [place, active]);

  const hotspot = active ? hotspotById(active) : null;
  // No panel (nor bottom sheet) for a plain view; on desktop the monitor shows the CV itself.
  const showPanel = hotspot && hasPanel(hotspot.content) && (coarse || hotspot.id !== 'monitor');
  const overview = portrait ? OVERVIEW_PORTRAIT : OVERVIEW;
  const inView = place !== 'overview';
  const layout = menuLayout({ compact: coarse || narrow, inView });
  const markers = visibleMarkers({ compact: coarse, place }).map((id) => ({ id, position: markerPosition(id, place) }));
  const listShown = layout === 'list' || menuOpen;
  const menuClass = ['room-menu', layout === 'button' && 'is-collapsed', menuOpen && 'is-open', inView && 'in-view']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`room-app${coarse ? ' is-coarse' : ''}`}>
      <div className="room-stage">
        <RoomCanvas
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
          onPointerMissed={() => setHovered(null)}
        >
          <color attach="background" args={['#ece9e1']} />
          {/* Suspends until every model has loaded; the loading screen covers it meanwhile. */}
          <Suspense fallback={null}>
            <Scene
              content={content}
              coarse={coarse}
              active={active}
              hovered={hovered}
              lampOn={lampOn}
              onHover={setHovered}
              onSelect={selectInScene}
              onBook={selectBook}
              markers={markers}
              onMarker={onMarker}
              deskLabel={room.desk}
              onLamp={() => setLampOn((on) => !on)}
              markerLayer={markerLayer}
              onReady={onReady}
              reducedMotion={reducedMotion}
            />
          </Suspense>
          <CameraRig
            framing={place === 'desk' ? DESK_VIEW : hotspot}
            reducedMotion={reducedMotion}
            panel={showPanel ? (coarse ? 'sheet' : 'side') : null}
          />
        </RoomCanvas>
        {/* Touch markers live here (a stable drei <Html> portal target). */}
        <div className="room-markers" ref={markerLayer} />
      </div>

      {inView && (
        <button type="button" className="room-back" ref={backButton} onClick={back}>
          <span aria-hidden="true">←</span> {room.back}
        </button>
      )}

      <nav className={menuClass} aria-label={room.menu}>
        {layout === 'button' && (
          <button
            type="button"
            className="room-menu-toggle"
            ref={menuToggle}
            aria-expanded={menuOpen}
            aria-controls="room-menu-list"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {room.objects}
          </button>
        )}
        {layout === 'list' && <p className="room-hint">{room.hint}</p>}
        <ul id="room-menu-list" hidden={!listShown}>
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
            <button
              type="button"
              aria-pressed={lampOn}
              onClick={() => {
                setMenuOpen(false);
                setLampOn((on) => !on);
              }}
            >
              {room.lamp}
            </button>
          </li>
        </ul>
      </nav>

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
