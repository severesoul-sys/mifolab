package ru.mifolab.android;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;

public class MainActivity extends Activity {
    WebView webView;
    final java.util.List<String> testConsoleErrors=new java.util.concurrent.CopyOnWriteArrayList<>();
    private AccountController account;
    private boolean ready;
    private ProgressBar progress;
    protected AccountController.Transport createTransport(){return new AccountController.HttpTransport();}
    protected void onLocalPageFinished(){ }
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(0xff172e29);
        root.setOnApplyWindowInsetsListener((view,insets)->{
            int left=insets.getSystemWindowInsetLeft(),top=insets.getSystemWindowInsetTop(),right=insets.getSystemWindowInsetRight(),bottom=insets.getSystemWindowInsetBottom();
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets safe=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());left=safe.left;top=safe.top;right=safe.right;bottom=safe.bottom;}
            else if(Build.VERSION.SDK_INT>=28&&insets.getDisplayCutout()!=null){DisplayCutout cut=insets.getDisplayCutout();left=Math.max(left,cut.getSafeInsetLeft());top=Math.max(top,cut.getSafeInsetTop());right=Math.max(right,cut.getSafeInsetRight());bottom=Math.max(bottom,cut.getSafeInsetBottom());}
            view.setPadding(left,top,right,bottom);return insets.consumeSystemWindowInsets();
        });
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);root.addView(progress,new LinearLayout.LayoutParams(-1,5));
        webView=new WebView(this);webView.setBackgroundColor(0xfff6f5ee);root.addView(webView,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        account=new AccountController(this,createTransport(),event->runOnUiThread(()->deliver(event)));
        WebSettings settings=webView.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setGeolocationEnabled(false);settings.setMediaPlaybackRequiresUserGesture(true);settings.setSupportMultipleWindows(false);settings.setDefaultTextEncodingName("UTF-8");settings.setTextZoom(100);settings.setBuiltInZoomControls(false);
        CookieManager.getInstance().setAcceptCookie(false);CookieManager.getInstance().setAcceptThirdPartyCookies(webView,false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);LocalAssets assets=new LocalAssets(this);
        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){@Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request){return assets.serve(request.getUrl());}});
        webView.addJavascriptInterface(new Bridge(),"MifoNative");
        webView.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return assets.serve(request.getUrl());}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                if(LocalAssets.page(request.getUrl()))return false;
                if(request.isForMainFrame()&&request.hasGesture()&&"https".equals(request.getUrl().getScheme()))openExternal(request.getUrl());
                return true;
            }
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){ready=false;}
            @Override public void onPageFinished(WebView view,String url){if(LocalAssets.page(Uri.parse(url)))onLocalPageFinished();}
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,android.net.http.SslError error){handler.cancel();}
            @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){
                ready=false;new AlertDialog.Builder(MainActivity.this).setTitle("Перезапустить Mifo Lab").setMessage("Android остановил экран приложения. Сохранённые отряды будут восстановлены.").setPositiveButton("Открыть заново",(d,w)->recreate()).setNegativeButton("Закрыть",(d,w)->finish()).show();return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onConsoleMessage(ConsoleMessage message){if(BuildConfig.DEBUG&&message.messageLevel()==ConsoleMessage.MessageLevel.ERROR)testConsoleErrors.add(message.message());return true;}
            @Override public void onProgressChanged(WebView view,int value){progress.setProgress(value);progress.setVisibility(value==100?View.GONE:View.VISIBLE);}
            @Override public void onPermissionRequest(PermissionRequest request){request.deny();}
        });
        webView.loadUrl(LocalAssets.START);
        applyFullscreen();
    }
    private void openExternal(Uri uri){try{startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE));}catch(ActivityNotFoundException error){Toast.makeText(this,"Не найден браузер",Toast.LENGTH_SHORT).show();}}
    private void deliver(JSONObject event){if(!ready||isDestroyed()||isFinishing())return;String encoded=JSONObject.quote(event.toString()).replace("\u2028","\\u2028").replace("\u2029","\\u2029");webView.evaluateJavascript("window.MifoAndroid&&window.MifoAndroid.receive(JSON.parse("+encoded+"))",null);}
    public final class Bridge {
        @JavascriptInterface public boolean fullscreen(){return getSharedPreferences("display",0).getBoolean("fullscreen",false);}
        @JavascriptInterface public void setFullscreen(boolean enabled){getSharedPreferences("display",0).edit().putBoolean("fullscreen",enabled).apply();runOnUiThread(()->applyFullscreen());}
        @JavascriptInterface public void ready(){runOnUiThread(()->{if(isDestroyed())return;ready=true;account.status();});}
        @JavascriptInterface public void connect(String code){account.connect(code);}
        @JavascriptInterface public void refresh(){account.refresh();}
        @JavascriptInterface public void logout(){account.logout();}
    }
    void applyFullscreen(){
        boolean enabled=getSharedPreferences("display",0).getBoolean("fullscreen",false);
        Window window=getWindow();View decor=window.getDecorView();
        if(Build.VERSION.SDK_INT>=28){WindowManager.LayoutParams attrs=window.getAttributes();attrs.layoutInDisplayCutoutMode=enabled?WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES:WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT;window.setAttributes(attrs);}
        if(Build.VERSION.SDK_INT>=30){
            window.setDecorFitsSystemWindows(false);WindowInsetsController control=window.getInsetsController();
            if(control!=null){control.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);if(enabled)control.hide(WindowInsets.Type.systemBars());else control.show(WindowInsets.Type.systemBars());}
        }else decor.setSystemUiVisibility(enabled?View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE:View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        decor.requestApplyInsets();
    }
    @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(focused)applyFullscreen();}
    @Override protected void onResume(){super.onResume();if(webView!=null)webView.onResume();applyFullscreen();}
    @Override protected void onPause(){if(ready)webView.evaluateJavascript("window.MifoArena&&window.MifoArena.pause()",null);if(webView!=null)webView.onPause();super.onPause();}
    @Override public void onBackPressed(){if(ready)webView.evaluateJavascript("window.MifoAndroid?window.MifoAndroid.back():false",value->{if(!"true".equals(value))MainActivity.super.onBackPressed();});else super.onBackPressed();}
    @Override protected void onDestroy(){if(account!=null)account.close();if(webView!=null){webView.removeJavascriptInterface("MifoNative");webView.destroy();}super.onDestroy();}
}
