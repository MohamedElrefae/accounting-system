import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Box, Card, CardContent, Typography } from '@mui/material';

interface ChartData {
  month: string;
  revenue: number;
  expenses: number;
}

interface PieData {
  name: string;
  value: number;
  color: string;
}

interface MonthlyRevenueChartProps {
  data: ChartData[];
  title: string;
}

interface ExpenseBreakdownChartProps {
  data: PieData[];
  title: string;
}

export const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({ data, title }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Box sx={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value, name) => [`$${value.toLocaleString()}`, name]} />
            <Bar dataKey="revenue" fill="#1976d2" name="Revenue" />
            <Bar dataKey="expenses" fill="#f44336" name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
);

export const ExpenseBreakdownChart: React.FC<ExpenseBreakdownChartProps> = ({ data, title }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Box sx={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, value }) => `${name}: $${value?.toLocaleString()}`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`$${value.toLocaleString()}`]} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
);
