import Bottleneck from 'bottleneck';

const perSecondLimiter = new Bottleneck({
  reservoir: 20,
  reservoirRefreshAmount: 20,
  reservoirRefreshInterval: 1000,
  maxConcurrent: 5,
});

const twoMinuteLimiter = new Bottleneck({
  reservoir: 100,
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 120000,
  maxConcurrent: 5,
});

export function scheduleRiotRequest<T>(task: () => Promise<T>) {
  return twoMinuteLimiter.schedule(() => perSecondLimiter.schedule(task));
}
