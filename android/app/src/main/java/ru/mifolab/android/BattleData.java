package ru.mifolab.android;

import android.content.Context;
import org.json.*;
import java.io.*;
import java.util.*;

final class BattleData {
    static final String[] STATS={"zhivitsa","sila","stoikost","pryt","duh"};
    static final String[] STAT_NAMES={"Живица","Сила","Стойкость","Прыть","Дух"};

    static final class Species {
        final String id,name,rarity;
        final String[] elements;
        final int[] base;
        Species(JSONObject row) throws JSONException {
            id=row.getString("id");name=row.getString("name");rarity=row.getString("rarity");
            JSONArray types=row.getJSONArray("elements");
            if(types.length()<1||types.length()>2)throw new JSONException("Неверные стихии вида "+id);
            elements=new String[types.length()];
            for(int index=0;index<elements.length;index++){elements[index]=types.getString(index);if(CombatModel.elementIndex(elements[index])<0)throw new JSONException("Неизвестная стихия");}
            base=values(row.getJSONObject("base"),1,10000);
        }
    }

    static final class Catalog {
        final Map<String,Species> rows=new LinkedHashMap<>();
        final String version;
        Catalog(JSONObject data) throws JSONException {
            version=data.getString("version");JSONArray species=data.getJSONArray("species");
            for(int index=0;index<species.length();index++){Species row=new Species(species.getJSONObject(index));rows.put(row.id,row);}
        }
    }

    static final class Spirit {
        final Species species;
        final CombatModel.Fighter fighter,potential;
        final int iv;
        final int[] individual;
        final int natureUp,natureDown;
        final String nature;
        final boolean shiny,favorite,guarding,buddy;
        final double health,cheer;
        Spirit(JSONObject raw,Species species,String buddyId,long now,boolean defender) throws JSONException {
            this.species=species;
            String id=defender?raw.optString("id",raw.optString("playerId","")):raw.optString("id","");
            if(id.isEmpty())throw new JSONException("нет ID экземпляра");
            int level=integer(raw,"level",1,CombatModel.MAX_LEVEL);
            individual=values(raw.getJSONObject("individual"),0,15);int total=0;for(int value:individual)total+=value;iv=Math.round(total/75f*100);
            JSONObject rawNature=raw.optJSONObject("nature");int up=-1,down=-1;
            if(raw.has("nature")&&!raw.isNull("nature")&&rawNature==null)throw new JSONException("неизвестный нрав");
            if(rawNature!=null){up=statIndex(rawNature.optString("up",""));down=statIndex(rawNature.optString("down",""));if(up<0||down<0||up==down)throw new JSONException("неизвестный нрав");}
            natureUp=up;natureDown=down;
            nature=up<0?"ровный нрав":"↑"+STAT_NAMES[up]+" ↓"+STAT_NAMES[down];
            shiny=raw.optBoolean("shiny",false);favorite=raw.optBoolean("fav",false);guarding=truthy(raw.opt("guard"));buddy=id.equals(buddyId);
            int[] current=CombatModel.stats(species.base,individual,level,up,down),maximum=CombatModel.stats(species.base,individual,40,up,down);
            String nickname=raw.optString("name","").trim();String name=nickname.isEmpty()||nickname.equals(species.name)?species.name:nickname+" («"+species.name+"»)";
            int maxHp=CombatModel.hp(current);
            if(defender){
                double baseCheer=raw.has("cheer")?number(raw,"cheer",0,1):1;
                long at=raw.optLong("cheerAt",raw.optLong("since",now));
                cheer=CombatModel.clamp(baseCheer-Math.max(0,now-at)/86400000.0,0,1);
                maxHp=Math.max(1,(int)Math.round(maxHp*(.5+.5*cheer)));health=1;
            }else{cheer=1;health=health(raw,now);}
            int currentHp=health<=0?0:Math.max(1,(int)Math.round(maxHp*health));
            fighter=new CombatModel.Fighter(id,name,species.elements,level,current,maxHp,currentHp);
            int potentialHp=CombatModel.hp(maximum);
            potential=new CombatModel.Fighter(id,name,species.elements,40,maximum,potentialHp,potentialHp);
        }
        String label(){return fighter.name+" ["+fighter.id+"] · ур."+fighter.level+" · IV "+iv+"%";}
        String elements(){StringJoiner names=new StringJoiner(" / ");for(String element:species.elements)names.add(CombatModel.elementName(element));return names.toString();}
        String protection(){
            if(favorite)return "избранный";if(shiny)return "светлый, коллекционная ценность";
            if(guarding)return "назначен в охрану";if(buddy)return "спутник на выгуле";
            if(species.rarity.equals("legendary"))return "легендарный вид";if(iv==100)return "100% IV";
            return "";
        }
    }

