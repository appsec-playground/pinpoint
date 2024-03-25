import { useNavigate } from 'react-router-dom';
import {
  useErrorAnalysisSearchParameters,
  useGetErrorAnalysisGroupedErrorListData,
} from '@pinpoint-fe/hooks';
import { cn } from '../../../lib';
import { DataTable } from '../../DataTable';
import { errorGroupedTableColumns } from './errorAnalysisGroupedTableColumn';
import {
  getErrorAnalysisPath,
  convertParamsToQueryString,
  getFormattedDateRange,
} from '@pinpoint-fe/utils';

export interface ErrorAnalysisGroupedTableFetcherProps {
  className?: string;
}

export const ErrorAnalysisGroupedTableFetcher = ({
  className,
}: ErrorAnalysisGroupedTableFetcherProps) => {
  const navigate = useNavigate();
  const { data } = useGetErrorAnalysisGroupedErrorListData();
  const { parsedGroupBy, agentId, application, dateRange } = useErrorAnalysisSearchParameters();

  const columns = errorGroupedTableColumns({
    groupBy: parsedGroupBy,
    onClickGroupBy: (group) => {
      navigate(
        `${getErrorAnalysisPath(application!)}?${convertParamsToQueryString({
          ...getFormattedDateRange(dateRange),
          ...{ agentId, groupBy: parsedGroupBy?.filter((g) => g !== group).join(',') },
        })}`,
      );
    },
  });

  return (
    <div className={cn('rounded-md border', className)}>
      <DataTable tableClassName="[&>tbody]:text-xs" columns={columns} data={data || []} />
    </div>
  );
};
