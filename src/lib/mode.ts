/** The visitor's last explicit choice between the 3D room and the simple page. */
export type SavedMode = 'room' | 'simple';

/** localStorage key holding a SavedMode. */
export const MODE_KEY = 'mode';
/** Devices reporting less memory than this (navigator.deviceMemory, Chromium only) start simple. */
export const MIN_DEVICE_MEMORY_GB = 4;
/** dataset key boot.ts sets on <html> to claim the loading screen the inline gate showed. */
export const BOOT_CLAIM_KEY = 'roomBoot';
/** If boot.ts has not claimed the loading screen by then, the inline gate uncovers the page. */
export const BOOT_TIMEOUT_MS = 6000;
/** If the room is not ready by then, boot.ts gives up and shows the simple page. */
export const LOAD_TIMEOUT_MS = 20000;

export interface GateEnv {
  webgl: boolean;
  saved: SavedMode | null;
  /** navigator.connection.saveData: the visitor asked the browser to save data. */
  saveData: boolean;
  /** navigator.deviceMemory in GB; undefined where the browser does not report it. */
  deviceMemory: number | undefined;
}

export function parseSavedMode(value: unknown): SavedMode | null {
  return value === 'room' || value === 'simple' ? value : null;
}

/**
 * Whether the room opens by itself on load. It does by default on every device with WebGL,
 * phones included, except when the visitor chose the simple page, the browser asks to save
 * data, or the device reports little memory. Browsers that report neither (Safari, Firefox)
 * get the room.
 */
export function shouldAutoStartRoom({ webgl, saved, saveData, deviceMemory }: GateEnv): boolean {
  if (saved === 'simple' || saveData) return false;
  if (deviceMemory !== undefined && deviceMemory < MIN_DEVICE_MEMORY_GB) return false;
  return webgl;
}

/**
 * The same decision, inlined in <head> so the loading screen shows before first paint.
 * Built from the constants above; tests run it against shouldAutoStartRoom.
 * The WebGL probe runs last, so visitors who start simple never create a context.
 * `undefined < 4` is false, so browsers without navigator.deviceMemory pass the memory check.
 * If boot.ts never runs (blocked or failed script), a timer uncovers the page after
 * BOOT_TIMEOUT_MS instead of leaving the loading screen up forever.
 */
export const GATE_SCRIPT = `(()=>{var s=null;try{s=localStorage.getItem('${MODE_KEY}')}catch(e){}var n=navigator,k=n.connection;if(s==='simple'||k&&k.saveData||n.deviceMemory<${MIN_DEVICE_MEMORY_GB})return;try{var g=document.createElement('canvas'),c=g.getContext('webgl2')||g.getContext('webgl');if(!c)return;var x=c.getExtension('WEBGL_lose_context');x&&x.loseContext();var d=document.documentElement.dataset;d.room='boot';setTimeout(function(){if(d.room==='boot'&&!d.${BOOT_CLAIM_KEY})delete d.room},${BOOT_TIMEOUT_MS})}catch(e){}})()`;
