CREATE TABLE `webhookDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`eventData` text NOT NULL,
	`status` enum('pending','success','failed','retrying') NOT NULL DEFAULT 'pending',
	`httpStatus` int,
	`responseBody` text,
	`error` text,
	`attemptCount` int NOT NULL DEFAULT 0,
	`nextRetryAt` timestamp,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `webhookDeliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`url` varchar(2048) NOT NULL,
	`secret` text,
	`events` text NOT NULL,
	`filters` text,
	`retryPolicy` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastDeliveryAt` timestamp,
	`successCount` int NOT NULL DEFAULT 0,
	`failureCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `webhookDeliveries` ADD CONSTRAINT `webhookDeliveries_webhookId_webhooks_id_fk` FOREIGN KEY (`webhookId`) REFERENCES `webhooks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhooks` ADD CONSTRAINT `webhooks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;