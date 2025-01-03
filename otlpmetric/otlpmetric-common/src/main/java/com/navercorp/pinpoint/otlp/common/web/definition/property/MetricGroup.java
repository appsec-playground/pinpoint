/*
 * Copyright 2024 NAVER Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.navercorp.pinpoint.otlp.common.web.definition.property;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * @author minwoo-jung
 */
public class MetricGroup {

    private final String metricGroupName;
    private final Map<String, Metric> metricMap;

    public MetricGroup(String metricGroupName) {
        this.metricGroupName = metricGroupName;
        this.metricMap = new TreeMap<>();
    }

    public void addUniqueMetric(MetricDescriptor metricDescriptor) {
        Metric metric = metricMap.computeIfAbsent(metricDescriptor.metricName(), k -> new Metric(metricDescriptor.metricName()));
        metric.addTagAndField(metricDescriptor.rawTags(), metricDescriptor.fieldName(), metricDescriptor.unit());
    }

    public String getMetricGroupName() {
        return metricGroupName;
    }

    public List<Metric> getMetricList() {
        return List.copyOf(metricMap.values());
    }

}
