CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` varchar(36) NOT NULL,
	`actorUserId` int,
	`action` varchar(128) NOT NULL,
	`resourceType` varchar(96) NOT NULL,
	`resourceId` varchar(128),
	`decision` enum('allow','deny','system') NOT NULL,
	`reason` varchar(255),
	`traceId` varchar(128) NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizationMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('OrgAdmin','RiskManager','Analyst','Viewer','Auditor','StreamOperator') NOT NULL DEFAULT 'Viewer',
	`status` enum('active','invited','suspended','deprovisioned') NOT NULL DEFAULT 'invited',
	`idpSubject` varchar(255),
	`joinedAt` timestamp,
	`deprovisionedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizationMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_members_org_user_unique` UNIQUE(`organizationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` enum('active','suspended','archived') NOT NULL DEFAULT 'active',
	`dataResidency` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ssoConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` varchar(36) NOT NULL,
	`protocol` enum('oidc','saml') NOT NULL DEFAULT 'oidc',
	`issuer` varchar(512) NOT NULL,
	`clientId` varchar(255) NOT NULL,
	`jwksUri` varchar(512),
	`secretRef` varchar(255),
	`scimEnabled` int NOT NULL DEFAULT 0,
	`enabled` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ssoConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `sso_connections_org_issuer_unique` UNIQUE(`organizationId`,`issuer`)
);
--> statement-breakpoint
CREATE TABLE `streamTelemetryWindows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` varchar(36) NOT NULL,
	`provider` varchar(96) NOT NULL,
	`channel` varchar(96) NOT NULL,
	`windowStartedAt` timestamp NOT NULL,
	`windowEndedAt` timestamp NOT NULL,
	`connectionAttempts` int NOT NULL DEFAULT 0,
	`successfulConnections` int NOT NULL DEFAULT 0,
	`disconnects` int NOT NULL DEFAULT 0,
	`invalidMessages` int NOT NULL DEFAULT 0,
	`duplicateMessages` int NOT NULL DEFAULT 0,
	`outOfOrderMessages` int NOT NULL DEFAULT 0,
	`p95RecoveryMs` int,
	`p95StalenessMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `streamTelemetryWindows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `auditEvents` ADD CONSTRAINT `auditEvents_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditEvents` ADD CONSTRAINT `auditEvents_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizationMembers` ADD CONSTRAINT `organizationMembers_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizationMembers` ADD CONSTRAINT `organizationMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ssoConnections` ADD CONSTRAINT `ssoConnections_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `streamTelemetryWindows` ADD CONSTRAINT `streamTelemetryWindows_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;