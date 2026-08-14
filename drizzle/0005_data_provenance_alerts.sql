CREATE TABLE `dataObservations` (
  `id` varchar(64) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `seriesKey` varchar(160) NOT NULL,
  `numericValue` varchar(64) NOT NULL,
  `unit` varchar(64) NOT NULL,
  `frequency` enum('daily','weekly','monthly','quarterly','annual') NOT NULL,
  `sourceProvider` enum('FRED','WorldBank','ECB','approved_provider') NOT NULL,
  `sourceReference` varchar(512) NOT NULL,
  `observedAt` timestamp NOT NULL,
  `ingestedAt` timestamp NOT NULL,
  `revisionState` enum('initial','revised','final') NOT NULL DEFAULT 'initial',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `data_observations_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `data_observations_org_series_observed_unique` UNIQUE (`organizationId`,`seriesKey`,`observedAt`)
);

CREATE TABLE `alertPolicies` (
  `id` varchar(64) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `seriesKey` varchar(160) NOT NULL,
  `condition` enum('above','below','stale') NOT NULL,
  `threshold` varchar(64),
  `staleAfterMinutes` int,
  `ownerUserId` int NOT NULL,
  `severity` enum('info','attention','critical') NOT NULL DEFAULT 'attention',
  `enabled` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `alert_policies_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `alert_policies_owner_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);

CREATE TABLE `alertEvents` (
  `id` varchar(64) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `alertPolicyId` varchar(64) NOT NULL,
  `observationId` varchar(64),
  `state` enum('triggered','acknowledged','resolved','suppressed') NOT NULL DEFAULT 'triggered',
  `evidenceHash` varchar(128) NOT NULL,
  `acknowledgedByUserId` int,
  `acknowledgedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `alert_events_org_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `alert_events_policy_fk` FOREIGN KEY (`alertPolicyId`) REFERENCES `alertPolicies`(`id`) ON DELETE CASCADE,
  CONSTRAINT `alert_events_observation_fk` FOREIGN KEY (`observationId`) REFERENCES `dataObservations`(`id`) ON DELETE SET NULL,
  CONSTRAINT `alert_events_ack_user_fk` FOREIGN KEY (`acknowledgedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
