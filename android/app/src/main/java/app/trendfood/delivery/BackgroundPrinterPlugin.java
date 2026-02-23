package app.trendfood.delivery;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "BackgroundPrinter")
public class BackgroundPrinterPlugin extends Plugin {

    @PluginMethod
    public void startService(PluginCall call) {
        String orgId = call.getString("orgId");
        String supabaseUrl = call.getString("supabaseUrl");
        String supabaseAnonKey = call.getString("supabaseAnonKey");
        String printerRobotToken = call.getString("printerRobotToken");
        String bleDeviceAddress = call.getString("bleDeviceAddress");

        if (orgId == null || supabaseUrl == null || bleDeviceAddress == null) {
            call.reject("Missing required parameters");
            return;
        }

        Intent intent = new Intent(getContext(), PrinterForegroundService.class);
        intent.setAction(PrinterForegroundService.ACTION_START);
        intent.putExtra("orgId", orgId);
        intent.putExtra("supabaseUrl", supabaseUrl);
        intent.putExtra("supabaseAnonKey", supabaseAnonKey);
        intent.putExtra("printerRobotToken", printerRobotToken);
        intent.putExtra("bleDeviceAddress", bleDeviceAddress);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Intent intent = new Intent(getContext(), PrinterForegroundService.class);
        intent.setAction(PrinterForegroundService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject result = new JSObject();
        result.put("running", PrinterForegroundService.isRunning);
        call.resolve(result);
    }
}
