import cn.gongzuodazi.app.AttachmentLimits;
public class AttachmentLimitsTest {
 public static void main(String[] args){
  AttachmentLimits.checkVideo(26,"1920","1080");
  AttachmentLimits.checkVideo(27,"7680","4320");
  for(String[] size:new String[][]{{"3840","2160"},{"7680","4320"},{null,null},{"0","1080"}}){try{AttachmentLimits.checkVideo(26,size[0],size[1]);throw new AssertionError("Must reject unbounded legacy decode");}catch(IllegalArgumentException expected){}}
  System.out.println("Legacy video decode bounds passed");
 }
}
