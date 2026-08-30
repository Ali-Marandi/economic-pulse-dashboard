# راهنمای پیاده‌سازی RBAC، SSO و عملیات جریان بازار

**وضعیت:** طراحی پیشنهادی برای مرحلهٔ Enterprise  
**محصول:** Economic Pulse Dashboard  
**هدف:** تبدیل مدل کنونیِ `user/admin` به کنترل دسترسی چندسازمانی، ایجاد ورود سازمانی استاندارد، و قابل‌اندازه‌گیری‌کردن قابلیت‌اطمینان جریان دادهٔ بلادرنگ.

> **اصل طراحی:** احراز هویت مشخص می‌کند «کاربر کیست»؛ مجوزدهی مشخص می‌کند «کاربر روی کدام منبع، در کدام سازمان، چه عملی می‌تواند انجام دهد». تصمیم مجوزدهی باید در سرور و برای هر درخواست اعمال شود، نه در رابط کاربر.

## 1. نقطهٔ شروع و تصمیم معماری

پلتفرم امروز یک ورود مبتنی بر OpenID، کاربر پایدارشده در پایگاه‌داده، و دو نقش سراسری `user` و `admin` دارد. همچنین، middleware فعلی tRPC یک کاربر احرازشده و حالت administrator را تشخیص می‌دهد، اما هنوز مفهوم سازمان، عضویت، دامنهٔ منبع، نقش چندگانه، یا سیاست سطح‌شیء را اعمال نمی‌کند. بنابراین، گسترش مستقیم فیلد `users.role` به نقش‌های زیاد، هم ریسک **role explosion** ایجاد می‌کند و هم مرزهای چندسازمانی را به‌درستی حل نمی‌کند.

OpenID Connect یک لایهٔ هویتی بر OAuth 2.0 است که برای اتکا به یک ارائه‌دهندهٔ هویت، احراز هویت کاربر و دریافت claimهای پایه را استاندارد می‌کند. برای برنامهٔ دسکتاپ که یک **public client** است، جریان Authorization Code به‌همراه PKCE با روش `S256` باید مبنای ورود باشد؛ RFC 7636 صریحاً توضیح می‌دهد که secret تعبیه‌شده در binary محرمانه تلقی نمی‌شود و PKCE ریسک رهگیری authorization code را کاهش می‌دهد.[1] [2]

| لایه | تصمیم پیشنهادی | دلیل کنترلی |
| --- | --- | --- |
| هویت | OIDC Authorization Code + PKCE (`S256`) با مرورگر سیستم | برنامهٔ دسکتاپ راز کلاینت نگه نمی‌دارد و ورود سازمانی به IdP مشتری واگذار می‌شود. |
| نشست | نشست کوتاه‌عمرِ سروری یا access token کوتاه‌عمر، با refresh-token rotation در محل امن سیستم‌عامل | کاهش اثر نشت توکن و امکان اعمال سریع revoke/deprovision. |
| مجوزدهی | **RBAC برای نقش‌های پایه** به‌همراه محدودیت‌های ABAC/ReBAC برای سازمان، مالکیت، حساسیت منبع و وضعیت تأیید | نقش‌ها قابل‌فهم می‌مانند؛ تصمیم‌های سطح‌شیء و چندسازمانی دقیق‌تر می‌شوند. |
| منبع حقیقت | پایگاه‌دادهٔ سرور برای عضویت، نقش و policy؛ claimهای IdP صرفاً ورودی provisioning هستند | نقشِ موجود در توکن به‌تنهایی برای مجوز طولانی‌مدت کافی نیست. |
| ممیزی | Audit event تغییرناپذیر برای login، denial، تغییر نقش، اتصال IdP، اجرای سناریو و export | شواهد بازبینی و پاسخ‌گویی عملیاتی. |

OWASP توصیه می‌کند دسترسی با **کمترین سطح اختیار**، **deny by default** و کنترل مجوز روی هر درخواست اعمال شود. همان راهنما تصریح می‌کند که RBAC برای نقش‌های پایه مفید است، اما برای کنترل‌های پیچیدهٔ چندسازمانی و سطح منبع باید با attribute یا relationship-based policy تکمیل شود.[3]

## 2. مدل دسترسی هدف

### 2.1 نقش‌های پایه و مرزهای سازمانی

