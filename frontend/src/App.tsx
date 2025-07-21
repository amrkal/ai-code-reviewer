// App.tsx (Polished and Refactored)
import React, { useEffect, useState } from 'react';
import CodeReview from './components/CodeReview';
import * as Diff2Html from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';

interface FileReviewResult {
  file: string;
  detailed_suggestions: string[];
  old_code?: string;
  new_code?: string;
}

const App: React.FC = () => {
  const [repoUrl] = useState('https://github.com/amrkal/TennisCourt');
  const [diffText, setDiffText] = useState<string>('');
  const [repoResults, setRepoResults] = useState<FileReviewResult[]>([]);
  const [html, setHtml] = useState('');

  useEffect(() => {
    const fetchSmartDiff = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/review_commit_diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: repoUrl }),
        });

        const data = await response.json();
        if (data.diff) setDiffText(data.diff);
        if (data.reviews) setRepoResults(data.reviews);
      } catch (error) {
        console.error('Error fetching smart diff review:', error);
      }
    };

    fetchSmartDiff();
  }, [repoUrl]);

  useEffect(() => {
    if (diffText) {
      const result = Diff2Html.html(diffText, {
        inputFormat: 'diff',
        showFiles: true,
        matching: 'lines',
        outputFormat: 'side-by-side',
      } as any);
      setHtml(result);
    }
  }, [diffText]);

  const handleSmartDiffExport = () => {
    if (!diffText || repoResults.length === 0) return;

    const header = `# Smart Diff Review Report\nRepository: ${repoUrl}\nDate: ${new Date().toLocaleString()}\n\n---\n`;
    const body = repoResults.map(({ file, detailed_suggestions }) => `## ${file}\n\n${detailed_suggestions.length > 0
      ? '**Suggestions:**\n' + detailed_suggestions.map(s => `- ${s}`).join('\n')
      : '_No suggestions._'}`).join('\n\n---\n\n');

    const blob = new Blob([header + body], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'smart-diff-review.md';
    link.click();

    URL.revokeObjectURL(url);
  };

  const suggestionsMap = repoResults.reduce((map, { file, detailed_suggestions }) => {
    map[file] = detailed_suggestions || [];
    return map;
  }, {} as { [file: string]: string[] });

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: 'auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>AI Code Reviewer</h1>

      <CodeReview />

      <h2 style={{ fontSize: '1.5rem', marginTop: '2rem' }}>Smart Diff Review</h2>

      <div dangerouslySetInnerHTML={{ __html: html }} className="diff-container" />

      {repoResults.map((file) => (
        <div key={file.file} style={{ marginTop: '1rem' }}>
          <h4>Suggestions for <code>{file.file}</code></h4>
          {file.detailed_suggestions.length > 0 ? (
            <ul>
              {file.detailed_suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'gray' }}>No suggestions available.</p>
          )}
        </div>
      ))}

      {repoResults.length > 0 && (
        <button
          onClick={handleSmartDiffExport}
          style={{ marginTop: '1.5rem', backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none' }}
        >
          Export Smart Diff Review as Markdown
        </button>
      )}
    </div>
  );
};

export default App;