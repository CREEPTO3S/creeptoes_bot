const nodeFetch = require('node-fetch');

class FetchAdapter {
  static fetch(url, callback = () => {}, errCallback = () => {}) {
    nodeFetch(url)
      .then((res) => res.json())
      .then((res) => callback(res))
      .catch((err) => {
        console.error(err);
        errCallback(err);
      });
  }
}

module.exports = FetchAdapter;
