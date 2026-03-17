CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskStartedEnabled` boolean NOT NULL DEFAULT true,
	`taskCompletedEnabled` boolean NOT NULL DEFAULT true,
	`taskFailedEnabled` boolean NOT NULL DEFAULT true,
	`taskPausedEnabled` boolean NOT NULL DEFAULT true,
	`systemAlertEnabled` boolean NOT NULL DEFAULT true,
	`quietHoursEnabled` boolean NOT NULL DEFAULT false,
	`quietHoursStart` varchar(5),
	`quietHoursEnd` varchar(5),
	`emailDigestEnabled` boolean NOT NULL DEFAULT false,
	`emailDigestFrequency` enum('daily','weekly','never') NOT NULL DEFAULT 'never',
	`pushNotificationsEnabled` boolean NOT NULL DEFAULT true,
	`doNotDisturbEnabled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD CONSTRAINT `notificationPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;