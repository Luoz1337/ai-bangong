package cn.gongzuodazi.app;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.util.Base64;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.security.*;
import java.util.Arrays;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.charset.StandardCharsets;

final class KeyVault {
 private static final String LEGACY_ALIAS="workmate_api_key_v1",ALIAS="workmate_api_key_envelope_v2",FIELD="key_v2";
 private static SecretKey cached;
 private static String boundPurpose;
 private static synchronized SecretKey secret(boolean create) throws Exception {
  if(cached!=null)return cached;
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
  if(!ks.containsAlias(ALIAS)){if(!create)throw new GeneralSecurityException("保存的密钥无法解锁，请重新填写。");KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();}
  cached=((KeyStore.SecretKeyEntry)ks.getEntry(ALIAS,null)).getSecretKey();return cached;
 }
 @SuppressWarnings("deprecation") private static synchronized String purpose(Context c) throws Exception {
  if(boundPurpose!=null)return boundPurpose;
  byte[] signature=c.getPackageManager().getPackageInfo(c.getPackageName(),PackageManager.GET_SIGNATURES).signatures[0].toByteArray();
  byte[] digest=MessageDigest.getInstance("SHA-256").digest(signature);StringBuilder hex=new StringBuilder();for(byte b:digest)hex.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
  boundPurpose="aiwork/api-key/v2/"+c.getPackageName()+"/"+hex;return boundPurpose;
 }
 static boolean hasKey(Context c){SharedPreferences p=c.getSharedPreferences("secure",0);return !p.getString(FIELD,"").isEmpty()||!p.getString("key","").isEmpty();}
 static synchronized void save(Context c,String key) throws Exception {
  byte[] raw=key.getBytes(StandardCharsets.UTF_8),verified=null;
  try{
   SecretKey wrapping=secret(true);String aad=purpose(c);byte[] record=SecretEnvelope.seal(raw,wrapping,aad);verified=SecretEnvelope.open(record,wrapping,aad);
   if(!MessageDigest.isEqual(raw,verified))throw new GeneralSecurityException("密钥加密校验失败，原有记录未删除。");
   SharedPreferences p=c.getSharedPreferences("secure",0);
   if(!p.edit().putString(FIELD,"E4:"+Base64.encodeToString(record,Base64.NO_WRAP)).commit())throw new Exception("密钥升级保存失败，原有记录已保留，请检查存储空间后重试。");
   cleanupLegacy(p);
  }finally{Arrays.fill(raw,(byte)0);if(verified!=null)Arrays.fill(verified,(byte)0);}
 }
 static synchronized String read(Context c) throws Exception {
  SharedPreferences p=c.getSharedPreferences("secure",0);String value=p.getString(FIELD,"");byte[] raw=null;
  try{
   if(!value.isEmpty()){
    if(!value.startsWith("E4:")||value.length()>6000)throw new GeneralSecurityException("保存的密钥格式异常，请重新填写。");
    raw=SecretEnvelope.open(Base64.decode(value.substring(3),Base64.NO_WRAP),secret(false),purpose(c));cleanupLegacy(p);return new String(raw,StandardCharsets.UTF_8);
   }
   String old=p.getString("key","");if(old.isEmpty())return "";String[] parts=old.split(":",-1);if(parts.length!=2||old.length()>6000)throw new GeneralSecurityException("原密钥记录格式异常，请重新填写。");
   KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias(LEGACY_ALIAS))throw new GeneralSecurityException("原密钥无法解锁，请重新填写。");
   Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,((KeyStore.SecretKeyEntry)ks.getEntry(LEGACY_ALIAS,null)).getSecretKey(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));
   raw=cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP));String recovered=new String(raw,StandardCharsets.UTF_8);save(c,recovered);return recovered;
  }finally{if(raw!=null)Arrays.fill(raw,(byte)0);}
 }
 private static void cleanupLegacy(SharedPreferences p) throws Exception {
  if(!p.contains("key"))return;
  if(!p.edit().remove("key").commit())throw new Exception("新密钥已保存，旧副本尚未清理，请重新保存一次。");
  try{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);ks.deleteEntry(LEGACY_ALIAS);}catch(Exception ignored){}
 }
 static synchronized void delete(Context c){
  if(!c.getSharedPreferences("secure",0).edit().remove(FIELD).remove("key").commit())throw new IllegalStateException("密钥删除失败，请检查存储空间后重试。");
  cached=null;try{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);ks.deleteEntry(ALIAS);ks.deleteEntry(LEGACY_ALIAS);}catch(Exception ignored){}
 }
}
