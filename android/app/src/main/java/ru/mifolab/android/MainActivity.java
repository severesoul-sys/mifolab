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
        root.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets.consumeSystemWindowInsets();});
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
    }
    private void openExternal(Uri uri){try{startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE));}catch(ActivityNotFoundException error){Toast.makeText(this,"Не найден браузер",Toast.LENGTH_SHORT).show();}}
    private void deliver(JSONObject event){if(!ready||isDestroyed()||isFinishing())return;String encoded=JSONObject.quote(event.toString()).replace("\u2028","\\u2028").replace("\u2029","\\u2029");webView.evaluateJavascript("window.MifoAndroid&&window.MifoAndroid.receive(JSON.parse("+encoded+"))",null);}
    public final class Bridge {
        @JavascriptInterface public void ready(){runOnUiThread(()->{if(isDestroyed())return;ready=true;account.status();});}
        @JavascriptInterface public void connect(String code){account.connect(code);}
        @JavascriptInterface public void refresh(){account.refresh();}
        @JavascriptInterface public void logout(){account.logout();}
    }
    @Override protected void onResume(){super.onResume();if(webView!=null)webView.onResume();}
    @Override protected void onPause(){if(ready)webView.evaluateJavascript("window.MifoArena&&window.MifoArena.pause()",null);if(webView!=null)webView.onPause();super.onPause();}
    @Override public void onBackPressed(){if(ready)webView.evaluateJavascript("window.MifoAndroid?window.MifoAndroid.back():false",value->{if(!"true".equals(value))MainActivity.super.onBackPressed();});else super.onBackPressed();}
    @Override protected void onDestroy(){if(account!=null)account.close();if(webView!=null){webView.removeJavascriptInterface("MifoNative");webView.destroy();}super.onDestroy();}
}
