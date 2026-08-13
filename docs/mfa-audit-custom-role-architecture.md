# معماری Step-up MFA، لاگ ممیزی و نقش‌های سفارشی

**محصول:** Economic Pulse Dashboard  
**نسخهٔ سند:** طرح اجرایی Enterprise پس از PR #15

> **اصل امنیتی:** ورود موفق فقط ثابت می‌کند یک نشست معتبر وجود دارد. انجام عملیاتی مانند تغییر role، اتصال IdP، export گزارش، تغییر connector بازار یا تصویب سناریوی حساس باید نیازمند assurance تازه و متناسب با ریسک همان عملیات باشد.

## 1. Step-up MFA چیست و کجا باید اعمال شود

Step-up MFA یک جریان **re-authentication هدفمند** است: کاربر ممکن است با نشست عادی وارد باشد، اما پیش از عملیات پرریسک باید با عامل قوی‌تر یا تازه‌تر دوباره هویت خود را اثبات کند. NIST صراحتاً بیان می‌کند که وقتی نشست در یک سطح assurance احراز شده و سطح بالاتری لازم است، می‌توان با step-up سطح AAL نشست را افزایش داد؛ در AAL2 نیز دست‌کم دو عامل و ارائهٔ گزینهٔ مقاوم در برابر phishing لازم است.[1]

برای این محصول، گزینهٔ اول باید WebAuthn/passkey با `userVerification: required` باشد. WebAuthn از credentialهای public-key، scoped به relying party و با رضایت کاربر استفاده می‌کند؛ اعتبارسنجی server-side challenge و assertion، اثبات cryptographic حضور کاربر را فراهم می‌کند.[2] عامل TOTP یا approval در IdP می‌تواند fallback کنترل‌شده باشد، اما SMS نباید عامل ترجیحی برای عملیات حساس باشد.

| کلاس عملیات | نمونه‌ها | assurance حداقل پیشنهادی | شرط freshness پیشنهادی |
| --- | --- | --- | --- |
| عادی | مشاهدهٔ dashboard، watchlist شخصی | نشست فعال | — |
| متوسط | ساخت scenario، export گزارش معمولی | نشست عادی و permission مناسب | re-auth پس از idle حساس یا تغییر دستگاه |
| حساس | `scenario.approve`، export دادهٔ حساس، تغییر policy | MFA یا IdP `acr` مناسب | کمتر از ۱۵ دقیقه |
| بحرانی | ساخت/تغییر role، grant `identity.manage`، اتصال IdP، چرخش credential، break-glass | WebAuthn UV یا IdP MFA phishing-resistant | کمتر از ۵ دقیقه؛ هر عملیات یک challenge تازه |

این پنجره‌ها **سیاست محصول** هستند نه ادعای انطباق خودکار با استانداردی مشخص. باید براساس threat model، قرارداد مشتری و مقررات نهایی تنظیم شوند.

## 2. جریان فنی Step-up MFA

### 2.1. اجزای سمت سرور

| جزء | مسئولیت | دادهٔ پایدار |
| --- | --- | --- |
| `mfaPolicies` | تعریف `operationClass`، AAL/عامل لازم، TTL، نیاز به تایید دوم | policy version، risk class |
| `mfaChallenges` | challenge یک‌بارمصرف WebAuthn یا transaction IdP، binding به کاربر/سازمان/عملیات | hash challenge، `expiresAt`، `usedAt` |
| `authAssuranceEvents` | ثبت موفقیت یا شکست re-auth با اطلاعات حداقلی | `aal`, `amr`, `authTime`, `mfaMethod`, `sessionIdHash` |
| `stepUpGrants` | grant کوتاه‌عمر و محدود به operation class/resource scope | `subject`, `organizationId`, `operation`, `resourceId?`, `expiresAt`, `policyVersion` |
| `auditEvents` | evidence immutable برای شروع، موفقیت، شکست و استفاده از grant | actor، target، decision، traceId |

### 2.2. توالی عملیاتی

1. کاربر درخواست mutation حساس مانند `role.create` را می‌فرستد. middleware ابتدا authentication، organization membership و permission را ارزیابی می‌کند.
2. اگر permission وجود دارد ولی assurance تازه کافی نیست، API **عملیات را انجام نمی‌دهد** و پاسخ `MFA_REQUIRED` همراه `challengeId` و policy summary بازمی‌گرداند. این رخداد با decision=`deny` و reason=`step_up_required` audit می‌شود.
3. Desktop فقط صفحهٔ re-auth را نمایش می‌دهد. برای WebAuthn، challenge از server می‌آید، client assertion را با مرورگر سیستم یا پنجرهٔ امن authentication اجرا می‌کند و نتیجه را به server بازمی‌گرداند.
4. Server `challenge`، origin/RP ID، signature، counter، UV flag، expiry، binding کاربر/سازمان و یک‌بارمصرف‌بودن را بررسی می‌کند. برای step-up مبتنی بر IdP، backend `acr`/`amr`، `auth_time`، issuer، audience و nonce را validate می‌کند.
5. Server یک `stepUpGrant` کوتاه‌عمر، محدود به operation/resource و متصل به `policyVersion` صادر می‌کند. خود mutation با grant در همان transaction یا درخواست بعدی مصرف می‌شود؛ grant عمومی برای همهٔ APIها ایجاد نمی‌شود.
6. mutation سرانجام اعمال و سه evidence audit ثبت می‌شود: درخواست، نتیجهٔ assurance، و نتیجهٔ mutation. هر grant در اولین مصرف invalid می‌شود.

