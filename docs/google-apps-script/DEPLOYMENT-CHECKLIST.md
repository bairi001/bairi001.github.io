# Google Apps Script 部署检查清单

## 账号

- [ ] 使用专门的预约自动化 Google 账号。
- [ ] 已开启两步验证。
- [ ] Google 商家资料核心管理账号不是唯一脚本账号。
- [ ] 已记录账号恢复与人员交接方式。

## Apps Script 与表格

- [ ] 已在 `script.google.com` 创建项目并复制 `Code.gs`。
- [ ] 已创建专用 Google Sheets 预约台账。
- [ ] 已设置 `TO_MAIL`、`SHEET_ID`、`MAX_PER_HOUR=20`、`SALON_NAME=身悠晏`、`TIME_ZONE=Asia/Tokyo`。
- [ ] 未把真实 Script Properties 或邮箱提交到 GitHub。
- [ ] 已完成首次授权。
- [ ] 部署类型为 Web app。
- [ ] Execute as 为部署者本人。
- [ ] 访问权限允许匿名外部用户提交。
- [ ] 使用正式 `/exec` 地址，不使用 `/dev`。
- [ ] 脚本修改后已更新部署版本。

## 正式域名测试

- [ ] `FORM_ENDPOINT` 已填入正式 `/exec` 地址。
- [ ] 测试期间 `FORM_LIVE_TESTED=false`。
- [ ] 已从 `https://shinyuuan.jp` 发起真实提交。
- [ ] Google Sheets 写入正确，时间为 Asia/Tokyo。
- [ ] Gmail 通知已到达。
- [ ] 邮件 `replyTo` 指向测试客人的邮箱。
- [ ] 手机 Gmail 通知已验证。
- [ ] 蜜罐、重复提交、过快/过旧提交和限流已验证。
- [ ] 表格写入失败不会显示成功。
- [ ] 邮件失败会保留表格记录并写入 `mail_status`。

## 隐私与开放

- [ ] 已确认收集项目、利用目的和 Google 服务的使用。
- [ ] 已确认账号访问权限、保存期限、删除规则和数据处理安排。
- [ ] 已确认是否涉及境外处理，并完成日本个人信息保护法最终确认。
- [ ] 正式隐私政策已更新，表单已显示隐私政策链接和同意确认。
- [ ] 隐私准备完成后设置 `FORM_PRIVACY_READY=true`。
- [ ] 全部正式测试通过后设置 `FORM_LIVE_TESTED=true`。
- [ ] 已再次确认网页预约按钮只在四个开关条件全部满足时出现。
