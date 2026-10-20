package ru.mifolab.android;

import org.json.*;
import java.io.*;

public final class TestActivity extends MainActivity {
    static volatile int claims,reads;
    volatile int documentLoads;
    @Override protected void onLocalPageFinished(){documentLoads++;}
    static final String TEST_TOKEN="mifolab-test-secret-never-in-javascript";
    @Override protected AccountController.Transport createTransport(){return (method,path,token,payload)->{
        if(method.equals("POST")&&path.equals("/api/auth/link/claim")){
            if(!payload.getString("code").equals("123456")||!token.isEmpty())throw new AssertionError("Incorrect claim request");claims++;return new JSONObject().put("token",TEST_TOKEN);
        }
        if(!method.equals("GET")||!path.equals("/api/me?churs=0")||!token.equals(TEST_TOKEN))throw new AssertionError("Unexpected game request");
        reads++;JSONObject fixture;
        try(InputStream input=getAssets().open("test/collection.json")){fixture=new JSONObject(AccountController.read(input,1000000));}
        JSONArray rows=new JSONArray(),spirits=fixture.getJSONArray("spirits");long now=System.currentTimeMillis();
        for(int index=0;index<spirits.length();index++){
            JSONObject entry=spirits.getJSONObject(index),row=new JSONObject();row.put("id",entry.getString("id")).put("species",entry.getString("speciesId")).put("name","Тест "+(index+1)).put("level",entry.getInt("level")).put("individual",entry.getJSONObject("iv"));
            JSONObject nature=entry.getJSONObject("nature");if(!nature.optString("up").isEmpty())row.put("nature",nature);
            row.put("shiny",entry.getBoolean("shiny")).put("fav",entry.getBoolean("favorite"));if(entry.getBoolean("guarding"))row.put("guard","test-tree");
            if(entry.getDouble("health")<100)row.put("hurt",new JSONObject().put("hp",entry.getDouble("health")/100).put("at",now));rows.put(row);
        }
        rows.put(new JSONObject().put("id","test-future").put("species","future-species"));
        return new JSONObject().put("save",new JSONObject().put("spirits",rows).put("buddy",new JSONObject().put("id","test-spirit-4")).put("lat",55.12345).put("token",TEST_TOKEN)).put("account","PRIVATE-SENTINEL");
    };}
}
