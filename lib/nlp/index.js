const { NlpManager } = require('node-nlp');
const trainnlp = require('./train-nlp');

const manager = new NlpManager({ languages: ['en'], treshold: 0.5, nlu: { log: false } });

(async () => {
  await trainnlp(manager);
})();

module.exports = manager;
