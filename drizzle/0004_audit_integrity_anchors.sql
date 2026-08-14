CREATE TABLE `auditAnchors` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(36) NOT NULL,
	`firstSequence` int NOT NULL,
	`lastSequence` int NOT NULL,
	`eventCount` int NOT NULL,
	`initialEventHash` varchar(128) NOT NULL,
	`terminalEventHash` varchar(128) NOT NULL,
	`previousAnchorHash` varchar(128),
	`anchorVersion` int NOT NULL,
	`keyId` varchar(255) NOT NULL,
	`algorithm` varchar(64) NOT NULL,
	`payloadDigest` varchar(128) NOT NULL,
	`signature` text NOT NULL,
	`anchorHash` varchar(128) NOT NULL,
	`status` enum('verified','invalid','pending_publish') NOT NULL DEFAULT 'pending_publish',
	`anchoredAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditAnchors_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_anchors_org_last_sequence_unique` UNIQUE(`organizationId`,`lastSequence`),
	CONSTRAINT `audit_anchors_org_anchor_hash_unique` UNIQUE(`organizationId`,`anchorHash`)
);
--> statement-breakpoint
ALTER TABLE `auditAnchors` ADD CONSTRAINT `auditAnchors_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;
