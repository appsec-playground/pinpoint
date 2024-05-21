import React from 'react';
import { useGetTraceViewerData, useTransactionSearchParameters } from '@pinpoint-fe/hooks';
import { TraceViewerData, TransactionInfo } from '@pinpoint-fe/constants';
import { FlameNode, FlameGraph } from './FlameGraph';
import { cn } from '../../../lib';
import { TimelineDetail } from './TimelineDetail';

export interface TimelineFetcherProps {
  transactionInfo?: TransactionInfo.Response;
}

export const TimelineFetcher = ({ transactionInfo }: TimelineFetcherProps) => {
  const { transactionInfo: transactionSearchParams } = useTransactionSearchParameters();
  const [selectedNode, setSelectedNode] = React.useState<FlameNode<TraceViewerData.TraceEvent>>();

  const { data } = useGetTraceViewerData({
    traceId: transactionInfo?.transactionId,
    spanId: `${transactionInfo?.spanId}`,
    agentId: transactionInfo?.agentId,
    focusTimestamp: transactionSearchParams?.focusTimestamp,
  });
  const flameGraphData = genFlameGraphData(data);

  React.useEffect(() => {
    setSelectedNode(undefined);
  }, [transactionInfo]);

  return (
    <div className={cn('h-full flex')}>
      <FlameGraph<TraceViewerData.TraceEvent>
        data={flameGraphData}
        start={transactionInfo?.callStackStart}
        end={transactionInfo?.callStackEnd}
        onClickNode={(_, node) => setSelectedNode(node)}
      />
      {selectedNode && (
        <TimelineDetail node={selectedNode} onClose={() => setSelectedNode(undefined)} />
      )}
    </div>
  );
};

const genFlameGraphData = (data?: TraceViewerData.Response) => {
  let result: FlameNode<TraceViewerData.TraceEvent>[] = [];
  if (data) {
    const traceEvents = data?.traceEvents || [];
    const mapByTid: { [key: number]: TraceViewerData.TraceEvent[] } = {};

    traceEvents.forEach((item) => {
      const { tid } = item;

      if (mapByTid[tid]) {
        mapByTid[tid].push(item);
      } else {
        mapByTid[tid] = [];
        mapByTid[tid].push(item);
      }
    });

    result = Object.values(mapByTid).map((traceEventsByTid) => {
      let root!: FlameNode<TraceViewerData.TraceEvent>;
      const map: { [key: string]: FlameNode<TraceViewerData.TraceEvent> } = {};

      traceEventsByTid.forEach((item) => {
        const { name } = item;

        if (name !== 'Async Trace') {
          const { id } = item.args;

          map[id] = {
            id,
            children: [],
            start: item.ts / 1000,
            duration: item.dur / 1000,
            detail: item,
            name,
          };
        }
      });

      traceEventsByTid.forEach((item) => {
        const { id, parentId } = item.args;
        const node = map[id];
        if (!root) {
          root = node;
        } else {
          map[parentId]?.children.push(node);
        }
      });

      return root;
    });
  }

  return result;
};
