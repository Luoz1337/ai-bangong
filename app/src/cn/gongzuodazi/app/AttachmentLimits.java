package cn.gongzuodazi.app;

/** API 26 cannot request bounded video frame decoding. Reject before allocation. */
public final class AttachmentLimits {
 public static void checkVideo(int api,String width,String height){
  if(api>=27)return;
  long w=0,h=0;
  try{w=Long.parseLong(width);h=Long.parseLong(height);}catch(Exception ignored){}
  if(w<=0||h<=0||w>2073600||h>2073600||w*h>2073600)throw new IllegalArgumentException("Android 8.0仅支持读取1080p以内视频，请先压缩分辨率或上传关键画面截图。");
 }
}
