package cn.gongzuodazi.app;

import android.content.Context;
import android.graphics.*;
import android.graphics.pdf.PdfDocument;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

final class DocumentExporter {
 static byte[] create(Context context,String kind,JSONObject r)throws Exception {
  if(kind.equals("xlsx")){JSONObject t=r.getJSONObject("table");JSONArray c=t.getJSONArray("columns"),rows=t.getJSONArray("rows");ArrayList<String> cols=new ArrayList<>();ArrayList<List<Object>> data=new ArrayList<>();for(int i=0;i<c.length();i++)cols.add(c.getString(i));for(int i=0;i<rows.length();i++){ArrayList<Object> row=new ArrayList<>();JSONArray a=rows.getJSONArray(i);for(int j=0;j<a.length();j++)row.add(a.isNull(j)?null:a.get(j));data.add(row);}return OfficeWriter.xlsx(r.getString("title"),cols,data);}
  if(kind.equals("pptx")){JSONArray a=r.getJSONArray("slides");ArrayList<OfficeWriter.Slide> slides=new ArrayList<>();for(int i=0;i<a.length();i++){JSONObject s=a.getJSONObject(i);JSONArray bullets=s.getJSONArray("bullets");ArrayList<String> b=new ArrayList<>();for(int j=0;j<bullets.length();j++)b.add(bullets.getString(j));slides.add(new OfficeWriter.Slide(s.getString("title"),b,s.optString("notes")));}return OfficeWriter.pptx(r.getString("title"),slides);}
  if(kind.equals("txt"))return ("\uFEFF"+plain(r)).getBytes(StandardCharsets.UTF_8);
  if(kind.equals("pdf"))return pdf(r);
  throw new Exception("不支持的文件格式");
 }
 static String plain(JSONObject r)throws Exception{
  StringBuilder s=new StringBuilder(r.getString("title")).append("\n\n").append(r.getString("summary")).append("\n\n");JSONArray sections=r.optJSONArray("sections");if(sections!=null)for(int i=0;i<sections.length();i++){JSONObject a=sections.getJSONObject(i);s.append(a.optString("heading")).append('\n').append(a.optString("body")).append("\n\n");}
  JSONObject t=r.optJSONObject("table");if(t!=null){s.append(join(t.getJSONArray("columns"))).append('\n');JSONArray rows=t.getJSONArray("rows");for(int i=0;i<rows.length();i++)s.append(join(rows.getJSONArray(i))).append('\n');s.append('\n');}
  JSONArray slides=r.optJSONArray("slides");if(slides!=null)for(int i=0;i<slides.length();i++){JSONObject a=slides.getJSONObject(i);s.append(i+1).append(". ").append(a.optString("title")).append('\n');JSONArray b=a.getJSONArray("bullets");for(int j=0;j<b.length();j++)s.append("• ").append(b.getString(j)).append('\n');if(!a.optString("notes").isEmpty())s.append("讲稿：").append(a.optString("notes")).append('\n');s.append('\n');}
  JSONArray sources=r.optJSONArray("sources");if(sources!=null&&sources.length()>0){s.append("检索来源\n");for(int i=0;i<sources.length();i++){JSONObject a=sources.getJSONObject(i);s.append('[').append(i+1).append("] ").append(a.optString("title")).append('\n').append(a.optString("url")).append('\n');}}
  return s.toString();
 }
 private static String join(JSONArray a){StringBuilder s=new StringBuilder();for(int i=0;i<a.length();i++){if(i>0)s.append(" | ");s.append(a.isNull(i)?"":a.optString(i));}return s.toString();}
 private static byte[] pdf(JSONObject r)throws Exception{
  try(PdfPages p=new PdfPages()){
   p.text(r.getString("title"),24,true);p.text("AI工作 / AI WORK",10,false);p.gap(18);p.text(r.getString("summary"),12,false);
   JSONArray sections=r.optJSONArray("sections");if(sections!=null)for(int i=0;i<sections.length();i++){JSONObject a=sections.getJSONObject(i);p.gap(14);p.text(a.optString("heading"),16,true);p.gap(4);p.text(a.optString("body"),12,false);}
   JSONObject t=r.optJSONObject("table");if(t!=null){p.gap(15);p.text("工作表",16,true);JSONArray columns=t.getJSONArray("columns"),rows=t.getJSONArray("rows");p.text(join(columns),11,true);for(int i=0;i<rows.length();i++){JSONArray row=rows.getJSONArray(i);StringBuilder b=new StringBuilder();for(int j=0;j<columns.length();j++){if(j>0)b.append("  ·  ");b.append(columns.getString(j)).append('：').append(row.isNull(j)?"":row.optString(j));}p.text((i+1)+". "+b,11,false);p.gap(5);}}
   JSONArray slides=r.optJSONArray("slides");if(slides!=null)for(int i=0;i<slides.length();i++){JSONObject a=slides.getJSONObject(i);p.gap(16);p.text((i+1)+". "+a.getString("title"),16,true);JSONArray b=a.getJSONArray("bullets");for(int j=0;j<b.length();j++)p.text("• "+b.getString(j),12,false);if(!a.optString("notes").isEmpty())p.text("讲稿："+a.optString("notes"),10,false);}
   JSONArray sources=r.optJSONArray("sources");if(sources!=null&&sources.length()>0){p.gap(18);p.text("检索来源",16,true);for(int i=0;i<sources.length();i++){JSONObject a=sources.getJSONObject(i);p.text("["+(i+1)+"] "+a.optString("title")+"\n"+a.optString("url"),10,false);}}
   return p.finish();
  }
 }
 private static class PdfPages implements AutoCloseable {
  final PdfDocument doc=new PdfDocument();final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);PdfDocument.Page page;Canvas canvas;float y;int number=0;boolean finished=false;
  PdfPages(){next();}
  void next(){Paint saved=new Paint(paint);if(page!=null)endPage();page=doc.startPage(new PdfDocument.PageInfo.Builder(595,842,++number).create());canvas=page.getCanvas();canvas.drawColor(Color.WHITE);paint.setColor(Color.rgb(69,91,54));canvas.drawRect(42,34,553,38,paint);paint.set(saved);y=66;}
  void endPage(){paint.setTextSize(9);paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));paint.setColor(Color.rgb(111,124,104));canvas.drawText("AI工作  ·  "+number,42,810,paint);doc.finishPage(page);page=null;}
  void gap(float n){y+=n;if(y>770)next();}
  void text(String text,float size,boolean bold){paint.setTextSize(size);paint.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));paint.setColor(bold?Color.rgb(42,65,35):Color.rgb(30,39,32));float line=size*1.7f;
   for(String part:text.split("\n",-1)){if(part.isEmpty()){gap(line*.65f);continue;}int start=0;while(start<part.length()){int count=paint.breakText(part,start,part.length(),true,511,null);if(count<1)count=Character.charCount(part.codePointAt(start));int end=Math.min(start+count,part.length());if(end<part.length()&&end>start&&Character.isHighSurrogate(part.charAt(end-1)))end--;if(end<=start)end=Math.min(start+2,part.length());if(y+line>779){next();paint.setTextSize(size);paint.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));paint.setColor(bold?Color.rgb(42,65,35):Color.rgb(30,39,32));}canvas.drawText(part,start,end,42,y,paint);y+=line;start=end;}}
  }
  byte[] finish()throws Exception{if(page!=null)endPage();ByteArrayOutputStream out=new ByteArrayOutputStream();doc.writeTo(out);finished=true;return out.toByteArray();}
  @Override public void close(){if(page!=null){doc.finishPage(page);page=null;}doc.close();}
 }
}
