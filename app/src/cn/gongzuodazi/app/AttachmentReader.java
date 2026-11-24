package cn.gongzuodazi.app;

import android.content.Context;
import android.net.Uri;
import android.database.Cursor;
import android.provider.OpenableColumns;
import android.graphics.*;
import android.graphics.pdf.PdfRenderer;
import android.media.MediaMetadataRetriever;
import android.os.ParcelFileDescriptor;
import android.util.Base64;
import org.json.*;
import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import java.util.*;
import java.util.zip.*;
import org.w3c.dom.*;
import javax.xml.parsers.DocumentBuilderFactory;

final class AttachmentReader {
 static JSONObject read(Context c,Uri uri) throws Exception {
  String name="附件";long size=-1;
  try(Cursor cursor=c.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE},null,null,null)){if(cursor!=null&&cursor.moveToFirst()){name=cursor.getString(0);if(!cursor.isNull(1))size=cursor.getLong(1);}}
  if(size>25L*1024*1024)throw new Exception(name+"：超过25MB，请压缩或拆分。");
  String lower=name.toLowerCase(Locale.ROOT),mime=c.getContentResolver().getType(uri);if(mime==null)mime="";
  JSONObject a=new JSONObject().put("name",name);JSONArray images=new JSONArray();String text="",note="";
  File tmp=File.createTempFile("attachment_",".tmp",c.getCacheDir());
  try{try(InputStream in=c.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(tmp)){if(in==null)throw new Exception("文件无法打开");byte[] buf=new byte[16384];int n,total=0;while((n=in.read(buf))!=-1){total+=n;if(total>25*1024*1024)throw new Exception("超过25MB，请压缩或拆分");out.write(buf,0,n);}}
   if(mime.startsWith("image/")||lower.matches(".*\\.(jpg|jpeg|png|webp|gif|bmp|heic)$")){
    BitmapFactory.Options o=new BitmapFactory.Options();o.inJustDecodeBounds=true;BitmapFactory.decodeFile(tmp.getPath(),o);if(o.outWidth<=0)throw new Exception("图片格式无法读取");o.inSampleSize=1;while(Math.max(o.outWidth,o.outHeight)/o.inSampleSize>1800)o.inSampleSize*=2;o.inJustDecodeBounds=false;Bitmap bitmap=BitmapFactory.decodeFile(tmp.getPath(),o);if(bitmap==null)throw new Exception("图片解码失败");images.put(image(bitmap));note="图片视觉输入（压缩后发送）";
   }else if(mime.equals("application/pdf")||lower.endsWith(".pdf")){
    try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(tmp,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer pdf=new PdfRenderer(fd)){int total=pdf.getPageCount();for(int i=0;i<Math.min(total,8);i++){try(PdfRenderer.Page page=pdf.openPage(i)){int w=1300,h=Math.max(1,Math.round(page.getHeight()*(w/(float)page.getWidth())));if(h>2000){h=2000;w=Math.max(1,Math.round(page.getWidth()*(h/(float)page.getHeight())));}Bitmap b=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);b.eraseColor(Color.WHITE);page.render(b,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);images.put(image(b));}}note="PDF共"+total+"页，已读取前"+Math.min(total,8)+"页图像"+(total>8?"；其余页未读取":"");text=note;}
   }else if(mime.startsWith("video/")||lower.matches(".*\\.(mp4|mov|mkv|webm|3gp|avi)$")){
    MediaMetadataRetriever video=new MediaMetadataRetriever();try{video.setDataSource(tmp.getPath());AttachmentLimits.checkVideo(android.os.Build.VERSION.SDK_INT,video.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH),video.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));String duration=video.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);long ms=Long.parseLong(duration==null?"0":duration);if(ms<=0)throw new Exception("视频时长无效");StringBuilder timestamps=new StringBuilder();for(int i=0;i<6;i++){long t=ms*(2*i+1)/12;Bitmap b=android.os.Build.VERSION.SDK_INT>=27?video.getScaledFrameAtTime(t*1000,MediaMetadataRetriever.OPTION_CLOSEST_SYNC,1280,720):video.getFrameAtTime(t*1000,MediaMetadataRetriever.OPTION_CLOSEST_SYNC);if(b!=null){images.put(image(b));timestamps.append(String.format(Locale.ROOT,"%.1f秒；",t/1000.0));}}if(images.length()==0)throw new Exception("视频没有可读取的画面");note="视频"+(ms/1000)+"秒，已抽取"+images.length()+"个画面；不含语音转写";text=note+"。请求抽帧时间："+timestamps+"仅分析抽样的静态画面，实际关键帧时间可能相邻。";}finally{video.release();}
   }else if(lower.endsWith(".docx")||lower.endsWith(".xlsx")||lower.endsWith(".pptx")){
    text=office(tmp,lower);note="已提取Office文字/数值；不含图片、版式、宏或未缓存公式结果";
   }else if(lower.matches(".*\\.(txt|md|csv|json|log|tsv)$")||mime.startsWith("text/")){
    byte[] bytes;try(InputStream in=new FileInputStream(tmp)){bytes=MainActivity.readLimited(in,25*1024*1024);}text=decode(bytes);note="已读取文本";
   }else throw new Exception("此格式暂不支持，请转成PDF、DOCX、XLSX、PPTX或TXT");
   if(text.length()>60000){text=text.substring(0,60000);note+="；文字已截取前60000字";}
   if(text.trim().isEmpty()&&images.length()==0)throw new Exception("没有读到可用文字，请改用PDF或图片");
   return a.put("text",text).put("note",note).put("images",images);
  }catch(Exception e){throw new Exception(name+"："+(e.getMessage()==null?"文件读取失败":e.getMessage()));}finally{tmp.delete();}
 }
 private static String image(Bitmap original) throws Exception {Bitmap b=original;int longest=Math.max(b.getWidth(),b.getHeight());if(longest>1500){float scale=1500f/longest;b=Bitmap.createScaledBitmap(original,Math.max(1,Math.round(original.getWidth()*scale)),Math.max(1,Math.round(original.getHeight()*scale)),true);}ByteArrayOutputStream out=new ByteArrayOutputStream();b.compress(Bitmap.CompressFormat.JPEG,78,out);if(b!=original)b.recycle();original.recycle();return "data:image/jpeg;base64,"+Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP);}
 private static String decode(byte[] b){if(b.length>2&&(b[0]&255)==255&&(b[1]&255)==254)return new String(b,2,b.length-2,StandardCharsets.UTF_16LE);if(b.length>2&&(b[0]&255)==254&&(b[1]&255)==255)return new String(b,2,b.length-2,StandardCharsets.UTF_16BE);try{return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(b)).toString().replace("\uFEFF","");}catch(Exception e){return new String(b,Charset.forName("GB18030"));}}
 private static Document xml(byte[] bytes)throws Exception {String raw=new String(bytes,StandardCharsets.UTF_8).toUpperCase(Locale.ROOT);if(raw.contains("<!DOCTYPE")||raw.contains("<!ENTITY"))throw new Exception("不支持包含DTD或自定义实体的Office文件");DocumentBuilderFactory f=DocumentBuilderFactory.newInstance();f.setNamespaceAware(true);f.setExpandEntityReferences(false);javax.xml.parsers.DocumentBuilder b=f.newDocumentBuilder();b.setEntityResolver((publicId,systemId)->{throw new org.xml.sax.SAXException("不允许外部XML实体");});return b.parse(new ByteArrayInputStream(bytes));}
 private static String textNodes(Node node){StringBuilder b=new StringBuilder();if(node instanceof Element&&((Element)node).getLocalName().equals("t"))return node.getTextContent();NodeList list=node.getChildNodes();for(int i=0;i<list.getLength();i++)b.append(textNodes(list.item(i)));return b.toString();}
 private static String office(File file,String name)throws Exception {
  Map<String,byte[]> parts=new TreeMap<>();int inflated=0;
  try(ZipFile z=new ZipFile(file)){Enumeration<? extends ZipEntry> entries=z.entries();int count=0;while(entries.hasMoreElements()){ZipEntry e=entries.nextElement();if(++count>6000)throw new Exception("Office文件内容过于复杂");String p=e.getName();if(!e.isDirectory()&&(p.equals("word/document.xml")||p.equals("xl/sharedStrings.xml")||p.matches("xl/worksheets/sheet[0-9]+\\.xml")||p.matches("ppt/slides/slide[0-9]+\\.xml"))){byte[] b;try(InputStream in=z.getInputStream(e)){b=MainActivity.readLimited(in,4*1024*1024);}inflated+=b.length;if(inflated>12*1024*1024)throw new Exception("Office解压后的文字内容过大");parts.put(p,b);}}}
  StringBuilder out=new StringBuilder();
  if(name.endsWith(".xlsx")){
   ArrayList<String> shared=new ArrayList<>();if(parts.containsKey("xl/sharedStrings.xml")){NodeList si=xml(parts.get("xl/sharedStrings.xml")).getElementsByTagNameNS("*","si");for(int i=0;i<si.getLength();i++)shared.add(textNodes(si.item(i)));}
   for(String p:naturalOrder(parts.keySet()))if(p.startsWith("xl/worksheets/")){out.append("\n工作表：").append(p).append("\n");NodeList rows=xml(parts.get(p)).getElementsByTagNameNS("*","row");for(int i=0;i<rows.getLength();i++){NodeList cells=((Element)rows.item(i)).getElementsByTagNameNS("*","c");for(int j=0;j<cells.getLength();j++){Element cell=(Element)cells.item(j);String type=cell.getAttribute("t");NodeList v=cell.getElementsByTagNameNS("*","v");String val=v.getLength()>0?v.item(0).getTextContent():textNodes(cell);if(type.equals("s")){try{val=shared.get(Integer.parseInt(val));}catch(Exception e){val="[共享字符串无法读取]";}}out.append(cell.getAttribute("r")).append('=').append(val).append('\t');}out.append('\n');if(out.length()>60000)return out.toString();}}
  }else {for(String p:naturalOrder(parts.keySet())){out.append("\n资料部分：").append(p).append('\n');NodeList paragraphs=xml(parts.get(p)).getElementsByTagNameNS("*","p");for(int i=0;i<paragraphs.getLength();i++){out.append(textNodes(paragraphs.item(i))).append('\n');if(out.length()>60000)return out.toString();}}}
  return out.toString();
 }
 private static List<String> naturalOrder(Set<String> names){ArrayList<String> list=new ArrayList<>(names);Collections.sort(list,(a,b)->{String x=a.replaceAll("\\d+",""),y=b.replaceAll("\\d+","");if(x.equals(y)){try{return Integer.compare(Integer.parseInt(a.replaceAll("\\D+","")),Integer.parseInt(b.replaceAll("\\D+","")));}catch(Exception ignored){}}return a.compareTo(b);});return list;}
}
