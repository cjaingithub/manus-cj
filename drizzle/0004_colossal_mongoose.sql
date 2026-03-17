CREATE TABLE `tokenUsageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int,
	`userId` int NOT NULL,
	`model` varchar(128) NOT NULL,
	`promptTokens` int NOT NULL,
	`completionTokens` int NOT NULL,
	`totalTokens` int NOT NULL,
	`estimatedCost` decimal(10,8) NOT NULL,
	`finishReason` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tokenUsageLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tokenUsageLogs` ADD CONSTRAINT `tokenUsageLogs_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tokenUsageLogs` ADD CONSTRAINT `tokenUsageLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;