// src/components/DiffViewer.tsx
import React, { useState, useEffect } from 'react';
import DiffViewer from 'react-diff-viewer';

interface DiffFile {
  file: string;
  old_code: string;
  new_code: string;
}

interface Props {
  repoUrl: string;
}

const SmartDiffViewer: React.FC<Props> = ({ repoUrl }) => {
  const [diffs, setDiffs] = useState<DiffFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiff = async () => {
    setLoading(true);
    setError(null);
    setDiffs([]);

    try {
      const response = await fetch('http://127.0.0.1:8000/diff_view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl }),
      });

      const data = await response.json();
      if (data.diffs) {
        setDiffs(data.diffs);
      } else {
        setError('No diffs found.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch diff data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoUrl) {
      fetchDiff();
    }
  }, [repoUrl]);

  if (!repoUrl) return null;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>Smart Diff Review</h2>
      {loading && <p>Loading diffs...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && diffs.length === 0 && !error && <p>No file diffs found.</p>}

      {diffs.map((diff, idx) => (
        <div key={idx} style={{ marginBottom: '2rem' }}>
          <h4>{diff.file}</h4>
          <DiffViewer
            oldValue={diff.old_code || ''}
            newValue={diff.new_code}
            splitView={true}
            showDiffOnly={false}
            styles={{ variables: { dark: { codeFoldGutterBackground: '#333' } } }}
          />
        </div>
      ))}
    </div>
  );
};

export default SmartDiffViewer;
