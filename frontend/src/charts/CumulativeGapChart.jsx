import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CumulativeGapChart = ({ data }) => {
  const labels = data.map((item) => item.bucketLabel);
  const gaps = data.map((item) => item.cumulativeGap);

  const chartData = {
    labels,
    datasets: [
      {
        fill: true,
        label: 'Cumulative Liquidity Gap',
        data: gaps,
        borderColor: '#a855f7', // Neon Purple
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
        borderWidth: 3,
        tension: 0.35,
        pointBackgroundColor: '#00d4ff', // Neon Cyan
        pointBorderColor: '#00d4ff',
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#ffffff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#888888',
          font: { family: 'Inter', size: 12, weight: '600' },
        },
      },
      tooltip: {
        backgroundColor: '#0a0a0a',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#888888', font: { family: 'Inter' } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#888888', font: { family: 'Inter' } },
      },
    },
  };

  return (
    <div style={{ height: '320px', position: 'relative' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default CumulativeGapChart;