هر دادهٔ خصوصی باید مالک یک `organizationId` باشد. نقش‌ها باید به «عضویت کاربر در سازمان» متصل شوند، نه به حساب کاربر در کل سامانه. نقش `PlatformOwner` فقط برای عملیات پلتفرم نگه‌داری می‌شود و نباید مجوز ضمنی برای خواندن دادهٔ مشتریان داشته باشد؛ دسترسی پشتیبانی به tenant باید در صورت نیاز، زمان‌دار، ثبت‌شده و تأییدپذیر باشد.

| نقش | کارکرد اصلی | نمونهٔ مجوزها | محدودیت‌های مهم |
| --- | --- | --- | --- |
| `OrgAdmin` | مدیریت سازمان، IdP، اعضا و نقش‌ها | `org.manage`, `identity.manage`, `member.manage` | تغییر نقش‌های حساس یا اتصال IdP باید رویداد ممیزی و ترجیحاً تأیید دومرحله‌ای ایجاد کند. |
| `RiskManager` | تصویب سناریو، policy و briefهای ریسک | `scenario.approve`, `policy.manage`, `report.export` | فقط در سازمان خود؛ policy حساس با ثبت دلیل. |
| `Analyst` | ساخت و ویرایش تحلیل و سناریو | `forecast.create`, `scenario.write`, `stream.read` | نمی‌تواند policy، نقش یا تنظیم IdP را تغییر دهد. |
| `Viewer` | مشاهدهٔ داشبورد و گزارش‌های مجاز | `dashboard.read`, `forecast.read`, `stream.read` | عدم export یا تغییر منبع مگر با مجوز صریح. |
| `Auditor` | مشاهدهٔ شواهد، lineage و log | `audit.read`, `provenance.read`, `report.read` | دسترسی read-only؛ دادهٔ بازار دارای مجوز با entitlement جدا. |
| `StreamOperator` | پایش gateway و providerهای داده | `stream.observe`, `connector.manage` | مجوز مدیریت provider معادل مجوز مشاهدهٔ سناریوها نیست. |

### 2.2 جداول دادهٔ پیشنهادی

طرح داده باید عملیات مجوزدهی را قابل‌پرس‌وجو، قابل‌آزمون و قابل‌ممیزی کند. مجموعهٔ حداقلی زیر برای Drizzle/MySQL پیشنهاد می‌شود.

| جدول | فیلدهای کلیدی | وظیفه |
| --- | --- | --- |
| `organizations` | `id`, `name`, `status`, `dataResidency` | مرز tenant و چرخهٔ حیات سازمان. |
| `organizationMembers` | `organizationId`, `userId`, `status`, `joinedAt`, `deprovisionedAt` | عضویت، دعوت و قطع‌دسترسی. |
| `roles` | `id`, `organizationId?`, `key`, `displayName`, `isSystem` | نقش‌های استاندارد و نقش‌های سفارشی سازمان. |
| `permissions` | `key`, `resource`, `action`, `riskClass` | واژه‌نامهٔ مجوز؛ مانند `scenario.approve`. |
| `memberRoles` و `rolePermissions` | foreign keys و timestamps | نگاشت many-to-many، بدون تکرار نقش در توکن. |
| `identityProviders` | `organizationId`, `issuer`, `clientId`, `jwksUri`, `scimConfigRef`, `enabled` | تنظیم OIDC/SAML و ارجاع امن به secretها. |
| `externalIdentities` | `issuer`, `subject`, `userId`, `email`, `claimsVersion` | اتصال پایدار هویت خارجی بر اساس ترکیب `iss + sub`. |
| `auditEvents` | `organizationId`, `actorId`, `action`, `resourceType`, `resourceId`, `decision`, `reason`, `traceId`, `createdAt` | مدرک immutable برای تصمیم‌های حساس. |
| `streamEntitlements` | `organizationId`, `provider`, `dataset`, `symbols`, `expiresAt` | اعمال حق‌استفادهٔ دادهٔ دارای لایسنس در gateway. |

### 2.3 middleware و policy engine

`protectedProcedure` فعلی باید به `requireAuthentication` تبدیل شود و middlewareهای ترکیبی زیر به تمام mutationها و readهای خصوصی اضافه شوند. UI فقط برای تجربهٔ کاربر عناصر غیرمجاز را پنهان می‌کند؛ **مرجع نهایی تصمیم، middleware سرور است**.

```ts
const scenarioApprove = protectedProcedure
  .use(requireOrganizationContext)
  .use(requirePermission("scenario.approve"))
  .use(requireResourcePolicy(({ ctx, input }) => ({
    organizationId: ctx.organization.id,
    resourceType: "scenario",
    resourceId: input.scenarioId,
    requiresMfa: true,
  })));
```