```ts
const manageIdentity = permissionProcedure("identity.manage")
  .use(requireOrganizationContext)
  .use(requireFreshAssurance({
    operation: "identity.connection.update",
    requiredAal: 2,
    maxAgeSeconds: 300,
    requireWebAuthnUv: true,
  }))
  .mutation(updateSsoConnection);
```

### 2.3. کنترل‌های حیاتی

| تهدید | کنترل |
| --- | --- |
| replay challenge یا assertion | challenge تصادفی، hash در server، TTL کوتاه، `usedAt` و binding به subject/operation؛ هر challenge فقط یک‌بار پذیرفته شود. |
| MFA fatigue | برای عملیات بحرانی push-prompt تنها کافی نیست؛ WebAuthn یا verification با transaction details لازم است. |
| نشست دزدیده‌شده | grant کوتاه‌عمر و operation-scoped، rotate session پس از step-up، device/session binding و logout/revoke سریع. |
| downgrade policy | policy version داخل grant باشد؛ تغییر policy، grantهای پیشین را نامعتبر کند. |
| bypass از client | `requireFreshAssurance` در middleware server قرار گیرد؛ renderer فقط تجربهٔ کاربری را کنترل می‌کند. |
| recovery ضعیف | recovery factor و تغییر authenticator خود یک عملیات بحرانی با delay، اعلان و audit مستقل باشد. |

## 3. معماری Audit Log تغییرناپذیر و قابل‌پیگیری

OWASP توصیه می‌کند رویدادهای authentication و authorization، تغییرات مدیریتی، export داده، خطاهای session و کارکردهای پرریسک ثبت شوند؛ هر رویداد باید «چه زمانی، کجا، چه کسی و چه چیزی» را برای تحلیل بعدی داشته باشد.[3] همان منبع تأکید می‌کند tokenها، session identifierها، passwordها، کلیدها و دادهٔ حساس نباید به‌صورت خام در لاگ ثبت شوند.[3]

### 3.1. قرارداد دادهٔ event

| ستون | محتوا |
| --- | --- |
| `eventId`, `occurredAt`, `ingestedAt` | شناسهٔ immutable و زمان رخداد/دریافت؛ ساعت سرور منبع زمان اصلی است. |
| `organizationId`, `actorUserId`, `actorType` | tenant و هویت انسانی/سرویس؛ برای actor حذف‌شده، FK باید set-null ولی snapshot شناسه حفظ شود. |
| `action`, `resourceType`, `resourceId` | مثال: `role.permission.updated` روی `role:123`. |
| `decision`, `reason`, `riskClass` | `allow/deny/system`، علت policy و حساسیت. |
| `traceId`, `requestId`, `sessionIdHash` | correlation بدون نگه‌داری session token خام. |
| `beforeHash`, `afterHash`, `changeSummary` | digest canonical برای اثبات تغییر و summary redacted برای UI. |
| `assuranceLevel`, `mfaMethod`, `authTime` | evidence مربوط به step-up بدون افشای credential. |
| `sourceIpPseudonym`, `deviceIdHash` | قابل‌استفاده برای forensic با retention و حریم خصوصی مشخص. |
| `prevEventHash`, `eventHash`, `signatureKeyId` | زنجیرهٔ hash و امضای دوره‌ای برای تشخیص tamper. |

### 3.2. الگوی append-only و tamper evidence

در database عملیاتی، account writer برای audit فقط باید `INSERT` داشته باشد؛ `UPDATE` و `DELETE` برای account سرویس و کاربران برنامه ممنوع می‌شود. Application پس از canonicalize شدن payload redacted، `eventHash = HMAC_or_hash(prevEventHash || canonicalEvent)` را محاسبه می‌کند و هر batch را با کلید KMS/HSM امضا می‌کند. hash anchorها به storage جداگانه یا سامانهٔ audit/SIEM ارسال می‌شوند. این الگو **tamper-evident** است، نه اینکه به‌تنهایی non-repudiation حقوقی تضمین‌شده ایجاد کند.

UI Audit Center باید به read model یا replica دسترسی داشته باشد؛ هیچ endpoint UI نباید امکان edit یا delete event بدهد. export لاگ، فیلترهای متنی، bulk download و مشاهدهٔ تغییرات حساس نیازمند permission مستقل `audit.read`/`audit.export` و در صورت scope حساس step-up MFA هستند.

