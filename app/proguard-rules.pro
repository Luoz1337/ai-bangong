-keep public class cn.gongzuodazi.app.MainActivity { public <init>(); }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault
-renamesourcefileattribute Protected
-dontwarn java.lang.invoke.**
