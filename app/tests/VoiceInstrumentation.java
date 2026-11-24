package cn.gongzuodazi.voicecheck;

import android.app.*;
import android.content.*;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.webkit.WebView;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.concurrent.*;
import org.json.*;

/** Test APK only: intercepts recognizer launch to test native result delivery without recording audio. */
public final class VoiceInstrumentation extends Instrumentation {
 private WebView web;
 @Override public void onCreate(Bundle args){super.onCreate(args);start();}
 private String js(String source) throws Exception {
  CountDownLatch done=new CountDownLatch(1);String[] value={null};
  runOnMainSync(()->web.evaluateJavascript(source,result->{value[0]=result;done.countDown();}));
  if(!done.await(5,TimeUnit.SECONDS))throw new Exception("WebView callback timed out");return value[0];
 }
 private void waitJs(String condition) throws Exception {for(int i=0;i<60;i++){if("true".equals(js(condition)))return;Thread.sleep(100);}throw new Exception("Condition not reached: "+condition);}
 private String input() throws Exception {return new JSONArray("["+js("document.querySelector('#prompt').value")+"]").getString(0);}
 private void setInput(String text) throws Exception {js("(()=>{const e=document.querySelector('#prompt');e.value="+JSONObject.quote(text)+";e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");}
 @Override public void onStart(){
  Activity activity=null;String original=null;Bundle result=new Bundle();int status=Activity.RESULT_CANCELED;
  try{
   Intent open=new Intent().setClassName("cn.gongzuodazi.app","cn.gongzuodazi.app.MainActivity").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
   activity=startActivitySync(open);Field f=activity.getClass().getDeclaredField("web");f.setAccessible(true);web=(WebView)f.get(activity);
   waitJs("!!document.querySelector('#voice-input')");original=input();String before=js("document.querySelectorAll('[data-chat-entry]').length");
   setInput("已有草稿（固定识别结果测试）");
   for(int mode=0;mode<3;mode++){
    Intent response=new Intent();ArrayList<String> values=new ArrayList<>();if(mode==0)values.add("这是语音识别结果测试，不自动发送。");response.putStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS,values);
    IntentFilter filter=new IntentFilter(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
    ActivityMonitor monitor=addMonitor(filter,new ActivityResult(mode==1?Activity.RESULT_CANCELED:Activity.RESULT_OK,response),true);
    js("document.querySelector('#voice-input').click();true");
    for(int i=0;i<60&&monitor.getHits()==0;i++)Thread.sleep(100);
    if(monitor.getHits()!=1)throw new Exception("Native recognizer intent was not dispatched");
    waitJs("!document.querySelector('#voice-input').disabled");removeMonitor(monitor);
    String expected="已有草稿（固定识别结果测试）\n这是语音识别结果测试，不自动发送。";
    if(!expected.equals(input()))throw new Exception("Success/cancel/empty-result draft mismatch in mode "+mode);
   }
   if(!before.equals(js("document.querySelectorAll('[data-chat-entry]').length")))throw new Exception("Unexpected automatic send");
   result.putString("summary","PASS: real WebView -> JavascriptInterface -> recognition Intent -> native activity result -> editable draft; success, cancel, empty result, no auto-send. Fixed results only; no microphone/audio/API request.");status=Activity.RESULT_OK;
  }catch(Throwable e){result.putString("failure",e.toString());}
  finally{try{if(original!=null)setInput(original);}catch(Exception ignored){}if(activity!=null){Activity a=activity;runOnMainSync(a::finish);}finish(status,result);}
 }
}
