# 身悠晏 官网最终优化前基线（2026-10-07）

用途：记录 Phase 0–5 施工前的可复核基线。完成全部确定性优化后，以“最终部署日”为冻结起点观察 28 天；本文件不是最终冻结起点。

## 1. GSC 过去 28 天（2026-09-06～2026-10-03）

来源：用户导出的 Search Console CSV。

- Clicks：386
- Impressions：9,391
- Mobile：342 clicks / 6,595 impressions / CTR 5.19% / position 6.83
- Desktop：39 clicks / 2,740 impressions / CTR 1.42% / position 3.38
- Tablet：5 clicks / 56 impressions / CTR 8.93% / position 6.36
- Mobile click share：88.6%

### 主要页面

| URL | Clicks | Impressions | CTR | Position |
| --- | ---: | ---: | ---: | ---: |
| /?utm_source=google&utm_medium=organic&utm_campaign=gbp_website | 227 | 5,876 | 3.86% | 4.71 |
| / | 69 | 2,258 | 3.06% | 7.60 |
| /en/late-night-massage-kamata.html | 22 | 351 | 6.27% | 6.05 |
| /kamata-late-night.html | 21 | 412 | 5.10% | 6.05 |
| /booking.html?...gbp_booking | 13 | 522 | 2.49% | 6.64 |
| /aroma-oil-kamata.html | 13 | 494 | 2.63% | 8.56 |
| /menu.html?...gbp_menu | 10 | 670 | 1.49% | 3.10 |
| /en/ | 7 | 309 | 2.27% | 6.22 |
| /en/haneda-kamata-massage.html | 5 | 232 | 2.16% | 9.09 |
| /ashitsubo-fukurahagi.html | 3 | 265 | 1.13% | 12.50 |
| /bodycare-kamata.html | 0 | 202 | 0% | 9.17 |

注：GBP UTM URL 必须先做 URL Inspection / canonical / GBP / GA4 交叉核验，不因该表直接删除 UTM、改 canonical 或做 redirect。

### 主要 Query

- 蒲田 マッサージ：18 clicks / 312 impressions / CTR 5.77% / position 7.29
- マッサージ：9 / 447 / 2.01% / 2.32
- 足つぼマッサージ：5 / 309 / 1.62% / 1.85
- 蒲田 マッサージ 深夜：深夜页 7 / 138 / 5.07% / 4.10
- 蒲田 オイルマッサージ：Aroma页 3 / 75 / 4.00% / 4.80
- 京急蒲田 マッサージ：首页 1 / 30 / 3.33% / 3.73

## 2. GA4 / Booking 诊断口径

真实 Web submission 以 Booking ledger distinct submission_id 为业务真值；GA4 事件只作行为诊断。

2026-09-06～2026-10-03 日级对账显示，GA4 booking_form_submit_success 与 ledger 在多数日期一致，但部分日期存在漏记/差异；因此从 2026-10-07 起增加：

- booking_form_submit_attempt
- attempt/success/error/unknown 的随机 submission_id 参数
- 非重复成功的 GA4 推荐事件 generate_lead
- lead_source=website_booking_request

submission_id 不注册为高基数常规报表维度。

## 3. 页面施工优先级

P1：
1. Body Care（已有曝光、0 click）
2. Foot（专页弱于首页）
3. Aroma（已有商业词接近 Top 3）
4. Late-night（保护成功 SEO 资产，只增强转化）
5. Menu（GBP menu 已有搜索点击）
6. Internal links
7. Mobile CRO（GSC clicks 88.6% 来自 mobile）

P2 / 先查再改：
- GBP UTM / URL canonical
- GBP Primary Category
- GBP Services
- Google Booking / KANZASHI
- Booking 主 CTA

## 4. 冻结规则

只有 Phase 0–5 全部确定性项目完成、QA通过、正式部署后，才设 Final Freeze Date。

Final Freeze 后 28 天，除以下 P0 外不再改：
- 页面/Booking不可用
- noindex/canonical/redirect严重错误
- 价格或业务事实严重错误
- analytics 完全失效

最终比较链：
GSC → GBP → Sessions → CTA → Booking → confirmed → arrived → final_amount_yen
