import Bull from 'bull';
import logger from '../utils/logger.js';
import EscrowService from '../services/escrow.service.js';

const escrowQueue = new Bull('escrow-auto-release', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Process auto-release jobs directly via shared EscrowService
escrowQueue.process(async (job) => {
  const { orderId } = job.data;
  logger.info(`[Bull Worker] Processing auto-release job for Order #${orderId}`);
  try {
    const result = await EscrowService.autoReleaseOrder(orderId);
    logger.info(`[Bull Worker] Escrow auto-release finished for Order #${orderId}: ${JSON.stringify(result)}`);
    return result;
  } catch (err) {
    logger.error(`[Bull Worker] Auto-release failed for Order #${orderId}: ${err.message}`);
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
