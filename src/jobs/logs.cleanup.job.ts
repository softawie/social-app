import LogModel from "@db/models/log.model";

function msUntilNext(hour: number, minute = 0, second = 0) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, second, 0);
  if (next <= now) {
    // move to next day
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function runCleanup() {
  try {
    const result = await LogModel.deleteMany({ status: { $lt: 400 } });
    console.log(`[logs-cleanup] Deleted ${result.deletedCount ?? 0} success logs at ${new Date().toISOString()}`);
  } catch (err) {
    console.error("[logs-cleanup] Failed to delete success logs:", err);
  }
}

export function startSuccessLogsCleanupJob() {
  const scheduleNext = () => {
    const delay = msUntilNext(21, 0, 0); // 9 PM local server time
    setTimeout(async () => {
      await runCleanup();
      // Re-schedule again after running, to handle DST changes properly
      scheduleNext();
    }, delay);
  };

  scheduleNext();
  console.log("[logs-cleanup] Scheduled daily success logs cleanup at 21:00 local time");
}
