package cn.gongzuodazi.app;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.io.*;
import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.util.*;
import java.util.zip.*;

/** Build-only packer. Resource unlocking keys are not user secrets or API keys. */
public final class PackAssets {
 public static void main(String[] args) throws Exception {
  if(args.length!=3)throw new IllegalArgumentException("assetsDir protectedAssetsDir generatedSourcesDir");
  Path source=Paths.get(args[0]),target=Paths.get(args[1]),generated=Paths.get(args[2]).resolve("cn/gongzuodazi/app/BuildSecrets.java");
  ByteArrayOutputStream bytes=new ByteArrayOutputStream();
  try(ZipOutputStream zip=new ZipOutputStream(bytes)){try(java.util.stream.Stream<Path> files=Files.walk(source)){for(Path p:(Iterable<Path>)files.filter(Files::isRegularFile).sorted()::iterator){String name=source.relativize(p).toString().replace('\\','/');ZipEntry e=new ZipEntry(name);e.setTime(0);zip.putNextEntry(e);Files.copy(p,zip);zip.closeEntry();}}}
  SecureRandom random=new SecureRandom();SecretKey[] keys=new SecretKey[4];StringBuilder code=new StringBuilder("package cn.gongzuodazi.app;\nfinal class BuildSecrets {\n static javax.crypto.SecretKey[] keys(){return new javax.crypto.SecretKey[]{");
  for(int i=0;i<4;i++){byte[] key=new byte[32],mask=new byte[32],sealed=new byte[32];random.nextBytes(key);random.nextBytes(mask);for(int j=0;j<32;j++)sealed[j]=(byte)(key[j]^mask[j]);keys[i]=new SecretKeySpec(key,"AES");if(i>0)code.append(',');code.append("new javax.crypto.spec.SecretKeySpec(x(").append(literal(mask)).append(',').append(literal(sealed)).append("),\"AES\")");Arrays.fill(key,(byte)0);}
  code.append("};}\n private static byte[] x(byte[] a,byte[] b){for(int i=0;i<a.length;i++)a[i]^=b[i];return a;}\n}\n");
  byte[] packed=LayeredCrypto.seal(bytes.toByteArray(),keys,"aiwork/ui/v1");Path packedFile=target.resolve("protected/ui.bin");Files.createDirectories(packedFile.getParent());Files.createDirectories(generated.getParent());Files.write(packedFile,packed);Files.write(generated,code.toString().getBytes(StandardCharsets.UTF_8));
  if(!Arrays.equals(bytes.toByteArray(),LayeredCrypto.open(packed,keys,"aiwork/ui/v1")))throw new GeneralSecurityException("Protected asset validation failed");
  System.out.println("Packed UI: 4 independent AES-256-GCM layers; "+bytes.size()+" compressed bytes -> "+packed.length+" protected bytes; no user key involved.");
 }
 private static String literal(byte[] b){StringBuilder s=new StringBuilder("new byte[]{");for(int i=0;i<b.length;i++){if(i>0)s.append(',');s.append(b[i]);}return s.append('}').toString();}
}
