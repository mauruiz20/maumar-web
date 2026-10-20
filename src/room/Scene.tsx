import { Html } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { MeshStandardMaterial, type Mesh, type Object3D } from 'three';
import { useModel } from './assets';
import type { Content } from '../content/profile';
import { BOOKS, DESK_TOP, WINDOW, onDesk, type HotspotId, type ProjectId, type Vec3 } from './hotspots';
import { BOOK_FILLERS, CV_SCREEN, LAMP_BULB, PLACEMENTS, type Placement } from './layout';
import type { ModelId } from './models';
import type { MarkerId } from './nav';
import { Highlight } from './highlight';
import { Outside } from './Outside';
import { RaspberryPi } from './RaspberryPi';
import { ExperienceBody } from './panels';
import { PALETTE as C, paletteFor } from './palette';


interface PartProps {
  size: Vec3;
  position: Vec3;
  color: string;
  rotation?: Vec3;
  emissive?: string;
}

function Box({ size, position, color, rotation, emissive }: PartProps) {
  const lit = useContext(Highlight);
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={lit ? C.highlight : (emissive ?? '#000000')}
        emissiveIntensity={lit ? 0.15 : emissive ? 1 : 0}
      />
    </mesh>
  );
}

interface CylProps {
  /** [radiusTop, radiusBottom, height] */
  size: Vec3;
  position: Vec3;
  color: string;
  rotation?: Vec3;
  segments?: number;
}

function Cyl({ size, position, color, rotation, segments = 20 }: CylProps) {
  const lit = useContext(Highlight);
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[size[0], size[1], size[2], segments]} />
      <meshStandardMaterial color={color} emissive={C.highlight} emissiveIntensity={lit ? 0.15 : 0} />
    </mesh>
  );
}

interface ModelProps {
  id: ModelId;
  placement: Placement;
  /**
   * A material (by Kenney name) that glows, e.g. the lamp shade when the lamp is on: emissive
   * in its own palette colour, so it brightens without washing out to the light's tint.
   */
  glow?: { material: string; on: boolean; intensity: number };
}

const meshesOf = (root: Object3D): Mesh[] => {
  const out: Mesh[] = [];
  root.traverse((o) => {
    if ((o as Mesh).isMesh) out.push(o as Mesh);
  });
  return out;
};

/**
 * A Kenney model, recoloured to the site palette: each instance clones the cached scene and
 * gets its own flat-shaded materials (named after the Kenney ones), so hover highlight and
 * glow never leak between instances or into the cache.
 */
function Model({ id, placement, glow }: ModelProps) {
  const { scene } = useModel(id);
  const lit = useContext(Highlight);
  const object = useMemo(() => {
    const root = scene.clone(true);
    for (const mesh of meshesOf(root)) {
      const name = (mesh.material as { name?: string }).name ?? '';
      const material = new MeshStandardMaterial({ color: C[paletteFor(name, id)], roughness: 1, metalness: 0, flatShading: true });
      material.name = name;
      mesh.material = material;
    }
    return root;
  }, [scene, id]);
  useEffect(() => () => meshesOf(object).forEach((m) => (m.material as MeshStandardMaterial).dispose()), [object]);
  const glowing = glow?.on ? glow.material : null;
  const glowIntensity = glow?.intensity ?? 0;
  useEffect(() => {
    for (const mesh of meshesOf(object)) {
      const m = mesh.material as MeshStandardMaterial;
      const glows = m.name === glowing;
      if (lit) m.emissive.set(C.highlight);
      else if (glows) m.emissive.copy(m.color);
      else m.emissive.set('#000000');
      m.emissiveIntensity = lit ? 0.15 : glows ? glowIntensity : 0;
    }
  }, [object, lit, glowing, glowIntensity]);
  return (
    <primitive object={object} position={placement.position} rotation={[0, placement.rotationY, 0]} scale={placement.scale} />
  );
}

/**
 * Calls onReady once, after the first frame that has everything in it: the scene suspends
 * until every model has loaded, so this only mounts then; useFrame runs before that frame's
 * render, and the next animation frame comes after it.
 */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => onReady());
  });
  return null;
}

