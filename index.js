require('dotenv').config();

const fetch = require('node-fetch');
const TelegramBot = require('node-telegram-bot-api');
const { CronJob } = require('cron');
const redis = require('redis');
const ChartJSImage = require('chart.js-image');

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
      const tokens = res.reduce((r, e) => {
        r.push(e.symbol, e.id);
        return r;
      }, []);

      client.mset(tokens, (err, reply) => {
        if (err) {
          console.error(err);
          return;
        }

        if (reply) {
          console.log('Caching token list finished!');
        }
      });
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

bot.onText(/^\/price/, (msg) => {
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

bot.onText(/^\/chart/, (msg) => {
  const tokenList = msg.text.split(' ');
  tokenList.shift();

  const firstToken = tokenList.shift();

  console.table({ ...msg.from, token: firstToken });

  client.get(firstToken, (err, reply) => {
    if (err) {
      console.error(err);
      return;
    }

    fetch(`${COINGECKO_ENDPOINT}/coins/${reply}/market_chart?vs_currency=usd&days=7&interval=daily`)
      .then((res) => res.json())
      .then(async (res) => {
        const labels = res.prices.map((price) => new Date(price[0]).toLocaleString().split(',')[0]);
        const data = res.prices.map((price) => price[1]);
        const lineChart = new ChartJSImage().chart({
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Price',
              lineTension: 0,
              backgroundColor: 'rgba(255,+99,+132,+.5)',
              borderColor: 'rgb(255,+99,+132)',
              data,
            }],
          },
          options: {
            title: {
              display: true,
              text: `${firstToken.toUpperCase()} - 7 Days Chart`,
            },
            scales: {
              yAxes: [
                {
                  ticks: {
                    beginAtZero: false,
                  },
                  scaleLabel: {
                    display: true,
                    labelString: 'Price (USD)',
                  },
                },
              ],
            },
          },
        })
          .backgroundColor('white')
          .width(1000)
          .height(300);

        const url = await lineChart.toURL();
        bot.sendPhoto(msg.chat.id, url);
      })
      .catch((error) => {
        console.error(err);
        bot.sendMessage(msg.chat.id, error.message);
      });
  });
});
