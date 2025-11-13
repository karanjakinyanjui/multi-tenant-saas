import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';

const TenantDetail: React.FC = () => {
  const { id } = useParams();

  return (
    <Box>
      <Typography variant="h4">Tenant Details</Typography>
      <Typography>Tenant ID: {id}</Typography>
      <Typography color="textSecondary">Implementation in progress...</Typography>
    </Box>
  );
};

export default TenantDetail;
