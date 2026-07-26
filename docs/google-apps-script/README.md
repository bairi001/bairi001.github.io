# 身悠晏网页预约 Apps Script 模板

此目录提供可复制到 Google Apps Script 的预约后端模板。当前正式网站的 `FORM_ENDPOINT` 为空，`FORM_PRIVACY_READY=false`、`FORM_LIVE_TESTED=false`，所以网页 POST 尚未对外开放。

## 账号与安全

- 建议使用专门的预约自动化 Google 账号，并开启两步验证。
- 不建议把 Google 商家资料的核心管理账号作为唯一脚本账号。
- 不要把真实邮箱、Google Sheets ID、密码或 Script Properties 提交到公开 GitHub 仓库。
- 定期复核账号权限、表格共享范围、数据保存和删除规则。

## 建立项目

1. 在 [script.google.com](https://script.google.com/) 创建独立项目。
2. 将 `Code.gs` 的内容复制到项目中。
3. 创建专用的 Google Sheets 预约台账；第一张工作表将用于写入。
4. 在“项目设置 → 脚本属性”中配置：

   - `TO_MAIL`：接收店铺通知的邮箱。
   - `SHEET_ID`：预约台账表格 ID。
   - `MAX_PER_HOUR`：建议先设为 `20`。
   - `SALON_NAME`：建议设为 `身悠晏`。
   - `TIME_ZONE`：必须设为 `Asia/Tokyo`。

5. 运行一次受保护的功能以完成首次授权，并确认授权账号正确。

## 部署

1. 选择“部署 → 新建部署 → Web 应用”。
2. “执行身份”选择部署者本人。
3. 访问权限选择允许匿名外部用户提交的选项。
4. 使用正式 `/exec` 地址，不使用测试 `/dev` 地址。
5. 每次修改脚本后创建新版本并更新部署。
6. 将 `/exec` 地址填入 `booking.html` 的 `FORM_ENDPOINT`。
7. 此时仍保持 `FORM_LIVE_TESTED=false`，不要提前公开网页预约入口。

## 正式测试顺序

必须从正式 `https://shinyuuan.jp` 域名进行真实提交测试，而不是只在本地或 Apps Script 编辑器中测试。

1. 确认健康检查仅返回 `ok`、`service` 和 `version`。
2. 测试正常预约写入 Google Sheets。
3. 测试 Gmail 通知到达、邮件中的 `replyTo` 和手机 Gmail 通知。
4. 测试重复 `submissionId`、蜜罐、过快提交、过期提交和小时限流。
5. 测试表格写入失败不会返回成功。
6. 测试邮件失败时，表格中仍保留记录并写入 `mail_status`。
7. 完成隐私政策确认后再将 `FORM_PRIVACY_READY` 设为 `true`。
8. 所有正式域名测试通过后再将 `FORM_LIVE_TESTED` 设为 `true`。

模板不会自动给客人发送确认邮件。预约只有在店铺人工回复后才正式成立。
