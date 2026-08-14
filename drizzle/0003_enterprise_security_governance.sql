ALTER TABLE `auditEvents` ADD `assuranceLevel` int;--> statement-breakpoint
ALTER TABLE `auditEvents` ADD `mfaMethod` varchar(32);--> statement-breakpoint
ALTER TABLE `auditEvents` ADD `sessionIdHash` varchar(128);--> statement-breakpoint
ALTER TABLE `auditEvents` ADD `beforeHash` varchar(128);--> statement-breakpoint
ALTER TABLE `auditEvents` ADD `afterHash` varchar(128);--> statement-breakpoint
ALTER TABLE `auditEvents` ADD `previousEventHash` varchar(128);--> statement-breakpoint
ALTER TABLE `auditEvents` ADD `eventHash` varchar(128);--> statement-breakpoint
CREATE TABLE `permissions` (
	`key` varchar(96) NOT NULL,
	`resource` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`riskClass` enum('standard','sensitive','critical') NOT NULL DEFAULT 'standard',
	`isAssignable` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`organizationId` varchar(36),
	`key` varchar(96) NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`description` text,
	`isSystem` int NOT NULL DEFAULT 0,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_org_key_unique` UNIQUE(`organizationId`,`key`)
);
--> statement-breakpoint
CREATE TABLE `rolePermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleId` varchar(36) NOT NULL,
	`permissionKey` varchar(96) NOT NULL,
	`grantedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rolePermissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permissions_unique` UNIQUE(`roleId`,`permissionKey`)
);
--> statement-breakpoint
CREATE TABLE `memberRoles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationMemberId` int NOT NULL,
	`roleId` varchar(36) NOT NULL,
	`source` enum('manual','scim','jit','break_glass') NOT NULL DEFAULT 'manual',
	`grantedByUserId` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberRoles_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_roles_unique` UNIQUE(`organizationMemberId`,`roleId`)
);
--> statement-breakpoint
CREATE TABLE `groupRoleMappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ssoConnectionId` int NOT NULL,
	`externalGroupId` varchar(255) NOT NULL,
	`roleId` varchar(36) NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groupRoleMappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_role_mappings_unique` UNIQUE(`ssoConnectionId`,`externalGroupId`)
);
--> statement-breakpoint
CREATE TABLE `mfaChallenges` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`operation` varchar(128) NOT NULL,
	`challengeHash` varchar(128) NOT NULL,
	`requiredAssurance` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mfaChallenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stepUpGrants` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`operation` varchar(128) NOT NULL,
	`resourceId` varchar(128),
	`assuranceLevel` int NOT NULL,
	`method` enum('webauthn','idp_mfa','totp') NOT NULL,
	`sessionIdHash` varchar(128) NOT NULL,
	`policyVersion` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stepUpGrants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roleChangeRequests` (
	`id` varchar(36) NOT NULL,
	`organizationId` varchar(36) NOT NULL,
	`roleId` varchar(36),
	`requestedByUserId` int NOT NULL,
	`approvedByUserId` int,
	`status` enum('pending','approved','rejected','applied','expired') NOT NULL DEFAULT 'pending',
	`diffHash` varchar(128) NOT NULL,
	`stepUpChallengeId` varchar(64),
	`reason` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roleChangeRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rolePermissions` ADD CONSTRAINT `rolePermissions_roleId_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rolePermissions` ADD CONSTRAINT `rolePermissions_permissionKey_permissions_key_fk` FOREIGN KEY (`permissionKey`) REFERENCES `permissions`(`key`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rolePermissions` ADD CONSTRAINT `rolePermissions_grantedByUserId_users_id_fk` FOREIGN KEY (`grantedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberRoles` ADD CONSTRAINT `memberRoles_organizationMemberId_organizationMembers_id_fk` FOREIGN KEY (`organizationMemberId`) REFERENCES `organizationMembers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberRoles` ADD CONSTRAINT `memberRoles_roleId_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberRoles` ADD CONSTRAINT `memberRoles_grantedByUserId_users_id_fk` FOREIGN KEY (`grantedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `groupRoleMappings` ADD CONSTRAINT `groupRoleMappings_ssoConnectionId_ssoConnections_id_fk` FOREIGN KEY (`ssoConnectionId`) REFERENCES `ssoConnections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `groupRoleMappings` ADD CONSTRAINT `groupRoleMappings_roleId_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mfaChallenges` ADD CONSTRAINT `mfaChallenges_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mfaChallenges` ADD CONSTRAINT `mfaChallenges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stepUpGrants` ADD CONSTRAINT `stepUpGrants_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stepUpGrants` ADD CONSTRAINT `stepUpGrants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roleChangeRequests` ADD CONSTRAINT `roleChangeRequests_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roleChangeRequests` ADD CONSTRAINT `roleChangeRequests_roleId_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roleChangeRequests` ADD CONSTRAINT `roleChangeRequests_requestedByUserId_users_id_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roleChangeRequests` ADD CONSTRAINT `roleChangeRequests_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roleChangeRequests` ADD CONSTRAINT `roleChangeRequests_stepUpChallengeId_mfaChallenges_id_fk` FOREIGN KEY (`stepUpChallengeId`) REFERENCES `mfaChallenges`(`id`) ON DELETE set null ON UPDATE no action;
