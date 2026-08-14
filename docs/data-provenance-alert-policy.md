# Data Provenance & Alert Policy Foundation

## هدف

این قابلیت، دادهٔ macro را قبل از ورود به workflow تصمیم به یک observation قابل‌ردیابی تبدیل می‌کند. هدف آن ارائهٔ دادهٔ بیشتر نیست؛ هدف پاسخ‌دادن به چهار سؤال سازمانی است: داده از کجا آمده است؟ کِی مشاهده و ingest شده است؟ آیا revision شده است؟ و در صورت عبور از policy چه کسی مالک بررسی است؟

## قرارداد Observation

هر `ProvenancedObservation` باید `organizationId`، `seriesKey`، مقدار عددی، unit، frequency، provider، source reference، زمان مشاهده، زمان ingest و `revisionState` داشته باشد. policy، observation بدون source reference، unit یا ترتیب زمانی معتبر را رد می‌کند. FRED از REST/HTTPS و JSON/XML پشتیبانی می‌کند؛ World Bank Indicators API دسترسی برنامه‌نویسی به indicatorهای خود را فراهم می‌کند؛ و ECB Data Portal از SDMX REST و metadata-driven discovery پشتیبانی می‌کند.[1] [2] [3]

## قرارداد Alert Policy

هر policy به یک سازمان، سری و owner متصل است. policyهای `above` و `below` به threshold عددی محدود نیاز دارند و policy `stale` به expiration بین ۱ دقیقه تا ۳۱ روز نیاز دارد. evaluator تنها تصمیم قطعی و evidence مربوط به observation را بازمی‌گرداند؛ notification، credential، provider dispatch و grant دسترسی خارج از این pure policy هستند.

## کنترل‌های استقرار

| کنترل | نیازمندی |
|---|---|
| Provider connector | server-owned، allowlisted و بدون credential در desktop renderer |
| Licensing | هر provider قبل از ingestion تجاری به review جداگانهٔ terms/licensing نیاز دارد |
| Persistence | جدول‌های tenant-scoped observation، policy و event در migration `0005` ثبت شده‌اند |
| Evidence | event باید policy، source reference، timestamps، revision و hash evidence را نگه‌دارد |
| Notification | فقط server-side و پس از کانال/recipient policy؛ در این مرحله پیاده‌سازی نشده است |
| AI/Forecast | هر prompt/model input باید به observationهای provenance‌دار ارجاع دهد؛ data stale/revised باید gate قابل‌مشاهده بسازد |

## مرز فعلی

پنل UI یک preview سازمانی است و نمونه‌های آن برای نمایش workflow محلی هستند. persistence و policy server-side آماده‌اند، اما connector زنده، scheduler، delivery notification، onboarding و approval workflow نیازمند اتصال به identity/session، database runtime و کانال‌های سازمانی در یک PR بعدی هستند.

## منابع

[1]: https://fred.stlouisfed.org/docs/api/fred/overview.html "FRED API overview"
[2]: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation "World Bank Indicators API documentation"
[3]: https://data.ecb.europa.eu/help/api/overview "ECB Data Portal API overview"
