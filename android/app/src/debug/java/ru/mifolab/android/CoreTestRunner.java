package ru.mifolab.android;

import android.app.*;
import android.content.*;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.*;
import android.view.MotionEvent;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

public final class CoreTestRunner extends Instrumentation {
    private int assertions;
    private TestActivity activity;
    private boolean screenshots;
    @Override public void onCreate(Bundle args){super.onCreate(args);screenshots="true".equals(args.getString("screenshots"));start();}
    private void check(boolean ok,String text){assertions++;if(!ok)throw new AssertionError(text);}
    private String js(String expression) throws Exception {
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();runOnMainSync(()->activity.webView.evaluateJavascript(expression,result->{value.set(result);done.countDown();}));if(!done.await(8,TimeUnit.SECONDS))throw new AssertionError("JS timeout: "+expression.substring(0,Math.min(expression.length(),180)));return value.get();
    }
    private void until(String expression,String label) throws Exception {long until=SystemClock.uptimeMillis()+30000;while(SystemClock.uptimeMillis()<until){if("true".equals(js(expression))){check(true,label);return;}Thread.sleep(100);}throw new AssertionError("Timed out: "+label+"; "+activity.testConsoleErrors);}
    private void click(String selector) throws Exception {String query="document.querySelector("+JSONObject.quote(selector)+")";until("!!"+query+"&&!"+query+".disabled","control ready "+selector);js("(()=>{const e="+query+";for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;e.scrollIntoView({block:'center'});e.click();})()");}
    private void select(String selector,String value) throws Exception {js("(()=>{const e=document.querySelector("+JSONObject.quote(selector)+");e.value="+JSONObject.quote(value)+";e.dispatchEvent(new Event('change',{bubbles:true}));})()");}
    private void search(String selector,String value) throws Exception {js("(()=>{const e=document.querySelector("+JSONObject.quote(selector)+");e.focus();e.value="+JSONObject.quote(value)+";e.dispatchEvent(new Event('input',{bubbles:true}));})()");}
    private void noPrivateLabels() throws Exception {
        check(js("(()=>{const text=document.body.textContent+' '+[...document.querySelectorAll('[title],[placeholder],[aria-label]')].map(e=>[e.getAttribute('title'),e.getAttribute('placeholder'),e.getAttribute('aria-label')].join(' ')).join(' ');return !/\\bID\\b|test-spirit-|test-future|future-species/i.test(text);})()").equals("true"),"public text and accessibility labels hide internal identifiers");
    }
    private void page(String name) throws Exception {click(".nav-item[data-tab=\""+name+"\"]");until("document.querySelector('#page-"+name+"').classList.contains('active')","page "+name);}
    @Override public void onStart(){Bundle report=new Bundle();try{runTests();report.putString("stream","Mifo Lab Android: "+assertions+" assertions passed\n");finish(-1,report);}catch(Throwable error){try{Bitmap shot=getUiAutomation().takeScreenshot();if(shot!=null){try(FileOutputStream output=getTargetContext().openFileOutput("mifolab-failure.png",0)){shot.compress(Bitmap.CompressFormat.PNG,100,output);}shot.recycle();}}catch(Exception ignored){}StringWriter trace=new StringWriter();error.printStackTrace(new PrintWriter(trace));report.putString("stream","FAILED after "+assertions+" checks: "+trace+"\n"+(activity==null?"":activity.testConsoleErrors));finish(0,report);}finally{if(activity!=null)runOnMainSync(()->activity.finish());}}
    private void runTests() throws Exception {
        Context context=getTargetContext();SecureSession.clear(context);runOnMainSync(()->android.webkit.WebStorage.getInstance().deleteAllData());TestActivity.claims=TestActivity.reads=0;
        check(AccountController.normalizeCode("123 456").equals("123456"),"code normalization");try{AccountController.normalizeCode("<script>");throw new AssertionError("invalid code accepted");}catch(IllegalArgumentException expected){check(true,"code validation");}
        check(LocalAssets.page(Uri.parse(LocalAssets.START)),"trusted local page");check(!LocalAssets.page(Uri.parse("https://mifozov.com/play")),"external page not trusted");check(!LocalAssets.trusted(Uri.parse("https://appassets.androidplatform.net.evil/")),"host suffix blocked");check(!LocalAssets.trusted(Uri.parse("https://user@appassets.androidplatform.net/")),"userinfo blocked");
        LocalAssets assets=new LocalAssets(context);check(assets.serve(Uri.parse(LocalAssets.START)).getStatusCode()==200,"packaged entry");check(assets.serve(Uri.parse(LocalAssets.ORIGIN+"/assets/../private")).getStatusCode()==404,"traversal blocked");check(assets.serve(Uri.parse("https://example.com/a.js")).getStatusCode()==403,"remote resource blocked");
        SecureSession.save(context,TestActivity.TEST_TOKEN);check(SecureSession.get(context).equals(TestActivity.TEST_TOKEN),"keystore roundtrip");check(!context.getSharedPreferences("mifolab-account",0).getAll().toString().contains(TestActivity.TEST_TOKEN),"no plaintext session");
        CountDownLatch entered=new CountDownLatch(1),release=new CountDownLatch(1);List<JSONObject> events=new CopyOnWriteArrayList<>();
        AccountController stale=new AccountController(context,(m,p,t,b)->{entered.countDown();release.await(5,TimeUnit.SECONDS);return new JSONObject().put("save",new JSONObject().put("spirits",new JSONArray()));},events::add);stale.refresh();check(entered.await(5,TimeUnit.SECONDS),"request started");stale.logout();release.countDown();Thread.sleep(200);check(events.stream().noneMatch(e->e.optString("type").equals("collection")),"logout invalidates in-flight response");check(SecureSession.get(context).isEmpty(),"logout clears key data");stale.close();
        activity=(TestActivity)startActivitySync(new Intent(context,TestActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        awaitDocument(1);
        until("!!window.MifoAndroid&&!!window.MifoOwned&&document.querySelectorAll('.sidebar .nav-item').length===6","all six phone sections ready");
        check(js("document.querySelectorAll('input[type=file],#import-button,#export-button,#export-ranking,.mobile-file-tools,.mobile-import-file').length===0").equals("true"),"file transfer controls removed");
        check(js("!/наблюдател|pvpoke|покемон|импорт|экспорт|JSON/i.test(document.body.textContent)").equals("true"),"public interface has no internal references");
        check(js("document.querySelector('#mobile-connect-form').hidden").equals("false"),"login optional initially");check(js("document.documentElement.scrollWidth<=window.innerWidth+1").equals("true"),"no page horizontal overflow");
        verifyPlannerCatalog();
        verifyCurrentUpdate();
        verifyNewFeatures();
        captureLayout("arena");
        if(screenshots){search("#species-search-b","гор");captureLayout("search-b");js("document.activeElement.blur();document.querySelector('#team-a details').open=true");captureLayout("arena-details");js("document.querySelector('#team-a details').open=false");}
        page("battle");search("#species-search-a","№ 006");check(js("document.querySelectorAll('#species-search-a-list .species-option').length===1&&document.querySelector('#species-search-a-list').textContent.includes('Рарог')").equals("true"),"arena search by chronicle number");click("#species-search-a-list .species-option");
        click("[data-size=\"6\"]");click("#team-a [data-slot=\"5\"]");search("#species-search-a","007");click("#species-search-a-list .species-option");check(js("document.querySelector('#team-a .fighter-identity').textContent.includes('Индрик')").equals("true"),"sixth arena slot accepts numbered search");noPrivateLabels();
        click("#run-battle");until("!document.querySelector('#battle-result').hidden","offline arena battle");
        captureLayout("teams");
        page("rankings");check(js("document.querySelectorAll('#ranking-body tr').length===138").equals("true"),"bundled spirit ranking");search("#rank-search","№007");check(js("document.querySelectorAll('#ranking-body tr').length===1&&document.querySelector('#ranking-body').textContent.includes('Индрик')").equals("true"),"ranking search by chronicle number");search("#rank-search","");
        captureLayout("rankings");
        page("elements");check(js("document.querySelectorAll('#type-table td').length>40").equals("true"),"element reference");
        captureLayout("elements");
        page("raids");until("document.querySelectorAll('#raid-rank-body .raid-add-slots').length>10","raid Worker loads local scripts");search("#raid-rank-search","007");check(js("document.querySelectorAll('#raid-rank-body .raid-add-slots').length===1&&document.querySelector('#raid-rank-body').textContent.includes('Индрик')").equals("true"),"raid ranking search by number");search("#raid-rank-search","");search("#species-search-raid","006");click("#species-search-raid-list .species-option");click("#raid-run");until("!document.querySelector('#raid-result').hidden","offline raid");
        page("collection");js("document.querySelector('#mobile-code').value='123456';document.querySelector('#mobile-connect').click()");
        until("!document.querySelector('.mobile-connected').hidden&&!document.querySelector('#mobile-refresh').disabled","code sign-in without yard fetch");
        check(TestActivity.claims==1&&TestActivity.reads==0,"sign-in does not fetch yard");click("#mobile-refresh");
        until("window.MifoOwned.get()?.spirits.length===9&&!document.querySelector('.mobile-connected').hidden","manual fetch directly populates collection");
        check(TestActivity.claims==1&&TestActivity.reads==1,"only claim and GET yard called");
        verifyPlannerYard();
        check(js("document.querySelector('#owned-capacity').textContent.includes('10 из 350')&&MifoOwned.get().yard.maximum===500").equals("true"),"yard population includes unavailable records and current purchased capacity");
        captureLayout("collection");
        check(js("window.MifoOwned.get().format==='mifolab-collection'&&window.MifoOwned.get().updatedAt>0").equals("true"),"current collection format");check(js("window.MifoOwned.get().spirits[1].stats.sila===172").equals("true"),"exact caught stats");check(js("window.MifoOwned.get().unavailable.length===1").equals("true"),"unknown record disclosed");
        check(!js("JSON.stringify(localStorage)").contains(TestActivity.TEST_TOKEN),"token never reaches web storage");check(!js("JSON.stringify(window.MifoOwned.get())").contains("PRIVATE-SENTINEL"),"account fields stripped");check(js("document.querySelector('#mobile-code').value==='' ").equals("true"),"code field cleared");
        search("#owned-search","006");check(js("document.querySelectorAll('#owned-body .owned-name').length===2").equals("true"),"number finds both caught copies");search("#owned-search","test-spirit-2");check(js("document.querySelectorAll('#owned-body .owned-name').length===0").equals("true"),"internal identifier is not a search key");search("#owned-search","");noPrivateLabels();
        click("#owned-rank");until("document.querySelector('#owned-ranking-status').textContent.includes('288')","personal ranking Worker");
        click("[data-owned-detail=\"test-spirit-2\"]");check(js("document.querySelector('#owned-detail').textContent.includes('№006')").equals("true"),"caught detail shows chronicle number");noPrivateLabels();click("#owned-close-detail");click("#owned-build");until("!document.querySelector('#owned-team').hidden","personal team preview");noPrivateLabels();
        select("#owned-raid-slot","4");click("[data-owned-raid=\"test-spirit-2\"]");page("raids");check(js("document.querySelector('.raid-spirit-title').textContent.includes('№006')&&document.querySelector('#raid-stat-summary').textContent.includes('172')").equals("true"),"caught spirit directly in raid slot");click("#raid-pick");until("!document.querySelector('#raid-pick-result').hidden","personal six in APK");noPrivateLabels();
        captureLayout("raids");
        if(screenshots){js("document.querySelector('.raid-team-panel').scrollIntoView({block:'start'})");captureLayout("raid-team",false);}
        page("training");js("document.querySelector('#practice-unlimited').checked=true");click("[data-shape=\"square\"]");click("#practice-start");until("document.querySelector('#rune-dialog').open","touch training dialog");
        drawSquare();until("!document.querySelector('#rune-dialog').open","finger stroke submitted");String score=js("document.querySelector('#practice-result').textContent");check(score.contains("%"),"touch rune graded");check(Integer.parseInt(js("parseInt(document.querySelector('#practice-result strong').textContent)"))>=90,"finger square matches visible guide");
        captureLayout("training");
        JSONObject bounds=new JSONObject(new JSONArray("["+js("JSON.stringify({width:innerWidth,screen:document.documentElement.scrollWidth})")+"]").getString(0));check(bounds.getInt("screen")<=bounds.getInt("width")+1,"phone layout fits");
        page("collection");click("#mobile-refresh");until("!document.querySelector('#mobile-refresh').disabled","refresh completed");check(TestActivity.reads==2,"refresh fetches current yard");
        page("raids");Thread.sleep(400);Bitmap screenshot=getUiAutomation().takeScreenshot();check(screenshot!=null,"Android screenshot captured");try(FileOutputStream out=context.openFileOutput("mifolab-phone.png",0)){screenshot.compress(Bitmap.CompressFormat.PNG,100,out);}screenshot.recycle();
        int nextLoad=activity.documentLoads+1;runOnMainSync(()->activity.webView.reload());awaitDocument(nextLoad);until("!!window.MifoAndroid&&window.MifoOwned.get()?.spirits.length===9","collection survives reload");
        Thread.sleep(300);check(TestActivity.reads==2,"reopening never fetches yard");
        check(js("MifoOwned.get().resources.dust===50000&&MifoOwned.get().resources.sparks.rarog===30").equals("true"),"upgrade resources persist offline after reload");
        page("collection");click("#mobile-disconnect");until("window.MifoOwned.get()?.spirits.length===9&&!document.querySelector('#mobile-connect-form').hidden","logout keeps offline collection");check(SecureSession.get(context).isEmpty(),"logged out natively");
        check(js("!/наблюдател|pvpoke|покемон|импорт|экспорт|JSON/i.test(document.body.textContent)").equals("true"),"loaded collection and results use public copy");
        noPrivateLabels();
        check(activity.testConsoleErrors.isEmpty(),"no WebView JS errors");
    }
    private void awaitDocument(int count) throws Exception {long end=SystemClock.uptimeMillis()+30000;while(SystemClock.uptimeMillis()<end&&activity.documentLoads<count)Thread.sleep(100);check(activity.documentLoads>=count,"local document finished loading");}
    private void verifyCurrentUpdate() throws Exception {
        check(js("MifoCatalog.version==='0.46'&&MifoChronicle.entries.length===138&&MifoRankings.battles===604992").equals("true"),"current data and recalculated ranking bundled");
        page("battle");search("#species-search-a","091");click("#species-search-a-list .species-option");check(js("MifoArena.teams().left[0].speciesId==='chudo_yudo'").equals("true"),"new spirit selected by number on arena");
        search("#species-search-b","Мяндаш");click("#species-search-b-list .species-option");click("#run-battle");until("!document.querySelector('#battle-result').hidden","new spirits fight offline");
        page("rankings");search("#rank-search","138");check(js("document.querySelectorAll('#ranking-body tr').length===1&&document.querySelector('#ranking-body').textContent.includes('Мяндаш')").equals("true"),"new chronicle number in ranking");search("#rank-search","");
        js("MifoUpgradeUI.openCatalog('myandash')");check(js("document.querySelector('#upgrade-identity').textContent.includes('№138')&&document.querySelector('#upgrade-cost-dust').textContent.length>0").equals("true"),"new spirit in upgrade planner");
        page("raids");search("#species-search-raid","091");click("#species-search-raid-list .species-option");
        check(js("document.querySelector('.raid-spirit-title').textContent.includes('Чудо-юдо')").equals("true"),"new raid team spirit");
        check(js("!document.querySelector('#raid-sila-potion').checked&&document.querySelector('#raid-revives').value==='0'").equals("true"),"potions default off for old saved conditions");
        click("#raid-sila-potion");select("#raid-revives","2");click("#raid-run");until("!document.querySelector('#raid-result').hidden","raid potions run offline");
        check(js("document.querySelector('#raid-result').textContent.includes('из 2')&&document.querySelector('#raid-result').textContent.includes('Отвар силы: у всех')").equals("true"),"potion conditions visible in results");
        if(screenshots){js("document.querySelector('.raid-potions').open=true;document.querySelector('.raid-potions').scrollIntoView({block:'start'})");captureLayout("raid-potions",false);}
        int loads=activity.documentLoads+1;runOnMainSync(()->activity.webView.reload());awaitDocument(loads);until("!!document.querySelector('#raid-revives')","raid controls after reload");
        check(js("document.querySelector('#raid-sila-potion').checked&&document.querySelector('#raid-revives').value==='2'").equals("true"),"potion settings survive reload");
        click("#raid-sila-potion");select("#raid-revives","0");
        check(TestActivity.reads==0&&TestActivity.claims==0,"current catalogue and potions never contact account");
        BattleData.Catalog catalog=BattleData.load(getTargetContext());long now=System.currentTimeMillis();JSONArray raw=new JSONArray();
        for(int i=0;i<2;i++){JSONObject iv=new JSONObject();for(String stat:BattleData.STATS)iv.put(stat,10+i);raw.put(new JSONObject().put("id","test-new-"+i).put("species","myandash").put("level",20+i).put("individual",iv));}
        JSONObject snapshot=CollectionSnapshot.create(BattleData.parse(raw,catalog,"",now,false),catalog,now,new JSONObject().put("xp",2500).put("items",new JSONObject().put("dust",10000)).put("sparks",new JSONObject().put("myandash",12)));
        check(snapshot.getJSONArray("spirits").length()==2&&snapshot.getString("gameVersion").equals("0.46"),"native account parser knows new spirit copies");
        check(snapshot.getJSONObject("resources").getJSONObject("sparks").getInt("myandash")==12,"native new species sparks");
        js("window.__newYard=MifoCollection.parse("+snapshot.toString()+",MifoCatalog)");
        check(js("window.__newYard.spirits.length===2&&window.__newYard.spirits[0].id!==window.__newYard.spirits[1].id").equals("true"),"new native snapshot accepted by web without merging copies");
        page("battle");noPrivateLabels();
    }
    private void verifyNewFeatures() throws Exception {
        page("battle");click("[data-open-squads=\"a\"]");until("document.querySelector('#squad-dialog').open","squad library opens");
        enter("#squad-name","Проверочный отряд");click("#squad-save-form button");
        check(js("document.querySelectorAll('[data-squad-load]').length===1").equals("true"),"named squad saved locally");click("#squad-close");
        page("raids");click("[data-open-squads=\"raid\"]");click("[data-squad-load]");
        check(js("!document.querySelector('#squad-dialog').open&&MifoRaidUI.currentTeam().filter(Boolean).length===1").equals("true"),"saved arena spirit loads into raid with remaining slots empty");
        select("#raid-friend-bonus","15");select("#raid-count","2");click("#raid-run");
        check(js("document.querySelector('#raid-result').textContent.includes('Бонус дружбы: 15%')").equals("true"),"raid displays friendship scenario");
        click("#mobile-fullscreen");check(js("MifoNative.fullscreen()===true").equals("true"),"fullscreen enabled through native preference");
        int loads=activity.documentLoads+1;runOnMainSync(()->activity.webView.reload());awaitDocument(loads);until("!!document.querySelector('#mobile-fullscreen')","new controls after reload");
        check(js("MifoNative.fullscreen()&&document.querySelector('#mobile-fullscreen').getAttribute('aria-pressed')==='true'&&document.querySelector('#raid-friend-bonus').value==='15'").equals("true"),"display and friendship choices survive reload");
        click("[data-open-squads=\"raid\"]");check(js("document.querySelector('#squad-list').textContent.includes('Проверочный отряд')").equals("true"),"named squads survive reload");click("#squad-close");
        click("#mobile-fullscreen");select("#raid-friend-bonus","0");select("#raid-count","1");
        check(TestActivity.reads==0&&TestActivity.claims==0,"new offline features never fetch account");page("battle");
    }
    private void enter(String selector,String value) throws Exception {js("(()=>{const e=document.querySelector("+JSONObject.quote(selector)+");e.value="+JSONObject.quote(value)+";e.dispatchEvent(new Event('input',{bubbles:true}));})()");}
    private void verifyPlannerCatalog() throws Exception {
        js("window.__arenaBeforePlanner=JSON.stringify(MifoArena.teams())");page("rankings");click("#open-upgrade-catalog");
        until("document.querySelector('#page-upgrade').classList.contains('active')","planner is available from the ranking");
        check(js("document.querySelector('#upgrade-cost-dust').textContent.replace(/\\D/g,'')==='127000'&&document.querySelector('#upgrade-cost-sparks').textContent==='109'").equals("true"),"level 20 to 40 shows verified game costs");
        search("#species-search-upgrade","№007");click("#species-search-upgrade-list .species-option");
        check(js("document.querySelector('#upgrade-picker select').value==='indrik'").equals("true"),"planner searches the chronicle by number");
        js("document.querySelector('#upgrade-budget').open=true");enter("#upgrade-player","20");enter("#upgrade-dust","6500");enter("#upgrade-sparks","5");click("#upgrade-max");
        check(js("document.querySelector('#upgrade-target').value==='22'&&document.querySelector('#upgrade-cost-dust').textContent.replace(/\\D/g,'')==='6500'").equals("true"),"maximum upgrade follows exact resource and player cap");
        enter("#upgrade-target","23");check(js("document.querySelector('#upgrade-status').textContent.includes('нужен игрок уровня 21')&&document.querySelector('#upgrade-status').textContent.includes('Не хватает')").equals("true"),"planner explains resource shortage and required player level");
        enter("#upgrade-from","");check(js("!!document.querySelector('#upgrade-result .error')").equals("true"),"empty current level is reported");click("[data-upgrade-source=\"owned\"]");click("[data-upgrade-source=\"catalog\"]");
        check(js("document.querySelector('#upgrade-from').value==='20'").equals("true"),"returning to catalog restores the last valid parameters");
        enter("#upgrade-target","40");enter("#upgrade-player","40");enter("#upgrade-dust","127000");enter("#upgrade-sparks","109");
        select("[data-upgrade-nature=\"up\"]","sila");
        check(js("document.querySelector('#upgrade-result').textContent.includes('258')").equals("true"),"nature changes the future spirit stats");
        check(js("JSON.stringify(MifoArena.teams())===window.__arenaBeforePlanner").equals("true"),"planning leaves arena teams unchanged");
        check(TestActivity.reads==0&&TestActivity.claims==0,"planning from the chronicle is offline");noPrivateLabels();
        captureLayout("upgrade-catalog");
        if(screenshots){js("document.querySelector('#upgrade-result').scrollIntoView({block:'start'})");captureLayout("upgrade-result",false);}
        page("elements");check(js("document.querySelector('#raid-pass-help').textContent.includes('200 монет')&&document.querySelector('#raid-pass-help').textContent.includes('до 3 за сутки')&&document.querySelector('#raid-pass-help').textContent.includes('не возвращает')").equals("true"),"raid pass reference includes price daily limit and lobby rule");
        page("battle");
    }
    private void verifyPlannerYard() throws Exception {
        check(js("MifoOwned.get().resources.playerXp===7253000&&MifoOwned.get().resources.dust===50000&&MifoOwned.get().resources.sparks.rarog===30&&MifoOwned.get().resources.sparks.unknown===undefined").equals("true"),"manual yard fetch provides only upgrade resource fields");
        js("window.__yardBeforePlanner=JSON.stringify(MifoOwned.get())");click("[data-owned-upgrade=\"test-spirit-2\"]");
        check(js("document.querySelector('#upgrade-from').value==='37'&&document.querySelector('#upgrade-from').readOnly").equals("true"),"caught copy keeps its actual initial level");
        if(!js("document.querySelector('#upgrade-use-yard').checked").equals("true"))click("#upgrade-use-yard");
        check(js("document.querySelector('#upgrade-dust').value==='50000'&&document.querySelector('#upgrade-sparks').value==='30'&&document.querySelector('#upgrade-dust').readOnly").equals("true"),"planner reads the cached account budget");
        click("#upgrade-max");check(js("document.querySelector('#upgrade-target').value==='40'&&document.querySelector('#upgrade-cost-dust').textContent.replace(/\\D/g,'')==='29100'").equals("true"),"caught upgrade to 40 uses current level and resources");
        js("document.querySelector('#upgrade-budget').open=false");captureLayout("upgrade-owned");
        search("#species-search-upgrade","006");check(js("document.querySelectorAll('#species-search-upgrade-list .species-option').length===2").equals("true"),"chronicle search preserves both caught copies in planner");click("#species-search-upgrade-list .species-option:nth-child(2)");
        check(js("document.querySelector('#upgrade-from').value==='16'").equals("true"),"second caught copy has its own actual level");
        check(js("JSON.stringify(MifoOwned.get())===window.__yardBeforePlanner").equals("true"),"planner does not spend resources or rewrite caught stats");
        click("#upgrade-back");click("[data-owned-upgrade=\"test-spirit-1\"]");check(js("document.querySelector('#upgrade-status').textContent.includes('в охране')").equals("true"),"guard restriction is visible");
        js("window.__freshYard=JSON.parse(window.__yardBeforePlanner);const old=JSON.parse(window.__yardBeforePlanner);delete old.resources;MifoOwned.load(old,{calculateNow:false})");
        check(js("document.querySelector('#upgrade-use-yard').disabled&&document.querySelector('#upgrade-budget-note').textContent.includes('нет запасов')").equals("true"),"older offline yard stays usable without resource data");
        js("MifoOwned.load(window.__freshYard,{calculateNow:false})");noPrivateLabels();check(TestActivity.reads==1,"opening and editing the planner never fetches the yard");click("#upgrade-back");
    }
    private void captureLayout(String name) throws Exception {captureLayout(name,true);}
    private void captureLayout(String name,boolean top) throws Exception {
        if(!screenshots)return;
        if(top)js("window.scrollTo(0,0)");Thread.sleep(350);
        Bitmap shot=getUiAutomation().takeScreenshot();if(shot!=null){try(FileOutputStream out=getTargetContext().openFileOutput("layout-"+name+".png",0)){shot.compress(Bitmap.CompressFormat.PNG,100,out);}shot.recycle();}
        Bundle result=new Bundle();result.putString("stream","LAYOUT "+name+" "+js("JSON.stringify((()=>{const box=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom}:null};return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,nav:box('.sidebar'),a:box('#team-a'),b:box('#team-b'),popup:box('#team-b .species-popup:not([hidden])')};})())")+"\n");sendStatus(0,result);
    }
    private void drawSquare() throws Exception {
        String raw=js("JSON.stringify((()=>{const r=document.querySelector('#rune-svg').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,viewport:innerWidth};})())");
        JSONObject rect=new JSONObject(new JSONArray("["+raw+"]").getString(0));float scale=activity.webView.getWidth()/(float)rect.getDouble("viewport");
        float x=(float)rect.getDouble("x"),y=(float)rect.getDouble("y"),w=(float)rect.getDouble("w"),h=(float)rect.getDouble("h");
        float[][] corners={{.1f,.1f},{.9f,.1f},{.9f,.9f},{.1f,.9f},{.1f,.1f}};long down=SystemClock.uptimeMillis();
        for(int edge=0;edge<4;edge++)for(int step=0;step<18;step++){
            final int action=edge==0&&step==0?MotionEvent.ACTION_DOWN:MotionEvent.ACTION_MOVE;float fraction=step/18f;final float px=(x+(corners[edge][0]+(corners[edge+1][0]-corners[edge][0])*fraction)*w)*scale,py=(y+(corners[edge][1]+(corners[edge+1][1]-corners[edge][1])*fraction)*h)*scale;
            runOnMainSync(()->{MotionEvent event=MotionEvent.obtain(down,SystemClock.uptimeMillis(),action,px,py,0);activity.webView.dispatchTouchEvent(event);event.recycle();});Thread.sleep(8);
        }
        runOnMainSync(()->{MotionEvent event=MotionEvent.obtain(down,SystemClock.uptimeMillis(),MotionEvent.ACTION_UP,(x+.1f*w)*scale,(y+.1f*h)*scale,0);activity.webView.dispatchTouchEvent(event);event.recycle();});
    }
}
