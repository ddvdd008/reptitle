const async = require('async');
const superagent = require('superagent');
const cheerio = require('cheerio');
const url = require('url');

const cnodeUrl = 'https://cnodejs.org/';
// 并发连接数的计数器
let concurrencyCount = 0;

superagent.get(cnodeUrl)
  .end(function (err, res) {
    if (err) {
      return console.error(err);
    }
    let topicUrls = [];
    const $ = cheerio.load(res.text);
    $('#topic_list .topic_title').each(function (idx, element) {
      const $element = $(element);
      const href = url.resolve(cnodeUrl, $element.attr('href'));
      topicUrls.push(href);
    });

    async.mapLimit(topicUrls, 3, function (url, callback) {
      concurrencyCount++;
      console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', url);
      superagent.get(url)
      .end(function (err, res) {
        concurrencyCount--;
        const $ = cheerio.load(res.text);
        callback(null,{
          title: $('.topic_full_title').text().trim(),
          href: url,
          comment1: $('.reply_content').eq(0).text().trim(),
        });
      });
    }, function (err, result) {
      console.log('final:');
      console.log(result);
    });
  });

