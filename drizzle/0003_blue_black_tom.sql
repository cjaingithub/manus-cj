CREATE TABLE `taskTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL,
	`icon` varchar(64),
	`taskTemplate` text NOT NULL,
	`parameters` text,
	`exampleOutput` text,
	`usageCount` int NOT NULL DEFAULT 0,
	`rating` int NOT NULL DEFAULT 0,
	`tags` text,
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taskTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templateUsageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`executionTime` int,
	`success` boolean NOT NULL,
	`feedback` text,
	`rating` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `templateUsageLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `taskTemplates` ADD CONSTRAINT `taskTemplates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templateUsageLogs` ADD CONSTRAINT `templateUsageLogs_templateId_taskTemplates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `taskTemplates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templateUsageLogs` ADD CONSTRAINT `templateUsageLogs_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `templateUsageLogs` ADD CONSTRAINT `templateUsageLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;