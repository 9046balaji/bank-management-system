# OpenTelemetry Demo

> Documentation collected from the [OpenTelemetry Demo documentation](https://opentelemetry.io/docs/demo/).

> This README contains the `/docs/demo/` documentation hierarchy.

---

## Table of Contents

- [Demo Architecture](#demo-architecture)
- [Collector Data Flow Dashboard](#collector-data-flow-dashboard)
- [Development](#development)
- [Docker deployment](#docker-deployment)
- [Feature Flags](#feature-flags)
  - [Using Metrics and Traces to diagnose a memory leak](#using-metrics-and-traces-to-diagnose-a-memory-leak)
- [Forking the demo repository](#forking-the-demo-repository)
- [Kubernetes deployment](#kubernetes-deployment)
- [Demo Requirements](#demo-requirements)
  - [Application Requirements](#application-requirements)
  - [Architecture Requirements](#architecture-requirements)
  - [OpenTelemetry Requirements](#opentelemetry-requirements)
  - [System Requirements](#system-requirements)
- [Sample Configurations](#sample-configurations)
  - [Tail-Based Sampling with service.criticality](#tail-based-sampling-with-servicecriticality)
- [Demo Screenshots](#demo-screenshots)
- [Self-Observability Dashboard](#self-observability-dashboard)
- [Services](#services)
  - [Accounting Service](#accounting-service)
  - [Ad Service](#ad-service)
  - [Cart Service](#cart-service)
  - [Checkout Service](#checkout-service)
  - [Currency Service](#currency-service)
  - [Email Service](#email-service)
  - [Flagd-UI Service](#flagd-ui-service)
  - [Fraud Detection Service](#fraud-detection-service)
  - [Frontend](#frontend)
  - [Frontend Proxy (Envoy)](#frontend-proxy-envoy)
  - [Image Provider Service](#image-provider-service)
  - [Kafka](#kafka)
  - [Load Generator](#load-generator)
  - [Payment Service](#payment-service)
  - [Product Catalog Service](#product-catalog-service)
  - [Quote Service](#quote-service)
  - [React Native App](#react-native-app)
  - [Recommendation Service](#recommendation-service)
  - [Shipping Service](#shipping-service)
- [Telemetry Features](#telemetry-features)
  - [Log Coverage by Service](#log-coverage-by-service)
  - [Manual Span Attributes](#manual-span-attributes)
  - [Metric Coverage by Service](#metric-coverage-by-service)
  - [Trace Coverage by Service](#trace-coverage-by-service)
- [Tests](#tests)

---

## Demo Architecture

> **Source:** https://opentelemetry.io/docs/demo/architecture/

**OpenTelemetry Demo** is composed of microservices written in different
programming languages that talk to each other over gRPC and HTTP; and a load
generator which uses [k6](https://k6.io/) to fake user traffic.

```
graph TD
subgraph Service Diagram
accounting(Accounting):::dotnet
ad(Ad):::java
cache[(Cache<br/>&#40Valkey&#41)]
cart(Cart):::dotnet
checkout(Checkout):::golang
currency(Currency):::cpp
email(Email):::ruby
flagd(Flagd):::golang
flagd-ui(Flagd-ui):::elixir
fraud-detection(Fraud Detection):::kotlin
frontend(Frontend):::typescript
frontend-proxy(Frontend Proxy <br/>&#40Envoy&#41):::cpp
image-provider(Image Provider <br/>&#40nginx&#41):::cpp
load-generator([Load Generator]):::golang
payment(Payment):::javascript
product-catalog(Product Catalog):::golang
quote(Quote):::php
recommendation(Recommendation):::python
shipping(Shipping):::rust
queue[(queue<br/>&#40Kafka&#41)]:::java
react-native-app(React Native App):::typescript
postgresql[(Database<br/>&#40PostgreSQL&#41)]

accounting ---> postgresql

ad ---->|gRPC| flagd

checkout -->|gRPC| currency
checkout -->|gRPC| cart
checkout -->|TCP| queue

cart --> cache
cart -->|gRPC| flagd

checkout -->|gRPC| payment
checkout --->|HTTP| email
checkout -->|gRPC| product-catalog
checkout -->|HTTP| shipping

fraud-detection -->|gRPC| flagd

frontend -->|gRPC| ad
frontend -->|gRPC| currency
frontend -->|gRPC| cart
frontend -->|gRPC| checkout
frontend -->|HTTP| shipping
frontend ---->|gRPC| recommendation
frontend -->|gRPC| product-catalog

frontend-proxy -->|gRPC| flagd
frontend-proxy -->|HTTP| frontend
frontend-proxy -->|HTTP| flagd-ui
frontend-proxy -->|HTTP| image-provider

payment -->|gRPC| flagd

queue -->|TCP| accounting
queue -->|TCP| fraud-detection

recommendation -->|gRPC| flagd
recommendation -->|gRPC| product-catalog

shipping -->|HTTP| quote

Internet -->|HTTP| frontend-proxy
load-generator -->|HTTP| frontend-proxy
react-native-app -->|HTTP| frontend-proxy
end

classDef dotnet fill:#178600,color:white;
classDef cpp fill:#f34b7d,color:white;
classDef elixir fill:#b294bb,color:black;
classDef golang fill:#00add8,color:black;
classDef java fill:#b07219,color:white;
classDef javascript fill:#f1e05a,color:black;
classDef kotlin fill:#560ba1,color:white;
classDef php fill:#4f5d95,color:white;
classDef python fill:#3572A5,color:white;
classDef ruby fill:#701516,color:white;
classDef rust fill:#dea584,color:black;
classDef typescript fill:#e98516,color:black;
```

```
graph LR
subgraph Service Legend
  dotnetsvc(.NET):::dotnet
  cppsvc(C++):::cpp
  elixirsvc(Elixir):::elixir
  golangsvc(Go):::golang
  javasvc(Java):::java
  javascriptsvc(JavaScript):::javascript
  kotlinsvc(Kotlin):::kotlin
  phpsvc(PHP):::php
  pythonsvc(Python):::python
  rubysvc(Ruby):::ruby
  rustsvc(Rust):::rust
  typescriptsvc(TypeScript):::typescript
end

classDef dotnet fill:#178600,color:white;
classDef cpp fill:#f34b7d,color:white;
classDef elixir fill:#b294bb,color:black;
classDef golang fill:#00add8,color:black;
classDef java fill:#b07219,color:white;
classDef javascript fill:#f1e05a,color:black;
classDef kotlin fill:#560ba1,color:white;
classDef php fill:#4f5d95,color:white;
classDef python fill:#3572A5,color:white;
classDef ruby fill:#701516,color:white;
classDef rust fill:#dea584,color:black;
classDef typescript fill:#e98516,color:black;
```

Follow these links for the current state of
[log](https://opentelemetry.io/docs/demo/telemetry-features/log-coverage/),
[metric](https://opentelemetry.io/docs/demo/telemetry-features/metric-coverage/) and
[trace](https://opentelemetry.io/docs/demo/telemetry-features/trace-coverage/) instrumentation of the
demo applications.

The collector is configured in
[otelcol-config.yml](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/otel-collector/otelcol-config.yml),
alternative exporters can be configured here.

When running with the observability stack, the Collector also connects to the
demo’s OpAMP server through the
[OpAMP extension](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/opampextension)
and reports its health, version, attributes, and effective configuration. Open
the OpAMP UI at <http://localhost:8080/opamp/> and select the Collector instance
to view the reported status.

```
graph TB
subgraph tdf[Telemetry Data Flow]
    subgraph subgraph_padding [ ]
        style subgraph_padding fill:none,stroke:none;
        %% padding to stop the titles clashing
        subgraph od[OpenTelemetry Demo]
        ms(Microservice)
        end

        ms -.->|"OTLP<br/>gRPC"| oc-grpc
        ms -.->|"OTLP<br/>HTTP POST"| oc-http

        subgraph oc[OTel Collector]
            style oc fill:#97aef3,color:black;
            oc-grpc[/"OTLP Receiver<br/>listening on<br/>grpc://localhost:4317"/]
            oc-http[/"OTLP Receiver<br/>listening on <br/>localhost:4318<br/>"/]
            oc-proc(Processors)
            oc-spanmetrics[/"Span Metrics Connector"/]
            oc-prom[/"OTLP HTTP Exporter"/]
            oc-otlp[/"OTLP Exporter"/]
            oc-opensearch[/"OpenSearch Exporter"/]

            oc-grpc --> oc-proc
            oc-http --> oc-proc

            oc-proc --> oc-prom
            oc-proc --> oc-otlp
            oc-proc --> oc-opensearch
            oc-proc --> oc-spanmetrics
            oc-spanmetrics --> oc-prom

            oc-opamp[/"OpAMP Extension"/]

        end

        oc-prom -->|"localhost:9090/api/v1/otlp"| pr-sc
        oc-otlp -->|gRPC| ja-col
        oc-opensearch -->|HTTP| os-http

        subgraph op[OpAMP Server]
            style op fill:#a6ce39,color:black;
            op-srv["OpAMP Server"]
            op-http[/"OpAMP HTTP<br/>listening on<br/>localhost:8080/opamp/"/]

            op-srv --> op-http
        end

        oc-opamp -->|"reports status<br/>over WebSocket"| op-srv

        op-b{{"Browser<br/>OpAMP UI"}}
        op-http -->|"localhost:8080/opamp/"| op-b

        subgraph pr[Prometheus]
            style pr fill:#e75128,color:black;
            pr-sc[/"Prometheus OTLP Write Receiver"/]
            pr-tsdb[(Prometheus TSDB)]
            pr-http[/"Prometheus HTTP<br/>listening on<br/>localhost:9090"/]

            pr-sc --> pr-tsdb
            pr-tsdb --> pr-http
        end

        pr-b{{"Browser<br/>Prometheus UI"}}
        pr-http ---->|"localhost:9090/graph"| pr-b

        subgraph ja[Jaeger]
            style ja fill:#60d0e4,color:black;
            ja-col[/"Jaeger Collector<br/>listening on<br/>grpc://jaeger:4317"/]
            ja-db[(Jaeger DB)]
            ja-http[/"Jaeger HTTP<br/>listening on<br/>localhost:16686"/]

            ja-col --> ja-db
            ja-db --> ja-http
        end

        subgraph os[OpenSearch]
            style os fill:#005eb8,color:black;
            os-http[/"OpenSearch<br/>listening on<br/>localhost:9200"/]
            os-db[(OpenSearch Index)]

            os-http ---> os-db
        end

        subgraph gr[Grafana]
            style gr fill:#f8b91e,color:black;
            gr-srv["Grafana Server"]
            gr-http[/"Grafana HTTP<br/>listening on<br/>localhost:3000"/]

            gr-srv --> gr-http
        end

        pr-http --> |"localhost:9090/api"| gr-srv
        ja-http --> |"localhost:16686/api"| gr-srv
        os-http --> |"localhost:9200/api"| gr-srv

        ja-b{{"Browser<br/>Jaeger UI"}}
        ja-http ---->|"localhost:16686/search"| ja-b

        gr-b{{"Browser<br/>Grafana UI"}}
        gr-http -->|"localhost:3000/dashboard"| gr-b
    end
end
```

Find the **Protocol Buffer Definitions** in the `/pb/` directory.

---

## Collector Data Flow Dashboard

> **Source:** https://opentelemetry.io/docs/demo/collector-data-flow-dashboard/

Monitoring data flow through the OpenTelemetry Collector is crucial for several
reasons. Gaining a macro-level perspective on incoming data, such as sample
counts and cardinality, is essential for comprehending the collector’s internal
dynamics. However, when delving into the details, the interconnections can
become complex. The Collector Data Flow Dashboard aims to demonstrate the
capabilities of the OpenTelemetry demo application, offering a solid foundation
for users to build upon. Collector Data Flow Dashboard provides valuable
guidance on which metrics to monitor. Users can tailor their own dashboard
variations by adding necessary metrics specific to their use cases, such as
memory\_delimiter processor or other data flow indicators. This demo dashboard
serves as a starting point, enabling users to explore diverse usage scenarios
and adapt the tool to their unique monitoring needs.

## Data Flow Overview

The diagram below provides an overview of the system components, showcasing the
configuration derived from the OpenTelemetry Collector (otelcol) configuration
file utilized by the OpenTelemetry demo application. Additionally, it highlights
the observability data (traces and metrics) flow within the system.

![OpenTelemetry Collector Overview](https://opentelemetry.io/docs/demo/collector-data-flow-dashboard/otelcol-data-flow-overview.png)

## Ingress/Egress Metrics

The metrics depicted in the diagram below are employed to monitor both egress
and ingress data flows. These metrics are generated by the otelcol process,
exported on port 8888, and subsequently scraped by Prometheus. The namespace
associated with these metrics is “otelcol,” and the job name is labeled as
`otel.`

![OpenTelemetry Collector Ingress and Egress Metrics](https://opentelemetry.io/docs/demo/collector-data-flow-dashboard/otelcol-data-flow-metrics.png)

Labels serve as a valuable tool for identifying specific metric sets (such as
exporter, receiver, or job), enabling differentiation among metric sets within
the overall namespace. It is important to note that you will only encounter
refused metrics if the memory limits, as defined in the memory delimiter
processor, are exceeded.

### Ingress Traces Pipeline

- `otelcol_receiver_accepted_spans`
- `otelcol_receiver_refused_spans`
- `by (receiver,transport)`

### Ingress Metrics Pipeline

- `otelcol_receiver_accepted_metric_points`
- `otelcol_receiver_refused_metric_points`
- `by (receiver,transport)`

### Processor

Currently, the only processor present in the demo application is a batch
processor, which is used by both traces and metrics pipelines.

- `otelcol_processor_batch_batch_send_size_sum`

### Egress Traces Pipeline

- `otelcol_exporter_sent_spans`
- `otelcol_exporter_send_failed_spans`
- `by (exporter)`

### Egress Metrics Pipeline

- `otelcol_exporter_sent_metric_points`
- `otelcol_exporter_send_failed_metric_points`
- `by (exporter)`

### Prometheus Scraping

- `scrape_samples_scraped`
- `by (job)`

## Dashboard

You can access the dashboard by navigating to the Grafana UI, selecting the
**OpenTelemetry Collector** dashboard under browse icon on the left-hand side of
the screen.

![OpenTelemetry Collector dashboard](https://opentelemetry.io/docs/demo/collector-data-flow-dashboard/otelcol-data-flow-dashboard.png)

The dashboard has four main sections:

1. Process Metrics
2. Traces Pipeline
3. Metrics Pipeline
4. Prometheus Scraping

Sections 2,3 and 4 represent overall data flow using the metrics mentioned
above. Additionally, export ratio is calculated for each pipeline to understand
the data flow.

### Export Ratio

Export ratio is basically the ratio between receiver and exporter metrics. You
can notice over the dashboard screenshot above that the export ratio on metrics
is way too high than the received metrics. This is because the demo application
is configured to generate span metrics which is a processor that generates
metrics from spans inside collector as illustrated in overview diagram.

### Process Metrics

Very limited but informative process metrics are added to dashboard. For
example, you might observe more than one instance of otelcol running on the
system during restarts or similar. This can be useful for understanding spikes
on dataflow.

![OpenTelemetry Collector Process Metrics](https://opentelemetry.io/docs/demo/collector-data-flow-dashboard/otelcol-dashboard-process-metrics.png)

---

## Development

> **Source:** https://opentelemetry.io/docs/demo/development/

[OpenTelemetry Demo GitHub repository](https://github.com/open-telemetry/opentelemetry-demo)

Development for this demo requires tooling in several programming languages.
Minimum required versions will be noted where possible, but it is recommended to
update to the latest version for all tooling. The OpenTelemetry demo team will
attempt to keep the services in this repository up to date with the latest
version for dependencies and tooling when possible.

## Generate protobuf files

The `make generate-protobuf` command is provided to generate protobuf files for
all services. This can be used to compile code locally (without Docker) and
receive hints from IDEs such as IntelliJ or VS Code. It may be necessary to run
`npm install` within the frontend source folder before generating the files.

## Development tooling requirements

### .NET

- .NET 8.0+

### C++

- build-essential
- cmake
- libcurl4-openssl-dev
- libprotobuf-dev
- nlohmann-json3-dev
- pkg-config
- protobuf-compiler

### Go

- Go 1.19+
- protoc-gen-go
- protoc-gen-go-grpc

### Java

- JDK 17+
- Gradle 7+

### JavaScript

- Node.js 16+

### PHP

- PHP 8.1+
- Composer 2.4+

### Python

- Python 3.10
- grpcio-tools 1.48+

### Ruby

- Ruby 3.1+

### Rust

- Rust 1.61+
- protoc 3.21+
- protobuf-dev

---

## Docker deployment

> **Source:** https://opentelemetry.io/docs/demo/docker-deployment/

## Prerequisites

- Docker
- [Docker Compose](https://docs.docker.com/compose/install/) v2.0.0+
- Make (optional)
- 6 GB of RAM for the application (or ~3 GB using
  [minimal mode](#run-in-minimal-mode))
- 14 GB of disk space

## Get and run the demo

1. Clone the Demo repository:

   ```
   git clone https://github.com/open-telemetry/opentelemetry-demo.git
   ```
2. Change to the demo folder:

   ```
   cd opentelemetry-demo/
   ```
3. Start the demo[1](#fn:1):

   ```
   make start
   ```

   ```
   docker compose up --force-recreate --remove-orphans --detach
   ```

   ### Run in minimal mode

   If you have limited resources, you can start the demo without Kafka and its
   dependent services, reducing memory usage to approximately 3 GB of RAM:

   ```
   make start-minimal
   ```

   ```
   docker compose -f docker-compose.minimal.yml up --force-recreate --remove-orphans --detach
   ```

   The following services are **not** included in minimal mode:

   - `accounting`
   - `fraud-detection`
   - `flagd-ui`
   - `kafka`
4. (Optional) Enable API observability-driven testing[1](#fn:1):

   ```
   make run-tracetesting
   ```

   ```
   docker compose -f docker-compose-tests.yml run traceBasedTests
   ```

## Verify the web store and Telemetry

Once the images are built and containers are started you can access:

- Web store: <http://localhost:8080/>
- Grafana: <http://localhost:8080/grafana/>
- Jaeger UI: <http://localhost:8080/jaeger/ui/>
- OpAMP UI: <http://localhost:8080/opamp/>
- Tracetest UI: <http://localhost:11633/>, only when using
  `make run-tracetesting`
- Flagd configurator UI: <http://localhost:8080/feature>

## Changing the demo’s primary port number

By default, the demo application will start a proxy for all browser traffic
bound to port 8080. To change the port number, set the `ENVOY_PORT` environment
variable before starting the demo.

- For example, to use port 8081[1](#fn:1):

  ```
  ENVOY_PORT=8081 make start
  ```

  ```
  ENVOY_PORT=8081 docker compose up --force-recreate --remove-orphans --detach
  ```

## Bring your own backend

Likely you want to use the web store as a demo application for an observability
backend you already have (e.g., an existing instance of Jaeger, Zipkin, or one
of the [vendors of your choice](https://opentelemetry.io/ecosystem/vendors/)).

OpenTelemetry Collector can be used to export telemetry data to multiple
backends. By default, the collector in the demo application will merge the
configuration from two files:

- `otelcol-config.yml`
- `otelcol-config-extras.yml`

To add your backend, open the file
[src/otel-collector/otelcol-config-extras.yml](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/otel-collector/otelcol-config-extras.yml)
with an editor.

- Start by adding a new exporter. For example, if your backend supports OTLP
  over HTTP, add the following:

  ```
  exporters:
    otlphttp/example:
      endpoint: <your-endpoint-url>
  ```
- Then override the `exporters` for telemetry pipelines that you want to use for
  your backend.

  ```
  service:
    pipelines:
      traces:
        exporters: [spanmetrics, otlphttp/example]
  ```

Note

When merging YAML values with the Collector, objects are merged and arrays are
replaced. The `spanmetrics` exporter must be included in the array of
exporters for the `traces` pipeline if overridden. Not including this exporter
will result in an error.

Vendor backends might require you to add additional parameters for
authentication, please check their documentation. Some backends require
different exporters, you may find them and their documentation available at
[opentelemetry-collector-contrib/exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter).

After updating the `otelcol-config-extras.yml`, start the demo by running
`make start`. After a while, you should see the traces flowing into your backend
as well.

---

1. `docker-compose` is deprecated. For details, see
   [Migrate to Compose V2](https://docs.docker.com/compose/). [↩︎](#fnref:1) [↩︎](#fnref1:1) [↩︎](#fnref2:1)

---

## Feature Flags

> **Source:** https://opentelemetry.io/docs/demo/feature-flags/

The demo provides several feature flags that you can use to simulate different
scenarios. These flags are managed by [`flagd`](https://flagd.dev), a simple
feature flag service that supports [OpenFeature](https://openfeature.dev).

Flag values can be changed through the user interface provided at
<http://localhost:8080/feature> when running the demo. Changing the values
through this user interface will be reflected in the flagd service.

There are two options when it comes to changing the feature flags through the
user interface:

- **Basic View**: A user friendly view in which default variants (the same
  options that need to be changed when configuring through the raw file) can be
  selected and saved for each feature flag. Currently, the basic view does not
  support fractional targeting.
- **Advanced View**: A view in which the raw configuration JSON file is loaded
  and can be edited within the browser. The view provides the flexibility that
  comes with editing a raw JSON file, however it also provides schema checking
  to ensure that the JSON is valid and that the provided configuration values
  are correct.

## Implemented feature flags

| Feature Flag | Service(s) | Description |
| --- | --- | --- |
| `adServiceFailure` | Ad | Generate an error for `GetAds` 1/10th of the time |
| `adServiceManualGc` | Ad | Trigger full manual garbage collections in the ad service |
| `adServiceHighCpu` | Ad | Trigger high cpu load in the ad service. If you want to demo cpu throttling, set cpu resource limits |
| `cartServiceFailure` | Cart | Generate an error whenever `EmptyCart` is called |
| `emailMemoryLeak` | Email | Simulate a memory leak in the `email` service. |
| `productCatalogFailure` | Product Catalog | Generate an error for `GetProduct` requests with product ID: `OLJCESPC7Z` |
| `recommendationServiceCacheFailure` | Recommendation | Create a memory leak due to an exponentially growing cache. 1.4x growth, 50% of requests trigger growth. |
| `paymentServiceFailure` | Payment | Generate an error when calling the `charge` method. |
| `paymentServiceUnreachable` | Checkout | Use a bad address when calling the PaymentService to make it seem like the PaymentService is unavailable. |
| `loadgeneratorFloodHomepage` | Load Generator | Start flooding the homepage with a huge amount of requests, configurable by changing flagd JSON on state. |
| `kafkaQueueProblems` | Kafka | Overloads Kafka queue while simultaneously introducing a consumer side delay leading to a lag spike. |
| `imageSlowLoad` | Frontend | Utilizes envoy fault injection, produces a delay in loading of product images in the frontend. |
| `failedReadinessProbe` | Cart | Force the readiness probe to fail with unhealthy status, simulating a pod “NotReady” condition. Applicable for Kubernetes deployments only. |

## Guided Debugging Scenario

The `recommendationServiceCacheFailure` scenario has a
[dedicated walkthrough document](https://opentelemetry.io/recommendation-cache/) to help understand how
you can debug memory leaks with OpenTelemetry.

## Feature Flag Architecture

Please see the [flagd documentation](https://flagd.dev) for more information on
how flagd works, and the [OpenFeature](https://openfeature.dev) website for more
information on how OpenFeature works, along with documentation for the
OpenFeature API.

---

##### [Using Metrics and Traces to diagnose a memory leak](https://opentelemetry.io/docs/demo/feature-flags/recommendation-cache/)

---

### Using Metrics and Traces to diagnose a memory leak

> **Source:** https://opentelemetry.io/docs/demo/feature-flags/recommendation-cache/

Application telemetry, such as the kind that OpenTelemetry can provide, is very
useful for diagnosing issues in a distributed system. In this scenario, we will
walk through a scenario demonstrating how to move from high-level metrics and
traces to determine the cause of a memory leak.

## Setup

To run this scenario, you will need to deploy the demo application and enable
the `recommendationServiceCacheFailure` feature flag. Let the application run
for about 10 minutes or so after enabling the feature flag to allow for data to
populate.

## Diagnosis

The first step in diagnosing a problem is to determine that a problem exists.
Often the first stop will be a metrics dashboard provided by a tool such as
Grafana.

A [demo dashboard folder](http://localhost:8080/grafana/dashboards) should exist
after launching the demo with two dashboards; One is to monitor your
OpenTelemetry Collector, and the other contains several queries and charts to
analyze latency and request rate from each service.

![Grafana dashboard](https://opentelemetry.io/docs/demo/feature-flags/recommendation-cache/grafana-dashboard.png)

This dashboard will contain a number of charts, but a few should appear
interesting:

- Recommendation Service (CPU% and Memory)
- Service Latency (from SpanMetrics)
- Error Rate

Recommendation Service charts are generated from OpenTelemetry Metrics exported
to Prometheus, while the Service Latency and Error Rate charts are generated
through the OpenTelemetry Collector Span Metrics processor.

From our dashboard, we can see that there seems to be anomalous behavior in the
recommendation service – spiky CPU utilization, as well as long tail latency in
our p95, 99, and 99.9 histograms. We can also see that there are intermittent
spikes in the memory utilization of this service.

We know that we’re emitting trace data from our application as well, so let’s
think about another way that we’d be able to determine that a problem exists.

![Jaeger](https://opentelemetry.io/docs/demo/feature-flags/recommendation-cache/jaeger.png)

Jaeger allows us to search for traces and display the end-to-end latency of an
entire request with visibility into each individual part of the overall request.
Perhaps we noticed an increase in tail latency on our frontend requests. Jaeger
allows us to then search and filter our traces to include only those that
include requests to the recommendation service.

By sorting by latency, we’re able to quickly find specific traces that took a
long time. Clicking on a trace in the right panel, we’re able to view the
waterfall view.

![Jaeger waterfall](https://opentelemetry.io/docs/demo/feature-flags/recommendation-cache/jaeger-waterfall.png)

We can see that the recommendation service is taking a long time to complete its
work, and viewing the details allows us to get a better idea of what’s going on.

## Confirming the Diagnosis

We can see in our waterfall view that the `app.cache_hit` attribute is set to
false, and that the `app.products.count` value is extremely high.

Returning to the search UI, select `recommendation` in the Service dropdown, and
search for `app.cache_hit=true` in the Tags box. Notice that requests tend to be
faster when the cache is hit. Now search for `app.cache_hit=false` and compare
the latency. You should notice some changes in the visualization at the top of
the trace list.

Now, since this is a contrived scenario, we know where to find the underlying
bug in our code. However, in a real-world scenario, we may need to perform
further searching to find out what’s going on in our code, or the interactions
between services that cause it.

---

## Forking the demo repository

> **Source:** https://opentelemetry.io/docs/demo/forking/

The [demo repository](https://github.com/open-telemetry/opentelemetry-demo) is designed to be forked and used as a tool to show off
what you are doing with OpenTelemetry.

Setting up a fork or a demo usually only requires overriding some environment
variables and possibly replacing some container images.

Live demos can be added to the demo
[README](https://github.com/open-telemetry/opentelemetry-demo/blob/main/README.md?plain=1).

## Suggestions for Fork Maintainers

- If you’d like to enhance the telemetry data emitted or collected by the demo,
  then we strongly encourage you to backport your changes to this repository.
  For vendor or implementation specific changes, a strategy of modifying
  telemetry in the pipeline via config is preferable to underlying code changes.
- Extend rather than replace. Adding net-new services that interface with the
  existing API is a great way to add vendor-specific or tool-specific features
  that can’t be accomplished through telemetry modification.
- To support extensibility, please use repository or facade patterns around
  resources like queues, databases, caches, etc. This will allow for different
  implementations of these services to be shimmed in for different platforms.
- Please do not attempt to backport vendor or tool-specific enhancements to this
  repository.

If you have any questions or would like to suggest ways that we can make your
life easier as a fork maintainer, please open an issue.

---

## Kubernetes deployment

> **Source:** https://opentelemetry.io/docs/demo/kubernetes-deployment/

We provide a
[OpenTelemetry Demo Helm chart](https://opentelemetry.io/docs/platforms/kubernetes/helm/demo/) to help
deploy the demo to an existing Kubernetes cluster.

[Helm](https://helm.sh) must be installed to use the charts. Please refer to
Helm’s [documentation](https://helm.sh/docs/) to get started.

## Prerequisites

- Kubernetes 1.24+
- 6 GB of free RAM for the application
- Helm 3.14+ (for Helm installation method only)

## Install using Helm

Add OpenTelemetry Helm repository:

```
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
```

To install the chart with the release name my-otel-demo, run the following
command:

```
helm install my-otel-demo open-telemetry/opentelemetry-demo
```

Note

The OpenTelemetry Demo Helm chart does not support being upgraded from one
version to another. If you need to upgrade the chart, you must first delete
the existing release and then install the new version.

Note

The OpenTelemetry Demo Helm chart version 0.11.0 or greater is required to
perform all usage methods mentioned below.

### Use Helm to generate a Kubernetes manifests

The following command will generate a single Kubernetes manifest file which will
contain a definition for all required resources. You can apply this manifest
using `kubectl apply -f opentelemetry-demo.yaml` after generating it.

```
helm template opentelemetry-demo open-telemetry/opentelemetry-demo --namespace otel-demo > opentelemetry-demo.yaml
```

Note

The OpenTelemetry Demo Kubernetes manifests do not support being upgraded from
one version to another. If you need to upgrade the demo, you must first delete
the existing resources and then install the new version.

## Use the Demo

The demo application will need the services exposed outside of the Kubernetes
cluster in order to use them. You can expose the services to your local system
using the `kubectl port-forward` command or by configuring service types (ie:
LoadBalancer) with optionally deployed ingress resources.

### Expose services using kubectl port-forward

To expose the frontend-proxy service use the following command (replace
`default` with your Helm chart release namespace accordingly):

```
kubectl --namespace default port-forward svc/frontend-proxy 8080:8080
```

Note

`kubectl port-forward` proxies the port until the process terminates. You
might need to create separate terminal sessions for each use of
`kubectl port-forward`, and use `Ctrl-C` to terminate the process
when done.

With the frontend-proxy port-forward set up, you can access:

- Web store: <http://localhost:8080/>
- Grafana: <http://localhost:8080/grafana/>
- Jaeger UI: <http://localhost:8080/jaeger/ui/>
- Flagd configurator UI: <http://localhost:8080/feature>

### Expose Demo components using service or ingress configurations

Note

We recommend that you use a values file when installing the Helm chart in
order to specify additional configuration options.

#### Configure ingress resources

Note

Kubernetes clusters might not have the proper infrastructure components to
enable LoadBalancer service types or ingress resources. Verify your cluster
has the proper support before using these configuration options.

Each demo component (ie: frontend-proxy) offers a way to have its Kubernetes
service type configured. By default, these will not be created, but you can
enable and configure them through the `ingress` property of each component.

To configure the frontend-proxy component to use an ingress resource you would
specify the following in your values file:

```
components:
  frontend-proxy:
    ingress:
      enabled: true
      annotations: {}
      hosts:
        - host: otel-demo.my-domain.com
          paths:
            - path: /
              pathType: Prefix
              port: 8080
```

Some ingress controllers require special annotations or service types. Refer to
the documentation from your ingress controller for more information.

#### Configure service types

Each demo component (ie: frontend-proxy) offers a way to have its Kubernetes
service type configured. By default, these will be `ClusterIP` but you can
change each one using the `service.type` property of each component.

To configure the frontend-proxy component to use a LoadBalancer service type you
would specify the following in your values file:

```
components:
  frontend-proxy:
    service:
      type: LoadBalancer
```

#### Configure browser telemetry

In order for spans from the browser to be properly collected, you will also need
to specify the location where the OpenTelemetry Collector is exposed. The
frontend-proxy defines a route for the collector with a path prefix of
`/otlp-http`. You can configure the collector endpoint by setting the following
environment variable on the frontend component:

```
components:
  frontend:
    envOverrides:
      - name: PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
        value: http://otel-demo.my-domain.com/otlp-http/v1/traces
```

## Bring your own backend

Likely you want to use the web store as a demo application for an observability
backend you already have (e.g. an existing instance of Jaeger, Zipkin, or one of
the [vendor of your choice](https://opentelemetry.io/ecosystem/vendors/)).

The OpenTelemetry Collector’s configuration is exposed in the Helm chart. Any
additions you do will be merged into the default configuration.

You can create a custom file (e.g., `my-values-file.yaml`) and use it to add
your own exporters to the desired pipeline(s):

```
opentelemetry-collector:
  config:
    exporters:
      otlphttp/example:
        endpoint: <your-endpoint-url>

    service:
      pipelines:
        traces:
          exporters: [spanmetrics, otlphttp/example]
```

Note

When merging YAML values with Helm, objects are merged and arrays are
replaced. The `spanmetrics` exporter must be included in the array of
exporters for the `traces` pipeline if overridden. Not including this exporter
will result in an error.

Vendor backends might require you to add additional parameters for
authentication, please check their documentation. Some backends require
different exporters, you may find them and their documentation available at
[opentelemetry-collector-contrib/exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter).

To install the Helm chart with a custom `my-values-file.yaml` values file use:

```
helm install my-otel-demo open-telemetry/opentelemetry-demo --values my-values-file.yaml
```

---

## Demo Requirements

> **Source:** https://opentelemetry.io/docs/demo/requirements/

The following documents capture the Application, OpenTelemetry (OTel), and
System requirements for our shared demo application. These were decided upon in
the ongoing SIG meeting.

1. [Application Requirements](https://opentelemetry.io/application/)
2. [OpenTelemetry Requirements](https://opentelemetry.io/opentelemetry/)
3. [System Requirements](https://opentelemetry.io/system/)

## Target Personas

We’re building the demo application with several different target personas in
mind:

1. **Enthusiasts** at a company that can use the demo app as an individual to
   advocate for OTel within their organization.
2. **Developers** with specific language skills who want to see a larger picture
   view.
3. **APM Vendors** who can evaluate OTel in general or need to produce a demo of
   their OTel capabilities for customers.
4. **Enterprises** considering adopting OTel and interested in understanding
   what a production-lite experience would be.

---

##### [Application Requirements](https://opentelemetry.io/docs/demo/requirements/application/)

##### [Architecture Requirements](https://opentelemetry.io/docs/demo/requirements/architecture/)

##### [OpenTelemetry Requirements](https://opentelemetry.io/docs/demo/requirements/opentelemetry/)

##### [System Requirements](https://opentelemetry.io/docs/demo/requirements/system/)

---

### Application Requirements

> **Source:** https://opentelemetry.io/docs/demo/requirements/application/

The following requirements were decided upon to define what OpenTelemetry (OTel)
signals the application will produce & when support for future SDKs should be
added:

1. Every supported language that has a GA Traces or Metrics SDK must have at
   least 1 service example.

   - Mobile support (Swift) is not an initial priority and not included in the
     above requirement.
2. Application processes must be language independent.

   - gRPC is preferred where available and HTTP is to be used where it is not.
3. Services should be architected to be modular components that can be switched
   out.

   - Individual services can and should be encouraged to have multiple language
     options available.
4. The architecture must allow for the possible integration of platform generic
   components like a database, queue, or blob storage.

   - There is no requirement for a particular component type - at least 1
     generic component should be present in general.
5. A load generator must be provided to simulate user load against the demo.

---

### Architecture Requirements

> **Source:** https://opentelemetry.io/docs/demo/requirements/architecture/

## Summary

The OpenTelemetry Community Demo application is intended to be a showcase for
OpenTelemetry API, SDK, and tools in a production-lite cloud native application.
The overall goal of this application is not only to provide a canonical ‘demo’
of OpenTelemetry components, but also to act as a framework for further
customization by end-users, vendors, and other stakeholders.

### Requirements

- [Application Requirements](https://opentelemetry.io/application/)
- [OpenTelemetry Requirements](https://opentelemetry.io/opentelemetry/)
- [System Requirements](https://opentelemetry.io/system/)

### Application Goals

- Provide developers with a robust sample application they can use in learning
  OpenTelemetry instrumentation.
- Provide observability vendors with a single, well-supported, demo platform
  that they can further customize (or simply use OOB).
- Provide the OpenTelemetry community with a living artifact that demonstrates
  the features and capabilities of OTel APIs, SDKs, and tools.
- Provide OpenTelemetry maintainers and WGs a platform to demonstrate new
  features/concepts ‘in the wild’.

The following is a general description of the logical components of the demo
application.

## Main Application

The bulk of the demo app is a self-contained microservice-based application that
does some useful ‘real-world’ work, such as an eCommerce site. This application
is composed of multiple services that communicate with each other over gRPC and
HTTP and runs on Kubernetes (or Docker, locally).

Each service shall be instrumented with OpenTelemetry for traces, metrics, and
logs (as applicable/available).

Each service should be interchangeable with a service that performs the same
business logic, implementing the same gRPC endpoints, but written in a different
language/implementation.

Each service should be able to communicate with a feature flag service in order
to enable/disable faults that can be used to illustrate how telemetry helps
solve problems in distributed applications.

## Feature Flag Component

Feature flagging is a crucial part of cloud native application development. The
demo uses OpenFeature, a CNCF incubating project, to manage feature flags.

Feature flags can be set through the flagd configurator user interface.

## Orchestration and Deployment

All services run on Kubernetes. The OpenTelemetry Collector should be deployed
via the OpenTelemetry Operator, and run in a sidecar + gateway mode. Telemetry
from each pod should be routed from agents to a gateway, and the gateway should
export telemetry by default to an open source trace + metrics visualizer.

For local/non-Kubernetes deployment, the Collector should be deployed via
compose file and monitor not only traces/metrics from applications, but also the
docker containers via `dockerstatsreceiver`.

A design goal of this project is to include a CI/CD pipeline for self-deployment
into cloud environments. This could be skipped for local development.

---

### OpenTelemetry Requirements

> **Source:** https://opentelemetry.io/docs/demo/requirements/opentelemetry/

The following requirements were decided upon to define what OpenTelemetry (OTel)
signals the application will produce & when support for future SDKs should be
added:

1. The demo must produce OTel logs, traces, & metrics out of the box for
   languages that have a GA SDK.
2. Languages that have a Beta SDK available may be included but are not required
   like GA SDKs.
3. Native OTel metrics should be produced where possible.
4. Both manual instrumentation and instrumentation libraries
   (auto-instrumentation) should be demonstrated in each language.
5. All data should be exported to the Collector first.
6. The Collector must be configurable to allow for a variety of consumption
   experiences but default tools must be selected for each signal.
7. The demo application architecture using the Collector should be designed to
   be a best practices reference architecture.

---

### System Requirements

> **Source:** https://opentelemetry.io/docs/demo/requirements/system/

To ensure the demo runs correctly please ensure your environment meets the
following system requirements:

1. Your system must meet [Docker Desktop](https://docs.docker.com/desktop)
   system requirements or you should use your preferred Cloud Service.
2. The demo must be able to work on the following Operating Systems (OS): Linux,
   macOS and Windows with documentation provided for each OS.

---

## Sample Configurations

> **Source:** https://opentelemetry.io/docs/demo/sample-configurations/

This section provides sample OpenTelemetry Collector configurations that
demonstrate how to leverage resource attributes and processors available in the
demo application.

- [Tail-Based Sampling with `service.criticality`](https://opentelemetry.io/tail-sampling-service-criticality/)

---

##### [Tail-Based Sampling with service.criticality](https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/)

---

### Tail-Based Sampling with service.criticality

> **Source:** https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/

This example demonstrates how to use the
[`service.criticality`](https://opentelemetry.io/docs/specs/semconv/resource/service/#service) resource
attribute for intelligent tail-based sampling decisions in the OpenTelemetry
Collector.

The demo application assigns a `service.criticality` value to each service,
classifying them by operational importance:

| Criticality | Sampling Rate | Services |
| --- | --- | --- |
| `critical` | 100% | payment, checkout, frontend, frontend-proxy |
| `high` | 50% | cart, product-catalog, currency, shipping |
| `medium` | 10% | recommendation, ad, email |
| `low` | 1% | accounting, fraud-detection, image-provider, load-generator, quote, flagd, flagd-ui, Kafka |

## Collector Configuration

To enable tail-based sampling, add the following to your
`otelcol-config-extras.yml`:

```
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    policies:
      # Policy 1: Always sample critical services (100%)
      - name: critical-services-always-sample
        type: string_attribute
        string_attribute:
          key: service.criticality
          values:
            - critical
          enabled_regex_matching: false
          invert_match: false

      # Policy 2: Sample 50% of high-criticality services
      - name: high-criticality-probabilistic
        type: and
        and:
          and_sub_policy:
            - name: is-high-criticality
              type: string_attribute
              string_attribute:
                key: service.criticality
                values:
                  - high
            - name: probabilistic-50
              type: probabilistic
              probabilistic:
                sampling_percentage: 50

      # Policy 3: Sample 10% of medium-criticality services
      - name: medium-criticality-probabilistic
        type: and
        and:
          and_sub_policy:
            - name: is-medium-criticality
              type: string_attribute
              string_attribute:
                key: service.criticality
                values:
                  - medium
            - name: probabilistic-10
              type: probabilistic
              probabilistic:
                sampling_percentage: 10

      # Policy 4: Sample 1% of low-criticality services
      - name: low-criticality-probabilistic
        type: and
        and:
          and_sub_policy:
            - name: is-low-criticality
              type: string_attribute
              string_attribute:
                key: service.criticality
                values:
                  - low
            - name: probabilistic-1
              type: probabilistic
              probabilistic:
                sampling_percentage: 1

      # Policy 5: Always sample error traces regardless of criticality
      - name: errors-always-sample
        type: status_code
        status_code:
          status_codes:
            - ERROR

      # Policy 6: Always sample slow traces from critical/high services
      - name: slow-critical-traces
        type: and
        and:
          and_sub_policy:
            - name: is-critical-or-high
              type: string_attribute
              string_attribute:
                key: service.criticality
                values:
                  - critical
                  - high
            - name: is-slow
              type: latency
              latency:
                threshold_ms: 5000

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, memory_limiter, transform, tail_sampling]
      exporters: [otlp, debug, spanmetrics]
```

## How It Works

The tail-sampling processor evaluates completed traces against the configured
policies. A trace is sampled if **any** policy matches:

- **Critical services** are always sampled to ensure full visibility into
  payment flows, checkout, and user-facing services.
- **High-criticality services** are sampled at 50%, balancing observability with
  data volume.
- **Medium and low-criticality services** are progressively sampled at lower
  rates to reduce noise from less critical paths.
- **Errors are always captured** regardless of service criticality, ensuring no
  issues go unnoticed.
- **Slow traces** (>5s) from critical and high-criticality services are always
  sampled to help identify performance bottlenecks.

---

## Demo Screenshots

> **Source:** https://opentelemetry.io/docs/demo/screenshots/

## Web store

| Home Page | Checkout Screen |
| --- | --- |
| frontend-1 | frontend-2 |

## Jaeger

| Jaeger UI | Trace View |
| --- | --- |
| jaeger-ui | jaeger-trace-view |

| System Architecture |
| --- |
| jaeger-system-architecture |

## Prometheus

![Prometheus](https://opentelemetry.io/docs/demo/screenshots/prometheus.png)

## Grafana

| Prometheus Data Source | Jaeger Data Source |
| --- | --- |
| Grafana-Prometheus | Grafana-jaeger |

## Flagd Configurator

| Basic view | Advanced view |
| --- | --- |
| flagd-ui-basic-view | flagd-ui-advanced-view |

---

## Self-Observability Dashboard

> **Source:** https://opentelemetry.io/docs/demo/self-observability-dashboard/

The OpenTelemetry SDKs can emit their own internal metrics (using the
experimental
[`otel.sdk.*` semantic conventions](https://opentelemetry.io/docs/specs/semconv/otel/sdk-metrics/)) that
describe how the SDK is behaving — for example whether a service is dropping
telemetry, how long exports take, or whether processor queues are filling up.
The demo’s **Self-Observability** dashboard visualizes these metrics across the
span, log, and metric pipelines.

## Enabling SDK self-observability

SDK self-observability is opt-in and still experimental, and is enabled through
SDK configuration on a per-service basis. In the demo, the `ad`,
`fraud-detection`, and `kafka` services opt in. The dashboard is driven by a
`Service` template variable, so any additional service that opts in appears
automatically.

## Accessing the dashboard

Once the demo is running, open the dashboard directly at
<http://localhost:8080/grafana/d/self-observability>, or navigate to it from the
Grafana dashboard list (“Self-Observability”).

---

## Services

> **Source:** https://opentelemetry.io/docs/demo/services/

To visualize request flows, see the [Service Diagram](https://opentelemetry.io/architecture/).

| Service | Language | Description |
| --- | --- | --- |
| [accounting](https://opentelemetry.io/accounting/) | .NET | Processes incoming orders and count the sum of all orders (mock/). |
| [ad](https://opentelemetry.io/ad/) | Java | Provides text ads based on given context words. |
| [cart](https://opentelemetry.io/cart/) | .NET | Stores the items in the user’s shopping cart in Valkey and retrieves it. |
| [checkout](https://opentelemetry.io/checkout/) | Go | Retrieves user cart, prepares order and orchestrates the payment, shipping and the email notification. |
| [currency](https://opentelemetry.io/currency/) | C++ | Converts one money amount to another currency. Uses real values fetched from European Central Bank. It’s the highest QPS service. |
| [email](https://opentelemetry.io/email/) | Ruby | Sends users an order confirmation email (mock/). |
| [flagd-ui](https://opentelemetry.io/flagd-ui/) | Elixir | Allows toggling and editing of feature flags. |
| [fraud-detection](https://opentelemetry.io/fraud-detection/) | Kotlin | Analyzes incoming orders and detects fraud attempts (mock/). |
| [frontend](https://opentelemetry.io/frontend/) | TypeScript | Exposes an HTTP server to serve the website. Does not require sign up / login and generates session IDs for all users automatically. |
| [load-generator](https://opentelemetry.io/load-generator/) | Go/k6 | Continuously sends requests imitating realistic user shopping flows to the frontend. |
| [payment](https://opentelemetry.io/payment/) | JavaScript | Charges the given credit card info (mock/) with the given amount and returns a transaction ID. |
| [product-catalog](https://opentelemetry.io/product-catalog/) | Go | Provides the list of products from a JSON file and ability to search products and get individual products. |
| [quote](https://opentelemetry.io/quote/) | PHP | Calculates the shipping costs, based on the number of items to be shipped. |
| [recommendation](https://opentelemetry.io/recommendation/) | Python | Recommends other products based on what’s given in the cart. |
| [shipping](https://opentelemetry.io/shipping/) | Rust | Gives shipping cost estimates based on the shopping cart. Ships items to the given address (mock/). |
| [react-native-app](https://opentelemetry.io/react-native-app/) | TypeScript | React Native mobile application that provides a UI on top of the shopping services. |

---

##### [Accounting Service](https://opentelemetry.io/docs/demo/services/accounting/)

##### [Ad Service](https://opentelemetry.io/docs/demo/services/ad/)

##### [Cart Service](https://opentelemetry.io/docs/demo/services/cart/)

##### [Checkout Service](https://opentelemetry.io/docs/demo/services/checkout/)

##### [Currency Service](https://opentelemetry.io/docs/demo/services/currency/)

##### [Email Service](https://opentelemetry.io/docs/demo/services/email/)

##### [Flagd-UI Service](https://opentelemetry.io/docs/demo/services/flagd-ui/)

##### [Fraud Detection Service](https://opentelemetry.io/docs/demo/services/fraud-detection/)

##### [Frontend](https://opentelemetry.io/docs/demo/services/frontend/)

##### [Frontend Proxy (Envoy)](https://opentelemetry.io/docs/demo/services/frontend-proxy/)

##### [Image Provider Service](https://opentelemetry.io/docs/demo/services/image-provider/)

##### [Kafka](https://opentelemetry.io/docs/demo/services/kafka/)

##### [Load Generator](https://opentelemetry.io/docs/demo/services/load-generator/)

##### [Payment Service](https://opentelemetry.io/docs/demo/services/payment/)

##### [Product Catalog Service](https://opentelemetry.io/docs/demo/services/product-catalog/)

##### [Quote Service](https://opentelemetry.io/docs/demo/services/quote/)

##### [React Native App](https://opentelemetry.io/docs/demo/services/react-native-app/)

##### [Recommendation Service](https://opentelemetry.io/docs/demo/services/recommendation/)

##### [Shipping Service](https://opentelemetry.io/docs/demo/services/shipping/)

---

### Accounting Service

> **Source:** https://opentelemetry.io/docs/demo/services/accounting/

This service calculates the total amount of sold products. This calculation is
currently mocked and received orders are printed out. Once a record is retrieved
from Kafka, it is saved to the database (PostgreSQL).

[Accounting Service](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/accounting/)

## Auto-instrumentation

This service relies on the OpenTelemetry .NET Automatic Instrumentation to
automatically instrument libraries such as Kafka, and to configure the
OpenTelemetry SDK. The instrumentation is added via Nuget package
[OpenTelemetry.AutoInstrumentation](https://www.nuget.org/packages/OpenTelemetry.AutoInstrumentation)
and activated using environment variables that are sourced from `instrument.sh`.
Using this installation approach also guarantees that all instrumentation
dependencies are properly aligned with the application.

## Publishing

Add `--use-current-runtime` to the `dotnet publish` command to distribute
appropriate native runtime components.

```
dotnet publish "./AccountingService.csproj" --use-current-runtime -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false
```

---

### Ad Service

> **Source:** https://opentelemetry.io/docs/demo/services/ad/

This service determines appropriate ads to serve to users based on context keys.
The ads will be for products available in the store.

[Ad service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/ad/)

## Auto-instrumentation

This service relies on the OpenTelemetry Java agent to automatically instrument
libraries such as gRPC, and to configure the OpenTelemetry SDK. The agent is
passed into the process using the `-javaagent` command line argument. Command
line arguments are added through the `JAVA_TOOL_OPTIONS` in the `Dockerfile`,
and leveraged during the automatically generated Gradle startup script.

```
ENV JAVA_TOOL_OPTIONS=-javaagent:/app/opentelemetry-javaagent.jar
```

## Traces

### Add attributes to auto-instrumented spans

Within the execution of auto-instrumented code you can get current span from
context.

```
Span span = Span.current();
```

Adding attributes to a span is accomplished using `setAttribute` on the span
object. In the `getAds` function multiple attributes are added to the span.

```
span.setAttribute("app.ads.contextKeys", req.getContextKeysList().toString());
span.setAttribute("app.ads.contextKeys.count", req.getContextKeysCount());
```

### Add span events

Adding an event to a span is accomplished using `addEvent` on the span object.
In the `getAds` function an event with an attribute is added when an exception
is caught.

```
span.addEvent("Error", Attributes.of(AttributeKey.stringKey("exception.message"), e.getMessage()));
```

### Setting span status

If the result of the operation is an error, the span status should be set
accordingly using `setStatus` on the span object. In the `getAds` function the
span status is set when an exception is caught.

```
span.setStatus(StatusCode.ERROR);
```

### Create new spans

New spans can be created and started using
`Tracer.spanBuilder("spanName").startSpan()`. Newly created spans should be set
into context using `Span.makeCurrent()`. The `getRandomAds` function will create
a new span, set it into context, perform an operation, and finally end the span.

```
// create and start a new span manually
Tracer tracer = GlobalOpenTelemetry.getTracer("ad");
Span span = tracer.spanBuilder("getRandomAds").startSpan();

// put the span into context, so if any child span is started the parent will be set properly
try (Scope ignored = span.makeCurrent()) {

  Collection<Ad> allAds = adsMap.values();
  for (int i = 0; i < MAX_ADS_TO_SERVE; i++) {
    ads.add(Iterables.get(allAds, random.nextInt(allAds.size())));
  }
  span.setAttribute("app.ads.count", ads.size());

} finally {
  span.end();
}
```

## Metrics

### Initializing Metrics

Similar to creating spans, the first step in creating metrics is initializing a
`Meter` instance, e.g. `GlobalOpenTelemetry.getMeter("ad")`. From there, use the
various builder methods available on the `Meter` instance to create the desired
metric instrument, e.g.:

```
meter
  .counterBuilder("app.ads.ad_requests")
  .setDescription("Counts ad requests by request and response type")
  .build();
```

### Bridging non-OTel custom metrics (Prometheus client library)

The Ad service also exposes a small set of custom metrics using the
[Prometheus Java client library](https://github.com/prometheus/client_java)
rather than the OpenTelemetry SDK. These metrics are exposed on a separate HTTP
endpoint (`/metrics` on `AD_PROMETHEUS_PORT`, default `9465`) and scraped by the
OpenTelemetry Collector’s
[`prometheus` receiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver),
which forwards them into the same pipeline as the OTel SDK metrics:

```
private static final Counter adsServedCounter =
    Counter.builder()
        .name("demo_ad_served_total")
        .help("Total number of ads served, labeled by category")
        .labelNames("category")
        .register();

HTTPServer prometheusServer =
    HTTPServer.builder().port(prometheusPort).buildAndStart();
```

Note

This is intentionally included to illustrate a **common pattern during OTel
adoption**: organizations frequently already own significant Prometheus
instrumentation – in libraries, third-party exporters, or legacy services –
and want to ingest those metrics into an OpenTelemetry-native pipeline without
rewriting everything upfront. The Collector’s `prometheus` receiver is the
bridge that makes this possible.

The Collector configuration that wires this up:

```
receivers:
  prometheus/ad:
    config:
      scrape_configs:
        - job_name: ad
          scrape_interval: 10s
          static_configs:
            - targets: ['ad:${env:AD_PROMETHEUS_PORT}']
```

Tip

**Recommendation**: treat this as a *transitional* pattern. For new custom
metrics, use the OpenTelemetry SDK directly. For existing Prometheus-client
metrics, migrate incrementally as you touch the surrounding code, or in a
focused refactor.

Common challenges when mixing OpenTelemetry and Prometheus telemetry:

- **Identity misalignment**: `service.name` and `service.instance.id` may not
  align across the two pipelines.
- **Dual mental models**: Prometheus and OTel use different concepts (labels
  vs. attributes, different semantic conventions) with separate APIs,
  ingestion pipelines, and potentially different enrichment rules.
- **Inconsistent code**: mixing Prometheus client calls for older metrics with
  OTel API calls for newer ones leaves the codebase without a single idiomatic
  style.

### Current Metrics Produced

Note that all the metric names below appear in Prometheus/Grafana with `.`
characters transformed to `_`.

#### Custom metrics

The following custom metrics are currently available:

- `app.ads.ad_requests` (OpenTelemetry SDK): A counter of ad requests with
  dimensions describing whether the request was targeted with context keys or
  not, and whether the response was targeted or random ads.
- `demo_ad_served_total` (Prometheus client library, scraped by the Collector):
  A counter of ads served, labeled by `category` (e.g. `telescopes`,
  `binoculars`, `random`). See
  [Bridging non-OTel custom metrics](#bridging-non-otel-custom-metrics-prometheus-client-library)
  above.

#### Auto-instrumented metrics

The following auto-instrumented metrics are available for the application:

- [Runtime metrics for the JVM](https://opentelemetry.io/docs/specs/semconv/runtime/jvm-metrics/).
- [Latency metrics for RPCs](https://opentelemetry.io/docs/specs/semconv/rpc/rpc-metrics/#rpc-server)

## Logs

Ad Service uses Log4J, which is automatically configured by the OTel Java agent.

It includes the trace context in log records, enabling log correlation with
traces.

---

### Cart Service

> **Source:** https://opentelemetry.io/docs/demo/services/cart/

This service maintains items placed in the shopping cart by users. It interacts
with a Valkey caching service for fast access to shopping cart data.

[Cart service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/cart/)

> **Note** OpenTelemetry for .NET uses the `System.Diagnostic.DiagnosticSource`
> library as its API instead of the standard OpenTelemetry API for Traces and
> Metrics. `Microsoft.Extensions.Logging.Abstractions` library is used for Logs.

## Traces

### Initializing Tracing

OpenTelemetry is configured in the .NET dependency injection container. The
`AddOpenTelemetry()` builder method is used to configure desired instrumentation
libraries, add exporters, and set other options. Configuration of the exporter
and resource attributes is performed through environment variables.

```
Action<ResourceBuilder> appResourceBuilder =
    resource => resource
        .AddContainerDetector()
        .AddHostDetector();

builder.Services.AddOpenTelemetry()
    .ConfigureResource(appResourceBuilder)
    .WithTracing(tracerBuilder => tracerBuilder
        .AddSource("OpenTelemetry.Demo.Cart")
        .AddRedisInstrumentation(
            options => options.SetVerboseDatabaseStatements = true)
        .AddAspNetCoreInstrumentation()
        .AddGrpcClientInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter());
```

### Add attributes to auto-instrumented spans

Within the execution of auto-instrumented code you can get current span
(activity) from context.

```
var activity = Activity.Current;
```

Adding attributes (tags in .NET) to a span (activity) is accomplished using
`SetTag` on the activity object. In the `AddItem` function from
`services/CartService.cs` several attributes are added to the auto-instrumented
span.

```
activity?.SetTag("app.user.id", request.UserId);
activity?.SetTag("app.product.quantity", request.Item.Quantity);
activity?.SetTag("app.product.id", request.Item.ProductId);
```

### Add span events

Adding span (activity) events is accomplished using `AddEvent` on the activity
object. In the `GetCart` function from `services/CartService.cs` a span event is
added.

```
activity?.AddEvent(new("Fetch cart"));
```

## Metrics

### Initializing Metrics

Similar to configuring OpenTelemetry Traces, the .NET dependency injection
container requires a call to `AddOpenTelemetry()`. This builder configures
desired instrumentation libraries, exporters, etc.

```
Action<ResourceBuilder> appResourceBuilder =
    resource => resource
        .AddContainerDetector()
        .AddHostDetector();

builder.Services.AddOpenTelemetry()
    .ConfigureResource(appResourceBuilder)
    .WithMetrics(meterBuilder => meterBuilder
        .AddMeter("OpenTelemetry.Demo.Cart")
        .AddProcessInstrumentation()
        .AddRuntimeInstrumentation()
        .AddAspNetCoreInstrumentation()
        .SetExemplarFilter(ExemplarFilterType.TraceBased)
        .AddOtlpExporter());
```

### Exemplars

[Exemplars](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars) are configured in
the Cart service with trace-based exemplar filter, which enables the
OpenTelemetry SDK to attach exemplars to metrics.

First it creates a `CartActivitySource`, `Meter` and two `Histograms`. The
histogram keeps track from the latency of the methods `AddItem` and `GetCart`,
as those are two important methods in the Cart service.

Those two methods are critical to the Cart service as users shouldn’t wait too
long when adding an item to the cart, or when viewing their cart before moving
to the checkout process.

```
private static readonly ActivitySource CartActivitySource = new("OpenTelemetry.Demo.Cart");
private static readonly Meter CartMeter = new Meter("OpenTelemetry.Demo.Cart");
private static readonly Histogram<long> addItemHistogram = CartMeter.CreateHistogram<long>(
    "app.cart.add_item.latency",
    advice: new InstrumentAdvice<long>
    {
        HistogramBucketBoundaries = [ 500000, 600000, 700000, 800000, 900000, 1000000, 1100000 ]
    });
private static readonly Histogram<long> getCartHistogram = CartMeter.CreateHistogram<long>(
    "app.cart.get_cart.latency",
    advice: new InstrumentAdvice<long>
    {
        HistogramBucketBoundaries = [ 300000, 400000, 500000, 600000, 700000, 800000, 900000 ]
    });
```

Note that a custom bucket boundary is also defined, as the default values don’t
fit the microseconds results Cart service has.

Once the variables are defined, the latency of the execution of each method is
tracked with a `StopWatch` as follows:

```
var stopwatch = Stopwatch.StartNew();

(method logic)

addItemHistogram.Record(stopwatch.ElapsedTicks);
```

To connect it all together, in the Traces pipeline, it is required to add the
created source. (Already present in the snippet above, but added here to
reference):

```
.AddSource("OpenTelemetry.Demo.Cart")
```

And, in the Metrics pipeline, the `Meter` and the `ExemplarFilter`:

```
.AddMeter("OpenTelemetry.Demo.Cart")
.SetExemplarFilter(ExemplarFilterType.TraceBased)
```

To visualize the Exemplars, navigate to Grafana
<http://localhost:8080/grafana> > Dashboards > Demo > Cart Service Exemplars.

Exemplars appear as special “diamond-shaped dots” on the 95th percentile chart
or as small squares on the heatmap chart. Select any exemplar to view its data,
which includes the timestamp of the measurement, the raw value, and the trace
context at the time of recording. The `trace_id` enables navigation to the
tracing backend (Jaeger, in this case).

![Cart Service Exemplars](https://opentelemetry.io/docs/demo/services/cart/exemplars.png)

## Logs

Logs are configured in the .NET dependency injection container on
`LoggingBuilder` level by calling `AddOpenTelemetry()`. This builder configures
desired options, exporters, etc.

```
builder.Logging
    .AddOpenTelemetry(options => options.AddOtlpExporter());
```

---

### Checkout Service

> **Source:** https://opentelemetry.io/docs/demo/services/checkout/

This service is responsible to process a checkout order from the user. The
checkout service will call many other services in order to process an order.

[Checkout service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/checkout/)

## Traces

### Initializing Tracing

The OpenTelemetry SDK is initialized from `main` using the `initTracerProvider`
function.

```
func initTracerProvider() *sdktrace.TracerProvider {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx)
    if err != nil {
        log.Fatal(err)
    }
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(initResource()),
    )
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))
    return tp
}
```

You should call `TracerProvider.Shutdown()` when your service is shutdown to
ensure all spans are exported. This service makes that call as part of a
deferred function in main

```
tp := initTracerProvider()
defer func() {
    if err := tp.Shutdown(context.Background()); err != nil {
        log.Printf("Error shutting down tracer provider: %v", err)
    }
}()
```

### Adding gRPC auto-instrumentation

This service receives gRPC requests, which are instrumented in the main function
as part of the gRPC server creation.

```
var srv = grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler()),
)
```

This service will issue several outgoing gRPC calls, which are all instrumented
by wrapping the gRPC client with instrumentation

```
func createClient(ctx context.Context, svcAddr string) (*grpc.ClientConn, error) {
    return grpc.DialContext(ctx, svcAddr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
    )
}
```

### Adding Kafka ( Sarama ) auto-instrumentation

This service will write the processed results onto a Kafka topic which will then
be in turn be processed by other microservices. To instrument the Kafka client
the Producer has to be wrapped after it has been created.

```
saramaConfig := sarama.NewConfig()
producer, err := sarama.NewAsyncProducer(brokers, saramaConfig)
if err != nil {
    return nil, err
}
producer = otelsarama.WrapAsyncProducer(saramaConfig, producer)
```

### Add attributes to auto-instrumented spans

Within the execution of auto-instrumented code you can get current span from
context.

```
span := trace.SpanFromContext(ctx)
```

Adding attributes to a span is accomplished using `SetAttributes` on the span
object. In the `PlaceOrder` function several attributes are added to the span.

```
span.SetAttributes(
    attribute.String("app.order.id", orderID.String()), shippingTrackingAttribute,
    attribute.Float64("app.shipping.amount", shippingCostFloat),
    attribute.Float64("app.order.amount", totalPriceFloat),
    attribute.Int("app.order.items.count", len(prep.orderItems)),
)
```

### Add span events

Adding span events is accomplished using `AddEvent` on the span object. In the
`PlaceOrder` function several span events are added. Some events have additional
attributes, others do not.

Adding a span event without attributes:

```
span.AddEvent("prepared")
```

Adding a span event with additional attributes:

```
span.AddEvent("charged",
    trace.WithAttributes(attribute.String("app.payment.transaction.id", txID)))
```

## Metrics

### Initializing Metrics

The OpenTelemetry SDK is initialized from `main` using the `initMeterProvider`
function.

```
func initMeterProvider() *sdkmetric.MeterProvider {
    ctx := context.Background()

    exporter, err := otlpmetricgrpc.New(ctx)
    if err != nil {
        log.Fatalf("new otlp metric grpc exporter failed: %v", err)
    }

    mp := sdkmetric.NewMeterProvider(sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter)))
    global.SetMeterProvider(mp)
    return mp
}
```

You should call `MeterProvider.Shutdown()` when your service is shutdown to
ensure all records are exported. This service makes that call as part of a
deferred function in main

```
mp := initMeterProvider()
defer func() {
    if err := mp.Shutdown(context.Background()); err != nil {
        log.Printf("Error shutting down meter provider: %v", err)
    }
}()
```

### Adding golang runtime auto-instrumentation

Golang runtime are instrumented in the main function

```
err := runtime.Start(runtime.WithMinimumReadMemStatsInterval(time.Second))
if err != nil {
    log.Fatal(err)
}
```

## Logs

You can send your logs to the OpenTelemetry Collector in two ways:

- Directly to the Collector
- Through a file or `stdout`

You can find documentation specifying how to use both these approaches in the
[Logs](https://opentelemetry.io/docs/languages/go/instrumentation/#logs) section of the
[Manual Instrumentation](https://opentelemetry.io/docs/languages/go/instrumentation/) documentation.

The Checkout service sends the logs directly to the Collector, and uses a log
bridge to send its logs, bridging to the `slog` logging package, which outputs
structured logs.

## LoggerProvider initialization

The OpenTelemetry SDK is initialized from `main` using the `initLoggerProvider`
function.

```
ctx := context.Background()

logExporter, err := otlploggrpc.New(ctx)
if err != nil {
	return nil
}

loggerProvider := sdklog.NewLoggerProvider(
	sdklog.WithProcessor(sdklog.NewBatchProcessor(logExporter)),
)
global.SetLoggerProvider(loggerProvider)

return loggerProvider
```

Call `LoggerProvider.Shutdown()` when your service is down to ensure all logs
are exported. This service makes that call as part of a deferred function in
`main`:

```
lp := initLoggerProvider()
defer func() {
	if err := lp.Shutdown(context.Background()); err != nil {
		logger.Error(fmt.Sprintf("Logger Provider Shutdown: %v", err))
	}
	logger.Info("Shutdown logger provider")
}()
```

### Logging functionality

This service sends logs to the Collector using gRPC calls. The logs are output
in a structured format using the `slog` package.

First, initialize the logger:

```
logger   *slog.Logger
logger = otelslog.NewLogger("checkout")
```

Note the use of `fmt.Sprintf` to format the output before it’s sent to the
logger:

```
logger.Info(fmt.Sprintf("order confirmation email sent to %q", req.Email))
logger.Warn(fmt.Sprintf("failed to send order confirmation to %q: %+v", req.Email, err))
logger.Error(fmt.Sprintf("Error shutting down logger provider: %v", err))
```

The advantage of using `slog` is the ability to attach additional attributes to
the output. The following example attaches a few attributes such as `orderID`,
`shippingCost` and `totalPrice`. This makes it possible to view and parse these
as part of the log output and makes it easier to view them as separate columns
in Grafana:

```
logger.LogAttrs(
    ctx,
    slog.LevelInfo, "order placed",
    slog.String("app.order.id", orderID.String()),
    slog.Float64("app.shipping.amount", shippingCostFloat),
    slog.Float64("app.order.amount", totalPriceFloat),
    slog.Int("app.order.items.count", len(prep.orderItems)),
    slog.String("app.shipping.tracking.id", shippingTrackingID),
)
```

---

### Currency Service

> **Source:** https://opentelemetry.io/docs/demo/services/currency/

This service provides functionality to convert amounts between different
currencies.

[Currency service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/currency/)

## Traces

### Initializing Tracing

The OpenTelemetry SDK is initialized from `main` using the `initTracer` function
defined in `tracer_common.h`

```
void initTracer()
{
  auto exporter = opentelemetry::exporter::otlp::OtlpGrpcExporterFactory::Create();
  auto processor =
      opentelemetry::sdk::trace::SimpleSpanProcessorFactory::Create(std::move(exporter));
  std::vector<std::unique_ptr<opentelemetry::sdk::trace::SpanProcessor>> processors;
  processors.push_back(std::move(processor));
  std::shared_ptr<opentelemetry::sdk::trace::TracerContext> context =
      opentelemetry::sdk::trace::TracerContextFactory::Create(std::move(processors));
  std::shared_ptr<opentelemetry::trace::TracerProvider> provider =
      opentelemetry::sdk::trace::TracerProviderFactory::Create(context);
 // Set the global trace provider
  opentelemetry::trace::Provider::SetTracerProvider(provider);

 // set global propagator
  opentelemetry::context::propagation::GlobalTextMapPropagator::SetGlobalPropagator(
      opentelemetry::nostd::shared_ptr<opentelemetry::context::propagation::TextMapPropagator>(
          new opentelemetry::trace::propagation::HttpTraceContext()));
}
```

### Create new spans

New spans can be created and started using
`Tracer->StartSpan("spanName", attributes, options)`. After a span is created
you need to start and put it into active context using
`Tracer->WithActiveSpan(span)`. You can find an example of this in the `Convert`
function.

```
std::string span_name = "CurrencyService/Convert";
auto span =
    get_tracer("currency")->StartSpan(span_name,
                                  {{SemanticConventions::kRpcSystem, "grpc"},
                                   {SemanticConventions::kRpcService, "oteldemo.CurrencyService"},
                                   {SemanticConventions::kRpcMethod, "Convert"},
                                   {SemanticConventions::kRpcGrpcStatusCode, 0}},
                                  options);
auto scope = get_tracer("currency")->WithActiveSpan(span);
```

### Adding attributes to spans

You can add an attribute to a span using `Span->SetAttribute(key, value)`.

```
span->SetAttribute("app.currency.conversion.from", from_code);
span->SetAttribute("app.currency.conversion.to", to_code);
```

### Add span events

Adding span events is accomplished using `Span->AddEvent(name)`.

```
span->AddEvent("Conversion successful, response sent back");
```

### Set span status

Make sure to set your span status to `Ok`, or `Error` accordingly. You can do
this using `Span->SetStatus(status)`

```
span->SetStatus(StatusCode::kOk);
```

### Tracing context propagation

In C++ propagation is not automatically handled. You need to extract it from the
caller and inject the propagation context into subsequent spans. The
`GrpcServerCarrier` class defines a method to extract context from inbound gRPC
requests which is leveraged in the service call implementations.

The `GrpcServerCarrier` class is defined in `tracer_common.h` as follows:

```
class GrpcServerCarrier : public opentelemetry::context::propagation::TextMapCarrier
{
public:
  GrpcServerCarrier(ServerContext *context) : context_(context) {}
  GrpcServerCarrier() = default;
  virtual opentelemetry::nostd::string_view Get(
      opentelemetry::nostd::string_view key) const noexcept override
  {
    auto it = context_->client_metadata().find(key.data());
    if (it != context_->client_metadata().end())
    {
      return it->second.data();
    }
    return "";
  }

  virtual void Set(opentelemetry::nostd::string_view key,
                   opentelemetry::nostd::string_view value) noexcept override
  {
   // Not required for server
  }

  ServerContext *context_;
};
```

This class is leveraged in the `Convert` method to extract context and create a
`StartSpanOptions` object to contain the right context which is used when
creating new spans.

```
StartSpanOptions options;
options.kind = SpanKind::kServer;
GrpcServerCarrier carrier(context);

auto prop        = context::propagation::GlobalTextMapPropagator::GetGlobalPropagator();
auto current_ctx = context::RuntimeContext::GetCurrent();
auto new_context = prop->Extract(carrier, current_ctx);
options.parent   = GetSpan(new_context)->GetContext();
```

## Metrics

### Initializing Metrics

The OpenTelemetry `MeterProvider` is initialized from `main()` using the
`initMeter()` function defined in `meter_common.h`.

```
void initMeter()
{
  // Build MetricExporter
  otlp_exporter::OtlpGrpcMetricExporterOptions otlpOptions;
  auto exporter = otlp_exporter::OtlpGrpcMetricExporterFactory::Create(otlpOptions);

  // Build MeterProvider and Reader
  metric_sdk::PeriodicExportingMetricReaderOptions options;
  std::unique_ptr<metric_sdk::MetricReader> reader{
      new metric_sdk::PeriodicExportingMetricReader(std::move(exporter), options) };
  auto provider = std::shared_ptr<metrics_api::MeterProvider>(new metric_sdk::MeterProvider());
  auto p = std::static_pointer_cast<metric_sdk::MeterProvider>(provider);
  p->AddMetricReader(std::move(reader));
  metrics_api::Provider::SetMeterProvider(provider);
}
```

### Starting IntCounter

A global `currency_counter` variable is created at `main()` calling the function
`initIntCounter()` defined in `meter_common.h`.

```
nostd::unique_ptr<metrics_api::Counter<uint64_t>> initIntCounter()
{
  std::string counter_name = name + "_counter";
  auto provider = metrics_api::Provider::GetMeterProvider();
  nostd::shared_ptr<metrics_api::Meter> meter = provider->GetMeter(name, version);
  auto int_counter = meter->CreateUInt64Counter(counter_name);
  return int_counter;
}
```

### Counting currency conversion requests

The method `CurrencyCounter()` is implemented as follows:

```
void CurrencyCounter(const std::string& currency_code)
{
    std::map<std::string, std::string> labels = { {"currency_code", currency_code} };
    auto labelkv = common::KeyValueIterableView<decltype(labels)>{ labels };
    currency_counter->Add(1, labelkv);
}
```

Every time the function `Convert()` is called, the currency code received as
`to_code` is used to count the conversions.

```
CurrencyCounter(to_code);
```

## Logs

The OpenTelemetry `LoggerProvider` is initialized from `main()` using the
`initLogger()` function defined in `logger_common.h`.

```
void initLogger() {
  otlp::OtlpGrpcLogRecordExporterOptions loggerOptions;
  auto exporter  = otlp::OtlpGrpcLogRecordExporterFactory::Create(loggerOptions);
  auto processor = logs_sdk::SimpleLogRecordProcessorFactory::Create(std::move(exporter));
  std::vector<std::unique_ptr<logs_sdk::LogRecordProcessor>> processors;
  processors.push_back(std::move(processor));
  auto context = logs_sdk::LoggerContextFactory::Create(std::move(processors));
  std::shared_ptr<logs::LoggerProvider> provider = logs_sdk::LoggerProviderFactory::Create(std::move(context));
  opentelemetry::logs::Provider::SetLoggerProvider(provider);
}
```

### Using the LoggerProvider

The initialized Logger Provider is called from `main` in `server.cpp`:

```
logger = getLogger(name);
```

It assigns the logger to a local variable called `logger`:

```
nostd::shared_ptr<opentelemetry::logs::Logger> logger;
```

Which is then used throughout the code whenever we need to log a line:

```
logger->Info(std::string(__func__) + " conversion successful");
```

---

### Email Service

> **Source:** https://opentelemetry.io/docs/demo/services/email/

This service will send a confirmation email to the user when an order is placed.

[Email service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/email/)

## Initializing Tracing

You will need to require the core OpenTelemetry SDK and exporter Ruby gems, as
well as any gem that will be needed for auto-instrumentation libraries (ie:
Sinatra)

```
require "opentelemetry/sdk"
require "opentelemetry/exporter/otlp"
require "opentelemetry/instrumentation/sinatra"
```

The Ruby SDK uses OpenTelemetry standard environment variables to configure OTLP
export, resource attributes, and service name automatically. When initializing
the OpenTelemetry SDK, you will also specify which auto-instrumentation
libraries to leverage (ie: Sinatra)

```
OpenTelemetry::SDK.configure do |c|
  c.use "OpenTelemetry::Instrumentation::Sinatra"
end
```

## Traces

### Add attributes to auto-instrumented spans

Within the execution of auto-instrumented code you can get current span from
context.

```
current_span = OpenTelemetry::Trace.current_span
```

Adding multiple attributes to a span is accomplished using `add_attributes` on
the span object.

```
current_span.add_attributes({
  "app.order.id" => data.order.order_id,
})
```

Adding only a single attribute can be accomplished using `set_attribute` on the
span object.

```
span.set_attribute("app.email.recipient", data.email)
```

### Create new spans

New spans can be created and placed into active context using `in_span` from an
OpenTelemetry Tracer object. When used in conjunction with a `do..end` block,
the span will automatically be ended when the block ends execution.

```
tracer = OpenTelemetry.tracer_provider.tracer('email')
tracer.in_span("send_email") do |span|
  # logic in context of span here
end
```

## Metrics

### Initializing Metrics

The OpenTelemetry Metrics SDK and OTLP metrics exporter are initialized at root
level in the `email_server.rb` file. You first need the `require` statements to
access them.

```
require "opentelemetry-metrics-sdk"
require "opentelemetry-exporter-otlp-metrics"
```

The Ruby SDK uses OpenTelemetry standard environment variables to configure OTLP
export, resource attributes, and service name automatically. When initializing
the OpenTelemetry Metrics SDK, you also need to configure a meter provider and a
metric reader.

```
otlp_metric_exporter = OpenTelemetry::Exporter::OTLP::Metrics::MetricsExporter.new
OpenTelemetry.meter_provider.add_metric_reader(otlp_metric_exporter)
meter = OpenTelemetry.meter_provider.meter("email")
```

With the meter provider you now have access to the meter, which can be used to
create a global metric (ie: `counter`).

```
$confirmation_counter = meter.create_counter("app.confirmation.counter", unit: "1", description: "Counts the number of order confirmation emails sent")
```

### Custom metrics

The following custom metric is currently available:

- `app.confirmation.counter`: Cumulative count of number of order confirmation
  emails sent

## Logs

### Initializing logs

The OpenTelemetry Logs SDK and OTLP logs exporter are initialized at root level
in the `email_server.rb` file. You first need the `require` statements to access
them.

```
require "opentelemetry-logs-sdk"
require "opentelemetry-exporter-otlp-logs"
```

The Ruby SDK uses OpenTelemetry standard environment variables to configure OTLP
export, resource attributes, and service name automatically. When initializing
the OpenTelemetry Logs SDK, you need a logger provider to create a global
logger.

```
$logger = OpenTelemetry.logger_provider.logger(name: "email")
```

### Emitting structured logs

You can use the logger’s `on_emit` method to write structured logs. Include
`severity_text` (e.g., `INFO`, `ERROR`), a human-readable `body`, and
`app.email.recipient` attribute that may help querying the logs later.

```
$logger.on_emit(
  timestamp: Time.now,
  severity_text: "INFO",
  body: "Order confirmation email sent",
  attributes: { "app.email.recipient" => data.email }
)
```

---

### Flagd-UI Service

> **Source:** https://opentelemetry.io/docs/demo/services/flagd-ui/

This service acts as a frontend where users can toggle and edit feature flags to
alter the behavior of the demo environment.

[Flagd-UI service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/flagd-ui/)

## Initializing Tracing

Once installed the necessary dependencies for auto-instrumentation of Phoenix
endpoints and requests, we configure them according to the
[official documentation](https://opentelemetry.io/docs/languages/erlang/getting-started/), editing the
`config/runtime.exs` file:

```
otel_endpoint =
  System.get_env("OTEL_EXPORTER_OTLP_ENDPOINT") ||
    raise """
    environment variable OTEL_EXPORTER_OTLP_ENDPOINT is missing.
    """

config :opentelemetry, :processors,
    otel_batch_processor: %{
      exporter: {:opentelemetry_exporter, %{endpoints: [otel_endpoint]}}
    }
```

And we initialize the OpenTelemetry Bandit adapter and the Phoenix library as
well inside
[`lib/flagd_ui/application.ex`](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/flagd-ui/lib/flagd_ui/application.ex):

```
OpentelemetryBandit.setup()
OpentelemetryPhoenix.setup(adapter: :bandit)
```

## Traces

Phoenix and Bandit are auto-instrumented through the dedicated libraries.

## Metrics

TBD

## Logs

TBD

---

### Fraud Detection Service

> **Source:** https://opentelemetry.io/docs/demo/services/fraud-detection/

This service analyses incoming orders and detects malicious customers. This is
only mocked and received orders are printed out.

[Fraud Detection service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/fraud-detection/)

## Auto-instrumentation

This service relies on the OpenTelemetry Java agent to automatically instrument
libraries such as Kafka, and to configure the OpenTelemetry SDK. The agent is
passed into the process using the `-javaagent` command line argument. Command
line arguments are added through the `JAVA_TOOL_OPTIONS` in the `Dockerfile`,
and leveraged during the automatically generated Gradle startup script.

```
ENV JAVA_TOOL_OPTIONS=-javaagent:/app/opentelemetry-javaagent.jar
```

---

### Frontend

> **Source:** https://opentelemetry.io/docs/demo/services/frontend/

The frontend is responsible to provide a UI for users, as well as an API
leveraged by the UI or other clients. The application is based on
[Next.JS](https://nextjs.org/) to provide a React web-based UI and API routes.

[Frontend source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/frontend/)

## Server Instrumentation

It is recommended to use a Node required module when starting your Node.js
application to initialize the SDK and auto-instrumentation. When initializing
the OpenTelemetry Node.js SDK, you optionally specify which auto-instrumentation
libraries to leverage, or make use of the `getNodeAutoInstrumentations()`
function which includes most popular frameworks. The
`utils/telemetry/Instrumentation.js` file contains all code required to
initialize the SDK and auto-instrumentation based on standard
[OpenTelemetry environment variables](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/)
for OTLP export, resource attributes, and service name.

```
const FrontendTracer = async () => {
  const { ZoneContextManager } = await import('@opentelemetry/context-zone');

  let resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: NEXT_PUBLIC_OTEL_SERVICE_NAME,
  });
  const detectedResources = detectResources({ detectors: [browserDetector] });
  resource = resource.merge(detectedResources);

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new SessionIdProcessor(),
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url:
            NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
            'http://localhost:4318/v1/traces',
        }),
        {
          scheduledDelayMillis: 500,
        },
      ),
    ],
  });

  const contextManager = new ZoneContextManager();

  provider.register({
    contextManager,
    propagator: new CompositePropagator({
      propagators: [
        new W3CBaggagePropagator(),
        new W3CTraceContextPropagator(),
      ],
    }),
  });

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: /.*/,
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span) {
            span.setAttribute('app.synthetic_request', IS_SYNTHETIC_REQUEST);
          },
        },
      }),
    ],
  });
};
```

Node required modules are loaded using the `--require` command line argument.
This can be done in the `scripts.start` section of `package.json` and starting
the application using `npm start`.

```
"scripts": {
  "start": "node --require ./Instrumentation.js server.js",
},
```

## Traces

### Span Exceptions and status

You can use the span object’s `recordException` function to create a span event
with the full stack trace of a handled error. When recording an exception also
be sure to set the span’s status accordingly. You can see this in the catch
block of the `NextApiHandler` function in the
`utils/telemetry/InstrumentationMiddleware.ts` file.

```
span.recordException(error as Exception);
span.setStatus({ code: SpanStatusCode.ERROR });
```

### Create new spans

New spans can be created and started using
`Tracer.startSpan("spanName", options)`. Several options can be used to specify
how the span can be created.

- `root: true` will create a new trace, setting this span as the root.
- `links` are used to specify links to other spans (even within another trace)
  that should be referenced.
- `attributes` are key/value pairs added to a span, typically used for
  application context.

```
span = tracer.startSpan(`${method}`, {
  root: true,
  kind: SpanKind.SERVER,
  links: [{ context: syntheticSpan.spanContext() }],
  attributes: {
    'app.synthetic_request': true,
    [ATTR_HTTP_RESPONSE_STATUS_CODE]: response.statusCode,
    [ATTR_HTTP_REQUEST_METHOD]: method,
    [ATTR_USER_AGENT_ORIGINAL]: headers['user-agent'] || '',
    [ATTR_URL_PATH]: target,
    [ATTR_URL_FULL]: `${headers.host}${url}`,
    [ATTR_NETWORK_PROTOCOL_VERSION]: httpVersion,
  },
});
```

## Browser Instrumentation

The web-based UI that the frontend provides is also instrumented for web
browsers. OpenTelemetry instrumentation is included as part of the Next.js App
component in `pages/_app.tsx`. Here instrumentation is imported and initialized.

```
import FrontendTracer from '../utils/telemetry/FrontendTracer';

if (typeof window !== 'undefined') FrontendTracer();
```

The `utils/telemetry/FrontendTracer.ts` file contains code to initialize a
TracerProvider, establish an OTLP export, register trace context propagators,
and register web specific auto-instrumentation libraries. Since the browser will
send data to an OpenTelemetry Collector that will likely be on a separate
domain, CORS headers are also setup accordingly.

As part of the changes to carry over the `synthetic_request` attribute flag for
the backend services, the `applyCustomAttributesOnSpan` configuration function
has been added to the `instrumentation-fetch` library custom span attributes
logic that way every browser-side span will include it.

```
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const FrontendTracer = async () => {
  const { ZoneContextManager } = await import('@opentelemetry/context-zone');

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME,
    }),
    spanProcessors: [new SimpleSpanProcessor(new OTLPTraceExporter())],
  });

  const contextManager = new ZoneContextManager();

  provider.register({
    contextManager,
    propagator: new CompositePropagator({
      propagators: [
        new W3CBaggagePropagator(),
        new W3CTraceContextPropagator(),
      ],
    }),
  });

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: /.*/,
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span) {
            span.setAttribute('app.synthetic_request', 'false');
          },
        },
      }),
    ],
  });
};

export default FrontendTracer;
```

## Metrics

TBD

## Logs

TBD

## Baggage

OpenTelemetry Baggage is leveraged in the frontend to check if the request is
synthetic (from the load generator). Synthetic requests will force the creation
of a new trace. The root span from the new trace will contain many of the same
attributes as an HTTP request instrumented span.

To determine if a Baggage item is set, you can leverage the `propagation` API to
parse the Baggage header, and leverage the `baggage` API to get or set entries.

```
const baggage = propagation.getBaggage(context.active());
if (baggage?.getEntry("synthetic_request")?.value == "true") {...}
```

---

### Frontend Proxy (Envoy)

> **Source:** https://opentelemetry.io/docs/demo/services/frontend-proxy/

The frontend proxy is used as a reverse proxy for user-facing web interfaces
such as the frontend, Jaeger, Grafana, load generator, and feature flag service.

[Frontend proxy configuration source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/frontend-proxy/)

## Enabling OpenTelemetry

**NOTE: Only non-synthetic requests will trigger the envoy tracing.**

In order to enable Envoy to produce spans whenever receiving a request, the
following configuration is required:

```
static_resources:
  listeners:
    - address:
        socket_address:
          address: 0.0.0.0
          port_value: ${ENVOY_PORT}
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                '@type': type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                codec_type: AUTO
                stat_prefix: ingress_http
                tracing:
                  provider:
                    name: envoy.tracers.opentelemetry
                    typed_config:
                      '@type': type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
                      grpc_service:
                        envoy_grpc:
                          cluster_name: opentelemetry_collector
                        timeout: 0.250s
                      service_name: frontend-proxy

  clusters:
    - name: opentelemetry_collector
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      typed_extension_protocol_options:
        envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
          '@type': type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
          explicit_http_config:
            http2_protocol_options: {}
      load_assignment:
        cluster_name: opentelemetry_collector
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: ${OTEL_COLLECTOR_HOST}
                      port_value: ${OTEL_COLLECTOR_PORT}
```

Where `OTEL_COLLECTOR_HOST` and `OTEL_COLLECTOR_PORT` are passed via environment
variables.

---

### Image Provider Service

> **Source:** https://opentelemetry.io/docs/demo/services/image-provider/

This service provides the images which are used in the frontend. The images are
statically hosted on a NGINX instance. The NGINX server is instrumented with the
[nginx-otel module](https://github.com/nginxinc/nginx-otel/tree/main).

For details, see the
[image provider service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/image-provider/).

---

### Kafka

> **Source:** https://opentelemetry.io/docs/demo/services/kafka/

This is used as a message queue service to connect the checkout service with the
accounting and fraud detection services.

[Kafka service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/kafka/)

## Auto-instrumentation

This service relies on the OpenTelemetry Java agent and the built in
[JMX Metric Insight Module](https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/main/instrumentation/jmx-metrics/javaagent)
to capture
[Kafka broker metrics](https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/javaagent/kafka-broker.md)
and send them off to the collector via OTLP.

The agent is passed into the process using the `-javaagent` command line
argument. Command line arguments are added through the `KAFKA_OPTS` in the
`Dockerfile`.

```
ENV KAFKA_OPTS="-javaagent:/tmp/opentelemetry-javaagent.jar -Dotel.jmx.target.system=kafka-broker"
```

---

### Load Generator

> **Source:** https://opentelemetry.io/docs/demo/services/load-generator/

The load generator is based on [k6](https://k6.io), a Go load testing tool that
runs test scenarios written in JavaScript. By default it will simulate users
requesting several different routes from the frontend. All of its OpenTelemetry
instrumentation comes from the Go SDK, embedded in the k6 binary by the
`xk6-otel` extension described below.

[Load generator source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/load-generator/)

## Traces

### Initializing Tracing

Tracing in the load generator is provided by a custom
[xk6](https://github.com/grafana/xk6) extension (`xk6-otel`) that wraps the
OpenTelemetry Go SDK and exposes it to k6 JavaScript scripts. The extension is
compiled into the k6 binary at image build time.

The extension initializes a `TracerProvider` backed by an OTLP HTTP exporter on
first use. The collector endpoint, protocol, resource attributes, and service
name are read from the standard
[OpenTelemetry environment variables](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/)
(`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`,
`OTEL_RESOURCE_ATTRIBUTES`, and `OTEL_SERVICE_NAME`).

### Creating Spans

Scripts import the `Tracer` class from the `k6/x/otel` module and create spans
manually around each simulated user action:

```
import { Tracer } from 'k6/x/otel';

const tracer = new Tracer();

function browseProduct() {
  const span = tracer.startSpan('user_browse_product', {
    'product.id': product,
  });
  http.get(`${BASE_URL}/api/products/${product}`, {
    headers: otelHeaders(span.traceParent()),
  });
  span.end();
}
```

The `startSpan(name, attrs?)` method starts a new client span and returns an
object with three methods:

- `traceParent()` — returns the W3C `traceparent` header value for the span,
  used to propagate trace context to backend services.
- `log(message)` — emits a correlated OTel log record tied to the span’s trace
  and span IDs.
- `end()` — ends the span and flushes it to the exporter.

## Metrics

The load generator emits two kinds of metrics:

- **k6 built-in test metrics** (request duration, error rate, throughput, etc.)
  are exported to the OpenTelemetry Collector via k6’s built-in `opentelemetry`
  output (`--out opentelemetry`). The output protocol and collector endpoint are
  configured via the `K6_OTEL_EXPORTER_PROTOCOL` and
  `K6_OTEL_HTTP_EXPORTER_ENDPOINT` environment variables.
- **Go runtime metrics** (memory, garbage collection, goroutines) are emitted by
  the `xk6-otel` extension using the OpenTelemetry `runtime` instrumentation.

## Logs

Log records are emitted by calling `span.log(message)` on any active span. The
`xk6-otel` extension injects the span’s trace and span IDs into each log record.

## Baggage

OpenTelemetry Baggage is used by the load generator to indicate that traces are
synthetically generated. Each outgoing HTTP request carries a `baggage` header
and a `traceparent` header constructed by the `otelHeaders` helper:

```
function otelHeaders(traceParent, extra) {
  return Object.assign(
    {
      baggage: `synthetic_request=true,session.id=${sessionId}`,
      traceparent: traceParent,
    },
    extra,
  );
}
```

Baggage on its own doesn’t mark the telemetry. Each backend service reads the
`synthetic_request` entry out of the incoming baggage and copies it onto its own
spans and log records as an attribute, and it is that attribute which records
whether the telemetry came from a synthetic flow. The frontend sets
`demo.synthetic_request`, while the checkout and payment services set
`user_agent.synthetic.type` to `test`. Because the marker ends up on the
telemetry itself, you can filter load-generator traffic in or out of any query
in your observability backend.

---

### Payment Service

> **Source:** https://opentelemetry.io/docs/demo/services/payment/

This service is responsible to process credit card payments for orders. It will
return an error if the credit card is invalid or the payment cannot be
processed.

[Payment service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/payment/)

## Zero-code instrumentation

This Node.js based service makes use of the OpenTelemetry Node.js Zero-code
Instrumentation, setting up by requiring the
`@opentelemetry/auto-instrumentations-node/register` module at startup. Export
endpoints, resource attributes, and service name are automatically set based on
environment variables. This can be done in the service’s `package.json` start
script or via `NODE_OPTIONS`.

```
"scripts": {
  "start": "node --require @opentelemetry/auto-instrumentations-node/register index.js"
}
```

## Traces

### Add attributes to auto-instrumented spans

Within the execution of auto-instrumented code you can get current span from
context.

```
const span = opentelemetry.trace.getActiveSpan();
```

Adding attributes to a span is accomplished using `setAttributes` on the span
object. In the `chargeServiceHandler` function an attributes is added to the
span as an anonymous object (map) for the attribute key/values pair.

```
span?.setAttributes({
  'demo.payment.amount': parseFloat(`${amount.units}.${amount.nanos}`).toFixed(
    2,
  ),
});
```

### Span Exceptions and status

You can use the span object’s `recordException` function to create a span event
with the full stack trace of a handled error. When recording an exception also
be sure to set the span’s status accordingly. You can see this in the `charge`
function in `charge.js`.

```
span.recordException(err);
span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
```

## Metrics

### Creating Meters and Instruments

Meters can be created using the `@opentelemetry/api` package. You can create
meters as seen below, and then use the created meter to create instruments.

```
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('payment');
const transactionsCounter = meter.createCounter('demo.payment.transactions');
```

Meters and Instruments are supposed to stick around. This means you should get a
Meter or an Instrument once , and then re-use it as needed, if possible.

## Logs

TBD

## Baggage

OpenTelemetry Baggage is leveraged in this service to check if the request is
synthetic (from the load generator). Synthetic requests will not be charged,
which is indicated with a span attribute. The `charge.js` file which does the
actual payment processing, has logic to check the baggage.

```
// check baggage for synthetic_request=true, and add charged attribute accordingly
const baggage = propagation.getBaggage(context.active());
if (
  baggage &&
  baggage.getEntry('synthetic_request') &&
  baggage.getEntry('synthetic_request').value === 'true'
) {
  span.setAttribute('demo.payment.charged', false);
} else {
  span.setAttribute('demo.payment.charged', true);
}
```

---

### Product Catalog Service

> **Source:** https://opentelemetry.io/docs/demo/services/product-catalog/

This service is responsible to return information about products. The service
can be used to get all products, search for specific products, or return details
about any single product.

[Product Catalog service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/product-catalog/)

## Traces

### Initializing Tracing

The OpenTelemetry SDK is initialized from `main` using the `initTracerProvider`
function.

```
func initTracerProvider() *sdktrace.TracerProvider {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx)
    if err != nil {
        log.Fatalf("OTLP Trace gRPC Creation: %v", err)
    }
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(initResource()),
    )
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))
    return tp
}
```

You should call `TracerProvider.Shutdown()` when your service is shutdown to
ensure all spans are exported. This service makes that call as part of a
deferred function in main

```
tp := InitTracerProvider()
defer func() {
    if err := tp.Shutdown(context.Background()); err != nil {
        log.Fatalf("Tracer Provider Shutdown: %v", err)
    }
}()
```

### Adding gRPC auto-instrumentation

This service receives gRPC requests, which are instrumented in the main function
as part of the gRPC server creation.

```
srv := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler()),
)
```

This service will issue outgoing gRPC calls, which are all instrumented by
wrapping the gRPC client with instrumentation.

```
func createClient(ctx context.Context, svcAddr string) (*grpc.ClientConn, error) {
    return grpc.DialContext(ctx, svcAddr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
    )
}
```

### Add attributes to auto-instrumented spans

Within the execution of auto-instrumented code you can get current span from
context.

```
span := trace.SpanFromContext(ctx)
```

Adding attributes to a span is accomplished using `SetAttributes` on the span
object. In the `GetProduct` function an attribute for the product ID is added to
the span.

```
span.SetAttributes(
    attribute.String("app.product.id", req.Id),
)
```

### Setting span status

This service can catch and handle an error condition based on a feature flag. In
an error condition, the span status is set accordingly using `SetStatus` on the
span object. You can see this in the `GetProduct` function.

```
msg := fmt.Sprintf("Error: ProductCatalogService Fail Feature Flag Enabled")
span.SetStatus(otelcodes.Error, msg)
```

### Add span events

Adding span events is accomplished using `AddEvent` on the span object. In the
`GetProduct` function a span event is added when an error condition is handled,
or when a product is successfully found.

```
span.AddEvent(msg)
```

## Metrics

### Initializing Metrics

The OpenTelemetry SDK is initialized from `main` using the `initMeterProvider`
function.

```
func initMeterProvider() *sdkmetric.MeterProvider {
    ctx := context.Background()

    exporter, err := otlpmetricgrpc.New(ctx)
    if err != nil {
        log.Fatalf("new otlp metric grpc exporter failed: %v", err)
    }

    mp := sdkmetric.NewMeterProvider(sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter)))
    global.SetMeterProvider(mp)
    return mp
}
```

You should call `initMeterProvider.Shutdown()` when your service is shutdown to
ensure all records are exported. This service makes that call as part of a
deferred function in main.

```
mp := initMeterProvider()
defer func() {
    if err := mp.Shutdown(context.Background()); err != nil {
        log.Fatalf("Error shutting down meter provider: %v", err)
    }
}()
```

### Adding golang runtime auto-instrumentation

Golang runtime is instrumented in the main function

```
err := runtime.Start(runtime.WithMinimumReadMemStatsInterval(time.Second))
if err != nil {
    log.Fatal(err)
}
```

## Logs

You can send your logs to the OpenTelemetry Collector in two ways:

- Directly to the Collector
- Through a file or `stdout`

You can find documentation specifying how to use both these approaches in the
[Logs](https://opentelemetry.io/docs/languages/go/instrumentation/#logs) section of the
[Manual Instrumentation](https://opentelemetry.io/docs/languages/go/instrumentation/) documentation.

The Product Catalog service sends the logs directly to the Collector, and uses a
log bridge to send its logs, bridging to the `slog` logging package, which
outputs structured logs.

## LoggerProvider initialization

The OpenTelemetry SDK is initialized from `main` using the `initLoggerProvider`
function.

```
ctx := context.Background()

logExporter, err := otlploggrpc.New(ctx)
if err != nil {
	return nil
}

loggerProvider := sdklog.NewLoggerProvider(
	sdklog.WithProcessor(sdklog.NewBatchProcessor(logExporter)),
)
global.SetLoggerProvider(loggerProvider)

return loggerProvider
```

Call `LoggerProvider.Shutdown()` when your service is down to ensure all logs
are exported. This service makes that call as part of a deferred function in
`main`:

```
lp := initLoggerProvider()
defer func() {
	if err := lp.Shutdown(context.Background()); err != nil {
		logger.Error(fmt.Sprintf("Logger Provider Shutdown: %v", err))
	}
	logger.Info("Shutdown logger provider")
}()
```

### Logging functionality

This service sends logs to the Collector using gRPC calls. The logs are output
in a structured format using the `slog` package.

First, initialize the logger:

```
logger   *slog.Logger
logger = otelslog.NewLogger("product-catalog")
```

Note the use of `fmt.Sprintf` to format the output before it’s sent to the
logger:

```
logger.Info("Loading Product Catalog...")
logger.Info(fmt.Sprintf("Product Catalog reload interval: %d", interval))
logger.Error(fmt.Sprintf("Error shutting down meter provider: %v", err))
```

The advantage of using `slog` is the ability to attach additional attributes to
the output. The following example attaches the `product.name` and `product.id`
attributes. This makes it possible to view and parse these as part of the log
output and makes it easier to view them as separate columns in Grafana:

```
logger.LogAttrs(
	ctx,
	slog.LevelInfo, "Product Found",
	slog.String("app.product.name", found.Name),
	slog.String("app.product.id", req.Id),
)
```

---

### Quote Service

> **Source:** https://opentelemetry.io/docs/demo/services/quote/

This service is responsible for calculating shipping costs, based on the number
of items to be shipped. The quote service is called from Shipping Service via
HTTP.

The Quote Service is implemented using the Slim framework and php-di for
managing the Dependency Injection.

The PHP instrumentation may vary when using a different framework.

[Quote service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/quote/)

## Traces

### Initializing Tracing

In this demo, the OpenTelemetry SDK has been automatically created as part of
SDK autoloading, which happens as part of composer autoloading.

This is enabled by setting the environment variable
`OTEL_PHP_AUTOLOAD_ENABLED=true`.

```
require __DIR__ . '/../vendor/autoload.php';
```

There are multiple ways to create or obtain a `Tracer`, in this example we
obtain one from the global tracer provider which was initialized above, as part
of SDK autoloading:

```
$tracer = Globals::tracerProvider()->getTracer('manual-instrumentation');
```

### Manually creating spans

Creating a span manually can be done via a `Tracer`. The span will be default be
a child of the active span in the current execution context:

```
$span = Globals::tracerProvider()
    ->getTracer('manual-instrumentation')
    ->spanBuilder('calculate-quote')
    ->setSpanKind(SpanKind::KIND_INTERNAL)
    ->startSpan();
/* calculate quote */
$span->end();
```

### Add span attributes

You can obtain the current span using `OpenTelemetry\API\Trace\Span`.

```
$span = Span::getCurrent();
```

Adding attributes to a span is accomplished using `setAttribute` on the span
object. In the `calculateQuote` function 2 attributes are added to the
`childSpan`.

```
$childSpan->setAttribute('app.quote.items.count', $numberOfItems);
$childSpan->setAttribute('app.quote.cost.total', $quote);
```

### Add span events

Adding span events is accomplished using `addEvent` on the span object. In the
`getquote` route span events are added. Some events have additional attributes,
others do not.

Adding a span event without attributes:

```
$span->addEvent('Received get quote request, processing it');
```

Adding a span event with additional attributes:

```
$span->addEvent('Quote processed, response sent back', [
    'app.quote.cost.total' => $payload
]);
```

## Metrics

In this demo, metrics are emitted by the batch trace and logs processors. The
metrics describe the internal state of the processor, such as number of exported
spans or logs, the queue limit, and queue usage.

You can enable metrics by setting the environment variable
`OTEL_PHP_INTERNAL_METRICS_ENABLED` to `true`.

A manual metric is also emitted, which counts the number of quotes generated,
including an attribute for the number of items.

A counter is created from the globally configured Meter Provider, and is
incremented each time a quote is generated:

```
static $counter;
$counter ??= Globals::meterProvider()
    ->getMeter('quotes')
    ->createCounter('quotes', 'quotes', 'number of quotes calculated');
$counter->add(1, ['number_of_items' => $numberOfItems]);
```

Metrics accumulate and are exported periodically based on the value configured
in `OTEL_METRIC_EXPORT_INTERVAL`.

## Logs

The quote service emits a log message after a quote is calculated. The Monolog
logging package is configured with a
[Logs Bridge](https://opentelemetry.io/docs/concepts/signals/logs/#log-appender--bridge) which converts
Monolog logs into the OpenTelemetry format. Logs sent to this logger will be
exported via the globally configured OpenTelemetry logger.

---

### React Native App

> **Source:** https://opentelemetry.io/docs/demo/services/react-native-app/

The React Native app provides a mobile UI for users on Android and iOS devices
to interact with the demo’s services. It is built with
[Expo](https://docs.expo.dev/get-started/create-a-project/) and uses Expo’s
file-based routing to layout the screens for the app.

[React Native app source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/react-native-app/)

## Instrumentation

The application uses the OpenTelemetry packages to instrument the application at
the JS layer.

Caution

The JS OTel packages are supported for node and web environments. While they
work for React Native as well, they are not explicitly supported for that
environment, where they might break compatibility with minor version updates
or require workarounds. Building JS OTel package support for React Native is
an area of active development.

The main entry point for the application is `app/_layout.tsx` where a hook is
used to initialize the instrumentation and make sure it is loaded before
displaying the UI:

```
import { useTracer } from '@/hooks/useTracer';

const { loaded: tracerLoaded } = useTracer();
```

`hooks/useTracer.ts` contains all the code for setting up instrumentation
including initializing a TracerProvider, establishing an OTLP export,
registering trace context propagators, and registering auto-instrumentation of
network requests.

```
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_DEVICE_ID,
  ATTR_OS_NAME,
  ATTR_OS_VERSION,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions/incubating';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import getLocalhost from '@/utils/Localhost';
import { useEffect, useState } from 'react';
import {
  getDeviceId,
  getSystemVersion,
  getVersion,
} from 'react-native-device-info';
import { Platform } from 'react-native';
import { SessionIdProcessor } from '@/utils/SessionIdProcessor';

const Tracer = async () => {
  const localhost = await getLocalhost();

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'react-native-app',
    [ATTR_OS_NAME]: Platform.OS,
    [ATTR_OS_VERSION]: getSystemVersion(),
    [ATTR_SERVICE_VERSION]: getVersion(),
    [ATTR_DEVICE_ID]: getDeviceId(),
  });

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: `http://${localhost}:${process.env.EXPO_PUBLIC_FRONTEND_PROXY_PORT}/otlp-http/v1/traces`,
        }),
        {
          scheduledDelayMillis: 500,
        },
      ),
      new SessionIdProcessor(),
    ],
  });

  provider.register({
    propagator: new CompositePropagator({
      propagators: [
        new W3CBaggagePropagator(),
        new W3CTraceContextPropagator(),
      ],
    }),
  });

  registerInstrumentations({
    instrumentations: [
      // Some tiptoeing required here, propagateTraceHeaderCorsUrls is required to make the instrumentation
      // work in the context of a mobile app even though we are not making CORS requests. `clearTimingResources` must
      // be turned off to avoid using the web-only Performance API
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: /.*/,
        clearTimingResources: false,
      }),

      // The React Native implementation of fetch is simply a polyfill on top of XMLHttpRequest:
      // https://github.com/facebook/react-native/blob/7ccc5934d0f341f9bc8157f18913a7b340f5db2d/packages/react-native/Libraries/Network/fetch.js#L17
      // Because of this when making requests using `fetch` there will an additional span created for the underlying
      // request made with XMLHttpRequest. Since in this demo calls to /api/ are made using fetch, turn off
      // instrumentation for that path to avoid the extra spans.
      new XMLHttpRequestInstrumentation({
        ignoreUrls: [/\/api\/.*/],
      }),
    ],
  });
};

export interface TracerResult {
  loaded: boolean;
}

export const useTracer = (): TracerResult => {
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (!loaded) {
      Tracer()
        .catch(() => console.warn('failed to setup tracer'))
        .finally(() => setLoaded(true));
    }
  }, [loaded]);

  return {
    loaded,
  };
};
```

---

### Recommendation Service

> **Source:** https://opentelemetry.io/docs/demo/services/recommendation/

This service is responsible to get a list of recommended products for the user
based on existing product IDs the user is browsing.

[Recommendation service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/recommendation/)

## Auto-instrumentation

This Python based service, makes use of the OpenTelemetry auto-instrumentor for
Python, accomplished by leveraging the `opentelemetry-instrument` Python wrapper
to run the scripts. This can be done in the `ENTRYPOINT` command for the
service’s `Dockerfile`.

```
ENTRYPOINT [ "opentelemetry-instrument", "python", "recommendation_server.py" ]
```

## Traces

### Initializing Tracing

The OpenTelemetry SDK is initialized in the `__main__` code block. This code
will create a tracer provider, and establish a Span Processor to use. Export
endpoints, resource attributes, and service name are automatically set by the
OpenTelemetry auto instrumentor based on environment variables.

```
tracer = trace.get_tracer_provider().get_tracer("recommendation")
```

### Add attributes to auto-instrumented spans

Within the execution of auto-instrumented code you can get current span from
context.

```
span = trace.get_current_span()
```

Adding attributes to a span is accomplished using `set_attribute` on the span
object. In the `ListRecommendations` function an attribute is added to the span.

```
span.set_attribute("app.products_recommended.count", len(prod_list))
```

### Create new spans

New spans can be created and placed into active context using
`start_as_current_span` from an OpenTelemetry Tracer object. When used in
conjunction with a `with` block, the span will automatically be ended when the
block ends execution. This is done in the `get_product_list` function.

```
with tracer.start_as_current_span("get_product_list") as span:
```

## Metrics

### Initializing Metrics

The OpenTelemetry SDK is initialized in the `__main__` code block. This code
will create a meter provider. Export endpoints, resource attributes, and service
name are automatically set by the OpenTelemetry auto instrumentor based on
environment variables.

```
meter = metrics.get_meter_provider().get_meter("recommendation")
```

### Custom metrics

The following custom metrics are currently available:

- `app_recommendations_counter`: Cumulative count of # recommended products per
  service call

### Auto-instrumented metrics

The following metrics are available through auto-instrumentation, courtesy of
the `opentelemetry-instrumentation-system-metrics`, which is installed as part
of `opentelemetry-bootstrap` on building the recommendation service Docker
image:

- `runtime.cpython.cpu_time`
- `runtime.cpython.memory`
- `runtime.cpython.gc_count`

## Logs

### Initializing logs

The OpenTelemetry SDK is initialized in the `__main__` code block. The following
code creates a logger provider with a batch processor, an OTLP log exporter, and
a logging handler. Finally, it creates a logger for use throughout the
application.

```
logger_provider = LoggerProvider(
    resource=Resource.create(
        {
            'service.name': service_name,
        }
    ),
)
set_logger_provider(logger_provider)
log_exporter = OTLPLogExporter(insecure=True)
logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
handler = LoggingHandler(level=logging.NOTSET, logger_provider=logger_provider)

logger = logging.getLogger('main')
logger.addHandler(handler)
```

### Create log records

Create logs using the logger. Examples can be found in `ListRecommendations` and
`get_product_list` functions.

```
logger.info(f"Receive ListRecommendations for product ids:{prod_list}")
```

As you can see, after the initialization, log records can be created in the same
way as in standard Python. OpenTelemetry libraries automatically add a trace ID
and span ID for each log record and, in this way, enable correlating logs and
traces.

### Notes

Logs for Python are still experimental, and some changes can be expected. The
implementation in this service follows the
[Python log example](https://github.com/open-telemetry/opentelemetry-python/blob/stable/docs/examples/logs/example.py).

---

### Shipping Service

> **Source:** https://opentelemetry.io/docs/demo/services/shipping/

This service is responsible for providing shipping information including pricing
and tracking information, when requested from Checkout Service.

Shipping service is built with [Actix Web](https://actix.rs/),
[Tracing](https://tracing.rs/) for logs and OpenTelemetry Libraries. All other
sub-dependencies are included in `Cargo.toml`.

Depending on your framework and runtime, you may consider consulting
[Rust docs](https://opentelemetry.io/docs/languages/rust/) to supplement. You’ll find examples of async
and sync spans in quote requests and tracking IDs respectively.

[Shipping service source](https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/shipping/)

## Instrumentation

The OpenTelemetry SDK is configured in the `telemetry_conf` file.

A function `get_resource()` is implemented to create a Resource using the
default Resource Detectors plus `OS` and `Process` detectors:

```
fn get_resource() -> Resource {
    let detectors: Vec<Box<dyn ResourceDetector>> = vec![
        Box::new(OsResourceDetector),
        Box::new(ProcessResourceDetector),
    ];

    Resource::builder().with_detectors(&detectors).build()
}
```

With `get_resource()` in place, the function can be called multiple times across
all provider initializations.

### Initializing Tracer Provider

```
fn init_tracer_provider() {
    global::set_text_map_propagator(TraceContextPropagator::new());

    let tracer_provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
        .with_resource(get_resource())
        .with_batch_exporter(
            opentelemetry_otlp::SpanExporter::builder()
                .with_tonic()
                .build()
                .expect("Failed to initialize tracing provider"),
        )
        .build();

    global::set_tracer_provider(tracer_provider);
}
```

### Initializing Meter Provider

```
fn init_meter_provider() -> opentelemetry_sdk::metrics::SdkMeterProvider {
    let meter_provider = opentelemetry_sdk::metrics::SdkMeterProvider::builder()
        .with_resource(get_resource())
        .with_periodic_exporter(
            opentelemetry_otlp::MetricExporter::builder()
                .with_temporality(opentelemetry_sdk::metrics::Temporality::Delta)
                .with_tonic()
                .build()
                .expect("Failed to initialize metric exporter"),
        )
        .build();
    global::set_meter_provider(meter_provider.clone());

    meter_provider
}
```

### Initializing Logger Provider

For logs, the Shipping service uses Tracing, so the `OpenTelemetryTracingBridge`
is used to bridge logs from the tracing crate to OpenTelemetry.

```
fn init_logger_provider() {
    let logger_provider = opentelemetry_sdk::logs::SdkLoggerProvider::builder()
        .with_resource(get_resource())
        .with_batch_exporter(
            opentelemetry_otlp::LogExporter::builder()
                .with_tonic()
                .build()
                .expect("Failed to initialize logger provider"),
        )
        .build();

    let otel_layer = OpenTelemetryTracingBridge::new(&logger_provider);
    let filter_otel = EnvFilter::new("info");
    let otel_layer = otel_layer.with_filter(filter_otel);

    tracing_subscriber::registry().with(otel_layer).init();
}
```

### Instrumentation Initialization

After defining the functions to initialize the providers for Traces, Metrics and
Logs, a public function `init_otel()` is created:

```
pub fn init_otel() -> Result<()> {
    init_logger_provider();
    init_tracer_provider();
    init_meter_provider();
    Ok(())
}
```

This function calls all initializers and returns `OK(())` if everything starts
properly.

The `init_otel()` function is then called on `main`:

```
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    match init_otel() {
        Ok(_) => {
            info!("Successfully configured OTel");
        }
        Err(err) => {
            panic!("Couldn't start OTel: {0}", err);
        }
    };

    [...]

}
```

### Instrumentation Configuration

With the providers now configured and initialized, Shipping uses the
[`opentelemetry-instrumentation-actix-web` crate](https://crates.io/crates/opentelemetry-instrumentation-actix-web)
to instrument the application during server-side and client-side configuration.

#### Server side

The server is wrapped with `RequestTracing` and `RequestMetrics` to
automatically create Traces and Metrics when receiving requests:

```
HttpServer::new(|| {
    App::new()
        .wrap(RequestTracing::new())
        .wrap(RequestMetrics::default())
        .service(get_quote)
        .service(ship_order)
})
```

#### Client side

When making a request to another service, `trace_request()` is added to the
call:

```
let mut response = client
    .post(quote_service_addr)
    .trace_request()
    .send_json(&reqbody)
    .await
    .map_err(|err| anyhow::anyhow!("Failed to call quote service: {err}"))?;
```

### Manual instrumentation

The `opentelemetry-instrumentation-actix-web` crate allows us to instrument
server and client side by adding the commands mentioned in the previous section.

In the Demo we also demonstrate how to manually enhance automatically created
spans and how to create manual metrics on the application.

#### Manual spans

In the following snippet, the current active span is enhanced with a span event
and a span attribute:

```
Ok(get_active_span(|span| {
    let q = create_quote_from_float(f);
    span.add_event(
        "Received Quote".to_string(),
        vec![KeyValue::new("app.shipping.cost.total", format!("{}", q))],
    );
    span.set_attribute(KeyValue::new("app.shipping.cost.total", format!("{}", q)));
    q
}))
```

#### Manual metrics

A custom metric counter is created to count how many items are in the shipping
request:

```
let meter = global::meter("otel_demo.shipping.quote");
let counter = meter.u64_counter("app.shipping.items_count").build();
counter.add(count as u64, &[]);
```

### Logs

Because the Shipping service is using Tracing as a log interface, it uses the
`opentelemetry-appender-tracing` crate to bridge Tracing logs into OpenTelemetry
logs.

The appender was already configured during the
[initialization of the logger provider](#initializing-logger-provider), with the
following two lines:

```
let otel_layer = OpenTelemetryTracingBridge::new(&logger_provider);
tracing_subscriber::registry().with(otel_layer).init();
```

With that in place, we can use Tracing as we would normally, for example:

```
info!(
    name = "SendingQuoteValue",
    quote.dollars = quote.dollars,
    quote.cents = quote.cents,
    message = "Sending Quote"
);
```

The `opentelemetry-appender-tracing` crate takes care of adding OpenTelemetry
context to the log entry, and the final exported log contains all resource
attributes configured and `TraceContext` information.

---

## Telemetry Features

> **Source:** https://opentelemetry.io/docs/demo/telemetry-features/

## OpenTelemetry

- **[OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)**: all services are
  instrumented using OpenTelemetry available instrumentation libraries.
- **[OpenTelemetry Metrics](https://opentelemetry.io/docs/concepts/signals/metrics/)**: select services
  are instrumented using OpenTelemetry available instrumentation libraries. More
  will be added as the relevant SDKs are released.
- **[OpenTelemetry Logs](https://opentelemetry.io/docs/concepts/signals/logs/)**: select services are
  instrumented using OpenTelemetry available instrumentation libraries. More
  will be added as the relevant SDKs are released.
- **[OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)**: all services are instrumented
  and sending the generated traces and metrics to the OpenTelemetry Collector
  via gRPC. The received traces are then exported to the logs and to Jaeger;
  received metrics and exemplars are exported to logs and Prometheus.
- **[OpAMP](https://opentelemetry.io/docs/specs/opamp/)**: the OpenTelemetry Collector reports health,
  version, attributes, and effective configuration to the demo’s OpAMP server.
  You can view the reported status in the OpAMP UI at
  <http://localhost:8080/opamp/>.
- **SDK Self-Observability**: select services opt in to the experimental
  `otel.sdk.*` internal metrics emitted by the OpenTelemetry SDKs themselves,
  visualized in the
  [Self-Observability dashboard](https://opentelemetry.io/docs/demo/self-observability-dashboard/).

## Observability Solutions

- **[Grafana](https://github.com/grafana/grafana)**: all metric dashboards are
  stored in Grafana.
- **[Jaeger](https://www.jaegertracing.io/)**: all generated traces are being
  sent to Jaeger.
- **[OpenSearch](https://opensearch.org/)**: all generated logs are sent to Data
  Prepper. OpenSearch will be used to centralize logging data from services.
- **[Prometheus](https://prometheus.io/)**: all generated metrics and exemplars
  are scraped by Prometheus.

## Environments

- **[Docker](https://docs.docker.com)**: this forked sample can be executed with
  Docker.
- **[Kubernetes](https://kubernetes.io/)**: the app is designed to run on
  Kubernetes (both locally, as well as on the cloud) using a Helm chart.

## Protocols

- **[gRPC](https://grpc.io/)**: microservices use a high volume of gRPC calls to
  communicate to each other.
- **[HTTP](https://www.rfc-editor.org/rfc/rfc9110.html)**: microservices use
  HTTP where gRPC is unavailable or not well supported.

## Other Components

- **[Envoy](https://www.envoyproxy.io/)**: Envoy is used as a reverse proxy for
  user-facing web interfaces such as the frontend and feature flag service.
- **[k6](https://k6.io)**: a background job that creates realistic usage
  patterns on the website using a synthetic load generator.
- **[OpenFeature](https://openfeature.dev)**: a feature flagging API and SDK
  that allows for the enabling and disabling of features in the application.
- **[flagd](https://flagd.dev)**: a feature flagging daemon that is used to
  manage feature flags in the demo application.

---

##### [Log Coverage by Service](https://opentelemetry.io/docs/demo/telemetry-features/log-coverage/)

##### [Manual Span Attributes](https://opentelemetry.io/docs/demo/telemetry-features/manual-span-attributes/)

##### [Metric Coverage by Service](https://opentelemetry.io/docs/demo/telemetry-features/metric-coverage/)

##### [Trace Coverage by Service](https://opentelemetry.io/docs/demo/telemetry-features/trace-coverage/)

---

### Log Coverage by Service

> **Source:** https://opentelemetry.io/docs/demo/telemetry-features/log-coverage/

| Service | Language | OTLP Logs |
| --- | --- | --- |
| Accounting | .NET | ✅ |
| Ad | Java | ✅ |
| Cart | .NET | ✅ |
| Checkout | Go | 🚧 |
| Currency | C++ | ✅ |
| Email | Ruby | 🚧 |
| Flagd | Go | 🚧 |
| Flagd-ui | TypeScript | 🚧 |
| Fraud Detection | Kotlin | ✅ |
| Frontend | TypeScript | 🚧 |
| Frontend Proxy | Envoy | ✅ |
| Image Provider | NGINX | 🚧 |
| Load Generator | Python | ✅ |
| Payment | JavaScript | 🚧 |
| Product Catalog | Go | 🚧 |
| Quote | PHP | ✅ |
| Recommendation | Python | ✅ |
| Shipping | Rust | ✅ |

Emoji Legend:

- Completed: ✅
- Not Applicable: 🔕
- Not Present (Yet): 🚧

---

### Manual Span Attributes

> **Source:** https://opentelemetry.io/docs/demo/telemetry-features/manual-span-attributes/

This page lists the manual Span Attributes used throughout the demo:

## Ad

| Name | Type | Description |
| --- | --- | --- |
| `app.ads.category` | string | Category for returned ad |
| `app.ads.contextKeys` | string | Context keys used to find related ads |
| `app.ads.contextKeys.count` | number | Count of unique context keys used |
| `app.ads.count` | number | Count of ads returned to user |
| `app.ads.ad_request_type` | string | Either `targeted` or `not_targeted` |
| `app.ads.ad_response_type` | string | Either `targeted` or `random` |

## Cart

| Name | Type | Description |
| --- | --- | --- |
| `app.cart.items.count` | number | Number of unique items in cart |
| `app.product.id` | string | Product ID for cart item |
| `app.product.quantity` | string | Quantity for cart item |
| `app.user.id` | string | User ID |

## Checkout

| Name | Type | Description |
| --- | --- | --- |
| `app.cart.items.count` | number | Total number of items in cart |
| `app.order.amount` | number | Order amount |
| `app.order.id` | string | Order ID |
| `app.order.items.count` | number | Number of unique items in order |
| `app.payment.transaction.id` | string | Payment transaction ID |
| `app.shipping.amount` | number | Shipping amount |
| `app.shipping.tracking.id` | string | Shipping tracking ID |
| `app.user.currency` | string | User currency |
| `app.user.id` | string | User ID |

## Currency

| Name | Type | Description |
| --- | --- | --- |
| `app.currency.conversion.from` | string | Currency code to convert from |
| `app.currency.conversion.to` | string | Currency code to convert to |

## Email

| Name | Type | Description |
| --- | --- | --- |
| `app.email.recipient` | string | Email used for order confirmation |
| `app.order.id` | string | Order ID |

## Frontend

| Name | Type | Description |
| --- | --- | --- |
| `app.cart.size` | number | Total number of items in cart |
| `app.cart.items.count` | number | Count of unique items in cart |
| `app.cart.shipping.cost` | number | Cart shipping cost |
| `app.cart.total.price` | number | Cart total price |
| `app.currency` | string | User currency |
| `app.currency.new` | string | New currency to set |
| `app.order.total` | number | Order total cost |
| `app.product.id` | string | Product ID |
| `app.product.quantity` | number | Product quantity |
| `app.products.count` | number | Total products displayed |
| `app.request.id` | string | Request ID |
| `app.session.id` | string | Session ID |
| `app.user.id` | string | User ID |

## Load Generator

| Name | Type | Description |
| --- | --- | --- |
| None yet |  |  |

## Payment

| Name | Type | Description |
| --- | --- | --- |
| `app.payment.amount` | number | Total payment amount |
| `app.payment.card_type` | string | Type of card used for payment |
| `app.payment.card_valid` | boolean | Was the card used valid |
| `app.payment.charged` | boolean | Was the charge successful (false with load generator) |

## Product Catalog

| Name | Type | Description |
| --- | --- | --- |
| `app.product.id` | string | Product ID |
| `app.product.name` | string | Product name |
| `app.products.count` | number | Number of products in catalog |
| `app.products_search.count` | number | Number of products returned in search |

## Quote

| Name | Type | Description |
| --- | --- | --- |
| `app.quote.items.count` | number | Total items to ship |
| `app.quote.cost.total` | number | Total shipping quote |

## Recommendation

| Name | Type | Description |
| --- | --- | --- |
| `app.filtered_products.count` | number | Number of filtered products returned |
| `app.products.count` | number | Number of products in catalog |
| `app.products_recommended.count` | number | Number of recommended products returned |
| `app.cache_hit` | boolean | If cache was accessed or not |

## Shipping

| Name | Type | Description |
| --- | --- | --- |
| `app.shipping.cost.total` | number | Total shipping cost |

---

### Metric Coverage by Service

> **Source:** https://opentelemetry.io/docs/demo/telemetry-features/metric-coverage/

| Service | Language | Instrumentation Libraries | Manual Instrumentation | Multiple Instruments | Views | Custom Attributes | Resource Detection | Exemplars |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accounting | .NET | ✅ | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Ad | Java | ✅ | ✅ | 🚧 | 🚧 | ✅ | ✅ | ✅ |
| Cart | .NET | ✅ | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | ✅ |
| Checkout | Go | ✅ | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Currency | C++ | 🔕 | ✅ | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Email | Ruby | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Flagd-ui | TypeScript | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Fraud Detection | Kotlin | ✅ | 🚧 | 🚧 | 🚧 | 🚧 | ✅ | 🚧 |
| Frontend | TypeScript | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Load Generator | Python | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Payment | JavaScript | 🚧 | ✅ | 🚧 | 🚧 | 🚧 | ✅ | 🚧 |
| Product Catalog | Go | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Quote | PHP | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Recommendation | Python | ✅ | ✅ | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Shipping | Rust | ✅ | ✅ | 🚧 | 🚧 | 🚧 | ✅ | 🚧 |

Emoji Legend:

- Completed: ✅
- Not Applicable: 🔕
- Not Present (Yet): 🚧

---

### Trace Coverage by Service

> **Source:** https://opentelemetry.io/docs/demo/telemetry-features/trace-coverage/

| Service | Language | Instrumentation Libraries | Manual Span Creation | Span Data Enrichment | RPC Context Propagation | Span Links | Baggage | Resource Detection |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accounting | .NET | ✅ | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | ✅ |
| Ad | Java | ✅ | ✅ | ✅ | 🔕 | 🔕 | 🔕 | 🚧 |
| Cart | .NET | ✅ | ✅ | ✅ | 🔕 | 🔕 | 🔕 | ✅ |
| Checkout | Go | ✅ | ✅ | ✅ | 🔕 | 🔕 | 🔕 | ✅ |
| Currency | C++ | 🔕 | ✅ | ✅ | ✅ | 🔕 | 🔕 | 🚧 |
| Email | Ruby | ✅ | ✅ | ✅ | 🔕 | 🔕 | 🔕 | 🚧 |
| Flagd-ui | TypeScript | ✅ | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Fraud Detection | Kotlin | ✅ | 🚧 | 🚧 | 🚧 | ✅ | 🚧 | 🚧 |
| Frontend | TypeScript | ✅ | ✅ | ✅ | 🔕 | ✅ | ✅ | ✅ |
| Load Generator | Python | ✅ | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 | 🚧 |
| Payment | JavaScript | ✅ | ✅ | ✅ | 🔕 | 🔕 | ✅ | ✅ |
| Product Catalog | Go | ✅ | 🔕 | ✅ | 🔕 | 🔕 | 🔕 | 🚧 |
| Quote Service | PHP | ✅ | ✅ | ✅ | 🔕 | 🔕 | 🔕 | 🚧 |
| Recommendation | Python | ✅ | ✅ | ✅ | 🔕 | 🔕 | 🔕 | 🚧 |
| Shipping | Rust | ✅ | ✅ | ✅ | ✅ | 🔕 | 🔕 | ✅ |

Emoji Legend:

- Completed: ✅
- Not Applicable: 🔕
- Not Present (Yet): 🚧

---

## Tests

> **Source:** https://opentelemetry.io/docs/demo/tests/

Currently, the repository includes E2E tests for both the frontend and backend
services. For the Frontend we are using [Cypress](https://www.cypress.io/) to
execute the different flows in the web store. While the backend services use
[AVA](https://avajs.dev) as the main testing framework for integration tests and
[Tracetest](https://tracetest.io/) for trace-based tests.

To run all the tests, execute `make run-tests` from the root directory.

Otherwise, if you want to run a specific suite of tests you can execute specific
commands for each type of test[1](#fn:1):

- **Frontend tests**: `docker compose run frontendTests`
- **Backend tests**:
  - Integration: `docker compose run integrationTests`
  - Trace-based: `docker compose run traceBasedTests`

To learn more about these tests, see
[Service Testing](https://github.com/open-telemetry/opentelemetry-demo/tree/main/test).

---

1. `docker-compose` is deprecated. For details, see
   [Migrate to Compose V2](https://docs.docker.com/compose/). [↩︎](#fnref:1)

---

