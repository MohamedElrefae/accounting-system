import React, { useState } from 'react';
import { Box, Container, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import DocumentControlsBar from './DocumentControlsBar';

// Create a test theme with RTL support
const theme = createTheme({
  direction: 'ltr', // Change to 'rtl' to test RTL layout
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const DocumentControlsBarTest: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(['draft', 'submitted']);

  const handleSearchChange = (search: string) => {
    setSearchText(search);
    console.log('Search changed:', search);
  };

  const handleFilterToggle = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
    console.log('Filter toggled:', filter);
  };

  const handleFilterClear = () => {
    setActiveFilters([]);
    console.log('Filters cleared');
  };

  const handleNewDocument = async () => {
    console.log('Creating new document...');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('New document created successfully!');
  };

  const handleUploadDocument = async () => {
    console.log('Uploading document...');
    // Simulate file upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Document uploaded successfully!');
  };

  const handleExportDocuments = async () => {
    console.log('Exporting documents...');
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Documents exported successfully!');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <h1>DocumentControlsBar Test</h1>
          <p>Testing the modernized DocumentControlsBar component with stylish filters</p>
        </Box>
        
        <DocumentControlsBar
          searchText={searchText}
          activeFilters={activeFilters}
          onSearchChange={handleSearchChange}
          onFilterToggle={handleFilterToggle}
          onFilterClear={handleFilterClear}
          onNewDocument={handleNewDocument}
          onUploadDocument={handleUploadDocument}
          onExportDocuments={handleExportDocuments}
          isLoading={false}
          canCreate={true}
          canUpload={true}
          canExport={true}
        />

        <Box sx={{ mt: 4, p: 2, backgroundColor: 'grey.100', borderRadius: 2 }}>
          <h3>Current State:</h3>
          <p><strong>Search:</strong> "{searchText}"</p>
          <p><strong>Active Filters:</strong> {activeFilters.join(', ') || 'None'}</p>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default DocumentControlsBarTest;