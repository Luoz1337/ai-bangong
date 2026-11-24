package cn.gongzuodazi.app;
import android.content.Context;
import java.io.*;
import java.util.*;
import java.util.zip.*;
/** Unlock once in memory, retaining the existing file origin and history. */
final class AssetVault {
 private final Context context; private volatile String page;
 AssetVault(Context c){context=c.getApplicationContext();}
 synchronized String page(){
  if(page!=null)return page;
  try{
   byte[] packed;try(InputStream in=context.getAssets().open("protected/ui.bin")){packed=MainActivity.readLimited(in,4*1024*1024);}
   byte[] clear=LayeredCrypto.open(packed,BuildSecrets.keys(),"aiwork/ui/v1");Map<String,byte[]> files=new HashMap<>();int total=0;
   try(ZipInputStream zip=new ZipInputStream(new ByteArrayInputStream(clear))){ZipEntry e;while((e=zip.getNextEntry())!=null){String name=e.getName();if(e.isDirectory()||name.startsWith("/")||name.contains("..")||files.containsKey(name))throw new IOException("Invalid protected asset name");byte[] data=MainActivity.readLimited(zip,2*1024*1024);total+=data.length;if(total>8*1024*1024)throw new IOException("Protected assets exceed size limit");files.put(name,data);}}
   finally{Arrays.fill(clear,(byte)0);}
   page=ProtectedPage.assemble(files);return page;
  }catch(Exception e){return "<!doctype html><meta charset=utf-8><body style='background:#0d1423;color:#dce9ff;font:18px sans-serif;padding:24px'>界面资源校验失败，请重新安装原版安装包。</body>";}
 }
}
