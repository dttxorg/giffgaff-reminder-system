# Product Design QA · 首页 Utility Poster

- source visual truth path: `/Users/zhuli/.codex/generated_images/019f6560-d6af-7843-a329-14f248192959/exec-5a04aa62-edc2-4ede-802e-73c0ab8b9641.png`
- implementation screenshot path: `/tmp/giffgaff-option3-implementation-passed-desktop.png`
- production screenshot path: `/tmp/giffgaff-option3-production-desktop.png`
- viewport: source normalized to implementation `1425 × 1013`（浏览器设置 `1440 × 1024`，滚动条占用可视宽度）
- state: 首页、未登录、首个 FAQ 展开
- full-view comparison evidence: `/tmp/giffgaff-option3-comparison-passed.png`
- focused hero comparison evidence: `/tmp/giffgaff-option3-comparison-hero-passed.png`
- focused service comparison evidence: `/tmp/giffgaff-option3-comparison-service-passed.png`

## Findings

没有剩余 P0、P1 或 P2 问题。

- [P3] 参考图会员服务票券左侧有装饰性锯齿/竖排标签，正式实现使用平直边界。
  - Location: `section[aria-labelledby="codex-membership-title"]`
  - Evidence: 参考图用票券切口强化海报感；实现保留蓝色服务区、左右信息结构与分隔节奏，但未复刻装饰切口。
  - Impact: 不影响层级、可读性、扫码或响应式，仅有轻微装饰差异。
  - Decision: 接受。避免为装饰效果引入 CSS 图形或伪造图像资产。

- [P3] 中文大标题使用现有系统中文字体栈，字面宽度与生成图中的展示字体略有差异。
  - Location: `#home-title`
  - Evidence: 字重、字号、行距与换行结构一致；部分中文笔画宽度略窄。
  - Impact: 视觉气质保持一致，不影响首屏理解与布局稳定性。
  - Decision: 接受。优先复用项目字体栈，避免新增大体积中文 WebFont。

## Required Fidelity Surfaces

- Fonts and typography: 大标题采用超粗字重、负字距和两行结构；正文维持 14–18px 可读尺度，未发现截断或异常换行。320px 下“Codex 会员代充”已修复为完整单行。
- Spacing and layout rhythm: 桌面端使用接近全幅的 32px 外边距；首屏、200px 时间线、左 FAQ / 右会员服务区与参考图顺序一致。320px、390px 均无横向滚动。
- Colors and visual tokens: 暖纸张底色、近黑文字、靛蓝主操作与橙红截止日强调均与参考方向一致；正文和交互元素对比清晰。
- Image quality and asset fidelity: 使用独立生成并压缩的真实纸张纹理；微信二维码继续引用原始 660 × 660 PNG，未重绘、滤镜、裁圆或压缩，生产页加载完成。
- Copy and content: 保留 Giffgaff 核心价值、登录/卡密入口、推送样例和 170–180 天节奏；会员服务明确为“官方渠道订阅、本人信用卡代付、30 天质保”，并展示 Plus ¥130、5× Pro ¥740、20× Pro ¥1,200；未再出现“第三方代充服务 / 非 Codex 官方渠道”。
- Icons: 全部功能图标统一来自 Phosphor Icons SSR 包，无 emoji、手绘 SVG 或 CSS 图形替代。
- Accessibility and behavior: 语义标题、区域标签、列表和二维码替代文本完整；按钮保持至少 44px 点击高度；FAQ 在 390px 视口点击后成功展开。

## Comparison History

### Pass 1 · blocked

- [P1] 会员服务与 FAQ 的桌面顺序和参考图相反。
- [P2] 首页与页眉最大宽度过窄，左右留白明显大于参考图。
- [P2] 首屏与时间线纵向间距过大，会员服务区在 1024px 高视口中过晚出现。
- [P2] 320px 下“Codex 会员代充”在“会员”中间断行。

Fixes made:

- 桌面端改为左 FAQ / 右会员服务，移动端仍保持会员服务优先。
- 首页和首页状态页眉扩大至 1440px 最大宽度。
- 收紧首屏、时间线和会员区间距，使会员区从 `y=943` 提前到 `y=759`。
- 移动端会员标题改为 32px 单行，二维码保持 196px 可扫码尺寸。

### Pass 2 · blocked

- [P2] 首屏右侧推送预览宽于参考图，起始位置偏左，削弱大标题主导性。

Fix made:

- 首屏桌面网格调整为 `1.12fr / minmax(500px, 0.88fr)`；最终左文案宽 `726px`，推送预览宽 `571px`，起始位置 `x=822px`。

### Pass 3 · passed

- 同视口全屏与重点区域对照未发现新的 P0、P1 或 P2 差异。
- 生产模式页面无浏览器 console error / warning。
- 生产模式二维码自然尺寸为 `660 × 660`，页面无横向溢出，隐私昵称和地区不在 DOM 中。

### Pass 4 · scoped pricing update passed

- User-directed change: 会员服务新增 Plus ¥130、5× Pro ¥740、20× Pro ¥1,200 三档价格。
- Mobile evidence: `/tmp/giffgaff-prices-mobile-390.png`、`/tmp/giffgaff-prices-mobile-320.png`。
- 390px 下每列宽约 `100–101px`；320px 下每列宽约 `77–78px`，各列 `scrollWidth === clientWidth`，页面无横向溢出。
- 价格使用三列规则线分组，保持方案 3 的海报式信息层级；二维码尺寸与服务保障内容未受影响。
- 最终生产模式复验：两档移动端截图均已刷新为 5× Pro ¥740；320px 下页面和价格列无溢出，二维码为原始 `660 × 660`，console 无 error / warning。

## Implementation Checklist

- [x] 桌面端首屏、时间线、FAQ 与会员服务结构对齐
- [x] 320px 与 390px 响应式检查
- [x] 登录、卡密链接与 FAQ 展开交互检查
- [x] 二维码加载、尺寸与隐私检查
- [x] TypeScript、ESLint、全量测试和生产构建
- [x] 生产模式 console 检查
- [x] 三档会员价格与 320px / 390px 移动端价格带检查

## Follow-up Polish

- 可在未来独立迭代中探索真实票券边缘纹理，但不属于本轮阻塞项。

final result: passed
