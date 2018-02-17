const prom = require('prom-client');

const CODE_LABEL = 'code';
const METHOD_LABEL = 'method';


/**
 * A koa handler that renders the metrics in koa format
 * @param {Prometheus.Registry} register - Object with labels where key is the label key and value is label value. Can only be one level deep
 * @returns {void}
 */
function getMetricsHandler(register) {
    return async (ctx) => {
        ctx.body = r.metrics();
        ctx.status = 200;
    }
}

function checkLabels(labelNames) {
    return {
        hasCode: labelNames.includes(CODE_LABEL),
        hasMethod: labelNames.includes(METHOD_LABEL)
    };
}

function getRequestLabels(ctx, labelNames) {
    const {hasCode, hasMethod} = checkLabels(labelNames);

    if (!hasCode) {
        return {};
    }

    const labels = {code: ctx.response.status || 200};

    if (hasMethod) {
        labels.method = ctx.request.method;
    }

    return labels;
}

/**
 * instrumentCountMiddleware returns a middleware that wraps the provided http.Handler 
 * to observe the request result with the provided Counter. The Counter must have zero,
 * one, or two non-const non-curried labels. For those, the only allowed label names 
 * are "code" and "method". Partitioning of the Counter happens by HTTP status code 
 * and/or HTTP method if the respective instance label names are present in the Counter. 
 * For unpartitioned counting, use a Counter with zero labels.
 * 
 * If the wrapped Handler does not set a status code, a status code of 200 is assumed. 
 *
 * @param {Prometheus.Counter} counter 
 */
function instrumentCountMiddleware(counter) {
    const {hasCode} = checkLabels(counter.labelNames);

    return async(ctx, next) => {
        try {
            await next();
        } finally {
            const labels = hasCode ? getRequestLabels(ctx, counter.labelNames) : {};
            counter.inc(labels);
        }
    };
}


function instrumentDurationMiddleware(histogram) {
    const {hasCode} = checkLabels(histogram.labelNames);

    return async (ctx, next) => {
        const end = histogram.startTimer();
        try {
            await next();
        } finally {
            const labels = hasCode ? getRequestLabels(ctx, histogram.labelNames) : {};
            end(labels);
        }
    };
}

function instrumentInFlightMiddleware(gauge) {
    return async (ctx, next) => {
        gauge.inc();
        try {
            await next();
        } finally {
            gauge.dec();
        }
    };
}

/**
 * 
 * // InstrumentHandlerResponseSize is a middleware that wraps the provided
// http.Handler to observe the response size with the provided ObserverVec.  The
// ObserverVec must have zero, one, or two non-const non-curried labels. For
// those, the only allowed label names are "code" and "method". The function
// panics otherwise. The Observe method of the Observer in the ObserverVec is
// called with the response size in bytes. Partitioning happens by HTTP status
// code and/or HTTP method if the respective instance label names are present in
// the ObserverVec. For unpartitioned observations, use an ObserverVec with zero
// labels. Note that partitioning of Histograms is expensive and should be used
// judiciously.
//
// If the wrapped Handler does not set a status code, a status code of 200 is assumed.
//
 * @param {*} observer 
 */
function instrumentResponseSizeMiddleware(observer) {
    const {hasCode} = checkLabels(histogram.labelNames);

    return async (ctx, next) => {
        await next();

        if(ctx.response.length){
            const labels = hasCode ? getRequestLabels(ctx, histogram.labelNames) : {};
            observer.observe(labels,ctx.response.length);
        }
    }
}

function computeRequestSize(request) {
    let len = 0;
    len += JSON.stringify(request.url).length
    len += JSON.stringify(request.header).length
    len += JSON.stringify(request.method).length
    len += JSON.stringify(request.origin).length
    len += request.length ? request.length : 0;

    return len;
}

// InstrumentHandlerRequestSize is a middleware that wraps the provided
// http.Handler to observe the request size with the provided ObserverVec.  The
// ObserverVec must have zero, one, or two non-const non-curried labels. For
// those, the only allowed label names are "code" and "method". The function
// panics otherwise. The Observe method of the Observer in the ObserverVec is
// called with the request size in bytes. Partitioning happens by HTTP status
// code and/or HTTP method if the respective instance label names are present in
// the ObserverVec. For unpartitioned observations, use an ObserverVec with zero
// labels. Note that partitioning of Histograms is expensive and should be used
// judiciously.
//
// If the wrapped Handler does not set a status code, a status code of 200 is assumed.
//
function instrumentRequestSizeMiddleware(observer) {
    const {hasCode} = checkLabels(histogram.labelNames);

    return async (ctx, next) => {
        await next();
        const labels = hasCode ? getRequestLabels(ctx, histogram.labelNames) : {};
        observer.observe(labels, computeRequestSize(ctx.request));
    }
}
    
module.exports = {
    CODE_LABEL,
    METHOD_LABEL,
    getMetricsHandler,
    instrumentCountMiddleware,
    instrumentDurationMiddleware,
    instrumentInFlightMiddleware,
    instrumentResponseSizeMiddleware,
    instrumentRequestSizeMiddleware,
}