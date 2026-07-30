import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartProps {
  type: 'bar' | 'line' | 'doughnut';
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }[];
  options?: any;
  className?: string;
}

export const Charts: React.FC<ChartProps> = ({
  type,
  labels,
  datasets,
  options = {},
  className = 'h-[300px]',
}) => {
  const data = {
    labels,
    datasets: datasets.map((ds) => ({
      ...ds,
      borderWidth: ds.borderWidth ?? 2,
      borderRadius: type === 'bar' ? 6 : 0,
    })),
  };

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(156, 163, 175, 1)',
          font: {
            family: 'Outfit, Inter, sans-serif',
          },
        },
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleFont: { family: 'Outfit, sans-serif' },
        bodyFont: { family: 'Inter, sans-serif' },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: type !== 'doughnut' ? {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(156, 163, 175, 1)',
          font: { family: 'Outfit, sans-serif', size: 11 },
        },
      },
      y: {
        grid: {
          color: 'rgba(243, 244, 246, 0.1)',
        },
        ticks: {
          color: 'rgba(156, 163, 175, 1)',
          font: { family: 'Outfit, sans-serif', size: 11 },
        },
      },
    } : {},
    ...options,
  };

  return (
    <div className={className}>
      {type === 'bar' && <Bar data={data} options={defaultOptions} />}
      {type === 'line' && <Line data={data} options={defaultOptions} />}
      {type === 'doughnut' && <Doughnut data={data} options={defaultOptions} />}
    </div>
  );
};