این middleware باید به‌ترتیب، اعتبار نشست را بررسی کند، membership فعال را بیابد، permissionهای نقش را resolve کند، مالکیت `organizationId` منبع را کنترل کند، constraintهای attribute مانند «سناریوی محرمانه»، «MFA تازه» یا «فقط ناحیهٔ دادهٔ اروپا» را اعمال کند، و در پایان allow/deny را با `traceId` ثبت کند. هر شناسهٔ منبع باید از server-side lookup به tenant محدود شود تا حدس‌زدن ID به horizontal privilege escalation تبدیل نشود.[3]

## 3. طراحی SSO برای Desktop و Web

### 3.1 جریان ورود

برنامهٔ Electron باید مرورگر پیش‌فرض سیستم را با `shell.openExternal` باز کند، نه یک webview قابل‌جای‌گذاری برای صفحهٔ ورود. برنامه یک `state`، `nonce` و `code_verifier` تصادفی ایجاد می‌کند، redirect loopback یا redirect HTTPS claim‌شده را فقط برای callback محدود می‌کند، سپس authorization code را با `code_verifier` به backend می‌فرستد. backend از discovery document تنظیمات issuer را می‌خواند، امضای ID token را با JWKS provider اعتبارسنجی می‌کند و claimهای `iss`, `sub`, `aud`, `exp`, `nonce` و `state` را قبل از ایجاد نشست بررسی می‌کند. OpenID Connect، ID token را برای انتقال claimهای رویداد احراز هویت تعریف می‌کند؛ اعتبارسنجی issuer و audience یک کنترل بنیادی است.[1]

RFC 7636 برای public clientها استفاده از verifier با entropy بالا و `S256` را تشریح می‌کند. این نکته برای EXE حیاتی است: `client_secret` در فایل اجرایی، محیط renderer، preload یا URL وجود ندارد.[2]

| گام | Desktop / Browser | Backend | IdP سازمانی |
| --- | --- | --- | --- |
| 1. شروع | ساخت `state`, `nonce`, `code_verifier` و بازکردن browser سیستم | ثبت transaction کوتاه‌عمر | — |
| 2. ورود | هدایت کاربر به authorization endpoint با `code_challenge=S256` | — | MFA، conditional access و احراز هویت سازمانی |
| 3. callback | دریافت authorization code در URI محدود | تطبیق state و exchange امن code | صدور ID/access token |
| 4. اعتبارسنجی | فقط پیام موفق/ناموفق را می‌بیند | validate issuer/JWKS/audience/nonce/expiry؛ نگاشت `iss+sub` | — |
| 5. provisioning | دریافت session کم‌اختیار | JIT membership یا SCIM reconciliation؛ resolve policy | group/claim mapping در صورت قرارداد |

### 3.2 Provisioning و lifecycle

برای ورود اولیه، **JIT provisioning** می‌تواند پس از اعتبارسنجی ایمیل و domain allowlist، یک کاربر و عضویت `Pending` یا `Viewer` بسازد. برای سازمان‌های بزرگ‌تر، SCIM 2.0 باید منبع اصلی ایجاد، به‌روزرسانی و غیرفعال‌سازی کاربر باشد. هر deprovision باید sessionها را revoke کند، tokenهای refresh را نامعتبر سازد، websocketهای مربوط را قطع کند و در کمتر از زمان تعریف‌شده در SLA اعمال شود. گروه‌های IdP باید تنها به نقش‌های allowlisted نگاشت شوند؛ نگاشت «هر گروه به هر role» ریسک privilege escalation می‌سازد.

### 3.3 hardening نشست و Electron

| کنترل | پیاده‌سازی لازم |
| --- | --- |
| نگه‌داری token | OS keychain با Electron `safeStorage` یا session server-side؛ هرگز `localStorage`، query string یا log renderer. |
| نشست | access token کوتاه‌عمر، refresh rotation، device/session ID و revoke server-side. |
| redirect | allowlist دقیق redirect URI، state و nonce یک‌بارمصرف، TTL کوتاه و TLS اجباری. |
| renderer | `contextIsolation: true`, `nodeIntegration: false`, preload حداقلی و allowlist کانال‌های IPC. |
| authorization | تکرار permission check در هر tRPC endpoint و gateway subscription؛ هیچ trust به role ارسالی از کلاینت. |
| ممیزی | login موفق/ناموفق، تغییر role، تغییر IdP، JIT/SCIM provision، denial، export و استفاده از break-glass. |

