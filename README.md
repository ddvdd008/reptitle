# 使用superagent与cheerio完成简单爬虫

# 前言
爬虫（又被称为网页蜘蛛，网络机器人，在FOAF社区中间，更经常的称为网页追逐者），是一种按照一定的规则，自动地抓取万维网信息的程序或者脚本。摘自百度百科-。-

说白了就是自己前几天刚好看到[cheerio](https://github.com/cheeriojs/cheerio),发现这个东西很强大，心血来潮想做一个简单爬虫～

# 准备工作
找个自己平时撸代码的文件夹，新建reptile文件夹：
```
    mkdir reptile && reptile
```
然后我们需要通过npm管理安装依赖：
```
    npm init
    npm install express superagent cheerio --save
```
1. express: nodejs的一个框架，便于我们处理服务端接受请求
2. superagent: 是个 http 方面的库，可以发起 get 或 post 请求，获取页面html
3. cheerio: 可以理解成一个 Node.js 版的 jquery，用来从网页中以 css selector 方式取dom数据，使用方式跟 jquery 一样一样的。
# 进入开发
根目录下新建文件app.js
## 爬虫目标
当在浏览器中访问 http://localhost:3000/ 时，输出 CNode(https://cnodejs.org/ ) 社区首页的所有帖子标题和链接以及对应的作者，以 json 的形式返回。
## 爬虫思路
你要爬取一个网页，首先你肯定需要获取到它的html，然后通过拿到的html分析页面结构，从而来获取想要的数据。
### 利用superagent抓取网页
```
    superagent.get('https://cnodejs.org/')
    .end(function (err, sres) {
      if (err) {
        return next(err);
      }
      console.log(sres);
    });
```
通过superagent访问https://cnodejs.org/，获取sres:
```
    {
    "req": {
        "method": "GET",
        "url": "https://cnodejs.org/",
        "headers": {
            "user-agent": "node-superagent/3.8.2"
        }
    },
    "header": {
        "server": "nginx/1.4.6 (Ubuntu)",
        "date": "Sat, 24 Feb 2018 06:56:48 GMT",
        "content-type": "text/html; charset=utf-8",
        "transfer-encoding": "chunked",
        "connection": "close",
        "x-powered-by": "Express",
        "x-frame-options": "SAMEORIGIN",
        "etag": "W/\"c77f-Z8I9VeMHUar0THBF358YpWENG3c\"",
        "set-cookie": ["connect.sid=s%3Ale8OOPrG2PSeEjHp2iQ8j868O1PW5YEz.GxWLGY8FIl63afSQTb5YlGdOwzfm1HLWOt76LLZ5O2k; Path=/; HttpOnly"],
        "vary": "Accept-Encoding",
        "content-encoding": "gzip",
        "x-response-time": "200.455ms",
        "strict-transport-security": "max-age=15768000"
    },
    "status": 200,
    "text": "<!DOCTYPE html>\n<html xmlns=\"http://www.w3.org/1999/xhtml\">\n<head>\n  <!-- meta -->\n  <meta charset=\"utf-8\"/>\n  <meta name='description' content='CNode：Node.js专业中文社区'>\n ...</html>\n"
}
```
发现sres对象的text是我们需要的CNode社区首页的html。
### 分析网页结构
通过页面html可以看到，我们需要的帖子标题和链接以及对应作者都在id为‘topic_list’的div下每个类名为‘cell’的div里。
只要我们能操作这些dom，就能获取到这些数据。
### 利用cheerio获取网页数据
我们现在有了html结构，怎么去获取html上特定dom的数据呢？
cheerio登场了，它有什么用呢？看下面官方的例子：
```
    const cheerio = require('cheerio')
    const $ = cheerio.load('<h2 class="title">Hello world</h2>')

    $('h2.title').text('Hello there!')
    $('h2').addClass('welcome')

    $.html()
    //=> <h2 class="title welcome">Hello there!</h2>
```
发现它的用法和基本的jquery一样，有html结构，就能操作dom获取数据:
```
    const $ = cheerio.load(sres.text);
    let items = [];
    $('#topic_list .cell').each(function (idx, element) {
        const $element = $(element).find('.topic_title').eq(0);
        const $auther = $(element).find('.user_avatar img').eq(0);
        items.push({
            title: $element.attr('title'),
            href: $element.attr('href'),
            author: $auther.attr('title')
        });
    });
```
## 爬虫核心完整代码
app.js
```
    const express = require('express');
    const cheerio = require('cheerio');
    const superagent = require('superagent');

    const app = express();

    app.get('/', function (req, res, next) {
    superagent.get('https://cnodejs.org/')
        .end(function (err, sres) {
        if (err) {
            return next(err);
        }
        const $ = cheerio.load(sres.text);
        let items = [];
        $('#topic_list .cell').each(function (idx, element) {
            const $element = $(element).find('.topic_title').eq(0);
            const $auther = $(element).find('.user_avatar img').eq(0);
            items.push({
            title: $element.attr('title'),
            href: $element.attr('href'),
            author: $auther.attr('title')
            });
        });

        res.send(items);
        });
    });


    app.listen(3000, function () {
    console.log('app is listening at port 3000');
    });

```
## 第一阶段小结
OK，一个简单的爬虫就是这么简单。这里我们还没有利用到 Node.js 的异步并发特性。以下第二阶段我们会继续深入。
第一阶段资料：
[superagent](http://visionmedia.github.io/superagent/)
[cheerio](https://github.com/cheeriojs/cheerio)
# 第二阶段爬虫进阶版
第一阶段我们介绍了如何使用 superagent 和 cheerio 来取主页内容，那只需要发起一次 http get 请求就能办到。但这次，我们需要取出每个主题的第一条评论，这就要求我们对每个主题的链接发起请求，并用 cheerio 去取出其中的第一条评论。

CNode 目前每一页有 40 个主题，于是我们就需要发起 1 + 40 个请求，后者的 40 个请求，我们并发地发起-。-
## 对第一阶段代码进行适当修改
首先我们获取主页的40个请求url，来作为后面获取评论的url：
```
    const superagent = require('superagent');
    const cheerio = require('cheerio');
    // url 模块是 Node.js 标准库里面的
    const url = require('url');

    const cnodeUrl = 'https://cnodejs.org/';

    superagent.get(cnodeUrl)
    .end(function (err, res) {
        if (err) {
        return console.error(err);
        }
        const topicUrls = [];
        const $ = cheerio.load(res.text);
        // 获取首页所有的链接
        $('#topic_list .topic_title').each(function (idx, element) {
            const $element = $(element);
            // $element.attr('href') 本来的样子是 /topic/542acd7d5d28233425538b04
            // 我们用 url.resolve 来自动推断出完整 url，变成
            // https://cnodejs.org/topic/542acd7d5d28233425538b04 的形式
            // 具体请看 http://nodejs.org/api/url.html#url_url_resolve_from_to 的示例
            const href = url.resolve(cnodeUrl, $element.attr('href'));
            topicUrls.push(href);
        });

        console.log(topicUrls);
    });
```
OK，这时候我们已经得到所有 url 的地址了，接下来，我们把这些地址都抓取一遍，就完成了。
## 引入eventproxy，控制请求并行
```
    npm install eventproxy--save
```
具体抓取之前，我们这次介绍下eventproxy 这个库。
用 js 写过异步的同学应该都知道，如果你要并发异步获取两三个地址的数据，并且要在获取到数据之后，对这些数据一起进行利用的话，常规的写法是自己维护一个计数器。

先定义一个 var count = 0，然后每次抓取成功以后，就 count++。如果你是要抓取三个源的数据，由于你根本不知道这些异步操作到底谁先完成，那么每次当抓取成功的时候，就判断一下 count === 3。当值为真时，使用另一个函数继续完成操作。
常规操作：
```
    (function () {
        var count = 0;
        var result = {};

        $.get('http://data1_source', function (data) {
            result.data1 = data;
            count++;
            handle();
            });
        $.get('http://data2_source', function (data) {
            result.data2 = data;
            count++;
            handle();
            });
        $.get('http://data3_source', function (data) {
            result.data3 = data;
            count++;
            handle();
            });

        function handle() {
            if (count === 3) {
            var html = fuck(result.data1, result.data2, result.data3);
            render(html);
            }
        }
    })();
```
而 eventproxy 就起到了这个计数器的作用，它来帮你管理到底这些异步操作是否完成，完成之后，它会自动调用你提供的处理函数，并将抓取到的数据当参数传过来。
骚操作：
```
    var ep = new eventproxy();
    ep.all('data1_event', 'data2_event', 'data3_event', function (data1, data2, data3) {
    var html = fuck(data1, data2, data3);
    render(html);
    });

    $.get('http://data1_source', function (data) {
    ep.emit('data1_event', data);
    });

    $.get('http://data2_source', function (data) {
    ep.emit('data2_event', data);
    });

    $.get('http://data3_source', function (data) {
    ep.emit('data3_event', data);
    });
```
好看多了是吧，也就是个高等计数器嘛。
```
    ep.all('data1_event', 'data2_event', 'data3_event', function (data1, data2, data3) {});
```
这一句，监听了三个事件，分别是 data1_event, data2_event, data3_event，每次当一个源的数据抓取完成时，就通过 ep.emit() 来告诉 ep 自己，某某事件已经完成了。

当三个事件未同时完成时，ep.emit() 调用之后不会做任何事；当三个事件都完成的时候，就会调用末尾的那个回调函数，来对它们进行统一处理。

因为我们现在40次请求都是一样的处理逻辑，所以我们这边采用重复异步协作[EventProxy.after](https://github.com/JacksonTian/eventproxy#%E9%87%8D%E5%A4%8D%E5%BC%82%E6%AD%A5%E5%8D%8F%E4%BD%9C),具体代码如下：
```
    // 得到 topicUrls 之后
    const eventproxy = require('eventproxy');
    // 得到一个 eventproxy 的实例
     const ep = new eventproxy();

    // 命令 ep 重复监听 topicUrls.length 次（在这里也就是 40 次） `topic_html` 事件再行动
    ep.after('topic_html', topicUrls.length, function (topics) {
    // topics 是个数组，包含了 40 次 ep.emit('topic_html', pair) 中的那 40 个 pair

    // 开始行动
    topics = topics.map(function (topicPair) {
        // 接下来都是 jquery 的用法了
        const topicUrl = topicPair[0];
        const topicHtml = topicPair[1];
        const $ = cheerio.load(topicHtml);
        return ({
        title: $('.topic_full_title').text().trim(),
        href: topicUrl,
        comment1: $('.reply_content').eq(0).text().trim(),
        });
    });

    console.log('final:');
    console.log(topics);
    });

    topicUrls.forEach(function (topicUrl) {
        superagent.get(topicUrl)
            .end(function (err, res) {
            console.log('fetch ' + topicUrl + ' successful');
            ep.emit('topic_html', [topicUrl, res.text]);
            });
    });
```
## 第二阶段完整代码
```
    const eventproxy = require('eventproxy');
    const superagent = require('superagent');
    const cheerio = require('cheerio');
    const url = require('url');

    const cnodeUrl = 'https://cnodejs.org/';

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

        const ep = new eventproxy();

        ep.after('topic_html', topicUrls.length, function (topics) {
        topics = topics.map(function (topicPair) {
            const topicUrl = topicPair[0];
            const topicHtml = topicPair[1];
            const $ = cheerio.load(topicHtml);
            return ({
            title: $('.topic_full_title').text().trim(),
            href: topicUrl,
            comment1: $('.reply_content').eq(0).text().trim(),
            });
        });

        console.log('final:');
        console.log(topics);
        });

        topicUrls.forEach(function (topicUrl) {
        superagent.get(topicUrl)
            .end(function (err, res) {
            console.log('fetch ' + topicUrl + ' successful');
            ep.emit('topic_html', [topicUrl, res.text]);
            });
        });
    });
```
注意，cnodejs.org 网站有并发连接数的限制，所以当请求发送太快的时候会导致返回值为空或报错。建议一次抓取3个主题即可。文中的40只是为了方便讲解。
## 第二阶段小结
学习使用 eventproxy 这一利器控制并发，但是并不完美。
第二阶段资料：
[eventproxy](https://github.com/JacksonTian/eventproxy)
# 第三阶段使用 async 控制并发，让爬虫更加完美
第二阶段代码其实是不完美的。为什么这么说，是因为我们一次性发了 40 个并发请求出去，要知道，除去 CNode 的话，别的网站有可能会因为你发出的并发连接数太多而当你是在恶意请求，把你的 IP 封掉。

我们在写爬虫的时候，如果有 100 个链接要去爬，那么不可能同时发出 100 个并发链接出去对不对？我们需要控制一下并发的数量，比如并发 10 个就好，然后慢慢抓完这 100 个链接。
## 引入async库
```
    npm install async --save
```
用 async 来做这件事很简单。

这次我们要介绍的是 async 的 mapLimit(arr, limit, iterator, callback) 接口。
改造代码如下：
```
    async.mapLimit(topicUrls, 3, function (url, callback) {
      concurrencyCount++;
      console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', url);
      superagent.get(url)
      .end(function (err, res) {
        const $ = cheerio.load(res.text);
        callback(null,{
          title: $('.topic_full_title').text().trim(),
          href: url,
          comment1: $('.reply_content').eq(0).text().trim(),
        });
        concurrencyCount--;
      });
    }, function (err, result) {
      console.log('final:');
      console.log(result);
    });
```
可以看到，一开始，并发链接数是从 1 开始增长的，增长到 3 时，就不再增加。当其中有任务完成时，再继续抓取。并发连接数始终控制在 3 个。
## 第三阶段小结
到现在为止，我们的爬虫总算完美完成了！
对了，还有个问题是，什么时候用 eventproxy，什么时候使用 async 呢？它们不都是用来做异步流程控制的吗？

当你需要去多个源(一般是小于 10 个)汇总数据的时候，用 eventproxy 方便；当你需要用到队列，需要控制并发数，或者你喜欢函数式编程思维时，使用 async。大部分场景是前者，所以我个人大部分时间是用 eventproxy 的。
第三阶段资料：
[async](https://github.com/caolan/async#queueworker-concurrency)

# 总结
[github地址](https://github.com/ddvdd008/reptitle)