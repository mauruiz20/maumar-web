/** The visitor's last explicit choice between the 3D room and the simple page. */
export type SavedMode = 'room' | 'simple';

/** localStorage key holding a SavedMode. */
export const MODE_KEY = 'mode';
/** Narrowest viewport (CSS px) that auto-starts the room. */
export const ROOM_MIN_WIDTH = 1024;
export const FINE_POINTER_QUERY = '(pointer: fine)';
/** dataset key boot.ts sets on <html> to claim the loading screen the inline gate showed. */
export const BOOT_CLAIM_KEY = 'roomBoot';
/** If boot.ts has not claimed the loading screen by then, the inline gate uncovers the page. */
export const BOOT_TIMEOUT_MS = 6000;
/** If the room is not ready by then, boot.ts gives up and shows the simple page. */
export const LOAD_TIMEOUT_MS = 20000;

export interface GateEnv {
  width: number;
  finePointer: boolean;
  webgl: boolean;
  saved: SavedMode | null;
}

export function parseSavedMode(value: unknown): SavedMode | null {
  return value === 'room' || value === 'simple' ? value : null;
}

/**
 * Whether the room opens by itself on load. Only wide screens with a mouse or trackpad and
 * WebGL, and never after the visitor chose the simple page. A saved "room" on a phone does
 * not auto-start: there the explicit "View the 3D room" button is the way in.
 */
export function shouldAutoStartRoom({ width, finePointer, webgl, saved }: GateEnv): boolean {
  return saved !== 'simple' && width >= ROOM_MIN_WIDTH && finePointer && webgl;
}

/**
 * The same decision, inlined in <head> so the loading screen shows before first paint.
 * Built from the constants above; tests run it against shouldAutoStartRoom.
 * The WebGL probe runs last, so phones and simple-mode visitors never create a context.
 * If boot.ts never runs (blocked or failed script), a timer uncovers the page after
 * BOOT_TIMEOUT_MS instead of leaving the loading screen up forever.
 */
export const GATE_SCRIPT = `(()=>{var s=null;try{s=localStorage.getItem('${MODE_KEY}')}catch(e){}if(s==='simple'||innerWidth<${ROOM_MIN_WIDTH}||!matchMedia('${FINE_POINTER_QUERY}').matches)return;try{var g=document.createElement('canvas'),c=g.getContext('webgl2')||g.getContext('webgl');if(!c)return;var x=c.getExtension('WEBGL_lose_context');x&&x.loseContext();var d=document.documentElement.dataset;d.room='boot';setTimeout(function(){if(d.room==='boot'&&!d.${BOOT_CLAIM_KEY})delete d.room},${BOOT_TIMEOUT_MS})}catch(e){}})()`;
