import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import UrlReport from './pages/UrlReport';
import EmailReport from './pages/EmailReport';

function App() {
  const [currentPage, setCurrentPage] = useState('url_report');

  useEffect(() => {
    // When the extension opens index.html?page=email_report, this catches it
    const params = new URLSearchParams(window.location.search);
    const pageToLoad = params.get('page');
    if (pageToLoad) {
      setCurrentPage(pageToLoad);
    }
  }, []);

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {currentPage === 'email_report' ? <EmailReport /> : <UrlReport />}
    </Layout>
  );
}

export default App;