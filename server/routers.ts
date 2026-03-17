import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { exportRouter } from "./routers/export";
import { agentRouter } from "./routers/agent";
import { webhookRouter } from "./routers/webhooks";
import { templatesRouter } from "./routers/templates";
import { tokenUsageRouter } from "./routers/tokenUsage";
import { searchRouter } from "./routers/search";
import { historyRouter } from "./routers/history";
import { notificationsRouter } from "./routers/notifications";
import { notificationPreferencesRouter } from "./routers/notificationPreferences";
import { taskRetryRouter } from "./routers/taskRetry";
import { analyticsRouter } from "./routers/analytics";
import { healthRouter } from "./routers/health";
import { auditRouter } from "./routers/audit";
import { apiKeysRouter } from "./routers/apiKeys";
import { adminRouter } from "./routers/admin";
import { dataExportRouter } from "./routers/dataExport";

export const appRouter = router({
  system: systemRouter,
  export: exportRouter,
  agent: agentRouter,
  webhooks: webhookRouter,
  templates: templatesRouter,
  tokenUsage: tokenUsageRouter,
  search: searchRouter,
  history: historyRouter,
  notifications: notificationsRouter,
  notificationPreferences: notificationPreferencesRouter,
  taskRetry: taskRetryRouter,
  analytics: analyticsRouter,
  health: healthRouter,
  audit: auditRouter,
  apiKeys: apiKeysRouter,
  admin: adminRouter,
  dataExport: dataExportRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
