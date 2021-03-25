const redis = require('redis');

class RedisAdapter {
  constructor() {
    this.client = redis.createClient();

    this.client.on('error', (error) => {
      console.error(error);
    });
  }
}

module.exports = RedisAdapter;
