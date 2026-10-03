# 身悠晏 Analytics 周报与预约归因口径

更新基线：2026-10-04 JST

## 1. 数据源优先级

1. 真实预约与收入：网页预约台账（distinct `submission_id`）
2. 全站 Sessions / Users：`GA4_Daily`
3. 渠道与 Landing Page 拆分：`GA4_Acquisition`
4. Booking 漏斗事件：`GA4_Booking`
5. Google 搜索曝光/点击：GSC
6. 代码中的 CTA 参数仅证明埋点设计，不替代实际台账结果

## 2. 周报总量口径

- 总 Sessions：只取 `GA4_Daily.sessions`。
- 不把 `GA4_Acquisition` 全部明细行相加作为总 Sessions。
- `GA4_Acquisition` 只用于已定义来源切片和 Landing Page 分析。
- 真实 Web 申请：网页预约台账中排除明确测试记录后，按 distinct `submission_id` 计数。
- `booking_form_submit_success` 是 GA4 事件，不等于真实台账申请数；发生差异时以台账为业务真值并排查埋点。

## 3. 渠道切片

- GBP Website：`sessionCampaignName = gbp_website`
- GBP Menu：`sessionCampaignName = gbp_menu`
- GBP Booking：`sessionCampaignName = gbp_booking`
- 普通 Google Organic：`sessionSource = google` + `sessionMedium = organic` + `sessionCampaignName = (organic)`
- GBP 与普通 Google Organic 分开报告，避免把 GBP 下降误判为官网自然搜索下降。

## 4. 数据成熟度

- GA4 正式周报默认冻结到 D-2；D-1 / 当日只作速報。
- GSC 正式周报默认冻结到 D-3；更新更近日期时明确标记为 preliminary / 未成熟。
- 若 Collector 当日未成功刷新，以上界限还要向前移动到最后一次成功采集日。
- GA4 与 GSC 的日期时区不同，日级对比必须注明口径；不把单日差异直接解释为流量变化。

## 5. Landing Page 归一化

用于 Landing Page 汇总时：

- `/?utm_*=...` → `/`
- `/?rwg_token=...` → `/`
- 同一路径的营销参数、跟踪参数不拆成独立页面。

注意：URL 归一化只用于页面统计，不删除原始归因信息。

## 6. 预约归因闭环

业务目标：

`origin_page → origin_cta → service_context → course_id → submission_id → booking_status → final_amount_yen`

### 新提交

前端把机器可解析标记写入现有 `utm_content`：

`sy_o=<origin>;sy_c=<cta>;sy_s=<service>`

如果原本已有 `utm_content`，保留在该标记之后，以 `|` 分隔，并遵守现有 120 字符上限。

同一预约行已包含：

- `submission_id`
- `course_id`
- `booking_status`
- `scheduled_at_jst`
- `final_amount_yen`

因此无需改变 Apps Script v5 表结构即可完成后续收入归因。

### 历史提交

部分历史预约已在 `note` 保存：

`origin: ... / cta: ...`

历史分析按以下顺序：

1. 优先解析 `utm_content` 中的 `sy_o / sy_c / sy_s`
2. 无机器标记时回退解析 `note` 的 `origin / cta`
3. 历史缺失 `service_context` 时可用 `course_id` 做服务类别映射，但必须标记为 derived，不冒充原始埋点
4. 无法确定时保留 unknown，不猜测

## 7. 预约状态与收入

- 不因预约时间已经过去自动判定 `arrived`。
- 只有人工或可靠业务记录确认后，才写入 `confirmed / arrived / cancelled / no_show`。
- `final_amount_yen` 只记录实际最终金额，不用菜单标价自动代填。
- 周报中收入只统计已明确记录的 `final_amount_yen`，缺失金额单列为 attribution incomplete。

## 8. 周报核心表

每周固定输出：

- Sessions
- GBP Website / Menu / Booking Sessions
- 普通 Google Organic Sessions
- GSC Clicks / Impressions / CTR / Average Position
- booking_channel_click
- booking_form_start
- booking_form_submit_success
- 真实 Web submissions
- requested / confirmed / arrived / cancelled / no_show
- recorded revenue
- 按 `origin_page / origin_cta / service_context / course_id` 的 submission、arrived、revenue

所有前后比较保持相同天数、成熟度边界和来源定义。
