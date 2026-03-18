CREATE TABLE `budgetAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`alertType` enum('warning','critical','limit_exceeded') NOT NULL,
	`spentAmount` decimal(10,8) NOT NULL,
	`budgetLimit` decimal(10,2) NOT NULL,
	`percentageUsed` int NOT NULL,
	`emailSent` boolean NOT NULL DEFAULT false,
	`slackSent` boolean NOT NULL DEFAULT false,
	`message` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budgetAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgetConfigurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthlyBudgetUSD` decimal(10,2) NOT NULL,
	`alertThresholdPercent` int NOT NULL DEFAULT 80,
	`hardLimitPercent` int NOT NULL DEFAULT 100,
	`emailAlertEnabled` boolean NOT NULL DEFAULT true,
	`slackAlertEnabled` boolean NOT NULL DEFAULT false,
	`slackWebhookUrl` varchar(2048),
	`currentMonthSpent` decimal(10,8) NOT NULL DEFAULT '0',
	`lastAlertSentAt` timestamp,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgetConfigurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performanceMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` int NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`duration` int NOT NULL,
	`cpuUsagePercent` decimal(5,2),
	`memoryUsageMB` int,
	`peakMemoryMB` int,
	`itemsProcessed` int NOT NULL DEFAULT 0,
	`itemsPerSecond` decimal(10,2),
	`successRate` int NOT NULL DEFAULT 100,
	`errorCount` int NOT NULL DEFAULT 0,
	`retryCount` int NOT NULL DEFAULT 0,
	`executionPhase` varchar(64),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performanceMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `budgetAlerts` ADD CONSTRAINT `budgetAlerts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budgetConfigurations` ADD CONSTRAINT `budgetConfigurations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performanceMetrics` ADD CONSTRAINT `performanceMetrics_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performanceMetrics` ADD CONSTRAINT `performanceMetrics_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;