// Web Bluetooth API for ESC/POS thermal printers

const PRINTER_SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";

// Common alternative UUIDs for different printer brands
const ALT_SERVICE_UUIDS = [
  PRINTER_SERVICE_UUID,
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
];

const STORED_DEVICE_KEY = "bt_printer_device_id";

let cachedServer: BluetoothRemoteGATTServer | null = null;
let cachedCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
let isConnecting = false;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
    ),
  ]);
}

export function isBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export function getBluetoothStatus(): "supported" | "brave-disabled" | "unsupported" {
  if (isBluetoothSupported()) return "supported";
  if ((navigator as any).brave) return "brave-disabled";
  return "unsupported";
}

export async function requestBluetoothPrinter(): Promise<BluetoothDevice | null> {
  if (!isBluetoothSupported()) return null;

  try {
    // Usar acceptAllDevices diretamente — impressoras genéricas
    // não anunciam UUIDs padrão, então filtros não funcionam.
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ALT_SERVICE_UUIDS,
    });

    if (device?.id) {
      localStorage.setItem(STORED_DEVICE_KEY, device.id);
    }

    return device;
  } catch (err) {
    console.warn("Bluetooth pairing cancelled or failed:", err);
    return null;
  }
}

export async function connectToDevice(device: BluetoothDevice): Promise<BluetoothRemoteGATTCharacteristic | null> {
  if (!device.gatt) return null;
  if (isConnecting) {
    console.warn("[BT] Connection already in progress, skipping");
    return null;
  }

  isConnecting = true;
  try {
    const server = await withTimeout(device.gatt.connect(), 10000, "GATT connect");
    cachedServer = server;

    // 1. Try known service UUIDs first (fast path)
    for (const serviceUuid of ALT_SERVICE_UUIDS) {
      try {
        const service = await withTimeout(server.getPrimaryService(serviceUuid), 3000, `getPrimaryService(${serviceUuid})`);
        const characteristics = await withTimeout(service.getCharacteristics(), 3000, "getCharacteristics");
        const writable = characteristics.find(
          (c) => c.properties.write || c.properties.writeWithoutResponse
        );
        if (writable) {
          cachedCharacteristic = writable;
          console.log("[BT] Found writable characteristic via known UUID:", serviceUuid);
          return writable;
        }
      } catch {
        // Try next service UUID
      }
    }

    // 2. Fallback: discover ALL services dynamically (generic printers)
    try {
      console.log("[BT] Known UUIDs failed, discovering all services...");
      const services = await withTimeout(server.getPrimaryServices(), 5000, "getPrimaryServices()");
      for (const service of services) {
        try {
          const characteristics = await withTimeout(service.getCharacteristics(), 3000, "getCharacteristics(dynamic)");
          const writable = characteristics.find(
            (c) => c.properties.write || c.properties.writeWithoutResponse
          );
          if (writable) {
            cachedCharacteristic = writable;
            console.log("[BT] Found writable characteristic via dynamic discovery, service:", service.uuid);
            return writable;
          }
        } catch {
          // Try next service
        }
      }
    } catch (discoverErr) {
      console.warn("[BT] Dynamic service discovery failed:", discoverErr);
    }

    return null;
  } catch (err) {
    console.error("[BT] Connection failed (timeout or error):", err);
    cachedServer = null;
    cachedCharacteristic = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

export async function sendToBluetoothPrinter(
  device: BluetoothDevice,
  text: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  const ESC_INIT = new Uint8Array([0x1b, 0x40]);
  const ESC_CENTER = new Uint8Array([0x1b, 0x61, 0x01]);
  const ESC_LEFT = new Uint8Array([0x1b, 0x61, 0x00]);
  const ESC_BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]);
  const ESC_BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]);
  const ESC_CUT = new Uint8Array([0x1d, 0x56, 0x01]);
  const NEWLINE = encoder.encode("\n");

  const chunks: Uint8Array[] = [];
  chunks.push(ESC_INIT);

  const lines = text.split("\n");
  for (const line of lines) {
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

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let characteristic = cachedCharacteristic;

      // Explicit check: if GATT disconnected, force reconnect before sending
      if (!device.gatt?.connected) {
        console.log("[BT] Device disconnected before print, reconnecting...");
        cachedCharacteristic = null;
        cachedServer = null;
        characteristic = null;
      }

      if (!characteristic || !cachedServer?.connected) {
        characteristic = await connectToDevice(device);
      }

      if (!characteristic) {
        throw new Error("No writable characteristic found");
      }

      const CHUNK_SIZE = 100;
      for (let i = 0; i < combined.length; i += CHUNK_SIZE) {
        const slice = combined.slice(i, i + CHUNK_SIZE);
        if (characteristic.properties.writeWithoutResponse) {
          await characteristic.writeValueWithoutResponse(slice);
        } else {
          await characteristic.writeValue(slice);
        }
        await new Promise((r) => setTimeout(r, 30));
      }

      return true;
    } catch (err) {
      console.error(`[BT] Attempt ${attempt + 1} failed:`, err);
      cachedCharacteristic = null;
      cachedServer = null;
      if (attempt === 0) {
        console.log("[BT] Retry attempt...");
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  return false;
}

export function disconnectPrinter(device: BluetoothDevice): void {
  try {
    device.gatt?.disconnect();
  } catch {
    // Ignore disconnect errors
  }
  cachedServer = null;
  cachedCharacteristic = null;
}

export function getStoredDeviceId(): string | null {
  return localStorage.getItem(STORED_DEVICE_KEY);
}

export function clearStoredDevice(): void {
  localStorage.removeItem(STORED_DEVICE_KEY);
}

/**
 * Attempt to reconnect to a previously paired printer without user gesture.
 * Uses navigator.bluetooth.getDevices() (Chrome 85+).
 * Returns the device if reconnection succeeds, null otherwise (silent fail).
 */
export async function reconnectStoredPrinter(): Promise<BluetoothDevice | null> {
  if (!isBluetoothSupported()) return null;
  const storedId = getStoredDeviceId();
  if (!storedId) return null;

  // Global timeout to prevent browser freeze when printer is off/out of range
  return withTimeout(reconnectStoredPrinterInternal(storedId), 12000, "reconnectStoredPrinter")
    .catch((err) => {
      console.warn("[BT] Auto-reconnect timed out or failed:", err);
      return null;
    });
}

async function waitForAdvertisement(device: BluetoothDevice, timeoutMs = 4000): Promise<void> {
  if (typeof (device as any).watchAdvertisements !== "function") {
    console.log("[BT] watchAdvertisements not supported, skipping");
    return;
  }

  return new Promise<void>((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      try { (device as any).unwatchAdvertisements?.(); } catch { /* ignore */ }
      device.removeEventListener("advertisementreceived", onAd);
      resolve();
    };

    const onAd = () => {
      console.log("[BT] Advertisement received — device visible");
      done();
    };

    device.addEventListener("advertisementreceived", onAd);

    (device as any).watchAdvertisements({ signal: AbortSignal.timeout?.(timeoutMs) })
      .catch(() => { /* timeout or error — proceed anyway */ });

    // Fallback timeout in case AbortSignal.timeout is not supported
    setTimeout(done, timeoutMs);
  });
}

