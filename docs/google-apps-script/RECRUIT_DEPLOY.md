# 身悠晏 Recruit Direct Apply V2 部署手顺

本后端与现有预约 Web App **分开部署**，避免招聘改动影响正常预约。

## 1. 新建独立 Apps Script 项目

1. 新建一个 Google Apps Script 项目，例如 `Shin Yuu An Recruit`。
2. 把 `docs/google-apps-script/RecruitCode.gs` 的全部内容复制到 `Code.gs`。
3. 不要把邮箱、Spreadsheet ID 或任何密钥直接写进代码。

## 2. 设置 Script Properties

在「项目设置 → 脚本属性」中添加：

- `TO_MAIL`：接收招聘咨询的店铺邮箱
- `SHEET_ID`：保存招聘申请的 Google Spreadsheet ID
- `SHEET_NAME`：`Recruit Applications`
- `MAX_PER_HOUR`：建议 `20`
- `SALON_NAME`：`身悠晏`
- `TIME_ZONE`：`Asia/Tokyo`

`SHEET_ID` 可以与预约台账使用同一个 Spreadsheet，但本脚本会写入独立的 `Recruit Applications` 工作表，不会写入预约工作表。

## 3. 部署 Web App

1. 点击「部署 → 新建部署」。
2. 类型选择「Web 应用程序」。
3. 执行身份选择「我」。
4. 访问权限选择「任何人」。
5. 完成授权并复制以 `/exec` 结尾的 Web App URL。

浏览器打开该 `/exec` URL，应返回：

```json
{"ok":true,"service":"shinyuuan-recruit","version":"1"}
```

## 4. 激活官网直投

打开 `assets/recruit-direct-apply.js` 顶部配置：

```js
const CONFIG = Object.freeze({
  enabled: false,
  endpoint: "",
  timeoutMs: 12000
});
```

改成：

```js
const CONFIG = Object.freeze({
  enabled: true,
  endpoint: "https://script.google.com/macros/s/你的部署ID/exec",
  timeoutMs: 12000
});
```

必须在真实测试通过后才将 `enabled` 改为 `true`。

## 5. 上线前测试

使用姓名 `TEST RECRUIT` 提交一次，确认：

- 网站显示已受理
- 店铺邮箱收到招聘咨询
- `Recruit Applications` 工作表新增一行
- 如果联系方式选择「メール」，测试邮箱收到自动回执
- 第二次提交相同内容不会重复写入
- GA4 只记录非个人信息事件，不包含姓名、邮箱、电话

测试结束后删除测试行和测试邮件。

## 状态边界

- GitHub 合并：只代表代码已进入官网仓库
- Web App 部署：只代表后端可访问
- `enabled:true` 合并并部署线上：直投功能才正式开放
- 收到申请：不等于已面试或已录用
