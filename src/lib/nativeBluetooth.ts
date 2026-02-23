/**
 * Native Bluetooth BLE implementation using @capacitor-community/bluetooth-le.
 * Used when running as a native Android app (Capacitor).
 * Falls back gracefully — this module is only imported when Capacitor.isNativePlatform() is true.
 */

import { BleClient, ScanMode } from "@capacitor-community/bluetooth-le";

const STORED_NATIVE_DEVICE_KEY = "bt_native_device_id";
const STORED_NATIVE_SERVICE_KEY = "bt_native_service_uuid";
const STORED_NATIVE_CHAR_KEY = "bt_native_char_uuid";

// Same UUIDs as the web version for consistency
const ALT_SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ff02-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "00001101-0000-1000-8000-00805f9b34fb",
];

let initialized = false;
let connectedDeviceId: string | null = null;
let cachedServiceUuid: string | null = null;
let cachedCharUuid: string | null = null;

export async function initNativeBle(): Promise<void> {
  if (initialized) return;
  await BleClient.initialize();
  initialized = true;
  console.log("[NativeBT] BleClient initialized");
}

export async function scanAndConnectNative(): Promise<string | null> {
  await initNativeBle();

  const device = await BleClient.requestDevice({
    optionalServices: ALT_SERVICE_UUIDS,
    scanMode: ScanMode.SCAN_MODE_LOW_LATENCY,
  });

  if (!device) {
    console.warn("[NativeBT] No device selected");
    return null;
  }

  console.log("[NativeBT] Selected device:", device.deviceId, device.name);

  const connected = await connectNativeDevice(device.deviceId);
  if (connected) {
    localStorage.setItem(STORED_NATIVE_DEVICE_KEY, device.deviceId);
    return device.deviceId;
  }
  return null;
}

export async function connectNativeDevice(deviceId: string): Promise<boolean> {
  await initNativeBle();

  try {
    await BleClient.connect(deviceId, (disconnectedId) => {
      console.log("[NativeBT] Device disconnected:", disconnectedId);
      connectedDeviceId = null;
      cachedServiceUuid = null;
      cachedCharUuid = null;
    });
    console.log("[NativeBT] Connected to", deviceId);

    // Discover writable characteristic
    const services = await BleClient.getServices(deviceId);
    console.log("[NativeBT] Discovered", services.length, "services");

    for (const service of services) {
      for (const char of service.characteristics) {
        const props = char.properties;
        if (props.write || props.writeWithoutResponse) {
          connectedDeviceId = deviceId;
          cachedServiceUuid = service.uuid;
          cachedCharUuid = char.uuid;
          localStorage.setItem(STORED_NATIVE_SERVICE_KEY, service.uuid);
          localStorage.setItem(STORED_NATIVE_CHAR_KEY, char.uuid);
          console.log("[NativeBT] Found writable char:", service.uuid, char.uuid);
          return true;
        }
      }
    }

    // Also try known UUIDs directly
    for (const svcUuid of ALT_SERVICE_UUIDS) {
      try {
        const services2 = await BleClient.getServices(deviceId);
        const svc = services2.find((s) => s.uuid.toLowerCase() === svcUuid.toLowerCase());
        if (svc) {
          for (const char of svc.characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              connectedDeviceId = deviceId;
              cachedServiceUuid = svc.uuid;
              cachedCharUuid = char.uuid;
              localStorage.setItem(STORED_NATIVE_SERVICE_KEY, svc.uuid);
              localStorage.setItem(STORED_NATIVE_CHAR_KEY, char.uuid);
              console.log("[NativeBT] Found writable char via known UUID:", svc.uuid, char.uuid);
              return true;
            }
          }
        }
      } catch {
        // continue
      }
    }

    console.warn("[NativeBT] No writable characteristic found");
    return false;
  } catch (err) {
    console.error("[NativeBT] Connection failed:", err);
    return false;
  }
}

/**
 * Reconnect using stored device ID + fast path with cached UUIDs.
 */
