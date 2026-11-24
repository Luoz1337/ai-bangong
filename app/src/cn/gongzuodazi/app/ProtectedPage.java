package cn.gongzuodazi.app;
import java.util.*;
import java.util.regex.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.io.IOException;
final class ProtectedPage {
 static String assemble(Map<String,byte[]> files) throws IOException {
  String html=text(files,"index.html");byte[] random=new byte[18];new SecureRandom().nextBytes(random);
  String nonce=Base64.getEncoder().withoutPadding().encodeToString(random);
  if(!html.contains("script-src 'self'"))throw new IOException("Missing script policy");
  html=html.replace("script-src 'self'","script-src 'nonce-"+nonce+"'");
  Matcher css=Pattern.compile("<link rel=\"stylesheet\" href=\"([^\"]+)\">" ).matcher(html);StringBuffer out=new StringBuffer();
  while(css.find())css.appendReplacement(out,Matcher.quoteReplacement("<style>"+text(files,css.group(1)).replaceAll("(?i)</style","<\\\\/style")+"</style>"));css.appendTail(out);
  Matcher js=Pattern.compile("<script src=\"([^\"]+)\"></script>").matcher(out.toString());out=new StringBuffer();
  while(js.find())js.appendReplacement(out,Matcher.quoteReplacement("<script nonce=\""+nonce+"\">"+text(files,js.group(1)).replaceAll("(?i)</script","<\\\\/script")+"</script>"));js.appendTail(out);
  return out.toString();
 }
 private static String text(Map<String,byte[]> files,String name) throws IOException {byte[] data=files.get(name);if(data==null)throw new IOException("Missing protected asset");return new String(data,StandardCharsets.UTF_8);}
}
