CREATE TABLE `checkpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`phase` varchar(64) NOT NULL,
	`state` text NOT NULL,
	`stepIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checkpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`role` enum('user','assistant','system','tool') NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pending','planning','executing','completed','failed','paused') NOT NULL DEFAULT 'pending',
	`currentPhase` varchar(64),
	`plan` text,
	`executionLog` text,
	`result` text,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `toolExecutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`toolName` varchar(64) NOT NULL,
	`params` text,
	`result` text,
	`error` text,
	`duration` int,
	`status` enum('pending','running','success','failed','timeout') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `toolExecutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `checkpoints` ADD CONSTRAINT `checkpoints_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversationHistory` ADD CONSTRAINT `conversationHistory_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `toolExecutions` ADD CONSTRAINT `toolExecutions_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;