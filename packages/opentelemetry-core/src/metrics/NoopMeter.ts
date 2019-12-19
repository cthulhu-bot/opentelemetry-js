/*!
 * Copyright 2019, OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  CounterInstrument,
  DistributedContext,
  GaugeInstrument,
  Meter,
  Metric,
  MetricOptions,
  MetricUtils,
  MeasureInstrument,
  SpanContext,
  LabelSet,
  Labels
} from "@opentelemetry/types";

/**
 * NoopMeter is a noop implementation of the {@link Meter} interface. It reuses constant
 * NoopMetrics for all of its methods.
 */
export class NoopMeter implements Meter {
  constructor() {}

  /**
   * Returns constant noop measure.
   * @param name the name of the metric.
   * @param [options] the metric options.
   */
  createMeasure(
    name: string,
    options?: MetricOptions
  ): Metric<MeasureInstrument> {
    return NOOP_MEASURE_METRIC;
  }

  /**
   * Returns a constant noop counter.
   * @param name the name of the metric.
   * @param [options] the metric options.
   */
  createCounter(
    name: string,
    options?: MetricOptions
  ): Metric<CounterInstrument> {
    return NOOP_COUNTER_METRIC;
  }

  /**
   * Returns a constant gauge metric.
   * @param name the name of the metric.
   * @param [options] the metric options.
   */
  createGauge(name: string, options?: MetricOptions): Metric<GaugeInstrument> {
    return NOOP_GAUGE_METRIC;
  }

  labels(labels: Labels): LabelSet {
    return NOOP_LABEL_SET;
  }
}

export class NoopMetric<T> implements Metric<T> {
  private readonly _instrument: T;

  constructor(instrument: T) {
    this._instrument = instrument;
  }
  /**
   * Returns an Instrument associated with specified LabelSet.
   * It is recommended to keep a reference to the Instrument instead of always
   * calling this method for every operations.
   * @param labels the canonicalized LabelSet used to associate with this metric instrument.
   */
  bind(labels: LabelSet): T {
    return this._instrument;
  }

  /**
   * Returns an Instrument for a metric with all labels not set.
   */
  getDefaultInstrument(): T {
    return this._instrument;
  }

  /**
   * Removes the Instrument from the metric, if it is present.
   * @param labels the canonicalized LabelSet used to associate with this metric instrument.
   */
  removeInstrument(labels: LabelSet): void {
    // @todo: implement this method
    return;
  }

  /**
   * Clears all timeseries from the Metric.
   */
  clear(): void {
    return;
  }

  setCallback(fn: () => void): void {
    return;
  }
}

export class NoopCounterMetric extends NoopMetric<CounterInstrument>
  implements Pick<MetricUtils, "add"> {
  add(value: number, labelSet: LabelSet) {
    this.bind(labelSet).add(value);
  }
}

export class NoopGaugeMetric extends NoopMetric<GaugeInstrument>
  implements Pick<MetricUtils, "set"> {
  set(value: number, labelSet: LabelSet) {
    this.bind(labelSet).set(value);
  }
}

export class NoopMeasureMetric extends NoopMetric<MeasureInstrument>
  implements Pick<MetricUtils, "record"> {
  record(
    value: number,
    labelSet: LabelSet,
    distContext?: DistributedContext,
    spanContext?: SpanContext
  ) {
    if (typeof distContext === "undefined") {
      this.bind(labelSet).record(value);
    } else if (typeof spanContext === "undefined") {
      this.bind(labelSet).record(value, distContext);
    } else {
      this.bind(labelSet).record(value, distContext, spanContext);
    }
  }
}

export class NoopCounterInstrument implements CounterInstrument {
  add(value: number): void {
    return;
  }
}

export class NoopGaugeInstrument implements GaugeInstrument {
  set(value: number): void {
    return;
  }
}

export class NoopMeasureInstrument implements MeasureInstrument {
  record(
    value: number,
    distContext?: DistributedContext,
    spanContext?: SpanContext
  ): void {
    return;
  }
}

export const NOOP_GAUGE_INSTRUMENT = new NoopGaugeInstrument();
export const NOOP_GAUGE_METRIC = new NoopGaugeMetric(NOOP_GAUGE_INSTRUMENT);

export const NOOP_COUNTER_INSTRUMENT = new NoopCounterInstrument();
export const NOOP_COUNTER_METRIC = new NoopCounterMetric(
  NOOP_COUNTER_INSTRUMENT
);

export const NOOP_MEASURE_INSTRUMENT = new NoopMeasureInstrument();
export const NOOP_MEASURE_METRIC = new NoopMeasureMetric(
  NOOP_MEASURE_INSTRUMENT
);

export const NOOP_LABEL_SET = {} as LabelSet;
