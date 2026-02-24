package app.trendfood.delivery;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothProfile;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class PrinterForegroundService extends Service {

    private static final String TAG = "PrinterFGService";
    private static final String CHANNEL_ID = "trendfood_printer";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_START = "START";
    public static final String ACTION_STOP = "STOP";

    public static volatile boolean isRunning = false;

    private static final UUID PRINTER_SERVICE_UUID =
            UUID.fromString("000018f0-0000-1000-8000-00805f9b34fb");
    private static final UUID PRINTER_CHAR_UUID =
            UUID.fromString("00002af1-0000-1000-8000-00805f9b34fb");

    private ScheduledExecutorService scheduler;
    private String orgId;
    private String supabaseUrl;
    private String printerRobotToken;
    private String bleDeviceAddress;

    private BluetoothGatt bluetoothGatt;
    private BluetoothGattCharacteristic printerCharacteristic;
    private volatile boolean bleReady = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(action)) {
            orgId = intent.getStringExtra("orgId");
            supabaseUrl = intent.getStringExtra("supabaseUrl");
            printerRobotToken = intent.getStringExtra("printerRobotToken");
            bleDeviceAddress = intent.getStringExtra("bleDeviceAddress");

            Notification notification = buildNotification("Impressão ativa em segundo plano");
            startForeground(NOTIFICATION_ID, notification);
            isRunning = true;

            connectBle();
            startPolling();
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        if (scheduler != null) scheduler.shutdownNow();
        if (bluetoothGatt != null) {
            bluetoothGatt.close();
            bluetoothGatt = null;
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "TrendFood Impressora",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Mantém a impressão funcionando em segundo plano");
            NotificationManager mgr = getSystemService(NotificationManager.class);
            if (mgr != null) mgr.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("TrendFood")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_send)
                .setOngoing(true)
                .build();
    }

    private void connectBle() {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null || bleDeviceAddress == null) return;

            BluetoothDevice device = adapter.getRemoteDevice(bleDeviceAddress);
            bluetoothGatt = device.connectGatt(this, true, new BluetoothGattCallback() {
                @Override
                public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                    if (newState == BluetoothProfile.STATE_CONNECTED) {
                        Log.d(TAG, "BLE connected, discovering services...");
                        gatt.discoverServices();
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                        Log.d(TAG, "BLE disconnected");
                        bleReady = false;
                        if (isRunning && scheduler != null) {
                            scheduler.schedule(() -> connectBle(), 5, TimeUnit.SECONDS);
                        }
                    }
                }

                @Override
                public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                    if (status == BluetoothGatt.GATT_SUCCESS) {
                        BluetoothGattService svc = gatt.getService(PRINTER_SERVICE_UUID);
                        if (svc != null) {
                            printerCharacteristic = svc.getCharacteristic(PRINTER_CHAR_UUID);
                            if (printerCharacteristic != null) {
                                bleReady = true;
                                Log.d(TAG, "BLE printer ready");
                            }
                        }
                    }
                }
            });
        } catch (SecurityException e) {
            Log.e(TAG, "BLE security exception", e);
        }
    }

    private void startPolling() {
        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleWithFixedDelay(this::pollAndPrint, 2, 10, TimeUnit.SECONDS);
    }

    private void pollAndPrint() {
        try {
            String endpoint = supabaseUrl + "/functions/v1/printer-queue?org_id=" + orgId;
            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + printerRobotToken);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            int code = conn.getResponseCode();
            if (code != 200) {
                Log.w(TAG, "Poll returned " + code);
                return;
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            reader.close();

            JSONArray jobs = new JSONArray(sb.toString());
            for (int i = 0; i < jobs.length(); i++) {
                JSONObject job = jobs.getJSONObject(i);
                String jobId = job.getString("id");
                String content = job.getString("conteudo_txt");

                if (printViaBle(content)) {
                    markAsPrinted(jobId);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Poll error", e);
        }
    }

    private boolean printViaBle(String content) {
        if (!bleReady || printerCharacteristic == null || bluetoothGatt == null) {
            Log.w(TAG, "BLE not ready, skipping print");
            return false;
        }

        try {
            byte[] data = content.getBytes(StandardCharsets.UTF_8);
            int chunkSize = 100;
            for (int offset = 0; offset < data.length; offset += chunkSize) {
                int end = Math.min(offset + chunkSize, data.length);
                byte[] chunk = new byte[end - offset];
                System.arraycopy(data, offset, chunk, 0, chunk.length);

                printerCharacteristic.setValue(chunk);
                bluetoothGatt.writeCharacteristic(printerCharacteristic);
                Thread.sleep(50);
            }

            byte[] feed = new byte[]{0x1B, 0x64, 0x04};
            printerCharacteristic.setValue(feed);
            bluetoothGatt.writeCharacteristic(printerCharacteristic);

            Log.d(TAG, "Print sent via BLE");
            return true;
        } catch (Exception e) {
            Log.e(TAG, "BLE print error", e);
            return false;
        }
    }

    private void markAsPrinted(String jobId) {
        try {
            String endpoint = supabaseUrl + "/functions/v1/printer-queue";
            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + printerRobotToken);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            String body = new JSONObject().put("id", jobId).toString();
            OutputStream os = conn.getOutputStream();
            os.write(body.getBytes(StandardCharsets.UTF_8));
            os.close();

            int code = conn.getResponseCode();
            if (code == 200) {
                Log.d(TAG, "Marked as printed: " + jobId);
            } else {
                Log.w(TAG, "Mark printed returned " + code);
            }
        } catch (Exception e) {
            Log.e(TAG, "Mark printed error", e);
        }
    }
}
