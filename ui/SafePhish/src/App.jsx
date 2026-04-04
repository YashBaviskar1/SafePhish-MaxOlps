import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import UrlReport from './pages/UrlReport';
import EmailReport from './pages/EmailReport';
import PipelineOverview from './pages/PipelineOverview'; // 1. Import the new page

function App() {
  const [currentPage, setCurrentPage] = useState('url_report');

  useEffect(() => {
    // When the extension opens index.html?page=..., this catches it
    const params = new URLSearchParams(window.location.search);
    const pageToLoad = params.get('page');
    if (pageToLoad) {
      setCurrentPage(pageToLoad);
    }
  }, []);

  // 2. Create a helper function to render the correct component
  const renderPage = () => {
    switch (currentPage) {
      case 'url_report':
        return <UrlReport />;
      case 'email_report':
        return <EmailReport />;
      case 'pipeline_overview':
        return <PipelineOverview />;
      // Add more cases here as you build Dashboard, Settings, etc.
      default:
        return <UrlReport />; // Fallback page
    }
  };

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {/* 3. Call the render function here */}
      {renderPage()}
    </Layout>
  );
}

export default App;