import React, { useEffect, useState } from 'react';
import CodeReview from './components/CodeReview';
import SmartDiffViewer from './components/SmartDiffViewer';

const App: React.FC = () => {
  const [repoUrl] = useState('https://github.com/amrkal/TennisCourt');
  const [diff, setDiff] = useState<string>('');

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/review_commit_diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: repoUrl }),
        });

        const data = await res.json();
        if (data && data.diff) {
          setDiff(data.diff);
        } else {
          console.warn('No diff returned');
        }
      } catch (err) {
        console.error('Failed to fetch diff:', err);
      }
    };

    fetchDiff();
  }, [repoUrl]);

  return (
    <div style={{ padding: '2rem' }}>
      <CodeReview />
      {diff && <SmartDiffViewer diff={diff} />}
    </div>
  );
};

export default App;
