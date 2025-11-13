import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const TenantList: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery('tenants', () =>
    api.getTenants().then(res => res.data)
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const tenants = data?.tenants || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Tenants</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Create Tenant
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Namespace</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary">No tenants found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant: any) => (
                <TableRow
                  key={tenant.id}
                  hover
                  onClick={() => navigate(`/tenants/${tenant.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{tenant.name}</TableCell>
                  <TableCell>
                    <code>{tenant.namespace}</code>
                  </TableCell>
                  <TableCell>{tenant.email}</TableCell>
                  <TableCell>
                    <Chip label={tenant.tier} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tenant.status}
                      size="small"
                      color={getStatusColor(tenant.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(tenant.metadata.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button size="small">View</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TenantList;
