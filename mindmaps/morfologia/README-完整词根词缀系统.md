# 西班牙语词根词缀完整系统｜A1–B2

> **覆盖状态完整 ≠ 每个词都已完成构词审校。** 当前主词库 827 条记录均有词素状态索引；其中 **76 条与本批 135 个编辑性分析示例匹配**，**118 条只标记不定式词尾**，**193 条是词组/词形变体**，还有 **440 条尚未完成可靠的词素审校**。135 个编辑性分析示例中，另有 59 个是词族扩展示例，而非主词库当前收录词。禁止将“100% 索引”描述为“100% 已拆解”。

## 从这里开始

- [交互式词根词缀检索：827 条状态索引 + 53 类词缀](https://anotonia.github.io/ES/#/morphology)
- [53 组词缀规则与反例 JSON](../../data/morphology/affix_catalog.json)
- [135 条具体分析 CSV（词基 + 表层分段 + 历史注意事项）](../../data/morphology/curated_analyses.csv)
- [270 条具名词素成分 CSV（前缀、词干、后缀或历史线索）](../../data/morphology/components.csv)
- [主词库 827 条完整状态 CSV](../../data/morphology/morphology_master.csv)
- [主词库原始数据](../../data/vocabulary_master.csv)

## 13 张 Mermaid 可编辑脑图

| 模块 | 图谱 | 本图包含 |
|---|---|---|
| 前缀 | [01 否定与逆转前缀](01-否定与逆转前缀.md) | 12 个词族结构 |
| 前缀 | [02 方向/时间及其他前缀](02-时间方向和其他前缀.md) | 11 个词族结构 |
| 动词→名词 | [03 -ación 的第一组](03-动作名词化-A.md) | 14 个词族结构 |
| 动词→名词 | [04 -ación 的学校行政词](04-动作名词化-B.md) | 14 个词族结构 |
| 词干交替 | [05 -sión/-ción 不规则关系](05-词干交替和-sión-名词.md) | 14 个词族结构 |
| 过程名词 | [06 -miento/-imiento](06-动作过程-miento.md) | 10 个词族结构 |
| 性质名词 | [07 -dad/-idad](07-性质名词-dad.md) | 11 个词族结构 |
| 抽象名词 | [08 -encia/-anza](08-抽象名词-encia-anza.md) | 10 个词族结构 |
| 职业与工具 | [09 -dor/-ero/-ería/-ista](09-施事职业场所-dor-ero.md) | 14 个词族结构 |
| 词性转换 | [10 -mente/-izar/-ificar](10-副词与动词后缀.md) | 13 个词族结构 |
| 其他词缀 | [11 -al/-oso/-ito 等](11-形容词程度和小称.md) | 12 个词族结构 |
| 核心区别 | [12 现代派生与历史误判](12-构词法与易误判范例.md) | 防止假词根 |
| 场景词族 | [13 学校、医院、行政](13-学校医院与行政词族关系.md) | 情境构词链 |

每份 Markdown 中的 ```mermaid``` 源码可在 GitHub 直接编辑。可视化学习页也可生成和修改某个词的 Mermaid 图源码，再自行复制保存。当前静态网页**不会自动把用户修改推送到 GitHub**，此点需明确。

## 不同层次的“拆分”是什么？

| 层次 | 示例 | 本质 | 是否直接表示新词元？ |
|---|---|---|---|
| 前缀派生 | `des- + igualdad` | 构成词义不同的新词 | 往往是 |
| 后缀派生 | `segur- + -idad` | 词性/抽象意义变化 | 通常是 |
| 动词屈折 | `habl-ar, habl-o, habl-amos` | 同一个动词的不同语法形式 | 否 |
| 名词复数 | `libro-s` | 数的屈折 | 否 |
| 历史词源 | `lección` 与 `leer` | 共享历史词源线索但非现代透明拼接 | 不自动判断 |
| 复合词 | `micro-organismo` | 词基/构词成分组合 | 视词项而定 |
| 词块搭配 | `pedir cita` | 句法／词汇搭配，不是单个词的派生 | 否 |

## 分析状态说明

- `provisional_editorial_analysis`：有具体表面分段、词族线索及解释；**仍需逐项核对权威词典词源**。
- `infinitive_pattern_only`：只标出词干线索与 `-ar/-er/-ir` 不定式词尾；此为基本变位学习，非词根词源证明。
- `multiword_or_variant`：一整条是短语、搭配或写成斜线并列的词形，必须逐词分析；保留原记录。
- `not_analyzed`：不可靠的结构不予臆造；不代表该词没有任何历史或现代形态结构。

## 能帮助记忆的学习顺序

1. **A1–A2**：先学习词语在真实医院/学校场景中的意思，再学习透明前缀 `des-`、`in-/im-`，职业后缀 `-dor/-ero`、副词 `-mente`；理解动词不定式 `-ar/-er/-ir` 与派生不是一回事。
2. **A2–B1**：将 `evaluar → evaluación`、`reparar → reparación`、`seguir → seguimiento` 作为词族，用不同词性造句。
3. **B1–B2**：处理 `responsabilidad`、`accesibilidad`、`desinformación`、`inversión`、`admisión` 等词干交替或抽象词。每条必须学搭配、语体及构词边界。
4. **每次间隔复习**：先凭基础词回忆派生词 → 反向回忆基础词 → 放入一个实际场景回答。抽象规则只有在陌生词迁移应用时才真正有价值。

## 构词审校的后续工作

目标是逐步把 **440 条未审、193 条短语／变体和 118 条初步屈折标记**进一步完善，不能凭 suffix matching 批量标记为“已分析”。未来每个词宜扩展字段：lemma、词类、现代词基、构词步骤、词缀及异体、历史来源和参考、词义迁移、语料例句、可靠度、人工复核时间。**53 组词缀规则不是封闭穷尽的语言学清单**，只是现阶段建立的主要高频教学目录。

## 参考资料

- [RAE-ASALE: Nueva gramática · 常规动词变位](https://www.rae.es/gram%C3%A1tica/morfolog%C3%ADa/la-conjugaci%C3%B3n-regular-i-caracter%C3%ADsticas-generales)
- [RAE-ASALE: Nuevo material de los sufijos superlativos](https://www.rae.es/gram%C3%A1tica/morfolog%C3%ADa/sufijos-caracter%C3%ADsticos-de-los-adjetivos-calificativos-ii-los-sufijos-de-grado-extremo-%C3%ADsimo%C3%ADsima-%C3%A9rrimo%C3%A9rrima)
- [FundéuRAE：-mento/-miento](https://www.fundeu.es/consulta/mento-miento-sufijos-1570/)
- [INTEF：词汇形态学与语法屈折](https://descargas.intef.es/recursos_educativos/RED_ES/04_Bachillerato/1/B_1_064_2025_0923/morfologa_lxica.html)

> 这些参考是分析方法与代表性规则的资料，并不意味着本仓库 135 条逐词关系已经得到这些来源逐条认证。

[返回 mindmaps 根目录](../) · [返回 GitHub 首页](../../README.md)
