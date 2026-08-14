# استراتژی محصول و اجرای Global-First — Economic Pulse

## Executive Summary

Economic Pulse نباید یک «ترمینال مالی کوچک‌تر» یا یک dashboard عمومی دیگر باشد. گزارهٔ ارزش قابل‌دفاع آن، تبدیل دادهٔ رسمی و پراکندهٔ macro به یک **workflow تصمیم‌گیری قابل‌ردیابی** برای تیم‌های treasury، risk و corporate strategy است. اولویت اجرایی کنونی باید اثبات این workflow باشد: مشاهدهٔ provenance و freshness، تعریف alert، مشخص‌کردن owner و acknowledgement، و نگه‌داشتن evidence از واکنش.

## مشتری و ارزش پیشنهادی

| مورد | انتخاب راهبردی |
|---|---|
| Beachhead customer | treasury، enterprise risk و corporate strategy در شرکت‌های چندکشوری EMEA/GCC که دادهٔ macro بر FX، نرخ، هزینهٔ سرمایه یا برنامه‌ریزی بازار آن‌ها اثر دارد |
| Job to be done | «وقتی indicator مهم تغییر می‌کند یا stale می‌شود، تیم من باید بداند داده از کجا آمده، چقدر قابل‌اعتماد است، چه کسی مسئول بررسی است و چه تصمیمی گرفته شد.» |
| Promise | تصمیم macro سریع‌تر، قابل‌توضیح‌تر و audit-ready بدون قرار دادن provider credential در desktop client |
| ۳۰ ثانیهٔ اول | کاربر یک indicator مهم با منبع، freshness، revision state و یک alert فعال/مالک مشخص می‌بیند |
| ۵ دقیقهٔ اول | کاربر یک آستانه یا freshness policy می‌سازد، اثر آن را preview می‌کند و evidence آن را در decision log می‌بیند |

## مدل کسب‌وکار پیشنهادی

مدل مناسب، **B2B SaaS hybrid** است: subscription مبتنی بر workspace/organization، seatهای کنترل‌شده برای نقش‌های فعال، و usage/connector add-on برای داده‌های licensed یا exportهای سنگین. نباید پیش از آزمون willingness-to-pay عدد قیمت قطعی اعلام شود.

| لایه | هدف مشتری | ارزش پولی | فرض لازم برای اعتبارسنجی |
|---|---|---|---|
| Pilot | یک تیم مشخص با ۱–۳ use case | اثبات workflow و زمان تا ارزش | حداقل سه گفت‌وگوی customer-discovery و یک pilot design partner |
| Team | treasury/risk کوچک تا متوسط | provenance، alert policy، decision log و workspace مشترک | اندازه‌گیری alert acknowledgement و weekly active teams |
| Business | سازمان چندتیمی | approval، export، SSO/RBAC، audit retention و connectors | اثبات نیاز compliance و بودجهٔ department |
| Enterprise | سازمان regulated یا چندکشوری | data gateway، custom policy، SCIM، residency و SLA | قرارداد provider/license و security review |

## KPI و North Star

**North Star Metric:** تعداد «تصمیم‌های macro دارای evidence» در هفته به ازای هر workspace فعال.

| مرحلهٔ قیف | KPI پیشنهادی | تفسیر |
|---|---|---|
| Activation | زمان از signup تا نخستین indicator با provenance | آیا کاربر سریع ارزش را می‌بیند؟ |
| Engagement | policyهای alert فعال به ازای workspace | آیا محصول در روند روزانه جا افتاده است؟ |
| Trust | درصد alertهای دارای acknowledgement و evidence | آیا workflow واقعاً کنترل‌شده است؟ |
| Retention | workspaceهای فعال هفتگی در هفتهٔ ۴ | آیا نیاز تکرارشونده است؟ |
| Revenue validation | تبدیل pilot به قرارداد Team/Business | آیا مشتری حاضر به پرداخت است؟ |

## اولویت Now / Next / Later

| طبقه | قابلیت | چرا اکنون/بعداً |
|---|---|---|
| **Now** | Data Provenance & Alert Policy Foundation | پیش‌نیاز trust، AI explainability، retention و فروش سازمانی؛ با APIهای رسمی قابل شروع است. |
| **Now** | Prototype customer discovery و fake-door برای alert ownership/export evidence | کم‌هزینه‌ترین روش برای سنجش نیاز و willingness-to-pay پیش از توسعهٔ بزرگ. |
| Next | Durable watchlists، notification routing، saved workspaces و scheduled reports | پس از اثبات activation و alert engagement. |
| Next | Managed provider gateway و licensed data connectors | تنها بعد از validation demand و بررسی license/provider economics. |
| Later | Model registry، exposure mapper و partner API/marketplace | نیازمند data foundation، مشتری فعال و governance بالغ. |
| Do not do | trading execution، توصیهٔ سرمایه‌گذاری شخصی، دادهٔ licensed بدون agreement، cloning کامل terminalهای سازمانی | ریسک regulatory/license بالا و تمرکز محصول پایین. |

## تصمیم اجرایی

گام P0 انتخاب‌شده، **Data Provenance & Alert Policy Foundation** است. این قابلیت باید ابتدا به شکل pure policy و UI امن ساخته شود: observationهای نمونه باید metadata کامل داشته باشند؛ alertها باید threshold یا freshness condition، owner، severity، acknowledgement و audit payload داشته باشند؛ و هیچ notification بیرونی یا credential provider در client اجرا نشود. اتصال durable storage و connectorهای واقعی در مرحلهٔ بعدی و پس از validation انجام می‌شود.

## ریسک‌ها و کنترل‌ها

| ریسک | احتمال / اثر | کنترل |
|---|---|---|
| مشتری صرفاً داده می‌خواهد نه workflow | متوسط / بالا | interview و fake-door پیش از توسعهٔ connectorهای پرهزینه |
| کیفیت یا مجوز داده ضعیف | متوسط / بالا | provenance سطح observation، allowlist source و licensing review |
| سطح قابلیت‌ها بیش از نیاز beachhead رشد کند | بالا / متوسط | Now/Next/Later و معیارهای KPI برای عبور مرحله |
| ادعای AI یا forecast فراتر از شواهد | متوسط / بالا | model card، confidence، freshness gate و human approval |
| مقاومت تیم‌ها در تغییر spreadsheet | بالا / متوسط | export evidence، onboarding ساده و integration تدریجی |