/** Invisible box that widens the tap target of small objects on touch screens. */
function HitArea({ size, position }: { size: Vec3; position: Vec3 }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

type TargetId = HotspotId | 'lamp';

interface ClickableProps {
  id: TargetId;
  hovered: TargetId | null;
  onHover: (id: TargetId | null) => void;
  onClick: () => void;
  hit?: { size: Vec3; position: Vec3 } | undefined;
  coarse: boolean;
  children: ReactNode;
}

function Clickable({ id, hovered, onHover, onClick, hit, coarse, children }: ClickableProps) {
  return (
    <group
      name={id}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (!coarse) onHover(id);
      }}
      onPointerOut={() => {
        if (hovered === id) onHover(null);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Highlight.Provider value={hovered === id}>{children}</Highlight.Provider>
      {coarse && hit && <HitArea size={hit.size} position={hit.position} />}
    </group>
  );
}

/** Window opening edges in the back wall. */
const OPENING = {
  left: WINDOW.center[0] - WINDOW.size[0] / 2,
  right: WINDOW.center[0] + WINDOW.size[0] / 2,
  bottom: WINDOW.center[1] - WINDOW.size[1] / 2,
  top: WINDOW.center[1] + WINDOW.size[1] / 2,
};

/** The back wall (x from -3 to 3, 3 m high, 0.1 m thick) as four pieces around the window. */
function BackWall() {
  const { left, right, bottom, top } = OPENING;
  const [cx] = WINDOW.center;
  const [w] = WINDOW.size;
  const z = -3.05;
  return (
    <>
      <Box size={[left + 3, 3, 0.1]} position={[(left - 3) / 2, 1.5, z]} color={C.wallBack} />
      <Box size={[3 - right, 3, 0.1]} position={[(right + 3) / 2, 1.5, z]} color={C.wallBack} />
      <Box size={[w, bottom, 0.1]} position={[cx, bottom / 2, z]} color={C.wallBack} />
      <Box size={[w, 3 - top, 0.1]} position={[cx, (top + 3) / 2, z]} color={C.wallBack} />
    </>
  );
}

function Room() {
  return (
    <group name="room">
      <Box size={[6, 0.1, 6]} position={[0, -0.05, 0]} color={C.floor} />
      <BackWall />
      <Box size={[0.1, 3, 6]} position={[-3.05, 1.5, 0]} color={C.wallLeft} />
    </group>
  );
}

function Desk() {
  return (
    <group name="desk">
      <Model id="desk" placement={PLACEMENTS.desk} />
    </group>
  );
}

/** Focus moves onto the screen once, as it appears (a stable ref callback). */
const focusOnMount = (el: HTMLElement | null) => el?.focus({ preventScroll: true });

function Monitor({ showCv, content }: { showCv: boolean; content: Content }) {
  return (
    <group name="monitor">
      <Model id="computerScreen" placement={PLACEMENTS.computerScreen} />
      <Model id="computerKeyboard" placement={PLACEMENTS.computerKeyboard} />
      <Model id="computerMouse" placement={PLACEMENTS.computerMouse} />
      {showCv && (
        <Html
          transform
          occlude
          position={CV_SCREEN.position}
          rotation={CV_SCREEN.rotation}
          distanceFactor={CV_SCREEN.distanceFactor}
          zIndexRange={[5, 0]}
          className="room-screen-host"
        >
          <div
            className="room-screen"
            tabIndex={0}
            ref={focusOnMount}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <h2>{content.experience.title}</h2>
            <ExperienceBody content={content} />
          </div>
        </Html>
      )}
    </group>
  );
}

function Chair() {
  return (
    <group name="chair">
      <Model id="chairDesk" placement={PLACEMENTS.chairDesk} />
    </group>
  );
}

function Phone() {
  return (
    <group name="phone" position={onDesk('phone', DESK_TOP + 0.005)} rotation={[0, 0.25, 0]}>
      <Box size={[0.075, 0.01, 0.15]} position={[0, 0, 0]} color={C.ink} />
      <Box size={[0.066, 0.002, 0.135]} position={[0, 0.006, 0]} color={C.inkSoft} />
    </group>
  );
}

function Mug() {
  return (
    <group name="mug" position={onDesk('mug', DESK_TOP + 0.05)}>
      <Cyl size={[0.04, 0.04, 0.1]} position={[0, 0, 0]} color={C.paper} />
      <Cyl size={[0.0405, 0.0405, 0.025]} position={[0, 0.015, 0]} color={C.accent} />
      <Box size={[0.012, 0.06, 0.02]} position={[0.048, 0, 0]} color={C.paper} />
    </group>
  );
}

function Lamp({ on }: { on: boolean }) {
  return (
    <group name="lamp">
      <Model id="lampRoundTable" placement={PLACEMENTS.lampRoundTable} glow={{ material: 'lamp', on, intensity: 0.55 }} />
      <pointLight position={LAMP_BULB} color={C.lampLight} intensity={on ? 1.6 : 0} distance={2.5} decay={2} />
    </group>
  );
}

function Bookshelf({ onBook }: { onBook: (id: ProjectId) => void }) {
  return (
    <group name="bookshelf">
      <Model id="bookcaseOpen" placement={PLACEMENTS.bookcaseOpen} />
      {BOOK_FILLERS.map((placement, i) => (
        <Model key={i} id="books" placement={placement} />
      ))}
      {BOOKS.map((b) => (
        <group
          key={b.project}
          name={`book-${b.project}`}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onBook(b.project);
          }}
        >
          <Box size={b.size} position={b.position} color={b.color} />
        </group>
      ))}
    </group>
  );
}

