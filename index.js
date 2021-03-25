require('dotenv').config();

const mockingcase = require('@strdr4605/mockingcase');
const { RedisAdapter, FetchAdapter } = require('./lib/adapters');
const Initializer = require('./lib/init');
const TelegramBot = require('./lib/telegram_bot');
const ChartJS = require('./lib/chart-js');
const {
  formatter,
  endpoints: {
    COINGECKO_ENDPOINT,
    MOCKIFY_IMG,
    MICKIFY_IMG,
  },
} = require('./lib/helpers');

const { client } = new RedisAdapter();
const { bot } = new TelegramBot();

Initializer.init(client);

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
    FetchAdapter.fetch(`${COINGECKO_ENDPOINT}/simple/price?ids=${reply.join(',')}&vs_currencies=usd&include_market_cap=true`, (res) => {
      reply.forEach((id) => {
        if (!res[id]) return;

        messages.push(`*${id.toUpperCase().replace(/[_*`[]/ig, ' ')}*: \n\t\tPrice: ${formatter.format(res[id].usd)}\n\t\tMC: ${formatter.format(res[id].usd_market_cap)}`);
      });

      if (messages.length > 0) {
        bot.sendMessage(msg.chat.id, messages.join('\n'), { parse_mode: 'Markdown' });
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

      const url = await ChartJS.chart(labels, data, reply).toURL();
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
  bot.sendPhoto(msg.chat.id, MOCKIFY_IMG);
});

bot.onText(/^\/mickify/, (msg) => {
  if (!msg.reply_to_message) return;

  const chat = { ...msg.reply_to_message.chat };
  delete chat.type;
  console.table({ type: 'mickify', ...chat, text: msg.reply_to_message.text });

  bot.sendMessage(msg.chat.id, msg.reply_to_message.text.replace(/[aAeEoOuU]/ig, 'i'), {
    reply_to_message_id: msg.reply_to_message.message_id,
  });
  bot.sendPhoto(msg.chat.id, MICKIFY_IMG);
});
