CREATE TABLE `taskRetryHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`attemptNumber` int NOT NULL,
	`success` boolean NOT NULL,
	`error` text,
	`delayMs` int,
	`metadata` text,
	`attemptedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskRetryHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `taskRetryHistory` ADD CONSTRAINT `taskRetryHistory_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;