async function reconnectStoredPrinterInternal(storedId: string): Promise<BluetoothDevice | null> {
  try {
    const bt = navigator as any;
    if (typeof bt.bluetooth?.getDevices !== "function") {
      console.log("[BT] getDevices() not supported in this browser");
      return null;
    }

    const devices: BluetoothDevice[] = await bt.bluetooth.getDevices();
    const device = devices.find((d) => d.id === storedId);
    if (!device) {
      console.log("[BT] Stored device not found among authorized devices");
      return null;
    }

    // Tornar dispositivo visível ao Chrome via watchAdvertisements (timeout 4s)
    await waitForAdvertisement(device, 4000);

    const char = await connectToDevice(device);
    if (char) {
      console.log("[BT] Auto-reconnected to", device.name || device.id);
      return device;
    }

    return null;
  } catch (err) {
    console.warn("[BT] Auto-reconnect internal error:", err);
    return null;
  }
}

/**
 * Attempt to auto-reconnect a device with exponential backoff.
 * Tries up to `maxRetries` times with increasing delays (1s, 2s, 4s).
 * Calls onConnected(device) on success, onFailed() after all attempts fail.
 */
export async function autoReconnect(
  device: BluetoothDevice,
  onConnected: (device: BluetoothDevice) => void,
  onFailed: () => void,
  maxRetries = 3
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
    console.log(`[BT] Reconnect attempt ${i + 1}/${maxRetries} in ${delay}ms...`);
    await new Promise((r) => setTimeout(r, delay));

    try {
      const char = await connectToDevice(device);
      if (char) {
        console.log("[BT] Reconnected successfully on attempt", i + 1);
        onConnected(device);
        return;
      }
    } catch (err) {
      console.warn(`[BT] Reconnect attempt ${i + 1} failed:`, err);
    }
  }
  console.warn("[BT] All reconnect attempts exhausted");
  onFailed();
}