## 4. متریک‌های عملکرد و قابلیت‌اطمینان Live Market Stream

### 4.1 وضعیت فعلی

پیاده‌سازی حاضر، وضعیت اتصال، آخرین زمان پیام و قیمت هر نماد را نشان می‌دهد و پس از بسته‌شدن اتصال با تأخیر ثابت شش‌ثانیه‌ای تلاش اتصال مجدد می‌کند. این مشاهده‌پذیری برای نمایش اولیه مفید است، اما برای عملیات سازمانی کافی نیست: latency، stale age، نرخ موفقیت اتصال، subscription readiness، خطای parsing، recovery time و کیفیت ترتیب/کامل‌بودن پیام‌ها هنوز اندازه‌گیری نمی‌شوند.

Coinbase، market-data را از trading API جدا می‌کند و WebSocket feed را برای market data معرفی می‌کند؛ این جداسازی، استفاده از فید عمومی و read-only را برای UI فعلی مناسب می‌سازد، اما به‌معنای مجوز استفاده از دادهٔ لایسنس‌شده یا entitlement سازمانی نیست.[4]

### 4.2 فرهنگ‌نامهٔ متریک‌ها

| حوزه | نام متریک | تعریف و فرمول | چرا مهم است |
| --- | --- | --- | --- |
| Availability | `stream_connection_success_rate` | اتصال‌های بازشدهٔ موفق ÷ همهٔ تلاش‌ها، در window مشخص | تشخیص failure در شبکه، TLS، DNS یا provider. |
| Availability | `stream_connected_ratio` | مجموع زمان state=`live` ÷ کل زمان مشاهده | SLI اصلی availability؛ باید per provider و per region باشد. |
| Recovery | `stream_recovery_seconds` | زمان از `close/error` تا اولین quote معتبر پس از subscribe | impact واقعی outage، نه فقط تعداد reconnect. |
| Handshake | `stream_connect_ms` | `onopen - connection_start` | تفکیک کندی اتصال از کندی feed. |
| Readiness | `stream_time_to_first_quote_ms` | اولین quote معتبر − `onopen` | تضمین می‌کند socket باز اما بدون subscription، به اشتباه «live» تلقی نشود. |
| Freshness | `quote_staleness_ms` | `now - latest_valid_quote_received_at` | مبنای نشان «Live / Stale / Offline» برای هر symbol. |
| Latency | `provider_to_gateway_lag_ms` | timestamp provider تا زمان دریافت gateway، با clock همگام | SLI واقعی upstream؛ فقط وقتی timestamp provider معتبر است. |
| Latency | `gateway_to_desktop_lag_ms` | timestamp relay gateway تا دریافت desktop | کیفیت distribution داخلی و network path. |
| Throughput | `quote_messages_per_second` | تعداد پیام معتبر در بازهٔ لغزان | یافتن burst، افت feed یا capacity issue. |
| Quality | `invalid_message_rate` | پیام parse/validate نشده ÷ پیام‌های دریافت‌شده | drift schema، پیام خراب یا parser fault. |
| Quality | `out_of_order_rate` | پیام با provider timestamp کمتر از آخرین پیام همان symbol ÷ پیام معتبر | جلوگیری از نمایش قیمت قدیمی به عنوان مقدار جدید. |
| Quality | `duplicate_rate` | quote تکراری یا sequence تکراری ÷ پیام معتبر | سنجش هزینهٔ retransmission و deduplication. |
| Subscription | `subscription_ack_rate` | subscription تأییدشده ÷ درخواست subscription | تشخیص entitlement، symbol allowlist و خطای provider. |
| Security | `entitlement_denial_count` | رد subscription به علت role، dataset یا symbol | کنترل data license و نشانهٔ misconfiguration. |
| Client health | `active_streams`, `memory_mb`, `render_drop_rate` | تعداد stream فعال، حافظه و drop در صف UI | جلوگیری از فشار renderer در desktop. |
| Provenance | `quote_lineage_coverage` | quoteهای دارای provider/channel/source timestamp/received timestamp ÷ کل quoteها | قابل‌ممیزی‌بودن داده برای تحلیل و گزارش. |

### 4.3 SLOهای پیشنهادی و آستانه‌های هشدار

