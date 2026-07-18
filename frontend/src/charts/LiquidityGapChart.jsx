import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const LiquidityGapChart = ({ data }) => {
  const labels = data.map((item) => item.bucketLabel);
  const assets = data.map((item) => item.totalAssets);
  const liabilities = data.map((item) => item.totalLiabilities);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Assets (Inflows)',
        data: assets,
        backgroundColor: 'rgba(0, 255, 136, 0.4)', // Neon Green Transparent
        borderColor: '#00ff88', // Neon Green
        borderWidth: 2,
        borderRadius: 4,
      },
      {
        label: 'Liabilities (Outflows)',
        data: liabilities,
        backgroundColor: 'rgba(255, 59, 92, 0.4)', // Neon Red/Pink Transparent
        borderColor: '#ff3b5c', // Neon Red/Pink
        borderWidth: 2,
        borderRadius: 4,
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
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default LiquidityGapChart;
