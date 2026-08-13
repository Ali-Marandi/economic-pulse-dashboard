# Access Review، Just-in-Time Access و Audit Integrity

## هدف

این بستهٔ governance، کنترل‌های نقش‌های سفارشی و Step-up MFA را به چرخهٔ عملیاتی تبدیل می‌کند: دسترسی ممتاز به‌صورت standing grant داده نمی‌شود، assignmentها به‌طور دوره‌ای certify می‌شوند و زنجیرهٔ Audit Log پیش از نمایش یا export قابل‌راستی‌آزمایی است.

## قابلیت‌های تحویل‌شده

| قابلیت | پیاده‌سازی | تصمیم policy |
| --- | --- | --- |
| JIT privileged access | `evaluatePrivilegedAccess` | فقط `market.connector.manage`، `member.manage`، `identity.manage` و `organization.manage`؛ حداکثر ۳۰ دقیقه؛ AAL3 WebAuthn تازه و user-verified؛ approval مستقل. |
| Access certification inspection | `inspectAccessReviewAssignments` | کشف assignment منقضی، certification بیش از ۹۰ روز و ترکیب‌های toxic permission. |
| Audit integrity verification | `verifyAuditEnvelope` | بازحساب `beforeHash`، `afterHash` و `eventHash` از payload redacted و canonical. |
| Operations UI | `GovernanceOperationsPanel` | preview شفاف برای reviewer packet و elevation request؛ بدون اعطای access در client. |

## مدل عملیاتی JIT

1. کاربر برای permission ممتاز دلیل و مدت درخواست می‌دهد؛ مدت بیش از ۳۰ دقیقه رد می‌شود.
2. backend evidence WebAuthn با AAL3، user verification، subject/tenant صحیح و age حداکثر پنج دقیقه را بررسی می‌کند.
3. policy تنها یک تصمیم `approval_required` برمی‌گرداند؛ هیچ grant عمومی یا client-side صادر نمی‌شود.
4. workflow approval باید actor مستقل داشته باشد، سپس backend یک grant تک‌permission، operation/resource-scoped و کوتاه‌عمر در `stepUpGrants` بنویسد.
5. صدور، approval، مصرف، expiry و revoke همگی رویداد append-only audit تولید می‌کنند.

## مدل Access Review

یک campaign بر مبنای membership و role assignment فعال آغاز می‌شود. برای هر assignment، inspector سه دسته finding ایجاد می‌کند: `assignment_expired`، `certification_overdue` و `toxic_permission_pair`. در نسخهٔ فعلی زوج‌های toxic شامل مدیریت connector همراه با export گزارش، و مدیریت عضو همراه با مدیریت سازمان هستند. این rules باید در policy registry versioned نگهداری شوند، نه به‌عنوان منطق UI.

## محدودیت‌های عمدی نسخهٔ اول

کامپوننت UI یک preview است و دادهٔ static آن صراحتاً اطلاعات واقعی سازمان نیست. صدور grant، approval workflow، ذخیرهٔ campaign، queue اعلان، revocation و webhook هنوز باید به backend و database متصل شوند. `verifyAuditEnvelope` نیز integrity هر event را راستی‌آزمایی می‌کند؛ verifier batch در سرویس audit باید پیوند `previousEventHash` هر event را با event پیشین persisted بررسی کند و hash anchorهای دوره‌ای امضاشده را از KMS/HSM دریافت کند.

## آزمون‌های پذیرش افزوده

- evidence WebAuthn تازه و AAL3 برای JIT به `approval_required` می‌رسد؛ چون approval مستقل هنوز لازم است.
- assurance شش‌دقیقه‌ای و duration بیش از ۳۰ دقیقه رد می‌شوند.
- assignment منقضی، بدون certification و دارای `market.connector.manage + report.export` هر سه finding مورد انتظار را تولید می‌کند.
- تغییر action در audit envelope باعث `event_hash_mismatch` می‌شود.

## مراحل بعدی production

1. migration برای `accessReviewCampaigns`، `accessReviewItems`، `jitAccessRequests` و `jitAccessApprovals` با unique constraintهای tenant-scoped.
2. tRPC middleware برای require-fresh-assurance، independent-approver و consume-once grant.
3. worker اعلان برای deadline certification و auto-revoke در expiry.
4. batch verifier امضاشده و export به SIEM با alert در صورت chain break.
5. اتصال SCIM lifecycle به revoke campaign item، cache و WebSocket entitlement.
