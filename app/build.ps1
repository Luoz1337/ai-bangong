param([string]$Sdk=$env:ANDROID_HOME,[string]$OutputApk="",[string]$BuildDir="")
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
if(-not $Sdk){$Sdk='E:\AndroidSdk'}
if(-not $BuildDir){$BuildDir=Join-Path $root '..\build'}
if(-not $OutputApk){$OutputApk=Join-Path $BuildDir 'AI-work-v2.3.4.apk'}
$bt=Join-Path $Sdk 'build-tools\34.0.0'
$android=Join-Path $Sdk 'platforms\android-34\android.jar'
if(-not(Test-Path -LiteralPath $android)){throw "缺少 Android SDK 34，请设置 ANDROID_HOME 或传入 -Sdk。"}
foreach($p in @($BuildDir,(Join-Path $BuildDir 'classes'),(Join-Path $BuildDir 'dex'),(Split-Path $OutputApk))){New-Item -ItemType Directory -Force $p | Out-Null}
function Check([string]$step){if($LASTEXITCODE -ne 0){throw "$step 失败，退出码 $LASTEXITCODE"}}
$key=Join-Path $BuildDir 'local-signing.p12'
$BuildDir=Join-Path $BuildDir ('release-'+[DateTime]::Now.ToString('yyyyMMdd-HHmmss-fff'))
foreach($dir in @('classes','dex','packer','release-web','packed-assets','generated')){New-Item -ItemType Directory -Force (Join-Path $BuildDir $dir)|Out-Null}
& node "$root\tools\build-web.cjs";Check '前端编译'
& node "$root\tools\prepare-release.cjs" "$BuildDir\release-web";Check '发布脚本压缩'
& javac -encoding UTF-8 -d "$BuildDir\packer" "$root\src\cn\gongzuodazi\app\LayeredCrypto.java" "$root\tools\PackAssets.java";Check '资源加密工具编译'
& java -cp "$BuildDir\packer" cn.gongzuodazi.app.PackAssets "$BuildDir\release-web" "$BuildDir\packed-assets" "$BuildDir\generated";Check '四层资源加密校验'
Copy-Item -LiteralPath "$root\tools\bootstrap.html" -Destination "$BuildDir\packed-assets\index.html"
& "$bt\aapt.exe" package -f -M "$root\AndroidManifest.xml" -S "$root\res" -A "$BuildDir\packed-assets" -I $android -F "$BuildDir\resources.apk"
Check '资源编译'
$java=Get-ChildItem -LiteralPath "$root\src" -Recurse -Filter '*.java' | ForEach-Object {$_.FullName}
$java+=Get-ChildItem -LiteralPath "$BuildDir\generated" -Recurse -Filter '*.java' | ForEach-Object {$_.FullName}
& javac -encoding UTF-8 -source 8 -target 8 -bootclasspath "$android;$bt\core-lambda-stubs.jar" -d "$BuildDir\classes" $java
Check 'Java编译'
& jar cf "$BuildDir\classes.jar" -C "$BuildDir\classes" .
Check 'class打包'
& java -cp "$bt\lib\d8.jar" com.android.tools.r8.R8 --release --lib $android --min-api 26 --pg-conf "$root\proguard-rules.pro" --pg-map-output "$BuildDir\mapping.txt" --output "$BuildDir\dex" "$BuildDir\classes.jar"
Check 'R8混淆编译'
Copy-Item -LiteralPath "$BuildDir\resources.apk" -Destination "$BuildDir\unsigned.apk" -Force
Push-Location "$BuildDir\dex"
try {& "$bt\aapt.exe" add "$BuildDir\unsigned.apk" classes.dex;Check 'DEX入包'} finally {Pop-Location}
& "$bt\zipalign.exe" -f 4 "$BuildDir\unsigned.apk" "$BuildDir\aligned.apk"
Check 'ZIP对齐'
if(-not(Test-Path -LiteralPath $key)){& keytool -genkeypair -keystore $key -storepass workmate-local -keypass workmate-local -alias workmate -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=AI Work Local Build,O=AI Work,C=CN';Check '本地签名生成'}
& "$bt\apksigner.bat" sign --ks $key --ks-key-alias workmate --ks-pass pass:workmate-local --key-pass pass:workmate-local --out $OutputApk "$BuildDir\aligned.apk"
Check 'APK签名'
& "$bt\apksigner.bat" verify --verbose $OutputApk
Check '签名验证'
& "$bt\aapt.exe" dump badging "$BuildDir\resources.apk" | Select-Object -First 7
Write-Output "APK: $OutputApk"
Write-Output "Release artifacts: $BuildDir"
