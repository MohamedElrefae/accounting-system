import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Paper,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import useAppStore from '../store/useAppStore';
import StatCard from '../components/ui/StatCard';
import { 
  dashboardStats, 
  recentTransactions, 
  monthlyRevenueData, 
  expenseBreakdown, 
  translations 
} from '../data/mockData';

const Dashboard: React.FC = () => {
  const { language } = useAppStore();
  const t = translations[language];

  // Transform data for recharts
  const chartData = monthlyRevenueData?.labels?.map((label, index) => ({
    month: label,
    revenue: monthlyRevenueData.datasets?.[0]?.data?.[index] || 0,
    expenses: monthlyRevenueData.datasets?.[1]?.data?.[index] || 0,
  })) || [];

  const pieData = expenseBreakdown?.labels?.map((label, index) => ({
    name: label,
    value: expenseBreakdown.datasets?.[0]?.data?.[index] || 0,
    color: expenseBreakdown.datasets?.[0]?.backgroundColor?.[index] || "#000000",
  })) || [];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  return (
    <Box>
      {/* Page Title */}
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        {t.dashboard}
      </Typography>

      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {dashboardStats.map((stat) => (
          <Box key={stat.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
            <StatCard stat={stat} />
          </Box>
        ))}
      </Box>

      {/* Charts Section */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {/* Monthly Revenue Chart */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(66.666% - 12px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {t.monthlyRevenue}
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
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
        </Box>

        {/* Expense Breakdown Pie Chart */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(33.333% - 12px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {t.expenseBreakdown}
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: $${value?.toLocaleString()}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`]} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Recent Transactions */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t.recentTransactions}
            </Typography>
            <Button variant="outlined" size="small">
              {t.viewAll}
            </Button>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{'Date'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{'Description'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{'Category'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{'Type'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{'Amount'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>{formatDate(transaction.date || '')}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type === 'income' ? t.income : t.expense}
                        color={transaction.type === 'income' ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        color: transaction.type === 'income' ? 'success.main' : 'error.main',
                        fontWeight: 600,
                      }}
                    >
                      {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;





