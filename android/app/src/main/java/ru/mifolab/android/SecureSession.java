package ru.mifolab.android;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.charset.StandardCharsets;

final class SecureSession {
    private static final String PREFS="mifolab-account",ALIAS="mifolab-account-v1";
    private static SecretKey key() throws Exception {
        java.security.KeyStore store=java.security.KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias(ALIAS)){KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generator.generateKey();}
        return (SecretKey)store.getKey(ALIAS,null);
    }
    static synchronized String get(Context context){
        try{String iv=context.getSharedPreferences(PREFS,0).getString("iv",""),data=context.getSharedPreferences(PREFS,0).getString("ciphertext","");if(iv.isEmpty()||data.isEmpty())return "";Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(iv,Base64.NO_WRAP)));return new String(cipher.doFinal(Base64.decode(data,Base64.NO_WRAP)),StandardCharsets.UTF_8);}catch(Exception error){return "";}
    }
    static synchronized void save(Context context,String token) throws Exception {
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());String iv=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP),data=Base64.encodeToString(cipher.doFinal(token.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
        if(!context.getSharedPreferences(PREFS,0).edit().putString("iv",iv).putString("ciphertext",data).commit())throw new java.io.IOException("Не удалось сохранить вход");
    }
    static synchronized void clear(Context context){context.getSharedPreferences(PREFS,0).edit().clear().commit();}
}