function Whiteboard() {
  const x = -1.75;
  const lines: [number, number, string][] = [
    [1.72, 0.5, C.accent],
    [1.6, 0.7, C.ink],
    [1.48, 0.55, C.ink],
    [1.3, 0.45, C.accent],
    [1.18, 0.65, C.ink],
  ];
  return (
    <group name="whiteboard">
      <Box size={[1.26, 0.86, 0.03]} position={[x, 1.5, -2.985]} color={C.muted} />
      <Box size={[1.2, 0.8, 0.012]} position={[x, 1.5, -2.965]} color={C.paper} />
      <Box size={[0.5, 0.02, 0.06]} position={[x, 1.07, -2.96]} color={C.muted} />
      {lines.map(([y, w, color]) => (
        <Box key={y} size={[w, 0.018, 0.004]} position={[x - (0.9 - w) / 2, y, -2.957]} color={color} />
      ))}
    </group>
  );
}

/**
 * Frame lining the opening (its bars reach 1 cm into the opening, so no face is coplanar with
 * the wall's), a mullion and a transom, and faint glass that never takes a click.
 */
function Window() {
  const { left, right, bottom, top } = OPENING;
  const [cx, cy] = WINDOW.center;
  const [w, h] = WINDOW.size;
  /** How far the frame shows on the wall around the opening, and the bar width. */
  const out = 0.06;
  const bar = out + 0.01;
  const mullion = 0.035;
  const lining = { depth: 0.14, z: -3.03 };
  return (
    <group name="window">
      <Box size={[w + 2 * out, bar, lining.depth]} position={[cx, top + out - bar / 2, lining.z]} color={C.paper} />
      <Box size={[w + 2 * out, bar, lining.depth]} position={[cx, bottom - out + bar / 2, lining.z]} color={C.paper} />
      <Box size={[bar, h, lining.depth]} position={[left - out + bar / 2, cy, lining.z]} color={C.paper} />
      <Box size={[bar, h, lining.depth]} position={[right + out - bar / 2, cy, lining.z]} color={C.paper} />
      <Box size={[mullion, h, mullion]} position={[cx, cy, -3.0]} color={C.paper} />
      {/* Transom in the upper third: above eye level from the window view, clear of the ridge. */}
      <Box size={[w, mullion, mullion]} position={[cx, top - h / 3, -3.0]} color={C.paper} />
      {/* The glass never tints on hover (basic material, no Highlight) and never takes a ray. */}
      <mesh position={[cx, cy, -3.0]} raycast={() => null}>
        <boxGeometry args={[w, h, 0.006]} />
        <meshBasicMaterial color={C.glass} transparent opacity={0.15} depthWrite={false} />
      </mesh>
      {/* Invisible pick plane over the opening, so pointing at the view selects the window. */}
      <mesh position={[cx, cy, -2.99]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Decor() {
  return (
    <>
      <group name="frame">
        <Box size={[0.03, 0.4, 0.5]} position={[-2.985, 1.65, 1.0]} color={C.ink} />
        <Box size={[0.01, 0.32, 0.42]} position={[-2.968, 1.65, 1.0]} color={C.accentSoft} />
      </group>
      <group name="plant">
        <Model id="pottedPlant" placement={PLACEMENTS.pottedPlant} />
      </group>
      <group name="rug">
        <Model id="rugRectangle" placement={PLACEMENTS.rugRectangle} />
      </group>
    </>
  );
}

/**
 * Pulsing tap markers (touch screens have no hover): which ones show, and where, comes from
 * nav.ts. They render into a fixed layer next to the canvas: with drei's default target, the
 * first marker's DOM root was replaced when R3F connected its events and it never showed.
 */
interface MarkersProps {
  markers: { id: MarkerId; position: Vec3 }[];
  onMarker: (id: MarkerId) => void;
  deskLabel: string;
  layer: RefObject<HTMLDivElement | null>;
}

function Markers({ markers, onMarker, deskLabel, layer }: MarkersProps) {
  return (
    <>
      {markers.map((m) => (
        <Html key={m.id} position={m.position} center zIndexRange={[6, 0]} portal={layer as RefObject<HTMLElement>}>
          <button
            type="button"
            className="room-marker"
            data-hotspot={m.id}
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => onMarker(m.id)}
          >
            {m.id === 'desk' && <span className="room-marker-label">{deskLabel}</span>}
          </button>
        </Html>
      ))}
    </>
  );
}

const HITS: Partial<Record<HotspotId, { size: Vec3; position: Vec3 }>> = {
  pi: { size: [0.32, 0.22, 0.3], position: onDesk('pi', DESK_TOP + 0.08) },
  phone: { size: [0.3, 0.2, 0.34], position: onDesk('phone', DESK_TOP + 0.08) },
  mug: { size: [0.26, 0.28, 0.26], position: onDesk('mug', DESK_TOP + 0.1) },
  window: {
    size: [WINDOW.size[0] + 0.4, WINDOW.size[1] + 0.4, 0.2],
    position: [WINDOW.center[0], WINDOW.center[1], -2.88],
  },
};

export interface SceneProps {
  content: Content;
  coarse: boolean;
  active: HotspotId | null;
  hovered: TargetId | null;
  lampOn: boolean;
  onHover: (id: TargetId | null) => void;
  onSelect: (id: HotspotId) => void;
  onBook: (id: ProjectId) => void;
  onLamp: () => void;
  /** Element the touch markers render into. */
  markerLayer: RefObject<HTMLDivElement | null>;
  /** Touch markers to show now (empty on desktop and inside hotspot views). */
  markers: MarkersProps['markers'];
  onMarker: (id: MarkerId) => void;
  deskLabel: string;
  /** After the models have loaded and the first full frame has rendered. */
  onReady: () => void;
}

export function Scene({ content, coarse, active, hovered, lampOn, onHover, onSelect, onBook, onLamp, markerLayer, markers, onMarker, deskLabel, onReady }: SceneProps) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.domElement.style.cursor = hovered ? 'pointer' : '';
  }, [gl, hovered]);

  const common = { hovered, onHover, coarse };
  const click = (id: HotspotId) => ({ id, onClick: () => onSelect(id), hit: HITS[id] });

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 6, 3]} intensity={1.8} />
      <Room />
      <Desk />
      <Clickable {...common} {...click('monitor')}>
        <Monitor showCv={!coarse && active === 'monitor'} content={content} />
        <Chair />
      </Clickable>
      <Clickable {...common} {...click('pi')}>
        <RaspberryPi />
      </Clickable>
      <Clickable {...common} {...click('phone')}>
        <Phone />
      </Clickable>
      <Clickable {...common} {...click('mug')}>
        <Mug />
      </Clickable>
      <Clickable {...common} {...click('bookshelf')}>
        <Bookshelf onBook={onBook} />
      </Clickable>
      <Clickable {...common} {...click('whiteboard')}>
        <Whiteboard />
      </Clickable>
      <Clickable {...common} {...click('window')}>
        <Window />
      </Clickable>
      <Clickable {...common} id="lamp" onClick={onLamp}>
        <Lamp on={lampOn} />
      </Clickable>
      <Decor />
      <Outside />
      <ReadySignal onReady={onReady} />
      {markers.length > 0 && <Markers markers={markers} onMarker={onMarker} deskLabel={deskLabel} layer={markerLayer} />}
    </>
  );
}

export type { TargetId };
