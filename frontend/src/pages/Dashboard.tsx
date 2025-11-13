import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const STAGE_LABELS: Record<string, string> = {
  mobilization: 'Mobilization',
  acquisition: 'Acquisition',
  verification: 'Verification',
  retention: 'Retention',
  graduation: 'Graduation',
  followup: 'Follow Up'
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const isSuperAdmin = user?.role === 'super-admin';

  const { data: tenants, isLoading: tenantsLoading } = useQuery(
    'tenants',
    () => api.getTenants().then(res => res.data),
    { enabled: isSuperAdmin }
  );

  const { data: participants, isLoading: participantsLoading } = useQuery(
    'participants',
    () => api.getParticipants().then(res => res.data)
  );

  const { data: funnelStats, isLoading: funnelLoading } = useQuery(
    'funnelStatistics',
    () => api.getFunnelStatistics().then(res => res.data)
  );

  const { data: costSummary, isLoading: costLoading } = useQuery(
    'costSummary',
    () => api.getCostSummary().then(res => res.data),
    { enabled: isSuperAdmin }
  );

  const isLoading = tenantsLoading || participantsLoading || funnelLoading || costLoading;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Prepare funnel data for charts
  const funnelChartData = funnelStats?.currentDistribution
    ? Object.entries(funnelStats.currentDistribution).map(([stage, count]) => ({
        stage: STAGE_LABELS[stage] || stage,
        count
      }))
    : [];

  const funnelPieData = funnelChartData.map((item, index) => ({
    name: item.stage,
    value: item.count,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Welcome back, {user?.email}!
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {isSuperAdmin && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Tenants"
              value={tenants?.total || 0}
              icon={<BusinessIcon sx={{ color: 'white' }} />}
              color="#1976d2"
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Participants"
            value={participants?.total || 0}
            icon={<PeopleIcon sx={{ color: 'white' }} />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Programs"
            value={funnelChartData.length}
            icon={<TrendingUpIcon sx={{ color: 'white' }} />}
            color="#ed6c02"
          />
        </Grid>
        {isSuperAdmin && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Cost"
              value={`$${costSummary?.totalCost?.toFixed(2) || '0.00'}`}
              icon={<MoneyIcon sx={{ color: 'white' }} />}
              color="#9c27b0"
            />
          </Grid>
        )}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Participants by Funnel Stage
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Stage Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={funnelPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {funnelPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {isSuperAdmin && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Typography variant="body2" color="textSecondary">
                No recent activity to display.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;
