import * as Koa from 'koa'
import * as koaCompose from 'koa-compose'
import * as prometheus from 'prom-client'

export const CODE_LABEL = 'code'
export const METHOD_LABEL = 'method'

// Hack because 'prom-client' d.ts is missing "labelNames"
class Counter extends prometheus.Counter {
    labelNames: string[];
}

// Hack because 'prom-client' d.ts is missing "labelNames"
class Histogram extends prometheus.Histogram {
    labelNames: string[];
}

function checkLabels(labelNames: string[]) {
    return {
        hasCode: labelNames.includes(CODE_LABEL),
        hasMethod: labelNames.includes(METHOD_LABEL)
    }
}

function getRequestLabels(ctx: Koa.Context, labelNames: string[]): prometheus.labelValues {
    const {hasCode, hasMethod} = checkLabels(labelNames)

    if (!hasCode) {
        return {}
    }

    const labels: prometheus.labelValues = {code: ctx.response.status}

    if (hasMethod) {
        labels.method = ctx.request.method
    }

    return labels
}

export function metricsHandler(register: prometheus.Registry): Koa.Middleware {
    return async (ctx) => {
        ctx.body = register.metrics()
        ctx.status = 200
    }
}

export function instrumentCountHandler(counter: prometheus.Counter): Koa.Middleware {
    const {hasCode} = checkLabels((counter as Counter).labelNames)

    return async (ctx, next) => {
        try {
            await next()
        } finally {
            const labels = hasCode
                ? getRequestLabels(ctx, (counter as Counter).labelNames)
                : {}
            counter.inc(labels)
        }
    }
}

export function instrumentDurationHandler(histogram: prometheus.Histogram): Koa.Middleware {
    const {hasCode} = checkLabels((histogram as Histogram).labelNames)

    return async (ctx, next) => {
        const end = histogram.startTimer()
        try {
            await next()
        } finally {
            const labels = hasCode
                ? getRequestLabels(ctx, (histogram as Histogram).labelNames)
                : {}
            end(labels)
        }
    }
}

export function instrumentInFlightHandler(gauge: prometheus.Gauge): Koa.Middleware {
    return async (_ctx, next) => {
        gauge.inc()
        try {
            await next()
        } finally {
            gauge.dec()
        }
    }
}

// TODO: will be usefull in case of graphql
// export const instrumentResponseSizeHandler: Koa.Middleware = () => {
//     return async (ctx, next) => {}
// }

// TODO: will be usefull in case of graphql
// export const instrumentRequestSizeHandler: Koa.Middleware = () => {
//     return async (ctx, next) => {}
// }


export function metricsInjector(httpRequestDurationSeconds: prometheus.Histogram,
                                httpRequestTotal: prometheus.Counter,
                                httpRequestInflight: prometheus.Gauge): Koa.Middleware {
    return koaCompose([
        instrumentDurationHandler(httpRequestDurationSeconds),
        instrumentCountHandler(httpRequestTotal),
        instrumentInFlightHandler(httpRequestInflight)
    ])
}

export function DefaultHTTPMetricsInjector(registry: prometheus.Registry, prefix: string = 'http'): Koa.Middleware {
    const httpRequestTotal = new prometheus.Counter({
        name: `${prefix}_request_total`,
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['code'],
        registers: [registry]
    })
    
    const httpRequestDurationSeconds = new prometheus.Histogram({
        name: `${prefix}_request_duration_seconds`,
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['code'],
        buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 1.0, 2.0, 5.0],
        registers: [registry]
    })
    
    const httpRequestInflight = new prometheus.Gauge({
        name: `${prefix}_request_in_flight`,
        help: 'Number of current processing HTTP requests',
        registers: [registry]
    })

    return metricsInjector(httpRequestDurationSeconds,httpRequestTotal,httpRequestInflight)
}
