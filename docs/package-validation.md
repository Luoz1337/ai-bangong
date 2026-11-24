# GitHub 打包核验

打包日期：2026-11-24。应用版本仍为2.3.4。

- 从原工程复制完整源码、开发资源、提示词说明及测试；无运行逻辑修改。
- 三个浏览器测试改用本项目npm依赖，不再依赖原工作区外部browser目录；新增package-lock.json，npm ci在独立目录安装成功。
- 整理包中的29项单元测试通过，整体密度和扁平聊天框浏览器测试通过。
- 独立目录命令行构建成功，APK v2/v3签名校验通过。该次验证使用新生成的临时本地签名，仅用于构建核验，不作为本包发布APK。
- releases/内保留原交付APK，逐字节与原2.3.4一致，原签名证书SHA-256为f8057fd2bc6ca6f193dca80f9d47b44d5a9578eeea7c60b04bca0a3a8dcdbbe4。
- Git忽略规则验证：node_modules、.env、build/local-signing.p12、work日志被排除，releases/AI-work-v2.3.4.apk允许纳入。
- 未加入真实API Key、手机数据或日志、私钥、生成资源密钥、依赖目录、构建缓存或.git历史。
- APK和所有打包文件的SHA-256见根目录SHA256SUMS.txt；该清单不包含自身。
- 未执行手机安装、真实AI请求、Android Keystore迁移或vivo真实语音验证。历史文档记录的是之前实现与测试边界，不代表已完成这些实测。
- 未上传GitHub，未创建远程仓库，未替版权持有人指定开源许可证。
