# koa-prometheus

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]

## Installation

```sh
npm install -i koa-prometheus prom-client
```
## Usage

Complete example 😀

```js
const koa = require('koa');
const prom = require('prom-client');
const koaPrometheus = require('koa-prometheus');

const httpRequestTotal = new prom.Counter({
    name: 'http_request_total',
    help: 'Duration of HTTP requests in seconds',
    labelNames: [
        'code'
    ],
});

const httpRequestDurationSeconds = new prom.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: [
        'code'
    ],
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 1.0, 2.0, 5.0]
});

const httpRequestInflight = new prom.Gauge({
    name: 'http_request_in_flight',
    help: 'Number of current processing HTTP requests',
});

const durHandler = koaPrometheus.instrumentDurationHandler(httpRequestDurationSeconds);
const countHandler = koaPrometheus.instrumentCountHandler(httpRequestTotal);
const inFlightHandler = koaPrometheus.instrumentInFlightHandler(httpRequestInflight);


const app = new Koa();


const metricsHandler = koaPrometheus.getMetricsHandler(prom.register);

app.use(koaPrometheus.instrumentDurationHandler(httpRequestDurationSeconds))
    .use(koaPrometheus.instrumentCountHandler(httpRequestTotal))
    .use(koaPrometheus.instrumentInFlightHandler(httpRequestInflight))
    .use(async (ctx) => {
        if(ctx.request.method === 'GET' && ctx.request.url === '/metrics') {
            return await metricsHandler(ctx);
        }

        ctx.status = 200;
        ctx.body = 'hello prometheus';
    })
```

# License 

MIT

[npm-image]: https://img.shields.io/npm/v/koa-prometheus-adv.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/koa-prometheus-adv
[travis-image]: https://img.shields.io/pastjean/koa-prometheus/koa/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/pastjean/koa-prometheus
