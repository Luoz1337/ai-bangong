package cn.gongzuodazi.app;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
public final class ProtectedReleaseTest {
 public static void main(String[] args) throws Exception {
  Map<String,byte[]> files=new HashMap<>();
  try(ZipFile apk=new ZipFile(args[0])){
   for(Enumeration<? extends ZipEntry> entries=apk.entries();entries.hasMoreElements();){String n=entries.nextElement().getName();if(n.startsWith("assets/")&&!n.equals("assets/index.html")&&!n.equals("assets/protected/ui.bin"))throw new AssertionError("Unprotected asset: "+n);}
   byte[] packed;try(InputStream in=apk.getInputStream(apk.getEntry("assets/protected/ui.bin"))){packed=read(in);}
   byte[] zip=LayeredCrypto.open(packed,BuildSecrets.keys(),"aiwork/ui/v1");
   try(ZipInputStream in=new ZipInputStream(new ByteArrayInputStream(zip))){ZipEntry e;while((e=in.getNextEntry())!=null){byte[] data=read(in);if(!Arrays.equals(data,Files.readAllBytes(Paths.get(args[1],e.getName()))))throw new AssertionError("Round trip changed asset "+e.getName());files.put(e.getName(),data);}}
   String page=ProtectedPage.assemble(files);
   if(page.contains("<script src=")||page.contains("<link rel=\"stylesheet\""))throw new AssertionError("External assets remain");
   if(!page.contains("script-src 'nonce-")||page.contains("script-src 'unsafe-inline'"))throw new AssertionError("Script nonce missing");
   if(page.equals(ProtectedPage.assemble(files)))throw new AssertionError("Nonce not random");
   Files.write(Paths.get(args[2]),page.getBytes(StandardCharsets.UTF_8));
   try(InputStream in=apk.getInputStream(apk.getEntry("assets/index.html"))){Files.write(Paths.get(args[3]),read(in));}
   System.out.println("PASS: actual APK has only bootstrap + four-layer protected UI; all "+files.size()+" assets round-trip exactly; random CSP nonce assembly.");
  }
 }
 private static byte[] read(InputStream in) throws IOException {ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toByteArray();}
}
