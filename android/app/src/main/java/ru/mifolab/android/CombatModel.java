package ru.mifolab.android;

import java.util.ArrayList;
import java.util.List;

final class CombatModel {
    static final int MAX_LEVEL=40, MAX_SQUAD=6;
    static final String[] ELEMENTS={"voda","ogon","drevo","zemlya","veter","yav","nav"};
    static final String[] ELEMENT_NAMES={"Вода","Огонь","Древо","Земля","Ветер","Явь","Навь"};

    static final class Fighter {
        final String id, name;
        final String[] elements;
        final int level, maxHp, hp;
        final int[] stats;
        Fighter(String id,String name,String[] elements,int level,int[] stats,int maxHp,int hp){
            this.id=id;this.name=name;this.elements=elements;this.level=level;this.stats=stats;
            this.maxHp=maxHp;this.hp=Math.max(0,Math.min(maxHp,hp));
        }
    }

    static final class Scenario {
        final double attack, defense, enemyAttack;
        Scenario(double attack,double defense,double enemyAttack){this.attack=attack;this.defense=defense;this.enemyAttack=enemyAttack;}
    }
    static final Scenario NORMAL=new Scenario(.8,.8,.85);
    static final Scenario PERFECT=new Scenario(1,1,.85);
    static final Scenario FAVORABLE=new Scenario(1,1,.45);

    static final class Result {
        boolean won, timedOut;
        int beaten, playerUltras, enemyUltras, swaps;
        long time;
        int[] playerHp, playerEnergy, enemyHp, enemyEnergy;
        final List<String> steps=new ArrayList<>();
        double progress(List<Fighter> guards){
            if(won)return guards.size();
            return beaten+(beaten<guards.size()?1-enemyHp[beaten]/(double)guards.get(beaten).maxHp:0);
        }
        double health(List<Fighter> team){double sum=0;for(int index=0;index<team.size();index++)sum+=playerHp[index]/(double)team.get(index).maxHp;return sum;}
    }

    static double clamp(double value,double minimum,double maximum){return Math.max(minimum,Math.min(maximum,value));}
    static double levelScale(int level){return .1+.9*(clamp(level,1,40)-1)/39;}
    static int[] stats(int[] base,int[] iv,int level,int up,int down){
        int[] result=new int[5];
        for(int index=0;index<5;index++)result[index]=(int)Math.floor((base[index]+iv[index])*levelScale(level)*(index==up?1.1:index==down?.9:1));
        return result;
    }
    static int hp(int[] stats){return Math.max(10,stats[0]*4);}
    static int elementIndex(String value){for(int index=0;index<ELEMENTS.length;index++)if(ELEMENTS[index].equals(value))return index;return -1;}
    static String elementName(String value){int index=elementIndex(value);return index<0?value:ELEMENT_NAMES[index];}
    static double element(String attack,String defense){
        int attacker=elementIndex(attack),defender=elementIndex(defense);
        if(attacker<0||defender<0)throw new IllegalArgumentException("Неизвестная стихия");
        if(attacker>=5||defender>=5)return attacker>=5&&defender>=5&&attacker!=defender?1.5:1;
        if((attacker+1)%5==defender)return 1.5;
        return (defender+1)%5==attacker?.67:1;
    }
    static double effect(Fighter attacker,Fighter defender,boolean ultra){
        String attack=attacker.elements[ultra&&attacker.elements.length>1?1:0];double result=1;
        for(String defense:defender.elements)result*=element(attack,defense);
        return result;
    }
    static int fast(Fighter attacker,Fighter defender){return (int)Math.floor(16.0*Math.max(1,attacker.stats[1])/Math.max(1,defender.stats[2])*levelScale(attacker.level)*effect(attacker,defender,false))+1;}
    static int ultra(Fighter attacker,Fighter defender,double attackAccuracy,double defenseAccuracy){
        double damage=135.0*Math.max(1,attacker.stats[4])/Math.max(1,defender.stats[4])*levelScale(attacker.level)*effect(attacker,defender,true);
        return (int)Math.floor(damage*(.3+1.2*clamp(attackAccuracy,0,1))*(1-.8*clamp(defenseAccuracy,0,1)))+1;
    }
    static long interval(Fighter attacker,Fighter defender,boolean ai){return Math.round((ai?1150:520)*clamp(Math.sqrt(Math.max(1,defender.stats[3])/(double)Math.max(1,attacker.stats[3])),.75,1.35));}
    static double matchup(Fighter own,Fighter enemy){
        double dealt=(9.0*fast(own,enemy)+ultra(own,enemy,.8,0))/(9*interval(own,enemy,false)+3300);
        double received=(9.0*fast(enemy,own)+ultra(enemy,own,.85,.8))/(9*interval(enemy,own,true)+3700);
        return dealt/enemy.maxHp*Math.max(1,own.hp)/Math.max(.00001,received);
    }

