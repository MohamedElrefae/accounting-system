import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import { TrendingUp, TrendingDown, AccountBalance, Receipt } from '../icons/SimpleIcons';
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
  size?: 'small' | 'normal';
}

const StatCard: React.FC<StatCardProps> = ({ stat, size = 'normal' }) => {
  const { language } = useAppStore();
  
  const title = language === 'ar' ? stat.titleAr : stat.titleEn;
  const isPositive = (stat.change ?? 0) > 0;
  const compact = size === 'small';

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.shadows[6],
        },
      }}
    >
      <CardContent sx={{ p: compact ? 2 : 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              gutterBottom
              sx={{ fontWeight: 600, letterSpacing: 0.2 }}
            >
              {title}
            </Typography>
            <Typography
              variant={compact ? 'h6' : 'h4'}
              component="div"
              sx={{ fontWeight: 700, mb: compact ? 1 : 2 }}
            >
              {stat.value}
            </Typography>
            {typeof stat.change !== 'undefined' && (
              <Chip
                icon={isPositive ? <TrendingUp /> : <TrendingDown />}
                label={`${isPositive ? '+' : ''}${stat.change}%`}
                color={isPositive ? 'success' : 'error'}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${stat.color}.main`,
              width: compact ? 40 : 56,
              height: compact ? 40 : 56,
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
