import cn.gongzuodazi.app.OfficeWriter;
import java.util.*;
import java.nio.file.*;
public class OfficeWriterTest {
 public static void main(String[] args) throws Exception {
  Path out=Paths.get(args[0]);Files.createDirectories(out);
  List<String> cols=Arrays.asList("项目","金额","备注");
  List<List<Object>> rows=new ArrayList<>();rows.add(Arrays.asList("打印纸",42.5,"真实数字"));rows.add(Arrays.asList("=HYPERLINK(\"https://example.com\")",0,"<>&引号\""));rows.add(Arrays.asList("空白",null,""));
  Files.write(out.resolve("sample.xlsx"),OfficeWriter.xlsx("费用表",cols,rows));
  List<OfficeWriter.Slide> slides=Arrays.asList(new OfficeWriter.Slide("季度工作汇报",Arrays.asList("先整理事实，再表达结论","数据不足时标待补充"),"这是第一页讲稿"),new OfficeWriter.Slide("下一步计划",Arrays.asList("明确负责人及截止日期","复盘实际进度并落实改进"),"这是第二页讲稿"));
  Files.write(out.resolve("sample.pptx"),OfficeWriter.pptx("工作汇报",slides));
  if(!OfficeWriter.xml("<>&\"\u0001").equals("&lt;&gt;&amp;&quot;"))throw new AssertionError("XML escaping");
  try{OfficeWriter.xlsx("bad",cols,Arrays.asList(Arrays.asList(1,2)));throw new AssertionError("must reject inconsistent rows");}catch(IllegalArgumentException expected){}
  System.out.println("OfficeWriter Java checks passed");
 }
}
