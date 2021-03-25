const TelegramBotApi = require('node-telegram-bot-api');

const { TELEGRAM_TOKEN } = process.env;

class TelegramBot {
  constructor() {
    this.bot = new TelegramBotApi(TELEGRAM_TOKEN, { polling: true });
  }
}

module.exports = TelegramBot;
