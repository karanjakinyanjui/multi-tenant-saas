import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

const ParticipantDetail: React.FC = () => {
  const { id } = useParams();

  return (
    <Box>
      <Typography variant="h4">Participant Details</Typography>
      <Typography>Participant ID: {id}</Typography>
      <Typography color="textSecondary">Implementation in progress...</Typography>
    </Box>
  );
};

export default ParticipantDetail;
