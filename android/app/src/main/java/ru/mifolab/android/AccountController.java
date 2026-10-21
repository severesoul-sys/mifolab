package ru.mifolab.android;

import android.content.Context;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;

/** Only sign-in and read-only yard requests are available to this app. */
final class AccountController implements AutoCloseable {
    interface Transport { JSONObject call(String method,String path,String token,JSONObject payload) throws Exception; }
    interface Listener { void receive(JSONObject event); }
    static final class HttpFailure extends IOException {final int status;HttpFailure(int value){super("HTTP "+value);status=value;}}
    static final class HttpTransport implements Transport {
        @Override public JSONObject call(String method,String path,String token,JSONObject payload) throws Exception {
            if(!(("GET".equals(method)&&"/api/me?churs=0".equals(path))||("POST".equals(method)&&"/api/auth/link/claim".equals(path))))throw new IOException("Запрос не поддерживается");
            HttpURLConnection connection=(HttpURLConnection)new URL("https://mifozov.com"+path).openConnection();
            try{
                connection.setConnectTimeout(12000);connection.setReadTimeout(20000);connection.setInstanceFollowRedirects(false);connection.setRequestMethod(method);connection.setRequestProperty("Accept","application/json");
                if(!token.isEmpty())connection.setRequestProperty("Authorization","Bearer "+token);
                if(payload!=null){byte[] bytes=payload.toString().getBytes(StandardCharsets.UTF_8);connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json; charset=utf-8");connection.setFixedLengthStreamingMode(bytes.length);try(OutputStream stream=connection.getOutputStream()){stream.write(bytes);}}
                int status=connection.getResponseCode();if(status<200||status>=300)throw new HttpFailure(status);
                try(InputStream input=connection.getInputStream()){return new JSONObject(read(input,12*1024*1024));}
            }finally{connection.disconnect();}
        }
    }
    static String read(InputStream input,int maximum) throws IOException {
        ByteArrayOutputStream output=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int count,total=0;
        while((count=input.read(buffer))!=-1){if((total+=count)>maximum)throw new IOException("Ответ слишком большой");output.write(buffer,0,count);}return output.toString("UTF-8");
    }
    static String normalizeCode(String input){String code=input==null?"":input.replaceAll("\\s+","");if(!code.matches("[0-9]{6}"))throw new IllegalArgumentException("Введите шестизначный код из профиля игры");return code;}
    static JSONObject snapshot(Context context,JSONObject response,long now) throws Exception {
        JSONObject save=response.optJSONObject("save");if(save==null)throw new IOException("Сервер не передал подворье");
        BattleData.Catalog catalog=BattleData.load(context);BattleData.Parsed parsed=BattleData.parse(save.optJSONArray("spirits"),catalog,BattleData.buddy(save),now,false);
        if(parsed.total>2000)throw new IOException("В подворье больше поддерживаемых 2000 духов");
        return CollectionSnapshot.create(parsed,catalog,now,save);
    }
    private final Context context;private final Transport transport;private final Listener listener;
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private int generation;private boolean busy,closed;private long lastSync;
    AccountController(Context context,Transport transport,Listener listener){this.context=context.getApplicationContext();this.transport=transport;this.listener=listener;}
    synchronized boolean connected(){return !SecureSession.get(context).isEmpty();}
    synchronized void status(){emit("status","",false,null,false);}
    private void emit(String type,String message,boolean error,JSONObject collection,boolean clear){
        if(closed)return;try{JSONObject event=new JSONObject().put("type",type).put("connected",connected()).put("busy",busy).put("message",message).put("error",error).put("lastSync",lastSync).put("clearCollection",clear);if(collection!=null)event.put("collection",collection);listener.receive(event);}catch(JSONException ignored){}
    }
    void connect(String input){String code;try{code=normalizeCode(input);}catch(Exception error){synchronized(this){emit("status",error.getMessage(),true,null,false);}return;}start(code);}
    void refresh(){start(null);}
    private synchronized void start(String code){
        if(closed||busy)return;if(code==null&&!connected()){emit("status","Сначала подключите аккаунт по коду",true,null,false);return;}
        final int task=++generation;busy=true;emit("status",code==null?"Обновляю подворье…":"Подключаю аккаунт…",false,null,false);
        executor.execute(()->{
            try{
                String token;
                if(code!=null){
                    JSONObject response=transport.call("POST","/api/auth/link/claim","",new JSONObject().put("code",code));token=response.optString("token","");if(token.isEmpty()||token.length()>16384)throw new IOException("Сервер не вернул данные входа");
                    synchronized(this){if(task!=generation||closed)return;SecureSession.save(context,token);busy=false;emit("status","Аккаунт подключён. Нажмите «Получить духов» или «Обновить духов».",false,null,false);}
                    return;
                }else token=SecureSession.get(context);
                JSONObject response=transport.call("GET","/api/me?churs=0",token,null);long now=System.currentTimeMillis();JSONObject collection=snapshot(context,response,now);
                synchronized(this){if(task!=generation||closed)return;lastSync=now;busy=false;emit("collection","Подворье обновлено",false,collection,false);}
            }catch(Exception error){synchronized(this){if(task!=generation||closed)return;busy=false;
                boolean expired=error instanceof HttpFailure&&((HttpFailure)error).status==401&&code==null;
                if(expired)SecureSession.clear(context);
                String message=error instanceof HttpFailure?(((HttpFailure)error).status==429?"Слишком много попыток. Подождите 10 минут.":expired?"Срок входа истёк. Получите новый код в игре.":code!=null&&((HttpFailure)error).status<500?"Код не подошёл или устарел. Получите новый код в игре.":"Сервер недоступен. Повторите позже."):error instanceof JSONException?"Формат данных игры изменился. Предыдущее подворье сохранено.":error instanceof IllegalArgumentException?error.getMessage():"Не удалось обновить данные. Проверьте интернет и нажмите «Обновить».";
                emit("status",message,true,null,false);
            }}
        });
    }
    synchronized void logout(){generation++;busy=false;lastSync=0;SecureSession.clear(context);emit("status","Аккаунт отключён. Сохранённый список доступен офлайн.",false,null,false);}
    @Override public synchronized void close(){closed=true;generation++;executor.shutdownNow();}
}
