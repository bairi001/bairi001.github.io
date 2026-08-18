# 身悠晏 Recruit Distribution V2

## 目标

官网负责真实条件、工作环境、职位详情和最终申请承接；外部平台负责把职位展示给正在找工作的求职者。

## 渠道顺序

1. ハローワーク：免费基础分发与本地求职者覆盖
2. 一个主测试平台：Indeed / Indeed PLUS、HotPepper Beauty WORK 或行业招聘平台中择一
3. 官网 JobPosting：继续作为实体一致性、职位详情和Google招聘资格页面
4. 店内、员工介绍和SNS：作为低成本辅助来源

## 30天测试方法

每个平台使用独立来源参数，例如：

- `https://shinyuuan.jp/recruit.html?utm_source=hellowork&utm_medium=job_board&utm_campaign=recruit_2026&job=full-time#apply`
- `https://shinyuuan.jp/recruit.html?utm_source=indeed&utm_medium=job_board&utm_campaign=recruit_2026&job=contractor#apply`
- `https://shinyuuan.jp/recruit.html?utm_source=beautywork&utm_medium=job_board&utm_campaign=recruit_2026&job=part-time#apply`

只记录：

- 页面访问
- 开始填写
- 申请成功
- 面谈
- 录用

不要用浏览量替代真实申请，也不要因短期无申请伪造工资、截止日期或保证条件。

## 发布前核对

- 店名、法人名、地址、电话一致
- 雇用形态与合同真实一致
- 工资、步合、最低保证的适用条件写清楚
- 正社員、パート、業務委託分开发布
- 不把条件性最低保证写成所有人固定工资
- 没有真实截止日期时不伪造 `validThrough`
- 外国籍应聘者只写“需确认可从事该工作的在留资格与就劳条件”

## 状态边界

- 官网页面完成：不等于外部平台已发布
- 平台提交：不等于审核通过
- 审核通过：不等于获得曝光
- 获得曝光：不等于产生申请
- 申请：不等于面谈或录用
