const TelegramBotApi = require('node-telegram-bot-api');

class TelegramBot {
  constructor(token, options) {
    this.bot = new TelegramBotApi(token, options);
  }
}

module.exports = TelegramBot;
