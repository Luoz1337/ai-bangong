package cn.gongzuodazi.app;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.security.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/** One hardware-key operation wraps/unwraps four random per-record data keys. */
final class SecretEnvelope {
 private static final byte[] MAGIC={'A','W','K',2};
 static byte[] seal(byte[] plaintext,SecretKey wrappingKey,String purpose) throws GeneralSecurityException {
  if(plaintext.length==0||plaintext.length>2048)throw new GeneralSecurityException("Invalid secret length");
  byte[] material=new byte[128];new SecureRandom().nextBytes(material);
  try{
   byte[] payload=LayeredCrypto.seal(plaintext,keys(material),purpose);
   Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,wrappingKey);c.updateAAD((purpose+"/wrapped-keys").getBytes(StandardCharsets.UTF_8));byte[] wrapped=c.doFinal(material);
   byte[] result=new byte[4+12+2+wrapped.length+payload.length];System.arraycopy(MAGIC,0,result,0,4);System.arraycopy(c.getIV(),0,result,4,12);result[16]=(byte)(wrapped.length>>>8);result[17]=(byte)wrapped.length;System.arraycopy(wrapped,0,result,18,wrapped.length);System.arraycopy(payload,0,result,18+wrapped.length,payload.length);return result;
  }finally{Arrays.fill(material,(byte)0);}
 }
 static byte[] open(byte[] record,SecretKey wrappingKey,String purpose) throws GeneralSecurityException {
  if(record.length<278||record.length>4096||!Arrays.equals(MAGIC,Arrays.copyOf(record,4)))throw new GeneralSecurityException("Invalid secret envelope");
  int length=((record[16]&255)<<8)|(record[17]&255);if(length!=144||record.length<18+length+116)throw new GeneralSecurityException("Invalid wrapped key length");
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,wrappingKey,new GCMParameterSpec(128,record,4,12));c.updateAAD((purpose+"/wrapped-keys").getBytes(StandardCharsets.UTF_8));byte[] material=c.doFinal(record,18,length);
  try{if(material.length!=128)throw new GeneralSecurityException("Invalid data key material");return LayeredCrypto.open(Arrays.copyOfRange(record,18+length,record.length),keys(material),purpose);}finally{Arrays.fill(material,(byte)0);}
 }
 private static SecretKey[] keys(byte[] material){SecretKey[] result=new SecretKey[4];for(int i=0;i<4;i++)result[i]=new SecretKeySpec(material,i*32,32,"AES");return result;}
}
