package cn.gongzuodazi.app;

import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.webkit.*;
import android.graphics.Color;
import org.json.*;
import java.io.*;
import java.net.*;
import javax.net.ssl.HttpsURLConnection;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;

public class MainActivity extends Activity {
 private WebView web;
 private VoiceInput voice;
 private AssetVault assetVault;
 private boolean pageReady=false;
 private final java.util.ArrayList<JSONObject> queuedEvents=new java.util.ArrayList<>();
 private final ExecutorService io=Executors.newFixedThreadPool(2);
 private static final int PICK=41,SAVE=42;
 private byte[] exportBytes;private boolean picking=false,exporting=false;private int slots=6;
 @Override public void onCreate(Bundle state){super.onCreate(state);getWindow().setStatusBarColor(Color.rgb(13,20,35));getWindow().setNavigationBarColor(Color.rgb(14,23,40));assetVault=new AssetVault(this);web=new WebView(this);web.setBackgroundColor(Color.rgb(13,20,35));setContentView(web);
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(true);s.setAllowContentAccess(false);s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setMediaPlaybackRequiresUserGesture(true);web.addJavascriptInterface(new Bridge(),"Android");
  web.setWebViewClient(new WebViewClient(){@Override public void onPageFinished(WebView v,String url){v.evaluateJavascript("typeof window.onNative==='function'",ready->{if("true".equals(ready)){pageReady=true;java.util.ArrayList<JSONObject> copy=new java.util.ArrayList<>(queuedEvents);queuedEvents.clear();for(JSONObject e:copy)emit(e);}});}@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){openExternal(r.getUrl());return true;}@Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){String url=r.getUrl().toString();if(url.startsWith("file:///android_asset/")||url.startsWith("data:"))return null;return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}});
  web.setWebChromeClient(new WebChromeClient(){@Override public boolean onJsConfirm(WebView v,String url,String msg,JsResult result){new AlertDialog.Builder(MainActivity.this).setTitle("AI工作").setMessage(msg).setPositiveButton("确定",(d,w)->result.confirm()).setNegativeButton("取消",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}@Override public boolean onCreateWindow(WebView v,boolean dialog,boolean gesture,android.os.Message msg){return false;}});
  voice=new VoiceInput(this,this::emit);
  web.loadUrl("file:///android_asset/index.html");
 }
 private void openExternal(Uri u){String scheme=u.getScheme();if("https".equals(scheme)||"http".equals(scheme)){try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception e){error("手机上没有可以打开链接的浏览器。");}}}
 @Override protected void onSaveInstanceState(Bundle out){web.saveState(out);super.onSaveInstanceState(out);}
 @Override public void onBackPressed(){web.evaluateJavascript("window.workmateBack?window.workmateBack():false",value->{if(!"true".equals(value))new AlertDialog.Builder(this).setMessage("退出AI工作？正在执行的任务会中断。").setPositiveButton("退出",(d,w)->finish()).setNegativeButton("继续使用",null).show();});}
 @Override protected void onDestroy(){if(voice!=null)voice.destroy();io.shutdownNow();if(web!=null){web.removeJavascriptInterface("Android");web.destroy();}super.onDestroy();}
 @Override protected void onStop(){if(voice!=null)voice.onStop();super.onStop();}
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);if(voice!=null)voice.onPermissionResult(request,grants);}
 private void emit(JSONObject obj){runOnUiThread(()->{if(isFinishing()||isDestroyed())return;if(!pageReady){queuedEvents.add(obj);return;}String json=obj.toString().replace("\u2028","\\u2028").replace("\u2029","\\u2029");web.evaluateJavascript("window.onNative("+json+")",null);});}
 private JSONObject event(String type){JSONObject o=new JSONObject();try{o.put("type",type);}catch(Exception e){}return o;}
 private void error(String msg){JSONObject o=event("export");try{o.put("error",msg);}catch(Exception e){}emit(o);}
 private JSONObject config(){JSONObject c=new JSONObject();android.content.SharedPreferences p=getSharedPreferences("settings",0);boolean hasKey=KeyVault.hasKey(this);try{c.put("hasKey",hasKey);c.put("base",p.getString("base","https://api.deepseek.com"));c.put("model",p.getString("model","deepseek-flash"));c.put("confirm",p.getBoolean("confirm",false));c.put("search",p.getBoolean("search",true));c.put("big",p.getBoolean("big",false));}catch(Exception ignored){}return c;}
 private class Bridge {
  @JavascriptInterface public String getProtectedPage(){return assetVault.page();}
  @JavascriptInterface public void protectedPageReady(){runOnUiThread(()->web.evaluateJavascript("typeof window.onNative===\u0027function\u0027",ready->{if("true".equals(ready)){pageReady=true;java.util.ArrayList<JSONObject> copy=new java.util.ArrayList<>(queuedEvents);queuedEvents.clear();for(JSONObject e:copy)emit(e);}}));}
  @JavascriptInterface public String getConfig(){return config().toString();}
  @JavascriptInterface public void startVoiceInput(String id){runOnUiThread(()->voice.start(id));}
  @JavascriptInterface public void showVoiceKeyboard(){runOnUiThread(()->{web.requestFocus();((android.view.inputmethod.InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).showSoftInput(web,android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);});}
  @JavascriptInterface public boolean setSearchEnabled(boolean enabled){return getSharedPreferences("settings",0).edit().putBoolean("search",enabled).commit();}
  @JavascriptInterface public void saveConfig(String raw){try{JSONObject c=new JSONObject(raw);String base=c.getString("base").replaceAll("/+$","");URL u=new URL(base);if(!"https".equals(u.getProtocol())||u.getHost().isEmpty()||u.getUserInfo()!=null||u.getQuery()!=null||u.getRef()!=null)throw new Exception("请填写有效的 HTTPS API 地址。");String key=c.optString("key").trim();String old=config().optString("base");if(!base.equals(old)&&key.isEmpty()&&KeyVault.hasKey(MainActivity.this))throw new Exception("更换 API 地址时，请重新填写对应的 Key。");if(!key.isEmpty()){if(key.contains("\n")||key.contains("\r")||key.length()>512)throw new Exception("API Key 格式异常。");KeyVault.save(MainActivity.this,key);}getSharedPreferences("settings",0).edit().putString("base",base).putString("model",c.getString("model")).putBoolean("confirm",c.optBoolean("confirm")).putBoolean("search",c.optBoolean("search")).putBoolean("big",c.optBoolean("big")).commit();JSONObject e=event("config");e.put("config",config());emit(e);}catch(Exception e){error(e.getMessage());}}
  @JavascriptInterface public void deleteKey(){try{KeyVault.delete(MainActivity.this);JSONObject e=event("config");e.put("config",config());emit(e);}catch(Exception e){error(friendly(e));}}
  @JavascriptInterface public void request(String id,String action,String raw){io.execute(()->{JSONObject e=event("response");try{e.put("id",id);e.put("data",post(action,new JSONObject(raw)));}catch(Exception ex){try{e.put("error",friendly(ex));}catch(Exception ignored){}}emit(e);});}
  @JavascriptInterface public void pickAttachments(int count){runOnUiThread(()->{if(picking)return;picking=true;slots=Math.max(1,Math.min(count,6));Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("*/*");i.addCategory(Intent.CATEGORY_OPENABLE);i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);try{startActivityForResult(i,PICK);}catch(Exception e){picking=false;emit(event("importCancelled"));error("系统文件选择器不可用。");}});}
  @JavascriptInterface public void exportFile(String kind,String raw){synchronized(MainActivity.this){if(exporting){error("请先完成当前文件的保存。");return;}exporting=true;}io.execute(()->{try{JSONObject r=new JSONObject(raw);exportBytes=DocumentExporter.create(MainActivity.this,kind,r);String title=r.optString("title","工作成果").replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]","_");title=title.substring(0,Math.min(55,title.length()));String mime=kind.equals("pdf")?"application/pdf":kind.equals("xlsx")?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":kind.equals("pptx")?"application/vnd.openxmlformats-officedocument.presentationml.presentation":"text/plain";final String filename=title+"."+kind;runOnUiThread(()->{try{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).setType(mime).addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,filename);startActivityForResult(i,SAVE);}catch(Exception ex){exporting=false;exportBytes=null;error("系统文件保存窗口不可用。");}});}catch(Exception ex){exporting=false;exportBytes=null;error("导出失败："+ex.getMessage());}});}
 }
 private String friendly(Exception e){if(e instanceof SocketTimeoutException)return "网络请求超时，请检查网络后重试这一步。";if(e instanceof UnknownHostException)return "无法连接 API 地址，请检查网络和设置。";String msg=e.getMessage();if(msg==null)msg=e.getClass().getSimpleName();return msg;}
 private JSONObject post(String action,JSONObject body) throws Exception {
  String key=KeyVault.read(this);if(key.isEmpty())throw new Exception("请先在设置中保存您的 API Key。");String base=config().getString("base");String endpoint;if(action.equals("chat"))endpoint=base+"/chat/completions";else if(action.equals("search")){endpoint=base.replaceAll("/v1$","")+"/v1/tools/search";body.put("count",5).put("need_content",true);}else throw new Exception("不支持的接口操作。");
  HttpsURLConnection c=(HttpsURLConnection)new URL(endpoint).openConnection();c.setInstanceFollowRedirects(false);c.setRequestMethod("POST");c.setConnectTimeout(20000);c.setReadTimeout(180000);c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json; charset=utf-8");c.setRequestProperty("Authorization","Bearer "+key);
  try{byte[] bytes=body.toString().getBytes(StandardCharsets.UTF_8);c.setFixedLengthStreamingMode(bytes.length);try(OutputStream out=c.getOutputStream()){out.write(bytes);}int code=c.getResponseCode();String text;InputStream stream=code>=200&&code<300?c.getInputStream():c.getErrorStream();try(InputStream in=stream){text=in==null?"":new String(readLimited(in,8*1024*1024),StandardCharsets.UTF_8);}if(code<200||code>=300){String msg=code==401?"API Key 无效，请在设置中检查。":code==402?"API 余额不足，请充值后重试这一步。":code==429?"请求过于频繁，请稍后重试这一步。":code==404&&action.equals("search")?"当前 API 服务不支持联网检索；可在设置中关闭检索后重试。":code>=500?"API 服务暂时繁忙，请稍后重试这一步。":"接口请求失败（HTTP "+code+"）";String detail="";try{detail=new JSONObject(text).getJSONObject("error").optString("message").replace(key,"[已隐藏]");}catch(Exception ignored){}if(!detail.isEmpty()&&code!=401)msg+="\n"+detail.substring(0,Math.min(300,detail.length()));throw new Exception(msg);}return new JSONObject(text);}finally{c.disconnect();}
 }
 static byte[] readLimited(InputStream in,int max) throws Exception {ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[16384];int n,total=0;while((n=in.read(b))!=-1){total+=n;if(total>max)throw new Exception("文件或接口内容过大，请缩小后重试。");out.write(b,0,n);}return out.toByteArray();}
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);
  if(voice!=null&&voice.onActivityResult(req,result,data))return;
  if(req==PICK){picking=false;if(result!=RESULT_OK||data==null){emit(event("importCancelled"));return;}java.util.ArrayList<Uri> uris=new java.util.ArrayList<>();if(data.getClipData()!=null){for(int i=0;i<Math.min(slots,data.getClipData().getItemCount());i++)uris.add(data.getClipData().getItemAt(i).getUri());}else if(data.getData()!=null)uris.add(data.getData());io.execute(()->{JSONObject e=event("attachments");JSONArray files=new JSONArray();StringBuilder errors=new StringBuilder();for(Uri u:uris){try{files.put(AttachmentReader.read(this,u));}catch(Exception ex){if(errors.length()>0)errors.append("\n");errors.append(friendly(ex));}}try{e.put("files",files);if(errors.length()>0)e.put("error",errors.toString());}catch(Exception ex){}emit(e);});}
  if(req==SAVE){if(result!=RESULT_OK||data==null||data.getData()==null){exportBytes=null;exporting=false;JSONObject e=event("export");try{e.put("cancelled",true);}catch(Exception ignored){}emit(e);return;}Uri u=data.getData();byte[] bytes=exportBytes;io.execute(()->{JSONObject e=event("export");try{if(bytes==null)throw new Exception("任务已被系统中断，请重新导出。");try(OutputStream out=getContentResolver().openOutputStream(u,"wt")){if(out==null)throw new Exception("保存位置不可写。");out.write(bytes);out.flush();}}catch(Exception ex){try{e.put("error","文件保存失败："+friendly(ex));}catch(Exception ignored){}}finally{exportBytes=null;exporting=false;}emit(e);});}
 }
}

