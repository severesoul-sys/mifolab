package ru.mifolab.android;

import org.json.*;

/** Spirit parameters and upgrade budgets, without account identifiers. */
final class CollectionSnapshot {
    static JSONObject create(BattleData.Parsed parsed,BattleData.Catalog catalog,long now,JSONObject save) throws JSONException {
        JSONObject result=new JSONObject().put("format","mifolab-collection").put("version",1).put("updatedAt",now)
            .put("gameVersion",catalog.version).put("total",parsed.total);
        JSONArray rows=new JSONArray();
        for(BattleData.Spirit spirit:parsed.spirits){
            JSONObject row=new JSONObject(),nature=new JSONObject();
            row.put("id",spirit.fighter.id).put("speciesId",spirit.species.id).put("speciesName",spirit.species.name).put("name",spirit.fighter.name);
            row.put("rarity",spirit.species.rarity).put("elements",new JSONArray(spirit.species.elements));
            row.put("level",spirit.fighter.level).put("iv",stats(spirit.individual)).put("ivPercent",spirit.iv);
            nature.put("up",spirit.natureUp<0?"":BattleData.STATS[spirit.natureUp]).put("down",spirit.natureDown<0?"":BattleData.STATS[spirit.natureDown]);row.put("nature",nature);
            row.put("baseStats",stats(spirit.species.base)).put("stats",stats(spirit.fighter.stats));
            row.put("hp",spirit.fighter.hp).put("hpMax",spirit.fighter.maxHp).put("health",spirit.health*100);
            row.put("shiny",spirit.shiny).put("favorite",spirit.favorite).put("guarding",spirit.guarding).put("buddy",spirit.buddy);
            rows.put(row);
        }
        JSONArray issues=new JSONArray();
        for(String reason:parsed.unavailable){String value=reason.toLowerCase(java.util.Locale.ROOT);
            issues.put(value.contains("вид отсутствует")?"Вид этого духа пока отсутствует в каталоге.":value.contains("повтор")?"Повторяющаяся запись в подворье. Обновите список духов.":"Не удалось получить все характеристики духа. Обновите подворье.");
        }
        Object slots=count(save.opt("yardSlots"));
        if(slots instanceof Number)result.put("yard",new JSONObject().put("used",parsed.total).put("capacity",250+Math.min(250,((Number)slots).longValue())).put("maximum",500));
        else if(save.isNull("yardSlots"))result.put("yard",new JSONObject().put("used",parsed.total).put("capacity",250).put("maximum",500));
        return result.put("spirits",rows).put("unavailable",issues).put("resources",resources(save,catalog));
    }
    static JSONObject resources(JSONObject save,BattleData.Catalog catalog) throws JSONException {
        JSONObject items=save.optJSONObject("items"),source=save.optJSONObject("sparks");
        JSONObject result=new JSONObject().put("playerXp",count(save.opt("xp")))
            .put("dust",items==null?JSONObject.NULL:count(items.has("dust")?items.opt("dust"):0));
        if(source==null)return result.put("sparks",JSONObject.NULL);
        JSONObject sparks=new JSONObject();
        for(String species:catalog.rows.keySet())sparks.put(species,count(source.has(species)?source.opt(species):0));
        return result.put("sparks",sparks);
    }
    private static Object count(Object value){
        if(!(value instanceof Number))return JSONObject.NULL;
        double number=((Number)value).doubleValue();
        return Double.isFinite(number)&&number>=0&&number<=9007199254740991d&&number==Math.rint(number)?((Number)value).longValue():JSONObject.NULL;
    }
    private static JSONObject stats(int[] values) throws JSONException {
        JSONObject result=new JSONObject();for(int index=0;index<BattleData.STATS.length;index++)result.put(BattleData.STATS[index],values[index]);return result;
    }
}
