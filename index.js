require('dotenv').config();

const ChartJSImage = require('chart.js-image');
const mockingcase = require('@strdr4605/mockingcase');
const { RedisAdapter, FetchAdapter } = require('./lib/adapters');
const TelegramBot = require('./lib/telegram_bot');
const Cron = require('./lib/cron');
const { formatter } = require('./lib/helpers');

const COINGECKO_ENDPOINT = 'https://api.coingecko.com/api/v3';
const { TELEGRAM_TOKEN } = process.env;

const { client } = new RedisAdapter();
const { bot } = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// eslint-disable-next-line no-new
new Cron('0 0 * * *', () => {
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

      if (reply) {
        console.log('Caching token list finished!');
      }
    });
  });
});

bot.onText(/^\/price/, (msg) => {
  const tokenList = msg.text.split(' ');
  tokenList.shift();

  const tokenListLowerCase = tokenList.map((token) => token.toLowerCase());

  if (tokenListLowerCase.length === 0) return;

  console.table({ type: 'price', ...msg.from, tokenList: tokenListLowerCase.join(',') });

  client.mget(tokenListLowerCase, (err, reply) => {
    if (err) {
      console.error(err);
      return;
    }

    const messages = [];
    FetchAdapter.fetch(`${COINGECKO_ENDPOINT}/simple/price?ids=${reply.join(',')}&vs_currencies=usd`, (res) => {
      reply.forEach((id) => {
        if (!res[id]) return;

        messages.push(`${id}: ${formatter.format(res[id].usd)}`);
      });

      if (messages.length > 0) {
        bot.sendMessage(msg.chat.id, messages.join('\n'));
      }
    }, (error) => {
      bot.sendMessage(msg.chat.id, error.message);
    });
  });
});

bot.onText(/^\/chart/, (msg) => {
  const tokenList = msg.text.split(' ');
  tokenList.shift();

  if (tokenList.length === 0) return;

  const firstToken = tokenList.shift().toLowerCase();

  console.table({ type: 'chart', ...msg.from, token: firstToken });

  client.get(firstToken, (err, reply) => {
    if (err) {
      console.error(err);
      return;
    }

    FetchAdapter.fetch(`${COINGECKO_ENDPOINT}/coins/${reply}/market_chart?vs_currency=usd&days=30&interval=daily`, async (res) => {
      if (!res.prices) return;

      const labels = res.prices.map((price) => new Date(price[0]).toLocaleString().split(',')[0].split('/').slice(0, 2).reverse().join('/'));
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
            text: `${firstToken.toUpperCase()} - 30 Days Chart`,
          },
          scales: {
            xAxes: [
              {
                scaleLabel: {
                  display: true,
                  labelString: 'Date (dd/mm)',
                },
              },
            ],
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
    }, (error) => {
      bot.sendMessage(msg.chat.id, error.message);
    });
  });
});

bot.onText(/^\/mockify/, (msg) => {
  if (!msg.reply_to_message) return;

  const chat = { ...msg.reply_to_message.chat };
  delete chat.type;
  console.table({ type: 'mockify', ...chat, text: msg.reply_to_message.text });

  bot.sendMessage(msg.chat.id, mockingcase(msg.reply_to_message.text), {
    reply_to_message_id: msg.reply_to_message.message_id,
  });
  bot.sendPhoto(msg.chat.id, 'https://camo.githubusercontent.com/3a3bd9d78deec2477321daecf7bbb48555d90507adbe08c95d673f5cc46dd23f/68747470733a2f2f696d67666c69702e636f6d2f732f6d656d652f4d6f636b696e672d53706f6e6765626f622e6a7067');
});

bot.onText(/^\/mickify/, (msg) => {
  if (!msg.reply_to_message) return;

  const chat = { ...msg.reply_to_message.chat };
  delete chat.type;
  console.table({ type: 'mickify', ...chat, text: msg.reply_to_message.text });

  bot.sendMessage(msg.chat.id, msg.reply_to_message.text.replace(/[aAeEoOuU]/ig, 'i'), {
    reply_to_message_id: msg.reply_to_message.message_id,
  });
  bot.sendPhoto(msg.chat.id, 'https://i.imgflip.com/si6e7.jpg');
});
