CREATE TABLE `debugLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` int,
	`level` enum('trace','debug','info','warn','error','fatal') NOT NULL DEFAULT 'info',
	`category` varchar(64) NOT NULL,
	`message` text NOT NULL,
	`context` text,
	`stackTrace` text,
	`duration` int,
	`metadata` text,
	`source` varchar(255),
	`lineNumber` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `debugLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `debugLogs` ADD CONSTRAINT `debugLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `debugLogs` ADD CONSTRAINT `debugLogs_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;