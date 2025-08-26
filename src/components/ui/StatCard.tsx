import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import TrendingUp from '@mui/icons-material/TrendingUp';
import TrendingDown from '@mui/icons-material/TrendingDown';
import AccountBalance from '@mui/icons-material/AccountBalance';
import Receipt from '@mui/icons-material/Receipt';
import type { StatCard as StatCardType } from '../../types';
import useAppStore from '../../store/useAppStore';

const iconMap = {
  TrendingUp: <TrendingUp />,
  TrendingDown: <TrendingDown />,
  AccountBalance: <AccountBalance />,
  Receipt: <Receipt />,
};

interface StatCardProps {
  stat: StatCardType;
}

const StatCard: React.FC<StatCardProps> = ({ stat }) => {
  const { language } = useAppStore();
  
  const title = language === 'ar' ? stat.titleAr : stat.titleEn;
  const isPositive = (stat.change ?? 0) > 0;

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              component="div"
              sx={{ fontWeight: 700, mb: 2 }}
            >
              {stat.value}
            </Typography>
            <Chip
              icon={isPositive ? <TrendingUp /> : <TrendingDown />}
              label={`${isPositive ? '+' : ''}${stat.change}%`}
              color={isPositive ? 'success' : 'error'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Avatar
            sx={{
              bgcolor: `${stat.color}.main`,
              width: 56,
              height: 56,
            }}
          >
            {iconMap[stat.icon as keyof typeof iconMap] || <AccountBalance />}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
