const { CronJob } = require('cron');

class Cron {
  constructor(cronString, callback) {
    this.job = new CronJob(cronString, callback, null, true, 'Asia/Jakarta');

    this.job.start();

    callback();
  }
}

module.exports = Cron;