    static Result simulate(List<Fighter> team,List<Fighter> guards,Scenario scenario,boolean switchAtEnemy,boolean explain){
        Result result=new Result();result.playerHp=new int[team.size()];result.playerEnergy=new int[team.size()];
        result.enemyHp=new int[guards.size()];result.enemyEnergy=new int[guards.size()];
        for(int index=0;index<team.size();index++)result.playerHp[index]=team.get(index).hp;
        for(int index=0;index<guards.size();index++)result.enemyHp[index]=guards.get(index).hp;
        if(team.isEmpty()||guards.isEmpty())return result;
        int active=0,enemyIndex=0;long time=0,myNext=0,aiNext=1500,swapAt=0;
        if(explain)result.steps.add("Начните: "+team.get(active).name+" ["+team.get(active).id+"].");
        for(int event=0;event<20000;event++){
            if(result.playerHp[active]<=0){
                int next=-1;
                for(int index=active+1;index<team.size();index++)if(result.playerHp[index]>0){next=index;break;}
                if(next<0)for(int index=0;index<team.size();index++)if(result.playerHp[index]>0){next=index;break;}
                if(next<0){result.time=time;return result;}
                active=next;time+=500;myNext=time+400;aiNext=Math.max(aiNext,time+800);
                if(explain)result.steps.add("После выбытия выберите: "+team.get(active).name+" ["+team.get(active).id+"] (в течение 10 с).");
            }
            if(time>3600000){result.timedOut=true;result.time=time;return result;}
            Fighter own=team.get(active),enemy=guards.get(enemyIndex);
            long actionAt=result.playerEnergy[active]>=100?time+100:Math.max(time,myNext);
            if(aiNext<=actionAt){
                time=aiNext;
                if(result.enemyEnergy[enemyIndex]>=100){
                    time+=2500;result.enemyUltras++;
                    result.playerHp[active]=Math.max(0,result.playerHp[active]-ultra(enemy,own,scenario.enemyAttack,scenario.defense));
                    result.enemyEnergy[enemyIndex]=0;myNext=time+300;aiNext=time+1200;
                }else{
                    aiNext=time+interval(enemy,own,true);
                    result.playerHp[active]=Math.max(0,result.playerHp[active]-fast(enemy,own));
                    result.enemyEnergy[enemyIndex]=Math.min(100,result.enemyEnergy[enemyIndex]+12);
                }
            }else{
                time=actionAt;
                if(result.playerEnergy[active]>=100){
                    time+=3000;result.playerUltras++;
                    result.enemyHp[enemyIndex]=Math.max(0,result.enemyHp[enemyIndex]-ultra(own,enemy,scenario.attack,0));
                    result.playerEnergy[active]=0;myNext=time+300;aiNext=time+1200;
                }else{
                    myNext=time+interval(own,enemy,false);
                    result.enemyHp[enemyIndex]=Math.max(0,result.enemyHp[enemyIndex]-fast(own,enemy));
                    result.playerEnergy[active]=Math.min(100,result.playerEnergy[active]+12);
                }
                if(result.enemyHp[enemyIndex]<=0){
                    result.beaten++;
                    if(++enemyIndex>=guards.size()){result.won=true;result.time=time;return result;}
                    myNext=time+600;aiNext=time+1500;
                    if(switchAtEnemy&&time>=swapAt){
                        int best=active;double bestScore=matchup(withHealth(own,result.playerHp[active]),guards.get(enemyIndex))*1.2;
                        for(int index=0;index<team.size();index++)if(index!=active&&result.playerHp[index]>0){
                            double score=matchup(withHealth(team.get(index),result.playerHp[index]),guards.get(enemyIndex));
                            if(score>bestScore){bestScore=score;best=index;}
                        }
                        if(best!=active){active=best;swapAt=time+60000;myNext=time+400;aiNext=Math.max(aiNext,time+800);result.swaps++;
                            if(explain)result.steps.add("После охранника №"+enemyIndex+" смените на "+team.get(active).name+" ["+team.get(active).id+"].");
                        }
                    }
                }
            }
        }
        result.timedOut=true;result.time=time;return result;
    }
    static Fighter withHealth(Fighter source,int health){return new Fighter(source.id,source.name,source.elements,source.level,source.stats,source.maxHp,health);}
}
