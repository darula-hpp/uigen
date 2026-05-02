import type { ChartConfig } from '@uigen-dev/core';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { transformChartData, getSeriesConfig } from '@/lib/chart-utils';

interface ChartVisualizationProps {
  data: any[];
  chartConfig: ChartConfig;
  className?: string;
}

/**
 * ChartVisualization component renders data visualizations based on chartConfig.
 * Supports multiple chart types: line, bar, pie, scatter, area, radar, donut.
 * 
 * @param data - Array of data objects from API response
 * @param chartConfig - Chart configuration from IR (x-uigen-chart annotation)
 * @param className - Optional CSS class name
 */
export function ChartVisualization({ data, chartConfig, className = '' }: ChartVisualizationProps) {
  // Transform data for Recharts
  const chartData = transformChartData(data, chartConfig);
  const seriesConfig = getSeriesConfig(chartConfig);
  
  // Get chart options
  const options = chartConfig.options || {};
  const title = options.title as string | undefined;
  
  // Handle empty data
  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No data available for chart</p>
      </div>
    );
  }
  
  // Render chart based on type
  const renderChart = () => {
    switch (chartConfig.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {seriesConfig.map((series) => (
                <Line
                  key={series.field}
                  type="monotone"
                  dataKey={series.field}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {seriesConfig.map((series) => (
                <Bar
                  key={series.field}
                  dataKey={series.field}
                  name={series.label}
                  fill={series.color}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={seriesConfig[0].field}
                nameKey={chartConfig.labels || chartConfig.xAxis}
                cx="50%"
                cy="50%"
                innerRadius={chartConfig.chartType === 'donut' ? '40%' : 0}
                outerRadius="70%"
                label
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={seriesConfig[0].color} fillOpacity={1 - (index * 0.1)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis dataKey={seriesConfig[0].field} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              {seriesConfig.map((series) => (
                <Scatter
                  key={series.field}
                  name={series.label}
                  data={chartData}
                  fill={series.color}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {seriesConfig.map((series) => (
                <Area
                  key={series.field}
                  type="monotone"
                  dataKey={series.field}
                  name={series.label}
                  stroke={series.color}
                  fill={series.color}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey={chartConfig.xAxis} />
              <PolarRadiusAxis />
              <Tooltip />
              <Legend />
              {seriesConfig.map((series) => (
                <Radar
                  key={series.field}
                  name={series.label}
                  dataKey={series.field}
                  stroke={series.color}
                  fill={series.color}
                  fillOpacity={0.6}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              Unsupported chart type: {chartConfig.chartType}
            </p>
          </div>
        );
    }
  };
  
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      {renderChart()}
    </div>
  );
}
