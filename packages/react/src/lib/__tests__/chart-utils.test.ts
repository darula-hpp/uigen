import { describe, it, expect } from 'vitest';
import { transformChartData, getYAxisFields, generateChartColors, getSeriesConfig } from '../chart-utils';
import type { ChartConfig } from '@uigen-dev/core';

describe('chart-utils', () => {
  describe('transformChartData', () => {
    it('should transform data with single y-axis', () => {
      const data = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 150 },
      ];
      
      const chartConfig: ChartConfig = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value',
      };
      
      const result = transformChartData(data, chartConfig);
      
      expect(result).toEqual([
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 150 },
      ]);
    });
    
    it('should transform data with multiple y-axes', () => {
      const data = [
        { month: 'Jan', revenue: 1000, expenses: 800 },
        { month: 'Feb', revenue: 1200, expenses: 900 },
      ];
      
      const chartConfig: ChartConfig = {
        chartType: 'bar',
        xAxis: 'month',
        yAxis: ['revenue', 'expenses'],
      };
      
      const result = transformChartData(data, chartConfig);
      
      expect(result).toEqual([
        { month: 'Jan', revenue: 1000, expenses: 800 },
        { month: 'Feb', revenue: 1200, expenses: 900 },
      ]);
    });
    
    it('should include labels when specified', () => {
      const data = [
        { category: 'A', value: 100, categoryName: 'Category A' },
        { category: 'B', value: 200, categoryName: 'Category B' },
      ];
      
      const chartConfig: ChartConfig = {
        chartType: 'pie',
        xAxis: 'category',
        yAxis: 'value',
        labels: 'categoryName',
      };
      
      const result = transformChartData(data, chartConfig);
      
      expect(result).toEqual([
        { category: 'A', value: 100, _label: 'Category A' },
        { category: 'B', value: 200, _label: 'Category B' },
      ]);
    });
    
    it('should return empty array for empty data', () => {
      const chartConfig: ChartConfig = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value',
      };
      
      expect(transformChartData([], chartConfig)).toEqual([]);
      expect(transformChartData(null as any, chartConfig)).toEqual([]);
    });
  });
  
  describe('getYAxisFields', () => {
    it('should return single field as array', () => {
      const chartConfig: ChartConfig = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value',
      };
      
      expect(getYAxisFields(chartConfig)).toEqual(['value']);
    });
    
    it('should return multiple fields as-is', () => {
      const chartConfig: ChartConfig = {
        chartType: 'bar',
        xAxis: 'month',
        yAxis: ['revenue', 'expenses'],
      };
      
      expect(getYAxisFields(chartConfig)).toEqual(['revenue', 'expenses']);
    });
  });
  
  describe('generateChartColors', () => {
    it('should generate requested number of colors', () => {
      const colors = generateChartColors(3);
      expect(colors).toHaveLength(3);
      expect(colors.every(c => c.startsWith('#'))).toBe(true);
    });
    
    it('should cycle through palette for large counts', () => {
      const colors = generateChartColors(10);
      expect(colors).toHaveLength(10);
    });
  });
  
  describe('getSeriesConfig', () => {
    it('should use explicit series config when provided', () => {
      const chartConfig: ChartConfig = {
        chartType: 'bar',
        xAxis: 'month',
        yAxis: ['revenue', 'expenses'],
        series: [
          { field: 'revenue', label: 'Total Revenue', color: '#00ff00' },
          { field: 'expenses', label: 'Total Expenses', color: '#ff0000' },
        ],
      };
      
      const result = getSeriesConfig(chartConfig);
      
      expect(result).toEqual([
        { field: 'revenue', label: 'Total Revenue', color: '#00ff00' },
        { field: 'expenses', label: 'Total Expenses', color: '#ff0000' },
      ]);
    });
    
    it('should generate series from yAxis when not provided', () => {
      const chartConfig: ChartConfig = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: ['revenue', 'expenses'],
      };
      
      const result = getSeriesConfig(chartConfig);
      
      expect(result).toHaveLength(2);
      expect(result[0].field).toBe('revenue');
      expect(result[0].label).toBe('Revenue');
      expect(result[0].color).toBeTruthy();
      expect(result[1].field).toBe('expenses');
      expect(result[1].label).toBe('Expenses');
    });
    
    it('should humanize field names', () => {
      const chartConfig: ChartConfig = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'total_revenue',
      };
      
      const result = getSeriesConfig(chartConfig);
      
      expect(result[0].label).toBe('Total Revenue');
    });
  });
});
