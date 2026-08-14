# Batch Audit Verification، KMS/HSM Anchor و Audit Integrity Health

## هدف

این بسته، integrity سطح یک رویداد را به integrity سطح زنجیره و عملیات ارتقا می‌دهد. `verifyAuditEnvelope` همچنان مسئول راستی‌آزمایی payload یک event است؛ verifier دسته‌ای ترتیب eventها و پیوند predecessor را کنترل می‌کند، anchor امضاشده یک checkpoint خارجی برای history می‌سازد و health evaluator وضعیت عملیاتی را برای SOC و compliance نمایش می‌دهد.

## مرزهای طراحی

| جزء | مسئولیت | خارج از مرز |
| --- | --- | --- |
| `verifyAuditBatch` | کنترل یکپارچگی envelopeها، organization، sequence صعودی و `previousEventHash` | خواندن database و retry worker |
| `createAuditAnchor` | ساخت payload canonical، digest و امضای asynchronous از provider مورد اعتماد | مدیریت credential یا private key در برنامه |
| `verifyAuditAnchor` | کنترل hash anchor و درخواست verify از signer | دریافت public key مستقیم در renderer |
| `evaluateAuditIntegrityHealth` | طبقه‌بندی healthy/degraded/broken براساس batch، age anchor و backlog | اعطای مجوز یا تغییر eventها |

## قرارداد KMS/HSM

برنامه فقط با یک `AuditAnchorSigner` تعامل دارد. signer باید دو عملیات asynchronous `signDigest` و `verifyDigest` با الگوریتم و شناسهٔ کلید مشخص ارائه کند. پیاده‌سازی cloud/provider در adapter سروری و با identity کوتاه‌عمر اجرا می‌شود؛ browser، renderer Electron و ترافیک client هرگز به private key یا credential KMS دسترسی ندارند.

پیام امضاشونده digest SHA-256 payloadی شامل version، organization، window sequence، شمار eventها، initial/terminal event hash، predecessor anchor، زمان تولید، `keyId` و `algorithm` است. چون tenant و window در خود پیام امضا شده‌اند، جابه‌جایی یک signature معتبر میان tenant یا window دیگر معتبر نخواهد بود.

## الگوریتم Batch

1. batch باید غیرخالی و از نظر sequence strictly increasing باشد.
2. هر event با verifier سطح envelope بررسی می‌شود.
3. event اول با `expectedPreviousEventHash` و هر event بعدی با `eventHash` رویداد قبلی مقایسه می‌شود.
4. هر failure با sequence و expected/actual ثبت می‌گردد؛ batch برای مشاهدهٔ همهٔ findingها تا انتها scan می‌شود.
5. تنها batch کاملاً معتبر قابل anchor است.

## Audit Integrity Health

| وضعیت | شرط |
| --- | --- |
| `healthy` | batch معتبر است، anchor وجود دارد، age از آستانه عبور نکرده و backlog صفر است. |
| `degraded` | batch معتبر است، اما anchor قدیمی/غایب یا backlog بیش از policy است. |
| `broken` | حداقل یک integrity failure یا anchor نامعتبر وجود دارد. |

## ملاحظات production

Storage event و anchor باید append-only باشد. sequence باید در سطح سازمان قطعی و immutable باشد. ثبت anchor و cursor باید transactional باشد؛ انتشار SIEM/WORM باید idempotent و قابل retry باشد. key rotation با نگهداری `keyId` و `algorithm` برای هر anchor، و verify با version کلید متناظر انجام می‌شود. شکست verification یا تأخیر anchor باید alert تولید کند.
