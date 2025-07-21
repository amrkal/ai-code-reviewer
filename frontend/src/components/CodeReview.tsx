import React, { useState } from 'react';
import { reviewCode, reviewRepo, reviewCommitDiff } from '../services/api';
import SmartDiffViewer from './SmartDiffViewer';
import ScoreBadge from './ScoreBadge';



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

const CodeReview: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diffText, setDiffText] = useState<string>('');


  const [repoUrl, setRepoUrl] = useState('');
  const [repoResults, setRepoResults] = useState<FileReviewResult[]>([]);

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

    try {
      const data = await reviewRepo(repoUrl) as { reviews: FileReviewResult[] };
      console.log("Repo review response:", data);
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
  setDiffText('');

  try {
    const data = await reviewCommitDiff(repoUrl) as { diff: string, reviews: FileReviewResult[] };

    if (data.diff) setDiffText(data.diff);
    if (data.reviews) setRepoResults(data.reviews);
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
<div className="flex flex-wrap gap-2">
  <ScoreBadge score={scores.readability_score} label="Readability" />
  <ScoreBadge score={scores.code_quality_score} label="Code Quality" />
  <ScoreBadge score={scores.best_practices_score} label="Best Practices" />
  <ScoreBadge score={scores.bug_risk_score} label="Bug Risk" />
</div>

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
<div className="flex flex-wrap gap-2">
  <ScoreBadge score={res.readability_score} label="Readability" />
  <ScoreBadge score={res.code_quality_score} label="Code Quality" />
  <ScoreBadge score={res.best_practices_score} label="Best Practices" />
  <ScoreBadge score={res.bug_risk_score} label="Bug Risk" />
</div>
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

          <div style={{ marginTop: '3rem' }}>
            <h3>Commit Diff Viewer</h3>
              <SmartDiffViewer
                diffText={diffText}
                diffObjects={repoResults
                  .filter(res => !res.error && 'old_code' in res && 'new_code' in res)
                  .map(res => ({
                    file: res.file,
                    old_code: (res as any).old_code || '',
                    new_code: (res as any).new_code || '',
                  }))}
                suggestions={Object.fromEntries(
                  repoResults.map(res => [res.file, res.detailed_suggestions || []])
                )}
              />
              {repoResults.length > 0 && diffText && (
                  <button
                    onClick={() => {
                      const header = `# Smart Diff Review Report\nRepository: ${repoUrl}\nDate: ${new Date().toLocaleString()}\n\n---\n`;
                      const body = repoResults.map(({ file, detailed_suggestions }) =>
                        `## ${file}\n\n${detailed_suggestions.length > 0
                          ? '**Suggestions:**\n' + detailed_suggestions.map(s => `- ${s}`).join('\n')
                          : '_No suggestions._'}`).join('\n\n---\n\n');

                      const blob = new Blob([header + body], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'smart-diff-review.md';
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ marginTop: '1.5rem', backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none' }}
                  >
                    Export Smart Diff Review as Markdown
                  </button>
                )}



          </div>
        </div>
      )}

      {repoResults.length === 0 && !loading && repoUrl && (
        <p style={{ marginTop: '1rem', color: 'gray' }}>
          No reviewable files found or something went wrong.
        </p>
      )}
    </div>
  );
};

export default CodeReview;