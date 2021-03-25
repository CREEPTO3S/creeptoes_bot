const ChartJSImage = require('chart.js-image');

class ChartJS {
  static chart(labels, data, id) {
    return new ChartJSImage().chart({
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
          text: `${id.toUpperCase()} - 30 Days Chart`,
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
  }
}

module.exports = ChartJS;
