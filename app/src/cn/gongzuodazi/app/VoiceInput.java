package cn.gongzuodazi.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.*;
import android.content.pm.*;
import android.os.*;
import android.provider.Settings;
import android.speech.*;
import java.util.*;
import java.util.function.Consumer;
import org.json.JSONObject;

/** OEM-neutral dictation: recognition Activity, then a discovered service, then the user's keyboard. */
final class VoiceInput {
 static final int RESULT_REQUEST=43,PERMISSION_REQUEST=44;
 private final Activity host;
 private final Consumer<JSONObject> output;
 private final Handler handler=new Handler(Looper.getMainLooper());
 private String requestId="";
 private SpeechRecognizer recognizer;
 private AlertDialog dialog;
 private boolean external=false;
 private Runnable timeout;
 VoiceInput(Activity host,Consumer<JSONObject> output){this.host=host;this.output=output;}
 private Intent intent(){return new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
  .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
  .putExtra(RecognizerIntent.EXTRA_LANGUAGE,"zh-CN")
  .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1)
  .putExtra(RecognizerIntent.EXTRA_PROMPT,"请说出您的工作需求，识别文字会填入输入框，不会自动发送。");}
 void start(String id){
  if(id==null||id.isEmpty()||id.length()>64)return;
  if(!requestId.isEmpty()){emit(id,null,"语音输入正在进行，请稍候。",false,false);return;}
  requestId=id;
  Intent i=intent();
  try{if(i.resolveActivity(host.getPackageManager())!=null){external=true;host.startActivityForResult(i,RESULT_REQUEST);return;}}catch(ActivityNotFoundException|SecurityException ignored){external=false;}
  startService();
 }
 private ComponentName service(){
  List<ResolveInfo> found=host.getPackageManager().queryIntentServices(new Intent(RecognitionService.SERVICE_INTERFACE),0);
  String preferred=Settings.Secure.getString(host.getContentResolver(),"voice_recognition_service");
  ComponentName wanted=preferred==null?null:ComponentName.unflattenFromString(preferred),first=null;
  for(ResolveInfo r:found){ServiceInfo s=r.serviceInfo;if(s==null||!s.enabled||!s.exported)continue;ComponentName c=new ComponentName(s.packageName,s.name);if(c.equals(wanted))return c;if(first==null)first=c;}
  return first;
 }
 private void startService(){
  try{
   ComponentName component=service();
   if(component==null){keyboard("此机型未开放系统语音接口，请点击输入法键盘上的麦克风进行语音输入。");return;}
   if(host.checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){host.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},PERMISSION_REQUEST);return;}
   final String id=requestId;
   recognizer=SpeechRecognizer.createSpeechRecognizer(host,component);
   dialog=new AlertDialog.Builder(host).setTitle("语音输入").setMessage("正在准备，请稍候…")
    .setPositiveButton("结束识别",null).setNegativeButton("取消",(d,w)->finish(null,null,true,false))
    .setOnCancelListener(d->finish(null,null,true,false)).create();
   dialog.show();
   android.graphics.drawable.GradientDrawable background=new android.graphics.drawable.GradientDrawable();background.setColor(android.graphics.Color.rgb(23,34,56));background.setCornerRadius(24*host.getResources().getDisplayMetrics().density);dialog.getWindow().setBackgroundDrawable(background);
   dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{if(recognizer!=null){dialog.setMessage("正在转成文字，请稍候…");dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(false);recognizer.stopListening();}});
   recognizer.setRecognitionListener(new RecognitionListener(){
    private boolean current(){return id.equals(requestId);}
    public void onReadyForSpeech(Bundle p){if(current()&&dialog!=null)dialog.setMessage("正在聆听，请说出您的工作需求…");}
    public void onBeginningOfSpeech(){}
    public void onRmsChanged(float rms){}
    public void onBufferReceived(byte[] b){}
    public void onEndOfSpeech(){if(current()&&dialog!=null)dialog.setMessage("正在转成文字，请稍候…");}
    public void onError(int code){if(!current())return;if(code==SpeechRecognizer.ERROR_CLIENT||code==SpeechRecognizer.ERROR_SERVER||code==SpeechRecognizer.ERROR_SERVER_DISCONNECTED||code==SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED||code==SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE){keyboard("此系统语音服务暂不可用，请使用已打开的输入法麦克风输入。");return;}String message=code==SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS?"请在手机应用权限中允许麦克风，再试一次。":code==SpeechRecognizer.ERROR_NETWORK||code==SpeechRecognizer.ERROR_NETWORK_TIMEOUT?"语音识别网络不可用，请检查网络后重试。":code==SpeechRecognizer.ERROR_AUDIO?"麦克风暂不可用，请检查是否被其它应用占用。":code==SpeechRecognizer.ERROR_RECOGNIZER_BUSY?"系统语音服务正忙，请稍后重试。":"没有识别到清晰文字，请再说一次。";finish(null,message,false,false);}
    public void onResults(Bundle b){if(current())complete(b==null?null:b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION));}
    public void onPartialResults(Bundle b){if(current()&&dialog!=null){String text=first(b==null?null:b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION));if(!text.isEmpty())dialog.setMessage(text.substring(0,Math.min(text.length(),2000)));}}
    public void onEvent(int type,Bundle b){}
   });
   timeout=()->{if(id.equals(requestId))finish(null,"语音识别超时，请重新点击语音输入。",false,false);};handler.postDelayed(timeout,45000);
   recognizer.startListening(intent().putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,true));
  }catch(Exception e){keyboard("未能启动系统语音服务，请使用输入法键盘上的麦克风输入。");}
 }
 boolean onActivityResult(int request,int result,Intent data){
  if(request!=RESULT_REQUEST)return false;
  if(requestId.isEmpty())return true;
  external=false;
  if(result!=Activity.RESULT_OK){finish(null,null,true,false);return true;}
  complete(data==null?null:data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS));return true;
 }
 boolean onPermissionResult(int request,int[] grants){
  if(request!=PERMISSION_REQUEST)return false;
  if(requestId.isEmpty())return true;
  if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)startService();
  else finish(null,"麦克风权限未开启，请在手机应用权限中允许后重试。",false,false);
  return true;
 }
 private static String first(ArrayList<String> values){if(values!=null)for(String s:values)if(s!=null&&!s.trim().isEmpty())return s.trim();return "";}
 private void complete(ArrayList<String> values){String text=first(values);finish(text,text.isEmpty()?"没有识别到文字，请再说一次。":null,false,false);}
 private void keyboard(String message){finish(null,message,false,true);}
 private void finish(String text,String message,boolean cancelled,boolean keyboard){
  if(requestId.isEmpty())return;
  String id=requestId;requestId="";external=false;release();emit(id,text,message,cancelled,keyboard);
 }
 private void emit(String id,String text,String message,boolean cancelled,boolean keyboard){try{JSONObject e=new JSONObject().put("type","voice").put("id",id);if(text!=null)e.put("text",text);if(keyboard){e.put("keyboard",true).put("message",message);}else if(message!=null)e.put("error",message);if(cancelled)e.put("cancelled",true);output.accept(e);}catch(Exception ignored){}}
 private void release(){if(timeout!=null){handler.removeCallbacks(timeout);timeout=null;}SpeechRecognizer r=recognizer;recognizer=null;if(r!=null){try{r.cancel();r.destroy();}catch(Exception ignored){}}AlertDialog d=dialog;dialog=null;if(d!=null)d.dismiss();}
 void onStop(){if(!external&&!requestId.isEmpty())finish(null,null,true,false);}
 void destroy(){requestId="";release();}
}
