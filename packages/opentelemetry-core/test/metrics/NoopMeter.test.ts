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

import * as assert from "assert";
import {
  NoopMeter,
  NOOP_GAUGE_INSTRUMENT,
  NOOP_GAUGE_METRIC,
  NOOP_COUNTER_INSTRUMENT,
  NOOP_COUNTER_METRIC,
  NOOP_MEASURE_INSTRUMENT,
  NOOP_MEASURE_METRIC
} from "../../src/metrics/NoopMeter";
import { Labels } from "@opentelemetry/types";

describe("NoopMeter", () => {
  it("should not crash", () => {
    const meter = new NoopMeter();
    const counter = meter.createCounter("some-name");
    const labels = {} as Labels;
    const labelSet = meter.labels(labels);

    // ensure NoopMetric does not crash.
    counter.setCallback(() => {
      assert.fail("callback occurred");
    });
    counter.bind(labelSet).add(1);
    counter.getDefaultInstrument().add(1);
    counter.removeInstrument(labelSet);

    // ensure the correct noop const is returned
    assert.strictEqual(counter, NOOP_COUNTER_METRIC);
    assert.strictEqual(counter.bind(labelSet), NOOP_COUNTER_INSTRUMENT);
    assert.strictEqual(counter.getDefaultInstrument(), NOOP_COUNTER_INSTRUMENT);
    counter.clear();

    const measure = meter.createMeasure("some-name");
    measure.getDefaultInstrument().record(1);
    measure.getDefaultInstrument().record(1, { key: { value: "value" } });
    measure.getDefaultInstrument().record(
      1,
      { key: { value: "value" } },
      {
        traceId: "a3cda95b652f4a1592b449d5929fda1b",
        spanId: "5e0c63257de34c92"
      }
    );

    // ensure the correct noop const is returned
    assert.strictEqual(measure, NOOP_MEASURE_METRIC);
    assert.strictEqual(measure.getDefaultInstrument(), NOOP_MEASURE_INSTRUMENT);
    assert.strictEqual(measure.bind(labelSet), NOOP_MEASURE_INSTRUMENT);

    const gauge = meter.createGauge("some-name");
    gauge.getDefaultInstrument().set(1);

    // ensure the correct noop const is returned
    assert.strictEqual(gauge, NOOP_GAUGE_METRIC);
    assert.strictEqual(gauge.getDefaultInstrument(), NOOP_GAUGE_INSTRUMENT);
    assert.strictEqual(gauge.bind(labelSet), NOOP_GAUGE_INSTRUMENT);

    const options = {
      component: "tests",
      description: "the testing package"
    };

    const measureWithOptions = meter.createMeasure("some-name", options);
    assert.strictEqual(measureWithOptions, NOOP_MEASURE_METRIC);
    const counterWithOptions = meter.createCounter("some-name", options);
    assert.strictEqual(counterWithOptions, NOOP_COUNTER_METRIC);
    const gaugeWithOptions = meter.createGauge("some-name", options);
    assert.strictEqual(gaugeWithOptions, NOOP_GAUGE_METRIC);
  });
});
