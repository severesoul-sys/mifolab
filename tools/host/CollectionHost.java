package ru.mifolab.android;
import org.json.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
public final class CollectionHost {
    private static int checks;
    private static void check(boolean value,String text){checks++;if(!value)throw new AssertionError(text);}
    public static void main(String[] args)throws Exception {
        BattleData.Catalog catalog=new BattleData.Catalog(new JSONObject(new String(Files.readAllBytes(Paths.get(args[0])),StandardCharsets.UTF_8)));
        JSONArray spirits=new JSONArray().put(new JSONObject().put("id","unknown").put("species","future"));
        BattleData.Parsed parsed=BattleData.parse(spirits,catalog,"",1,false);JSONObject save=new JSONObject();
        check(CollectionSnapshot.create(parsed,catalog,1,save).getJSONObject("yard").getInt("capacity")==250,"missing slots");
        save.put("yardSlots",JSONObject.NULL);check(CollectionSnapshot.create(parsed,catalog,1,save).getJSONObject("yard").getInt("capacity")==250,"null slots");
        for(int extra=0;extra<=2000;extra+=50){save.put("yardSlots",extra);JSONObject result=CollectionSnapshot.create(parsed,catalog,1,save),yard=result.getJSONObject("yard");check(yard.getInt("capacity")==Math.min(500,250+extra),"capacity");check(yard.getInt("used")==1&&yard.getInt("maximum")==500,"unknown spirits occupy space");}
        for(Object invalid:new Object[]{"50",-1,1.5}){save.put("yardSlots",invalid);check(!CollectionSnapshot.create(parsed,catalog,1,save).has("yard"),"invalid capacity remains unknown");}
        System.out.println("Mifo Lab native collection: "+checks+" assertions passed without device or network");
    }
}
