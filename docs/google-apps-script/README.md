# 身悠晏网页预约 Apps Script 模板

此目录保存身悠晏网页预约后端的仓库版本。正式网站已启用 Google Apps Script 网页预约；**仓库源码更新不等于线上 Web App 已部署**，每次后端变更都必须更新原有部署并复核正式 `/exec`。当前 D 阶段候选版本为 `SERVICE_VERSION="4"`，在既有 22 列之后仅追加 `same_room_requested`（W列）。

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

## V4：2名同室申请的发布顺序

1. 预约台账 A–V 原列保持不动，在 W1 使用 `same_room_requested`。
2. 将本目录 `Code.gs` 的 v4 变更合并到**现有** Apps Script 项目「身悠晏 网页预约接收」，不要新建新的 Web App 或更换 `/exec` 地址。
3. 更新现有 Web App 部署后，健康检查应返回 `{"ok":true,"service":"shinyuuan-booking","version":"4"}`。
4. 后端 v4 验证完成后，再合并/发布官网同室申请前端。
5. 同室字段只代表“客人提出需求”。只有店铺核对房间、2名分的工作人员、开始时间和课程后，并在回复中明确确认，才视为同室安排成立。