مقادیر زیر **اهداف اولیهٔ پیشنهادی** هستند، نه ادعای عملکرد فعلی. باید پس از جمع‌آوری baseline در محیط آزمایشی، براساس asset class، provider SLA، منطقه و ساعات بازار بازبینی شوند. برای بازاری که ذاتاً ممکن است دقیقه‌ها معامله نداشته باشد، stale age نباید فقط با نبود tick سنجیده شود؛ heartbeat یا timestamp gateway مبنای مکمل لازم است.

| SLI | هدف اولیهٔ پیشنهادی | هشدار عملیاتی | عمل اصلاحی |
| --- | --- | --- | --- |
| `stream_connected_ratio` | حداقل 99.5% ماهانه برای gateway مدیریت‌شده | burn-rate سریع یا افت زیر 99% در 30 دقیقه | failover provider/region، بررسی DNS/TLS و capacity. |
| `stream_recovery_seconds` | p95 کمتر از 30 ثانیه | p95 بیش از 60 ثانیه در 15 دقیقه | backoff را بازبینی، reconnect storm را محدود و root cause ثبت کنید. |
| `stream_time_to_first_quote_ms` | p95 کمتر از 5 ثانیه | بیش از 15 ثانیه پس از open | وضعیت `connecting` بماند؛ subscription/entitlement بررسی شود. |
| `quote_staleness_ms` | بر مبنای symbol و heartbeat قرارداد شود | عبور از آستانهٔ per-symbol | UI باید `Stale` نشان دهد، نه `Live`. |
| `invalid_message_rate` | کمتر از 0.1% | بیش از 1% در پنج دقیقه | schema drift/provider change؛ payload نمونه به quarantine ارسال شود. |
| `out_of_order_rate` | کمتر از 0.01% پس از dedupe | جهش ناگهانی یا عبور از baseline | ترتیب provider و queue gateway بررسی شود. |
| `subscription_ack_rate` | 100% برای datasetهای مجاز | هر failure جدید | symbol allowlist، entitlement و quota provider بررسی شود. |

### 4.4 مسیر instrumentation

Desktop تنها باید telemetry حداقلی و فاقد PII تولید کند: زمان شروع اتصال، open، subscription، first quote، message-valid/invalid، close code، retry number و staleness per symbol. این eventها به‌صورت batch و با `traceId` به endpoint مجاز backend ارسال می‌شوند؛ در failure، queue محدود محلی باید بدون نگه‌داری quote خام یا token پاک شود. Gateway باید metricهای Prometheus/OpenTelemetry را مستقیماً ثبت کند، timestamp provider و gateway را برای محاسبهٔ lag نگه دارد، و هر subscription را به `organizationId` و entitlement bind کند.

برای جلوگیری از false precision، desktop نباید latency «سرتاسری» را تنها از اختلاف ساعت سیستم کاربر و provider اعلام کند. اگر clock synchronization تضمین نیست، UI باید آن را **client receipt age** بنامد؛ SLI provider-to-gateway در server همگام‌شده محاسبه می‌شود.

## 5. فازبندی اجرا و معیار پذیرش

| فاز | خروجی | معیار پذیرش |
| --- | --- | --- |
| A. پایهٔ policy | جدول‌های organization/membership/role/permission، middleware centralized و policy test matrix | تمام endpointهای خصوصی `organizationId` و permission check دارند؛ cross-tenant tests رد می‌شوند. |
| B. SSO | OIDC multi-tenant، PKCE، issuer/JWKS validation، session revoke و audit log | هیچ secret در EXE نیست؛ replay state/nonce رد می‌شود؛ logout/revoke stream را قطع می‌کند. |
| C. provisioning | JIT کنترل‌شده، SCIM 2.0، group mapping allowlist و deprovision | کاربر حذف‌شده نمی‌تواند session یا websocket جدید بسازد. |
| D. stream observability | telemetry، dashboard SLI، stale-state، backoff jitter، alert rules | هر reconnect و quote lifecycle traceable است؛ stale value هرگز live برچسب نمی‌خورد. |
| E. governance | approval workflow، break-glass، audit export و access review دوره‌ای | هر تغییر role/IdP/export دارای actor، زمان، دلیل و correlation ID است. |

## 6. تصمیم‌های اجرایی پیشنهادی

در نسخهٔ بعد، ابتدا `Organization → Membership → Permission` را پیاده‌سازی کنید و همهٔ procedureهای خصوصی را به middleware متمرکز منتقل کنید. هم‌زمان، telemetry محلیِ Live Market Stream را اضافه کنید تا پیش از استقرار gateway سازمانی، baseline واقعی از handshake، first-quote، staleness، reconnect و parse error به‌دست آید. پس از آن، OIDC چندسازمانی با PKCE و JIT محدود فعال شود؛ SCIM و اتصال IdPهای اختصاصی فقط پس از تعریف قرارداد onboarding، data residency و mapping نقش هر سازمان انجام شود.

