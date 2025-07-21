import React, { useState } from 'react';
import { reviewCode, reviewRepo, reviewCommitDiff } from '../services/api';
import SmartDiffViewer from './SmartDiffViewer';

interface ReviewResult {
  readability_score: number;
  code_quality_score: number;
  best_practices_score: number;
  bug_risk_score: number;
  detailed_suggestions: string[];
}

interface FileReviewResult extends ReviewResult {
  file: string;
  error?: string;
}

interface DiffFile {
  file: string;
  old_code: string;
  new_code: string;
}

const CodeReview: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [repoUrl, setRepoUrl] = useState('');
  const [repoResults, setRepoResults] = useState<FileReviewResult[]>([]);
  const [diffResults, setDiffResults] = useState<DiffFile[]>([]);

  const handleRepoExport = () => {
    if (repoResults.length === 0) return;

    const md = repoResults.map(res => {
      if (res.error) {
        return `## ${res.file}\n**Error:** ${res.error}`;
      }

      return `## ${res.file}

**Readability:** ${res.readability_score}/10  
**Code Quality:** ${res.code_quality_score}/10  
**Best Practices:** ${res.best_practices_score}/10  
**Bug Risk:** ${res.bug_risk_score}/10  

### Suggestions
${res.detailed_suggestions.map((s: string) => `- ${s}`).join('\n')}`;
    }).join('\n\n---\n\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'repo-review.md';
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleReview = async () => {
    setLoading(true);
    setError(null);
    setScores(null);
    setRepoResults([]);
    setDiffResults([]);

    try {
      const result = await reviewCode(code) as ReviewResult;
      if ('error' in result || !result.readability_score) {
        setError('Failed to parse AI response.');
        console.warn('RAW GPT RESPONSE:', (result as any).raw);
      } else {
        setScores(result);
      }
    } catch (err) {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleRepoReview = async () => {
    setLoading(true);
    setError(null);
    setScores(null);
    setRepoResults([]);
    setDiffResults([]);

    try {
      const data = await reviewRepo(repoUrl) as { reviews: FileReviewResult[] };
      setRepoResults(data.reviews || []);
    } catch (err) {
      setError('Failed to analyze repo.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!scores) return;

    const md = `
# Code Review Report

**Readability:** ${scores.readability_score}/10  
**Code Quality:** ${scores.code_quality_score}/10  
**Best Practices:** ${scores.best_practices_score}/10  
**Bug Risk:** ${scores.bug_risk_score}/10  

## Suggestions
${scores.detailed_suggestions.map(s => `- ${s}`).join('\n')}`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'code-review.md';
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleSmartDiffReview = async () => {
    setLoading(true);
    setError(null);
    setScores(null);
    setRepoResults([]);
    setDiffResults([]);

    try {
      const data = await reviewCommitDiff(repoUrl) as { diffs: DiffFile[] };
      setDiffResults(data.diffs || []);
    } catch (err) {
      setError('Failed to fetch commit diff review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
      <h1>AI Code Reviewer</h1>

      <textarea
        rows={10}
        placeholder="Paste your code here..."
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{ width: '100%', fontFamily: 'monospace' }}
      />

      <input
        type="text"
        placeholder="GitHub repo URL (e.g., https://github.com/user/repo)"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        style={{ width: '100%', marginTop: '1rem' }}
      />

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button onClick={handleReview} disabled={loading}>
          {loading ? 'Reviewing Code...' : 'Review Code'}
        </button>

        <button onClick={handleRepoReview} disabled={loading}>
          {loading ? 'Reviewing Repo...' : 'Review GitHub Repo'}
        </button>

        <button onClick={handleSmartDiffReview} disabled={loading}>
          {loading ? 'Analyzing Commit Diff...' : 'Smart Diff Review'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}

      {scores && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Scores</h3>
          <ul>
            <li><strong>Readability:</strong> {scores.readability_score}/10</li>
            <li><strong>Code Quality:</strong> {scores.code_quality_score}/10</li>
            <li><strong>Best Practices:</strong> {scores.best_practices_score}/10</li>
            <li><strong>Bug Risk:</strong> {scores.bug_risk_score}/10</li>
          </ul>

          <h3>Suggestions</h3>
          <ul>
            {scores.detailed_suggestions.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>

          <button onClick={handleExport} style={{ marginTop: '1rem' }}>
            Export as Markdown
          </button>
        </div>
      )}

      {repoResults.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>GitHub Repo Review Results</h3>

          {repoResults.map((res, idx) => (
            <div key={idx} style={{ marginBottom: '1.5rem' }}>
              <h4>{res.file}</h4>
              {res.error ? (
                <p style={{ color: 'red' }}>Error: {res.error}</p>
              ) : (
                <ul>
                  <li><strong>Readability:</strong> {res.readability_score}/10</li>
                  <li><strong>Code Quality:</strong> {res.code_quality_score}/10</li>
                  <li><strong>Best Practices:</strong> {res.best_practices_score}/10</li>
                  <li><strong>Bug Risk:</strong> {res.bug_risk_score}/10</li>
                </ul>
              )}

              {res.detailed_suggestions && (
                <>
                  <h5>Suggestions</h5>
                  <ul>
                    {res.detailed_suggestions.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}

          <button onClick={handleRepoExport} style={{ marginTop: '1rem' }}>
            Export Repo Review as Markdown
          </button>
        </div>
      )}

      {diffResults.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h3>Commit Diff Viewer</h3>
          <SmartDiffViewer
            diffObjects={diffResults}
            suggestions={{}}
          />
        </div>
      )}

      {repoResults.length === 0 && diffResults.length === 0 && !loading && repoUrl && (
        <p style={{ marginTop: '1rem', color: 'gray' }}>
          No reviewable files found or something went wrong.
        </p>
      )}
    </div>
  );
};

export default CodeReview;