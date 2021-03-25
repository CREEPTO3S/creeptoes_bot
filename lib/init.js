const Cron = require('./cron');
const { FetchAdapter } = require('./adapters');
const { endpoints: { COINGECKO_ENDPOINT } } = require('./helpers');

class Initializer {
  static init(client) {
    Cron.init('0 0 * * *', () => {
      console.log('Caching token list started...');

      FetchAdapter.fetch(`${COINGECKO_ENDPOINT}/coins/list`, (res) => {
        const tokens = res.reduce((r, e) => {
          r.push(e.symbol, e.id);
          return r;
        }, []);

        client.mset(tokens, (err, reply) => {
          if (err) {
            console.error(err);
            return;
          }

          const tokenExceptions = ['uni', 'uniswap'];
          if (reply) {
            client.mset(tokenExceptions, (err2, reply2) => {
              if (err2) {
                console.error(err);
                return;
              }

              if (reply2) {
                console.log('Caching token list finished!');
              }
            });
          }
        });
      });
    });
  }
}

module.exports = Initializer;