export async function reconnectNativeDevice(): Promise<string | null> {
  const storedId = localStorage.getItem(STORED_NATIVE_DEVICE_KEY);
  if (!storedId) return null;

  const storedService = localStorage.getItem(STORED_NATIVE_SERVICE_KEY);
  const storedChar = localStorage.getItem(STORED_NATIVE_CHAR_KEY);

  console.log("[NativeBT] Attempting reconnect to:", storedId, "fastPath:", !!(storedService && storedChar));

  try {
    await initNativeBle();

    // Disconnect first if stale (ignore errors)
    try { await BleClient.disconnect(storedId); } catch { /* ok */ }

    await BleClient.connect(storedId, (id) => {
      console.log("[NativeBT] Disconnected callback:", id);
      connectedDeviceId = null;
      cachedServiceUuid = null;
      cachedCharUuid = null;
    });

    // Fast path: use stored UUIDs without re-discovering services
    if (storedService && storedChar) {
      connectedDeviceId = storedId;
      cachedServiceUuid = storedService;
      cachedCharUuid = storedChar;
      console.log("[NativeBT] Fast-path reconnect OK");
      return storedId;
    }

    // Slow path: re-discover services
    const ok = await connectNativeDevice(storedId);
    return ok ? storedId : null;
  } catch (err) {
    console.error("[NativeBT] Reconnect failed:", err);
    return null;
  }
}

/**
 * Ensure native BLE connection is alive. Call before printing.
 */
export async function ensureNativeConnection(): Promise<boolean> {
  if (connectedDeviceId && cachedServiceUuid && cachedCharUuid) {
    return true; // Already connected
  }
  const result = await reconnectNativeDevice();
  return result !== null;
}

/**
 * Send text to native BLE printer with retry logic (3 attempts with backoff).
 */
export async function sendToNativePrinter(text: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    // Ensure connection before each attempt
    if (!connectedDeviceId || !cachedServiceUuid || !cachedCharUuid) {
      console.warn(`[NativeBT] Not connected, reconnect attempt ${attempt + 1}/3...`);
      const reconnected = await reconnectNativeDevice();
      if (!reconnected) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // backoff
        continue;
      }
    }

    // Build ESC/POS data
    const encoder = new TextEncoder();
    const ESC_INIT = new Uint8Array([0x1b, 0x40]);
    const ESC_CENTER = new Uint8Array([0x1b, 0x61, 0x01]);
    const ESC_LEFT = new Uint8Array([0x1b, 0x61, 0x00]);
    const ESC_BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]);
    const ESC_BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]);
    const ESC_CUT = new Uint8Array([0x1d, 0x56, 0x01]);
    const NEWLINE = encoder.encode("\n");

    const chunks: Uint8Array[] = [ESC_INIT];

    for (const line of text.split("\n")) {
      if (line.startsWith("##CENTER##")) {
        chunks.push(ESC_CENTER);
        chunks.push(encoder.encode(line.replace("##CENTER##", "")));
        chunks.push(NEWLINE);
        chunks.push(ESC_LEFT);
      } else if (line.startsWith("##BOLD##")) {
        chunks.push(ESC_BOLD_ON);
        chunks.push(encoder.encode(line.replace("##BOLD##", "")));
        chunks.push(NEWLINE);
        chunks.push(ESC_BOLD_OFF);
      } else {
        chunks.push(encoder.encode(line));
        chunks.push(NEWLINE);
      }
    }
    chunks.push(encoder.encode("\n\n\n"));
    chunks.push(ESC_CUT);

    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.length;
    }

    try {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < combined.length; i += CHUNK_SIZE) {
        const slice = combined.slice(i, i + CHUNK_SIZE);
        const dataView = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);
        await BleClient.write(
          connectedDeviceId!,
          cachedServiceUuid!,
          cachedCharUuid!,
          dataView
        );
        await new Promise((r) => setTimeout(r, 30));
      }
      console.log("[NativeBT] Print sent successfully on attempt", attempt + 1);
      return true;
    } catch (err) {
      console.error(`[NativeBT] Print attempt ${attempt + 1}/3 failed:`, err);
      // Clear state to force reconnect on next attempt
      connectedDeviceId = null;
      cachedServiceUuid = null;
      cachedCharUuid = null;
    }
  }

  console.error("[NativeBT] All 3 print attempts failed");
  return false;
}

export function disconnectNative(): void {
  if (connectedDeviceId) {
    BleClient.disconnect(connectedDeviceId).catch(() => {});
    connectedDeviceId = null;
    cachedServiceUuid = null;
    cachedCharUuid = null;
  }
}

export function getNativeStoredDeviceId(): string | null {
  return localStorage.getItem(STORED_NATIVE_DEVICE_KEY);
}

export function clearNativeStoredDevice(): void {
  localStorage.removeItem(STORED_NATIVE_DEVICE_KEY);
  localStorage.removeItem(STORED_NATIVE_SERVICE_KEY);
  localStorage.removeItem(STORED_NATIVE_CHAR_KEY);
}

export function isNativeConnected(): boolean {
  return connectedDeviceId !== null;
}
