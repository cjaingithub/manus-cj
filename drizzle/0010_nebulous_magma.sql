CREATE TABLE `episodicMemory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` int,
	`eventType` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`outcome` varchar(64),
	`details` text,
	`duration` int,
	`relatedTaskIds` text,
	`tags` text,
	`importance` enum('low','normal','high','critical') NOT NULL DEFAULT 'normal',
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `episodicMemory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memoryIndex` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`memoryType` varchar(32) NOT NULL,
	`memoryId` int NOT NULL,
	`searchText` text,
	`category` varchar(128),
	`relevanceScore` int NOT NULL DEFAULT 50,
	`embedding` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memoryIndex_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `semanticMemory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(128) NOT NULL,
	`key` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`description` text,
	`confidence` int NOT NULL DEFAULT 50,
	`usageCount` int NOT NULL DEFAULT 0,
	`successRate` int NOT NULL DEFAULT 0,
	`relatedKeys` text,
	`tags` text,
	`metadata` text,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `semanticMemory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workingMemory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` int NOT NULL,
	`currentGoal` text,
	`currentPhase` varchar(64),
	`activeTools` text,
	`recentResults` text,
	`contextWindow` text,
	`metadata` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workingMemory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `episodicMemory` ADD CONSTRAINT `episodicMemory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `episodicMemory` ADD CONSTRAINT `episodicMemory_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memoryIndex` ADD CONSTRAINT `memoryIndex_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `semanticMemory` ADD CONSTRAINT `semanticMemory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workingMemory` ADD CONSTRAINT `workingMemory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workingMemory` ADD CONSTRAINT `workingMemory_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;