package cn.gongzuodazi.app;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Arrays;

/** Four independently keyed authenticated layers. No custom cryptographic primitives. */
final class LayeredCrypto {
 static final int LAYERS=4;
 private static final byte[] MAGIC={'A','W','C',4};
 static byte[] seal(byte[] plaintext,SecretKey[] keys,String purpose) throws GeneralSecurityException {
  validate(keys);byte[] current=plaintext.clone();
  for(int i=0;i<LAYERS;i++){
   Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,keys[i]);c.updateAAD(aad(purpose,i));byte[] encrypted=c.doFinal(current),iv=c.getIV();
   byte[] next=new byte[12+encrypted.length];System.arraycopy(iv,0,next,0,12);System.arraycopy(encrypted,0,next,12,encrypted.length);Arrays.fill(current,(byte)0);current=next;
  }
  byte[] result=new byte[MAGIC.length+current.length];System.arraycopy(MAGIC,0,result,0,MAGIC.length);System.arraycopy(current,0,result,MAGIC.length,current.length);Arrays.fill(current,(byte)0);return result;
 }
 static byte[] open(byte[] blob,SecretKey[] keys,String purpose) throws GeneralSecurityException {
  validate(keys);if(blob.length<116||blob.length>16*1024*1024||!Arrays.equals(MAGIC,Arrays.copyOf(blob,4)))throw new GeneralSecurityException("Invalid protected record");
  byte[] current=Arrays.copyOfRange(blob,4,blob.length);
  try{for(int i=LAYERS-1;i>=0;i--){if(current.length<28)throw new GeneralSecurityException("Truncated protected layer");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,keys[i],new GCMParameterSpec(128,current,0,12));c.updateAAD(aad(purpose,i));byte[] next=c.doFinal(current,12,current.length-12);Arrays.fill(current,(byte)0);current=next;}return current;}catch(GeneralSecurityException e){Arrays.fill(current,(byte)0);throw e;}
 }
 private static byte[] aad(String purpose,int i){return (purpose+"/layer/"+i).getBytes(StandardCharsets.UTF_8);}
 private static void validate(SecretKey[] keys){if(keys==null||keys.length!=LAYERS)throw new IllegalArgumentException("Four keys required");for(SecretKey key:keys)if(key==null||!"AES".equals(key.getAlgorithm()))throw new IllegalArgumentException("AES key required");}
}
