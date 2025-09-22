import React, { useState } from 'react';
import { Box, Container, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import DocumentControlsBar from './DocumentControlsBar';

// Create RTL cache for emotion
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const cacheLtr = createCache({
  key: 'muiltr',
  stylisPlugins: [prefixer],
});

// Create a test theme with RTL support
const rtlTheme = createTheme({
  direction: 'rtl',
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

const ltrTheme = createTheme({
  direction: 'ltr',
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

const DocumentControlsBarRTLTest: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(['draft', 'approved']);
  const [isRTL, setIsRTL] = useState(true);

  const theme = isRTL ? rtlTheme : ltrTheme;
  const emotionCache = isRTL ? cacheRtl : cacheLtr;

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

  const toggleDirection = () => {
    setIsRTL(!isRTL);
  };

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="xl" sx={{ py: 4 }} dir={isRTL ? 'rtl' : 'ltr'}>
          <Box sx={{ mb: 4, textAlign: isRTL ? 'right' : 'left' }}>
            <h1>DocumentControlsBar RTL Test</h1>
            <p>Testing the modernized DocumentControlsBar component with RTL layout support</p>
            <button onClick={toggleDirection} style={{ 
              padding: '10px 20px', 
              marginBottom: '20px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              cursor: 'pointer'
            }}>
              Switch to {isRTL ? 'LTR' : 'RTL'} Layout
            </button>
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
            <p><strong>Direction:</strong> {isRTL ? 'RTL (Right-to-Left)' : 'LTR (Left-to-Right)'}</p>
            <p><strong>Search:</strong> "{searchText}"</p>
            <p><strong>Active Filters:</strong> {activeFilters.join(', ') || 'None'}</p>
          </Box>
        </Container>
      </ThemeProvider>
    </CacheProvider>
  );
};

export default DocumentControlsBarRTLTest;