> **جمع‌بندی:** RBAC باید یک «فیلد نقش در کاربر» باقی نماند؛ باید به policy سرویس‌محور با tenant isolation و audit تبدیل شود. به همین ترتیب، نشان سبز اتصال websocket نباید معیار قابلیت‌اطمینان تلقی شود؛ SLIهای readiness، freshness، recovery، quality و entitlement باید در gateway و desktop باهم دیده شوند.

## منابع

[1]: https://openid.net/specs/openid-connect-core-1_0.html "OpenID Connect Core 1.0"
[2]: https://datatracker.ietf.org/doc/html/rfc7636 "RFC 7636: Proof Key for Code Exchange by OAuth Public Clients"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html "OWASP Authorization Cheat Sheet"
[4]: https://docs.cdp.coinbase.com/exchange/docs/websocket-overview "Coinbase Exchange API: WebSocket and Market Data Overview"

## 7. وضعیت پیاده‌سازی این تغییر

این تغییر، پایهٔ اجرایی مرحلهٔ نخست را به کد اضافه می‌کند: واژه‌نامهٔ permissionها و middleware مرکزیِ `permissionProcedure` برای transition از کنترل ad-hoc؛ schema و migration لازم برای `organizations`, `organizationMembers`, `ssoConnections`, `auditEvents` و windowهای telemetry؛ و محدودسازی update/delete هشدارهای قیمت به مالک احرازشدهٔ همان alert. این migration باید ابتدا در محیط آزمایشی و همراه با برنامهٔ backfill یک سازمان پیش‌فرض برای داده‌های موجود اعمال شود.

در Live Market Stream، telemetry محلی اکنون تلاش اتصال، اتصال موفق، subscription acknowledgement، readiness تا اولین quote، freshness، reconnect recovery، پیام نامعتبر و رویدادهای duplicate/out-of-order را محاسبه و نمایش می‌دهد. backoff اتصال مجدد به شکل exponential همراه با jitter است و quote قدیمی به‌صورت `Stale` نمایش داده می‌شود. این telemetry عمداً فاقد PII و token است.

**مرز صادقانهٔ این مرحله:** هنوز هیچ IdP سازمانی، secret provider یا tenant production در این workspace پیکربندی نشده است. اتصال OIDC واقعی، SCIM، lookup عضویت سازمانی و نگه‌داری audit در محیط production باید پس از تأیید تنظیمات مشتری و اعمال migration به backend متصل شوند؛ هیچ‌کدام با تغییر UI یا claim ارسالی از کلاینت جایگزین نمی‌شود.

## 8. شواهد اعتبارسنجی تغییر

در اعتبارسنجی محلی این تغییر، `npm run check`، `npm test` و `npm run build` با موفقیت اجرا شدند. مجموعهٔ آزمون‌ها شامل ۹ آزمون عبوری است: مسیر logout موجود، چهار آزمون پایهٔ authorization و چهار آزمون deterministic برای telemetry جریان بازار. شاخهٔ محافظت‌شدهٔ `feat/enterprise-access-stream-observability` از `main` ایجاد شده و تغییرات در آن برای CI و بازبینی مستقل ارسال می‌شوند.

در زمان آماده‌سازی Pull Request، چهار commit مستقل در شاخهٔ `feat/enterprise-access-stream-observability` ثبت شد: پنل قابل‌مشاهدهٔ stream، موتور و آزمون telemetry، middleware permission با آزمون RBAC، و enforcement مالکیت alert. تفکیک commitها بازبینی امنیتی و rollback هدفمند را ساده می‌کند.

در ادامهٔ آماده‌سازی PR، commit پنجم schema و migration تولیدشدهٔ MySQL را ثبت کرد. migration شامل foreign keyهای tenant، عضویت، اتصال SSO، audit event و windowهای telemetry است و باید پیش از اعمال در تولید، در محیط آزمایشی به‌همراه backfill سازمان پیش‌فرض مرور شود.

commit ششم snapshot و journal مربوط به migration را همگام کرد. شاخه اکنون شامل شش commit مستقل و قابل‌مرور است؛ مرحلهٔ باقی‌مانده ثبت مستندات، پیکربندی آزمون، ایجاد Pull Request و بررسی CI است.
