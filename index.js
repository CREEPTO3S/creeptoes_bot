require('dotenv').config();

const fetch = require('node-fetch');
const TelegramBot = require('node-telegram-bot-api');
const { CronJob } = require('cron');
const redis = require('redis');

const { TELEGRAM_TOKEN } = process.env;

const COINGECKO_ENDPOINT = 'https://api.coingecko.com/api/v3';

const client = redis.createClient();

client.on('error', (error) => {
  console.error(error);
});

const fetchCoinList = () => {
  console.log('Caching token list started...');

  fetch(`${COINGECKO_ENDPOINT}/coins/list`)
    .then((res) => res.json())
    .then((res) => {
      res.forEach((token) => {
        client.set(token.symbol, token.id, (err) => {
          if (err) {
            console.error(err);
          }
        });
      });

      console.log('Caching token list finished!');
    })
    .catch((err) => console.error(err));
};

fetchCoinList();

const job = new CronJob('0 0 * * *', () => {
  fetchCoinList();
}, null, true, 'Asia/Jakarta');

job.start();

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 3,
});

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.onText(/^[/price]/, (msg) => {
  const tokenList = msg.text.split(' ');
  tokenList.shift();

  console.table({ ...msg.from, tokenList: tokenList.join(',') });

  client.mget(tokenList, (err, reply) => {
    if (err) {
      console.error(err);
      return;
    }

    const messages = [];
    fetch(`${COINGECKO_ENDPOINT}/simple/price?ids=${reply.join(',')}&vs_currencies=usd`)
      .then((res) => res.json())
      .then((res) => {
        reply.forEach((id) => {
          if (res[id]) {
            messages.push(`${id}: ${formatter.format(res[id].usd)}`);
          }
        });

        bot.sendMessage(msg.chat.id, messages.join('\n'));
      })
      .catch((error) => {
        console.error(err);
        bot.sendMessage(msg.chat.id, error.message);
      });
  });
});