    static final class Parsed {
        final List<Spirit> spirits=new ArrayList<>();
        final List<String> unavailable=new ArrayList<>();
        int total;
    }

    static Catalog load(Context context) throws Exception {
        try(InputStream input=context.getAssets().open("battle-catalog.json");ByteArrayOutputStream output=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1)output.write(buffer,0,count);
            return new Catalog(new JSONObject(output.toString("UTF-8")));
        }
    }
    static Parsed parse(JSONArray rows,Catalog catalog,String buddy,long now,boolean defenders) throws IOException {
        if(rows==null)throw new IOException(defenders?"Сервер не передал охрану":"Сервер не передал духов подворья");
        Parsed result=new Parsed();result.total=rows.length();Set<String> seen=new HashSet<>();
        for(int index=0;index<rows.length();index++){
            JSONObject raw=rows.optJSONObject(index);String label="Запись №"+(index+1);
            try{
                if(raw==null)throw new JSONException("неверный формат");
                label=raw.optString("name",raw.optString("species",label))+" ["+raw.optString("id",raw.optString("playerId","?"))+"]";
                JSONObject embedded=raw.optJSONObject("species");String code=embedded==null?raw.optString("species",""):embedded.optString("id","");
                Species species=catalog.rows.get(code);if(species==null)throw new JSONException("вид отсутствует в каталоге");
                Spirit spirit=new Spirit(raw,species,buddy,now,defenders);
                if(!seen.add(spirit.fighter.id))throw new JSONException("повтор ID");
                result.spirits.add(spirit);
            }catch(Exception error){result.unavailable.add(label+": "+error.getMessage());}
        }
        return result;
    }
    static String buddy(JSONObject save){JSONObject buddy=save.optJSONObject("buddy");return buddy==null?"":buddy.optString("id","");}
    static int statIndex(String value){for(int index=0;index<STATS.length;index++)if(STATS[index].equals(value))return index;return -1;}
    static double number(JSONObject object,String key,double minimum,double maximum) throws JSONException {
        Object value=object.opt(key);if(!(value instanceof Number))throw new JSONException("нет параметра "+key);
        double number=((Number)value).doubleValue();if(!Double.isFinite(number)||number<minimum||number>maximum)throw new JSONException("неверный параметр "+key);return number;
    }
    static int integer(JSONObject object,String key,int minimum,int maximum) throws JSONException {double number=number(object,key,minimum,maximum);if(number!=Math.floor(number))throw new JSONException("нецелый параметр "+key);return (int)number;}
    static int[] values(JSONObject object,int minimum,int maximum) throws JSONException {int[] result=new int[5];for(int index=0;index<5;index++)result[index]=integer(object,STATS[index],minimum,maximum);return result;}
    static boolean truthy(Object value){return value!=null&&value!=JSONObject.NULL&&!Boolean.FALSE.equals(value)&&!"".equals(value);}
    static double health(JSONObject raw,long now) throws JSONException {
        if(!raw.has("hurt")||raw.isNull("hurt"))return 1;
        JSONObject hurt=raw.getJSONObject("hurt");double health=number(hurt,"hp",0,1),at=number(hurt,"at",1,Long.MAX_VALUE);
        return CombatModel.clamp(health+Math.max(0,now-at)/3600000,0,1);
    }
}
