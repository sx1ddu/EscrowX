import Bull from 'bull';
import logger from '../utils/logger.js';

const escrowQueue = new Bull('escrow-auto-release', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Process auto-release jobs
escrowQueue.process(async (job) => {
  const { orderId } = job.data;
  logger.info(`⏳ Auto-releasing escrow for order: ${orderId}`);
  try {
    const response = await fetch(
      `${process.env.SERVER_URL || 'http://localhost:5000'}/api/payments/release-auto/${orderId}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.JWT_ACCESS_SECRET } }
    );
    const data = await response.json();
    logger.info(`✅ Escrow auto-released: ${JSON.stringify(data)}`);
  } catch (err) {
    logger.error(`❌ Auto-release failed: ${err.message}`);
    throw err;
  }
});

export const scheduleAutoRelease = async (orderId, delayMs) => {
  await escrowQueue.add({ orderId }, { delay: delayMs, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
  logger.info(`📅 Scheduled auto-release for order ${orderId} in ${delayMs / 3600000}h`);
};

escrowQueue.on('failed', (job, err) => {
  logger.error(`❌ Escrow job failed [${job.id}]: ${err.message}`);
});

export default escrowQueue;
