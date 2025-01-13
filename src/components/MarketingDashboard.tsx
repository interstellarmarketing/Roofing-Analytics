'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Papa from 'papaparse';
import _ from 'lodash';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface LeadData {
  LeadEntryDate: Date;
  CallDisposition: string;
  Source: string;
  Sold: number;
  LeadCost: number;
  [key: string]: any;
}

interface DispositionStat {
  current: string;
  currentCount: number;
  previous: string;
  previousCount: number;
  change: string;
}

interface DispositionStats {
  [key: string]: DispositionStat;
}

interface SourceStat {
  source: string;
  count: number;
  conversionRate: string;
  averageCost: string;
}

const MarketingDashboard = () => {
  const [data, setData] = useState<LeadData[]>([]);
  const [dateRange, setDateRange] = useState('7'); // days
  const [loading, setLoading] = useState(true);
  const [dispositionStats, setDispositionStats] = useState<DispositionStats>({});
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);

  const processData = useCallback((rawData: LeadData[]) => {
    // Process disposition trends
    const now = new Date();
    const daysAgo = new Date(now.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000));
    
    const recentData = rawData.filter(row => row.LeadEntryDate >= daysAgo);
    const olderData = rawData.filter(row => 
      row.LeadEntryDate >= new Date(daysAgo.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000)) &&
      row.LeadEntryDate < daysAgo
    );

    // Calculate disposition stats
    const calculateDispositionStats = (data: LeadData[]) => {
      const total = data.length;
      return _.chain(data)
        .groupBy('CallDisposition')
        .map((group, disposition) => ({
          disposition,
          count: group.length,
          percentage: (group.length / total) * 100
        }))
        .value();
    };

    const recentStats = calculateDispositionStats(recentData);
    const olderStats = calculateDispositionStats(olderData);

    // Combine stats
    const changes: DispositionStats = {};
    [...recentStats, ...olderStats].forEach(stat => {
      const disposition = stat.disposition;
      if (!changes[disposition]) {
        changes[disposition] = {
          current: '0',
          currentCount: 0,
          previous: '0',
          previousCount: 0,
          change: '0'
        };
      }
    });

    recentStats.forEach(stat => {
      if (changes[stat.disposition]) {
        changes[stat.disposition].current = stat.percentage.toFixed(1);
        changes[stat.disposition].currentCount = stat.count;
      }
    });

    olderStats.forEach(stat => {
      if (changes[stat.disposition]) {
        changes[stat.disposition].previous = stat.percentage.toFixed(1);
        changes[stat.disposition].previousCount = stat.count;
        changes[stat.disposition].change = (
          (parseFloat(changes[stat.disposition].current) - stat.percentage) || 0
        ).toFixed(1);
      }
    });

    setDispositionStats(changes);

    // Process source performance
    const sourcePerformance = _.chain(rawData)
      .groupBy('Source')
      .map((group, source) => ({
        source,
        count: group.length,
        conversionRate: (group.filter(row => row.Sold === 1).length / group.length * 100).toFixed(1),
        averageCost: _.meanBy(group, 'LeadCost').toFixed(2)
      }))
      .value();

    setSourceStats(sourcePerformance);
  }, [dateRange]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/All Vertical _ Database - Raw Data (1).csv');
        const text = await response.text();
        
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data.map(row => ({
              ...row,
              LeadEntryDate: new Date(row.LeadEntryDate)
            })) as LeadData[];
            
            setData(parsedData);
            processData(parsedData);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error reading file:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [processData]);

  useEffect(() => {
    if (data.length > 0) {
      processData(data);
    }
  }, [dateRange, data, processData]);

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  const dispositionTrends = Object.entries(dispositionStats).map(([disposition, stats]) => ({
    disposition,
    ...stats
  }));

  return (
    <div className="space-y-8">
      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <Calendar className="w-5 h-5" />
        <select 
          className="border rounded p-2"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="7">Last 7 Days</option>
          <option value="14">Last 14 Days</option>
          <option value="30">Last 30 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Call Disposition Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Call Disposition Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dispositionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="disposition" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar name="Current Period %" dataKey="current" fill="#4f46e5" />
                  <Bar name="Previous Period %" dataKey="previous" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Source Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Source Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="source" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar name="Lead Count" dataKey="count" fill="#4f46e5" />
                  <Bar name="Conversion Rate %" dataKey="conversionRate" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disposition Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Disposition Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">Disposition</th>
                  <th className="text-right p-2">Current %</th>
                  <th className="text-right p-2">Current Count</th>
                  <th className="text-right p-2">Previous %</th>
                  <th className="text-right p-2">Previous Count</th>
                  <th className="text-right p-2">% Change</th>
                </tr>
              </thead>
              <tbody>
                {dispositionTrends.map((row) => (
                  <tr key={row.disposition} className="border-t">
                    <td className="p-2">{row.disposition}</td>
                    <td className="text-right p-2">{row.current}%</td>
                    <td className="text-right p-2">{row.currentCount}</td>
                    <td className="text-right p-2">{row.previous}%</td>
                    <td className="text-right p-2">{row.previousCount}</td>
                    <td className={`text-right p-2 ${parseFloat(row.change) > 0 ? 'text-green-600' : parseFloat(row.change) < 0 ? 'text-red-600' : ''}`}>
                      {row.change > 0 ? '+' : ''}{row.change}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 font-bold">
                <tr>
                  <td className="p-2">TOTAL</td>
                  <td className="text-right p-2">100%</td>
                  <td className="text-right p-2">
                    {dispositionTrends.reduce((sum, row) => sum + row.currentCount, 0)}
                  </td>
                  <td className="text-right p-2">100%</td>
                  <td className="text-right p-2">
                    {dispositionTrends.reduce((sum, row) => sum + row.previousCount, 0)}
                  </td>
                  <td className="text-right p-2">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingDashboard; 