# گزارش فنی PR #15: RBAC، OIDC/PKCE، SCIM Provisioning و نقش‌های سفارشی

**محصول:** Economic Pulse Dashboard  
**مبنای بررسی:** Pull Request [#15](https://github.com/Ali-Marandi/economic-pulse-dashboard/pull/15)  
**وضعیت:** پایهٔ اجرایی RBAC و مدل دادهٔ SSO/SCIM اضافه شده است؛ اتصال واقعی IdP، endpointهای SCIM و نقش‌های سفارشی هنوز باید در فازهای بعدی پیاده‌سازی شوند.

> **تفکیک کلیدی:** احراز هویت پاسخ می‌دهد «چه کسی وارد شده است؟»؛ مجوزدهی پاسخ می‌دهد «این هویت، در کدام سازمان، روی کدام منبع و با چه شرطی چه عملی می‌تواند انجام دهد؟». در محصول چندسازمانی، نقش نباید صرفاً فیلدی در جدول `users` باشد؛ تصمیم مجوز باید در سرور، در context سازمان و برای هر درخواست اجرا شود.

## 1. آنچه PR #15 واقعاً پیاده‌سازی می‌کند

PR #15 یک migration و چند کنترلِ قابل‌آزمون برای عبور از مدل سراسری `user/admin` به مدل Enterprise فراهم می‌کند. این PR هنوز SSO یا SCIM را عملیاتی نمی‌کند و نباید چنین برداشتی از وجود ستون‌های schema شود. این مرز برای امنیت و برنامه‌ریزی انتشار مهم است.

| حوزه | پیاده‌سازی فعلی در PR #15 | اثر امنیتی | محدودیت باقی‌مانده |
| --- | --- | --- | --- |
| واژه‌نامهٔ مجوز | آرایهٔ ثابت ۱۷ permission از جمله `alert.write`، `scenario.approve`، `identity.manage` و `organization.manage` در `server/_core/authorization.ts` | مجوزدهی بر اساس capability به‌جای شرط‌های پراکندهٔ `isAdmin` انجام می‌شود. | permissionها هنوز database-backed و tenant-scoped نیستند. |
| نقش‌های پایه | نقش‌های `OrgAdmin`, `RiskManager`, `Analyst`, `Viewer`, `Auditor`, `StreamOperator` و نگاشت permissionها | مدل هدف نقش‌ها مشخص و تست‌پذیر است. | نقش‌های جاری حساب‌های موجود هنوز با نگاشت انتقالی `user → Analyst` و `admin → all permissions` کار می‌کنند. |
| deny-by-default | `canCurrentUser(null, permission)` مقدار `false` می‌دهد و `permissionProcedure` ابتدا کاربر احرازشده و سپس permission را کنترل می‌کند. | هر mutation متصل به middleware در نبود هویت یا مجوز با `UNAUTHORIZED` یا `FORBIDDEN` متوقف می‌شود. | membership سازمان و policy سطح منبع هنوز وارد context tRPC نشده‌اند. |
| اعمال در API | ایجاد/حذف watchlist به `watchlist.write` و ایجاد/به‌روزرسانی/حذف alert به `alert.write` متصل شده‌اند. | UI تنها مرجع تصمیم نیست و سمت سرور مجوز را کنترل می‌کند. | خواندن watchlist/alert با بررسی مستقیم کاربر انجام می‌شود؛ endpointهای آینده باید همگی الگوی متمرکز را بگیرند. |
| کنترل مالکیت | `deleteAlert` و `updateAlert` شناسهٔ alert را همراه با `userId` مالک در query محدود می‌کنند. | حدس‌زدن شناسهٔ alert به تغییر یا حذف دادهٔ کاربر دیگر تبدیل نمی‌شود. | منابع سازمانی آینده باید به `organizationId` و policy سطح‌شیء نیز محدود شوند. |
| multi-tenancy | جدول‌های `organizations` و `organizationMembers` با نقش، status، تاریخ deprovision و unique key سازمان/کاربر | مرز داده و lifecycle عضویت به مدل داده افزوده شده است. | داده‌های خصوصی قدیمی هنوز `organizationId` ندارند و backfill و enforcement سراسری لازم است. |
| SSO و audit | جدول‌های `ssoConnections` و `auditEvents` وجود دارند؛ اتصال SSO شامل `issuer`، `clientId`، `jwksUri`، `secretRef` و flagهای `scimEnabled`/`enabled` است. | configuration قابل‌ردیابی است و secret فقط باید با reference به secret manager نگهداری شود. | discovery، exchange توکن، JWKS validation، audit writer و session revocation هنوز endpoint اجرایی ندارند. |

فایل `server/_core/trpc.ts` محل اجرای policy فعلی است. `protectedProcedure` وجود کاربر را بررسی می‌کند و `permissionProcedure(permission)` با استفاده از `canCurrentUser` تصمیم allow/deny می‌گیرد. در `server/routers.ts` نیز mutationهای حساس به این middleware متصل شده‌اند. بنابراین، تغییر نقش یا یک ترفند در renderer Electron به‌تنهایی نباید مجوز سمت سرور تولید کند؛ با این حال، تا پیش از افزودن context سازمانی، این کنترل صرفاً یک **foundation انتقالی** است، نه RBAC چندسازمانی کامل.

## 2. مدل هدف RBAC پس از PR #15

مدل پیشنهادی، RBAC را برای تخصیص سادهٔ مجموعه‌ای از مجوزها نگه می‌دارد و کنترل‌های رابطه‌ای/ویژگی‌محور را برای مرز سازمان، مالکیت منبع، سطح حساسیت، ناحیهٔ داده و الزام MFA به آن می‌افزاید. OWASP توصیه می‌کند تصمیم‌های مجوزدهی با least privilege، deny-by-default و اعتبارسنجی دسترسی در هر درخواست اعمال شوند؛ همچنین برای سیاست‌های پیچیده، RBAC به‌تنهایی کافی نیست.[1]

### 2.1. مدل دادهٔ تکمیلی پیشنهادی

| موجودیت | کلیدها و قیدهای ضروری | نقش در کنترل دسترسی |
| --- | --- | --- |
| `permissions` | `key` سراسری و immutable، `resource`، `action`، `riskClass` | واژه‌نامهٔ کنترل‌شده مانند `scenario.approve`؛ این جدول را مشتری نباید آزادانه بسازد. |
| `roles` | `id`, `organizationId nullable`, `key`, `displayName`, `isSystem`, `status`, `version` | roleهای system و custom؛ کلید role سفارشی در هر سازمان unique باشد. |
| `rolePermissions` | `roleId`, `permissionKey`، unique composite | نگاشت many-to-many role به permission. |
| `memberRoles` | `organizationMemberId`, `roleId`, `grantedBy`, `source`, `expiresAt` | تخصیص چند role و امکان grant موقت یا منشأ SCIM. |
| `groupRoleMappings` | `ssoConnectionId`, `externalGroupId`, `roleId`, `status` | نگاشت allowlisted از شناسهٔ immutable گروه IdP به role محلی. نام گروه تنها برای نمایش است. |
| `externalIdentities` | `issuer`, `subject`, `userId` با unique composite | اتصال پایدار کاربر خارجی بر اساس `iss + sub`، نه صرفاً email. |
| `scimTokens` | `connectionId`, `tokenHash`, `scopes`, `expiresAt`, `revokedAt`, `lastUsedAt` | ذخیرهٔ hash توکن provisioning؛ مقدار خام هرگز در database یا log ذخیره نشود. |
| `provisioningEvents` | `connectionId`, `externalId`, `operation`, `result`, `traceId`, `payloadHash` | idempotency، تشخیص ترتیب رویداد و audit بدون نگه‌داری PII خام غیرضروری. |

پس از schema، middleware خصوصی باید به شکل مفهومی زیر عمل کند: ابتدا نشست را validate کند؛ سپس سازمان انتخاب‌شده را از session یا مسیر درخواست resolve کند؛ عضویت فعال را بیابد؛ permissionهای roleها را جمع کند؛ منبع را با `organizationId` در query سمت سرور بیابد؛ constraintهای resource را اعمال کند؛ و در پایان تصمیم را همراه `traceId` در audit ثبت کند. کلاینت نباید `organizationId` یا role را به‌عنوان حقیقت قابل‌اعتماد ارسال کند.

```ts
const scenarioApprove = protectedProcedure
  .use(requireOrganizationContext)
  .use(requirePermission("scenario.approve"))
  .use(requireResourcePolicy(({ ctx, input }) => ({
    organizationId: ctx.organization.id,
    resourceType: "scenario",
    resourceId: input.scenarioId,
    requiresRecentMfa: true,
  })));
```

## 3. طراحی امن OIDC Authorization Code + PKCE برای Desktop

OpenID Connect لایهٔ هویت روی OAuth 2.0 است و ID Token را برای انتقال claimهای رویداد احراز هویت تعریف می‌کند.[2] در Electron، برنامه یک **public client** است؛ بنابراین `client_secret` تعبیه‌شده در EXE راز نیست. RFC 7636 برای public clientها PKCE را معرفی می‌کند تا سرقت authorization code به‌تنهایی برای مهاجم کافی نباشد.[3]

### 3.1. الگوی پیشنهادی: server-brokered authorization transaction

بهترین الگو برای این محصول، استفاده از مرورگر پیش‌فرض سیستم به‌همراه callback سمت سرور است. Electron تنها یک transaction کوتاه‌عمر را شروع می‌کند و URL ورود را با `shell.openExternal` می‌گشاید؛ renderer صفحهٔ ورود را در WebView نمایش نمی‌دهد. Backend برای هر transaction، `state`، `nonce`، `code_verifier` با entropy بالا و یک device-completion secret یک‌بارمصرف ایجاد می‌کند و آن‌ها را با TTL کوتاه در datastore سروری نگه می‌دارد. درخواست authorization شامل `code_challenge = BASE64URL(SHA-256(code_verifier))` است.

| مرحله | Desktop | Backend | IdP | کنترل اصلی |
| --- | --- | --- | --- | --- |
| 1. شروع | درخواست transaction و بازکردن browser سیستم | `state`, `nonce`, `code_verifier` و completion secret کوتاه‌عمر تولید/ذخیره می‌کند. | — | هیچ client secret یا refresh token در EXE نیست. |
| 2. authorization | URI بازگشتی را فقط برای completion دنبال می‌کند. | authorization URL را با issuer allowlisted و `S256` می‌سازد. | MFA و conditional access را اجرا می‌کند. | redirect URI و issuer allowlist شده‌اند. |
| 3. callback | کد را نمی‌بیند یا نگه نمی‌دارد. | callback HTTPS را دریافت و `state` را به‌صورت یک‌بارمصرف تطبیق می‌دهد. | authorization code می‌دهد. | دفاع در برابر CSRF و mix-up. |
| 4. exchange | از completion secret یک‌بارمصرف برای دریافت نتیجه استفاده می‌کند. | code را با verifier exchange می‌کند؛ پاسخ توکن را در server نگه می‌دارد. | ID/access token را می‌دهد. | PKCE، TLS، token عدم‌افشا. |
| 5. validation | فقط وضعیت ورود و session کم‌اختیار را دریافت می‌کند. | JWKS را بر اساس `kid` cache/rotate و امضای token را validate می‌کند؛ `iss`, `aud`, `azp` در صورت نیاز، `exp`, `iat`, `nonce` و subject را کنترل می‌کند. | — | جلوگیری از token substitution و replay. |
| 6. authorization | UI را مطابق permission دریافتی نمایش می‌دهد. | هویت خارجی را با `issuer + sub` نگاشت، membership فعال را resolve و policy را سروری اعمال می‌کند. | — | claim IdP به‌تنهایی مجوز منبع نیست. |

این طراحی از نگه‌داری token در renderer و `localStorage` اجتناب می‌کند. Electron باید `contextIsolation: true`، `nodeIntegration: false` و preload با API حداقلی و allowlisted داشته باشد. اگر session material ناچار به دستگاه منتقل شود، آن را در OS keychain با Electron `safeStorage` نگه دارید، access token را کوتاه‌عمر و refresh token را rotated/revocable کنید؛ با این حال BFF/session سمت سرور بر نگه‌داری refresh token در client ارجح است.

### 3.2. کنترل‌های غیرقابل‌چشم‌پوشی

| ریسک | کنترل لازم |
| --- | --- |
| authorization-code interception | Authorization Code + PKCE با `S256`، verifier یک‌بارمصرف و TTL کوتاه. |
| callback hijacking | HTTPS callback سروریِ ثبت‌شده یا loopback دقیق؛ تطبیق state و nonce؛ عدم پذیرش custom scheme مبهم. |
| IdP mix-up یا token substitution | issuer discovery فقط از allowlist، validate امضا با JWKS، کنترل `iss`, `aud`, `azp`, `exp`, `nonce` و cache امن کلیدها. |
| token leakage | عدم ثبت Authorization header، code، token یا verifier در log؛ redaction سراسری و secret reference در database. |
| stale authorization | resolve membership و permission از database در هر request؛ refresh/role claim توکن منبع حقیقت طولانی‌مدت نیست. |
| deprovision دیرهنگام | revoke تمام sessionها، refresh tokenها و WebSocketهای عضو غیرفعال؛ کنترل membership در subscription gateway. |
| privilege escalation از کلاینت | renderer فقط UX؛ تمام endpointها و gateway subscriptionها permission و tenant policy را سروری چک می‌کنند. |

## 4. SCIM Provisioning: دامنه، endpointها و سناریوهای اجرایی

SCIM یک پروتکل HTTP و JSON برای provision و مدیریت هویت در محیط‌های cross-domain است و عملیات create، retrieve، modify، delete و discovery برای User و Group را استاندارد می‌کند.[4] RFC 7643 مدل resource و schema برای User و Group را تعریف می‌کند و RFC 7644 مواردی مانند PATCH، filter، pagination، `ServiceProviderConfig`، TLS، token authorization و multi-tenancy را پوشش می‌دهد.[4] [5]

برای سازگاری گسترده، endpoint باید حداقل discovery و subset موردنیاز client هدف را پیش از فعال‌شدن advertisement کند. برای نمونه، Microsoft Entra در endpointهای SCIM از `/Users` و `/Groups`، PATCH، filter، pagination و deprovision با `active=false` استفاده می‌کند و توصیه می‌کند schema و mappingهای attribute به‌صراحت طراحی شوند.[6]

| اولویت | endpoint یا قابلیت | رفتار پیشنهادی در Economic Pulse |
| --- | --- | --- |
| ضروری | `GET /scim/v2/ServiceProviderConfig` | فقط قابلیت‌های واقعاً پشتیبانی‌شده مانند PATCH و filter را advertise کند؛ ویژگی‌های ناقص را false اعلام کند. |
| ضروری | `GET/POST /scim/v2/Users` | lookup با `userName` و `externalId`؛ ایجاد idempotent؛ email و `active` را validate کند. |
| ضروری | `GET /Users?filter=...` و pagination | filter allowlisted برای `userName eq`، `externalId eq` و email کاری؛ parser عمومی بدون allowlist نسازید. |
| ضروری | `PATCH /Users/{id}` | عملیات `add`, `replace`, `remove` با validation دقیق؛ update غیرمجاز نقش یا tenant رد شود. |
| ضروری | `active=false` | membership را `deprovisioned` کند، session/token را revoke و WebSocketها را close کند؛ hard delete پیش‌فرض نباشد. |
| مرحلهٔ دوم | `GET/POST/PATCH /Groups` | گروه IdP را فقط به role mapping allowlisted متصل کند؛ membership را با delta PATCH به‌روز کند. |
| مرحلهٔ دوم | `/Schemas`, `/ResourceTypes` | schema discovery و custom extensionهای امن را expose کند. |
| بعد از baseline | `/Bulk` | فقط با quota، پردازش صفی، limit، idempotency و گزارش partial failure؛ ادعای پشتیبانی زودهنگام نشود. |

### 4.1. مدل lifecycle و deprovisioning

Provisioning باید event-driven اما idempotent باشد. هر درخواست SCIM باید connection مربوط به یک organization را از token یا مسیر اختصاصی resolve کند؛ `externalId` و SCIM resource `id` باید به همان organization محدود باشند. درخواست تکراری با correlation/operation key نباید membership یا audit را دوبار بسازد. PATCHهای خارج از ترتیب با `meta.version` یا ordering policy باید قابل‌تشخیص باشند.

> **قاعدهٔ عملیاتی:** `active=false` فقط یک تغییر نمایشی نیست. این رخداد باید در یک transaction منطقی، `organizationMembers.status = deprovisioned`، `deprovisionedAt`، revoke session، revoke refresh token، close gateway subscription و audit event را انجام دهد. در صورت خطا، صف retry و هشدار باید خروجی قابل‌مشاهده تولید کند.

### 4.2. سناریوهای پیشنهادی rollout SCIM

| سناریو | رفتار | کنترل و معیار پذیرش |
| --- | --- | --- |
| JIT محدود پیش از SCIM | نخستین ورود OIDC کاربر domain-allowlisted را با membership `Viewer` یا `invited` می‌سازد. | هیچ JIT user حق `identity.manage` یا `organization.manage` نمی‌گیرد؛ همهٔ رویدادها audit می‌شوند. |
| SCIM User-first | `/Users` ایجاد/به‌روزرسانی/غیرفعال‌سازی را پیاده می‌کند؛ roleها دستی یا با mapping محدود هستند. | create، lookup، PATCH، `active=false`، restore و request تکراری در test matrix پاس شوند. |
| Group-to-role | `/Groups` و delta membership فعال می‌شود؛ هر `externalGroupId` به role از پیش‌تأییدشده نگاشت می‌شود. | نگاشت با شناسهٔ immutable گروه است، نه display name؛ گروه ناشناخته permission ایجاد نمی‌کند. |
| چند-IdP در یک سازمان | هر `ssoConnection` issuer مستقل و token/provisioning credential مستقل دارد. | unique `issuer + subject` و unique org/issuer؛ یکی از IdPها نمی‌تواند کاربر IdP دیگر را تغییر دهد. |
| انتقال کارمند بین سازمان‌ها | درخواست خارج‌کردن از tenant A و دعوت/تأیید در tenant B به‌صورت workflow جدا اجرا می‌شود. | هیچ PATCH واحدی نمی‌تواند user را بدون approval به tenant دیگر منتقل کند. |
| deprovision انبوه یا اشتباه | آستانهٔ safety valve برای تعداد deactivate در بازهٔ کوتاه؛ عملیات در صف و قابل‌لغو قبل از commit نهایی. | جهش غیرعادی، notification و نیاز به تأیید دومرحله‌ای؛ sessionهای صحیح بی‌دلیل قطع نمی‌شوند. |
| قطع موقت IdP | آخرین membership فعال برای بازهٔ محدود grace ادامه دارد؛ grant جدید متوقف می‌شود. | fail-open برای permissionهای حساس ممنوع است؛ audit و warning UX ثبت می‌شوند. |

## 5. نقش‌های سفارشی: طراحی و governance

نقش‌های سفارشی برای مشتری enterprise ضروری‌اند، اما اگر مشتری بتواند permission جدید یا role سطح‌پلتفرم بسازد، surface حمله و role explosion ایجاد می‌شود. راه‌حل این است که **permission vocabulary محصول controlled و immutable باشد** و مشتری فقط مجموعه‌ای از permissionهای allowlisted را برای نقش custom خود انتخاب کند.

### 5.1. policy پیشنهادی ساخت role

| تصمیم | پیشنهاد | دلیل |
| --- | --- | --- |
| سازنده | فقط `OrgAdmin` دارای permission مستقل `role.manage` | ایجاد role یک تغییر identity-admin محسوب می‌شود. |
| scope | role سفارشی فقط `organizationId` خود را دارد. | نقش tenant A در tenant B قابل‌استفاده نیست. |
| permissions | فقط از registry محصول؛ permission سیستمی، break-glass، platform-admin و secret management خارج از فهرست قابل‌اعطا هستند. | مشتری capability جدید یا privilege فراتر از tenant نمی‌سازد. |
| نام و کلید | `displayName` قابل‌نمایش و `key` immutable؛ key بعد از استفاده تغییر نکند. | audit و mapping IdP با تغییر نام نمی‌شکنند. |
| role mutation | version، actor، reason، diff before/after و audit event اجباری. | امکان review، rollback و forensic analysis. |
| مجوز حساس | افزودن `identity.manage`, `organization.manage`, `report.export` یا `scenario.approve` نیازمند step-up MFA و در سازمان‌های regulated، dual approval. | کاهش privilege escalation و خطای administrator. |
| حذف | role استفاده‌شده ابتدا disable، سپس reassignment/cascade برنامه‌ریزی‌شده؛ hard delete فقط پس از retention. | کاربر ناگهان بدون policy مبهم باقی نمی‌ماند. |

### 5.2. الگوهای نقش پیشنهادی برای مشتریان

| نوع سازمان | role سفارشی | مجوزهای نمونه | سناریوی کسب‌وکاری |
| --- | --- | --- | --- |
| خزانه‌داری | `TreasuryAnalyst` | `forecast.read`, `forecast.write`, `market.stream.read`, `report.export` | تحلیل نقدینگی و FX بدون تغییر IdP یا policy ریسک. |
| مدیریت ریسک | `ScenarioApprover` | `scenario.read`, `scenario.approve`, `audit.read` | تصویب سناریو بدون مجوز ویرایش connector یا عضویت. |
| عملیات داده | `MarketDataSteward` | `market.stream.read`, `market.connector.manage`, `audit.read` | پایش provider و entitlement بدون دسترسی به سناریوهای محرمانه. |
| انطباق | `ReadOnlyCompliance` | `audit.read`, `report.export`, `forecast.read` | بازبینی evidence بدون تغییر داده یا نقش. |
| پشتیبانی زمان‌دار | `SupportObserver` با `expiresAt` | `audit.read` و منابع از پیش mask‌شده | break-glass محدود، نیازمند ticket و audit. |

## 6. ترتیب پیشنهادی پیاده‌سازی

| موج | خروجی | شرط عبور |
| --- | --- | --- |
| 1. تکمیل foundation | backfill سازمان پیش‌فرض، `organizationId` برای تمام منابع خصوصی، context سازمانی، resource lookup tenant-scoped و migration تست‌شده | testهای cross-tenant و ownership برای هر mutation رد access نامجاز را ثابت کنند. |
| 2. OIDC/PKCE | transaction broker، external browser، callback سروری، JWKS validation، session revoke و audit login | replay state/nonce، issuer نادرست، audience نادرست و code reuse همگی رد شوند. |
| 3. custom roles | جداول role/permission mapping، console مدیریت، version/audit و policy review | مشتری نمی‌تواند permission سطح‌پلتفرم بدهد؛ diff role و rollback قابل‌مشاهده است. |
| 4. SCIM Users | token management، Users CRUD/filter/PATCH، soft deprovision، idempotency و Entra/Okta interoperability tests | `active=false` همهٔ sessionها و streamها را در SLA تعیین‌شده revoke می‌کند. |
| 5. SCIM Groups | Group PATCH، mapping allowlisted، reconcile job و deprovision safety valve | گروه ناشناخته یا nested group غیرپشتیبانی‌شده هیچ roleی ایجاد نمی‌کند. |
| 6. governance | access review دوره‌ای، SoD policy، break-glass، provisioning dashboard و alerting | هر grant، revoke و failure دارای actor، source، traceId و evidence است. |

## 7. چک‌لیست عملی قبل از انتشار به مشتری

1. PR #15 باید پیش از ادغام، تأیید مستقل و بررسی migration tenancy دریافت کند.
2. migration ابتدا در staging اعمال و backfill سازمان پیش‌فرض با snapshot و rollback plan آزمایش شود.
3. connection واقعی IdP با test tenant جدا راه‌اندازی شود؛ secret فقط در secret manager و با reference در `ssoConnections.secretRef` نگهداری شود.
4. endpointهای SCIM با SCIM validator و دست‌کم یک client هدف مانند Entra یا Okta در create، filter، PATCH، deactivate، restore و group delta آزمون شوند.
5. SLO برای زمان deprovision، session revocation و قطع WebSocket تعریف و alert شود.
6. custom roleها قبل از استفادهٔ عمومی با allowlist permission، MFA برای تغییرات حساس، audit diff و access review دوره‌ای منتشر شوند.

## منابع

[1]: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html "OWASP Authorization Cheat Sheet"
[2]: https://openid.net/specs/openid-connect-core-1_0.html "OpenID Connect Core 1.0"
[3]: https://datatracker.ietf.org/doc/html/rfc7636 "RFC 7636: Proof Key for Code Exchange by OAuth Public Clients"
[4]: https://datatracker.ietf.org/doc/html/rfc7644 "RFC 7644: System for Cross-domain Identity Management Protocol"
[5]: https://datatracker.ietf.org/doc/html/rfc7643 "RFC 7643: System for Cross-domain Identity Management Core Schema"
[6]: https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups "Microsoft Entra: Plan provisioning for a SCIM endpoint"