## 4. مدل پایگاه‌داده برای نقش‌های سفارشی و مجوزهای پویا

واژه‌نامهٔ permission باید توسط محصول کنترل شود، اما مجموعهٔ permissionهای role می‌تواند در هر سازمان سفارشی شود. مشتری نباید permission جدیدی با معنای ناشناخته یا privilege سطح‌پلتفرم بسازد.

```text
organizations 1 ──< organization_members >── 1 users
organizations 1 ──< roles >──< role_permissions >── permissions
organization_members 1 ──< member_roles >── 1 roles
sso_connections 1 ──< group_role_mappings >── 1 roles
auth_assurance_events 1 ──< step_up_grants >── audit_events
```

| جدول | فیلدهای کلیدی و constraint | توضیح |
| --- | --- | --- |
| `permissions` | `key PK`, `resource`, `action`, `riskClass`, `isAssignable` | registry سراسری و immutable؛ permissionهای platform-only، assignable نیستند. |
| `roles` | `id`, `organizationId nullable`, `key`, `displayName`, `description`, `isSystem`, `status`, `version`, unique `(organizationId,key)` | role پایه system یا role سفارشی tenant؛ حذف به disable تبدیل می‌شود. |
| `rolePermissions` | `roleId`, `permissionKey`, `grantedBy`, unique `(roleId,permissionKey)` | نگاشت capabilityها؛ trigger/application check باید permission غیرassignable را رد کند. |
| `organizationMembers` | `organizationId`, `userId`, `status`, unique `(organizationId,userId)` | عضویت فعال پیش‌شرط هر permission است. |
| `memberRoles` | `memberId`, `roleId`, `source`, `grantedBy`, `expiresAt`, unique `(memberId,roleId)` | grant دستی، SCIM، JIT یا break-glass با زمان انقضا. |
| `groupRoleMappings` | `connectionId`, `externalGroupId`, `roleId`, `enabled`, unique `(connectionId,externalGroupId)` | نگاشت allowlisted گروه IdP به role؛ display name فقط متادیتا است. |
| `roleChangeRequests` | `requestedBy`, `approvedBy`, `status`, `diffHash`, `stepUpEventId` | dual-control برای role حساس؛ درخواست و approval دو actor متفاوت دارند. |
| `effectivePermissionCache` | `memberId`, `permissionKey`, `policyVersion`, `expiresAt` | cache اختیاری؛ invalidation با role/membership change اجباری است. |

محاسبهٔ permission مؤثر باید مجموعهٔ roleهای **فعال، متعلق به همان سازمان و منقضی‌نشده** را جمع کند، سپس permissionهای role را intersect با policy resource و entitlement دادهٔ بازار کند. cache بهینه‌سازی است و هرگز منبع حقیقت نیست. هر تغییر در role، mapping گروه، membership یا policy باید `policyVersion` را افزایش داده و cache و step-up grantهای مربوط را invalid کند.

## 5. سناریوی عملیات Role Builder

Role Builder در UI فقط اجازه می‌دهد یک OrgAdmin مجاز، از کاتالوگ permissionهای allowlisted یک نقش بسازد. پیش از save، server باید validation انجام دهد: role در همان tenant باشد؛ permissionها assignable باشند؛ ترکیب ممنوع separation-of-duties نداشته باشد؛ actor step-up MFA تازه داشته باشد؛ و در سازمان‌های regulated، درخواست به workflow dual approval برود. بعد از approval، role version جدید ایجاد و audit chain ثبت می‌شود. این فرایند باید یک diff قابل‌خواندن مانند «افزودن `scenario.approve` به `ScenarioApprover`» و reason را حفظ کند.

## 6. نقشهٔ اجرای پیشنهادی

| فاز | تحویل | آزمون پذیرش |
| --- | --- | --- |
| 1 | schema role/permission + audit contract + migration | isolation tenant، unique constraints و migration rollback در staging پاس شوند. |
| 2 | WebAuthn registration/assertion و `requireFreshAssurance` | challenge replay، origin نادرست، assertion منقضی و grant reuse رد شوند. |
| 3 | Audit writer append-only، hash chain و Audit Center | event حساس immutable باشد؛ payload فاقد token/secret باشد؛ traceId قابل‌جست‌وجو باشد. |
| 4 | Role Builder، policy validation و dual approval | customer نمی‌تواند permission platform-only بدهد و role حساس بدون MFA/approval فعال نمی‌شود. |
| 5 | SCIM group mapping و lifecycle revoke | `active=false` یا حذف گروه، session و WebSocket را در SLO تنظیم‌شده قطع کند. |

## منابع

[1]: https://pages.nist.gov/800-63-4/sp800-63b.html "NIST SP 800-63B: Digital Identity Guidelines — Authentication and Authenticator Management"
[2]: https://www.w3.org/TR/webauthn-3/ "W3C Web Authentication: Public Key Credentials Level 3"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html "OWASP Logging Cheat Sheet"
