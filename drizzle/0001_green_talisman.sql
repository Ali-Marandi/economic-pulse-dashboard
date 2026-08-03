CREATE TABLE `macroIndicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`indicator` varchar(50) NOT NULL,
	`value` varchar(50) NOT NULL,
	`date` varchar(20) NOT NULL,
	`source` varchar(50) NOT NULL,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `macroIndicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketDataCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`instrumentType` varchar(20) NOT NULL,
	`name` text,
	`price` varchar(50) NOT NULL,
	`change` varchar(50) NOT NULL,
	`changePercent` varchar(50) NOT NULL,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketDataCache_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketDataCache_symbol_unique` UNIQUE(`symbol`)
);
--> statement-breakpoint
CREATE TABLE `priceAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`instrumentType` varchar(20) NOT NULL,
	`alertType` varchar(20) NOT NULL,
	`targetPrice` varchar(50) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`triggeredAt` timestamp,
	CONSTRAINT `priceAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`instrumentType` varchar(20) NOT NULL,
	`name` text,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `priceAlerts` ADD CONSTRAINT `priceAlerts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchlist` ADD CONSTRAINT `watchlist_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;