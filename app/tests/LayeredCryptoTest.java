package cn.gongzuodazi.app;
import javax.crypto.*;
import javax.crypto.spec.SecretKeySpec;
import java.util.*;
import java.nio.charset.StandardCharsets;

public final class LayeredCryptoTest {
 private static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
 private static SecretKey key() throws Exception {KeyGenerator g=KeyGenerator.getInstance("AES");g.init(256);return g.generateKey();}
 private static void rejected(RunnableWithException r) throws Exception {try{r.run();throw new AssertionError("Invalid ciphertext accepted");}catch(java.security.GeneralSecurityException|IllegalArgumentException expected){}}
 private interface RunnableWithException {void run() throws Exception;}
 public static void main(String[] args) throws Exception {
  SecretKey[] keys={key(),key(),key(),key()};byte[] data="这是固定测试 Key，不是真实凭据。".getBytes(StandardCharsets.UTF_8);
  byte[] sealed=LayeredCrypto.seal(data,keys,"test/ui");check(sealed.length==data.length+116,"exactly four authenticated layers");check(Arrays.equals(data,LayeredCrypto.open(sealed,keys,"test/ui")),"four-layer round trip");
  check(!Arrays.equals(sealed,LayeredCrypto.seal(data,keys,"test/ui")),"fresh random IVs");
  for(int offset:new int[]{0,5,20,sealed.length-1}){byte[] bad=sealed.clone();bad[offset]^=1;rejected(()->LayeredCrypto.open(bad,keys,"test/ui"));}
  rejected(()->LayeredCrypto.open(sealed,keys,"wrong purpose"));SecretKey[] wrong=keys.clone();wrong[0]=key();rejected(()->LayeredCrypto.open(sealed,wrong,"test/ui"));
  rejected(()->LayeredCrypto.open(new byte[20],keys,"test/ui"));
  SecretKey wrapping=key();byte[] record=SecretEnvelope.seal(data,wrapping,"test/api");check(Arrays.equals(data,SecretEnvelope.open(record,wrapping,"test/api")),"Keystore-compatible envelope round trip");
  check(!Arrays.equals(record,SecretEnvelope.seal(data,wrapping,"test/api")),"random envelope keys and IVs");
  rejected(()->SecretEnvelope.open(record,key(),"test/api"));rejected(()->SecretEnvelope.open(record,wrapping,"test/other"));
  for(int offset:new int[]{0,6,25,record.length-1}){byte[] bad=record.clone();bad[offset]^=1;rejected(()->SecretEnvelope.open(bad,wrapping,"test/api"));}
  byte[] ui=new byte[96*1024];new java.security.SecureRandom().nextBytes(ui);byte[] packed=LayeredCrypto.seal(ui,keys,"benchmark/ui");
  for(int i=0;i<30;i++)LayeredCrypto.open(packed,keys,"benchmark/ui");
  long[] times=new long[100];for(int i=0;i<times.length;i++){long t=System.nanoTime();LayeredCrypto.open(packed,keys,"benchmark/ui");times[i]=System.nanoTime()-t;}Arrays.sort(times);
  System.out.printf(java.util.Locale.ROOT,"PASS: 4-layer/envelope roundtrips, tamper/purpose/key rejection and randomization. Desktop JCA 96KiB unwrap median %.3f ms, p95 %.3f ms; NOT Android/Keystore measurements.%n",times[50]/1e6,times[95]/1e6);
 }
}
