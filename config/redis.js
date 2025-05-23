const redis = require('redis');

// Redis configuration
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Handle Redis connection events
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

// Helper functions for common Redis operations
const setCache = async (key, value, expiration = 3600) => {
  await redisClient.set(key, JSON.stringify(value), {
    EX: expiration,
  });
};

const getCache = async (key) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

const deleteCache = async (key) => {
  await redisClient.del(key);
};

module.exports = {
  redisClient,
  setCache,
  getCache,
  deleteCache
};