package ru.mifolab.android;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceResponse;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

final class LocalAssets {
    static final String ORIGIN="https://appassets.androidplatform.net",START=ORIGIN+"/assets/index.html";
    private final Context context;
    LocalAssets(Context context){this.context=context;}
    static boolean trusted(Uri uri){return "https".equals(uri.getScheme())&&"appassets.androidplatform.net".equals(uri.getHost())&&uri.getPort()==-1&&uri.getUserInfo()==null;}
    static boolean page(Uri uri){return trusted(uri)&&"/assets/index.html".equals(uri.getPath());}
    WebResourceResponse serve(Uri uri){
        if(!trusted(uri)||uri.getPath()==null||!uri.getPath().startsWith("/assets/"))return error(403,"Forbidden");
        String name=uri.getPath().substring(8);
        if(!name.matches("[a-zA-Z0-9_.-]+")||name.contains(".."))return error(404,"Not found");
        String mime=name.endsWith(".html")?"text/html":name.endsWith(".js")?"application/javascript":name.endsWith(".css")?"text/css":name.endsWith(".json")?"application/json":name.endsWith(".png")?"image/png":name.endsWith(".svg")?"image/svg+xml":name.endsWith(".md")?"text/plain":null;
        if(mime==null)return error(404,"Not found");
        try{
            Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-cache");headers.put("X-Content-Type-Options","nosniff");
            headers.put("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'");
            return new WebResourceResponse(mime,name.endsWith(".png")?null:"UTF-8",200,"OK",headers,context.getAssets().open("web/"+name));
        }catch(IOException error){return error(404,"Not found");}
    }
    private static WebResourceResponse error(int status,String text){return new WebResourceResponse("text/plain","UTF-8",status,text,Collections.emptyMap(),new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)));}
}
