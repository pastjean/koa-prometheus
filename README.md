# koa-prometheus

## Usage

```sh
npm install -i koa-prometheus prom-client
```

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