# 网页预约开放检查清单

只有以下项目全部完成，才能公开网页 POST：

- [ ] `FORM_BACKEND === "google-apps-script"`。
- [ ] `FORM_ENDPOINT` 为正式 Apps Script `/exec` 地址。
- [ ] `FORM_PRIVACY_READY === true`。
- [ ] `FORM_LIVE_TESTED === true`。
- [ ] 正式隐私政策已说明实际收集项目、目的和 Google Apps Script、Gmail、Google Sheets 的使用。
- [ ] 表单显示隐私政策链接与同意确认。
- [ ] 已确认账号访问权限、保存期限、删除规则、处理安排和境外处理判断。
- [ ] 已完成日本个人信息保护法最终确认。
- [ ] 从 `https://shinyuuan.jp` 的真实跨域提交成功。
- [ ] Google Sheets 写入、Gmail 到达、`replyTo` 和手机通知均已验证。
- [ ] 超时、非 JSON、`ok:false`、表格写入失败和邮件失败场景已验证。
- [ ] 蜜罐、重复提交、过快/过旧提交、payload 长度和小时限流已验证。
- [ ] 所有失败场景保留用户输入并显示 WhatsApp 与电话备用方式。
- [ ] 成功文案只表示“预约申请已发送”，并明确店铺回复后预约才正式成立。
- [ ] Google Analytics 与页面 URL 均不包含姓名、邮箱、电话、备注、完整 WhatsApp 消息或 `submissionId`。

当前默认值必须保持：

```js
const FORM_ENDPOINT = "";
const FORM_PRIVACY_READY = false;
const FORM_LIVE_TESTED = false;
```
