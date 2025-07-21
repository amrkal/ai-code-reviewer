// SmartDiffViewer.tsx (React-Diff & Diff2HTML)
import React, { useEffect, useState } from 'react';
import DiffViewer from 'react-diff-viewer-continued';
import * as Diff2Html from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';

interface DiffFile {
  file: string;
  old_code: string;
  new_code: string;
}

interface Props {
  diffText?: string; // For diff2html
  diffObjects?: DiffFile[]; // For react-diff-viewer
  suggestions?: { [file: string]: string[] };
}

const SmartDiffViewer: React.FC<Props> = ({ diffText, diffObjects = [], suggestions = {} }) => {
  const [mode, setMode] = useState<'react-diff-viewer' | 'diff2html'>('react-diff-viewer');
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (mode === 'diff2html' && diffText) {
      const result = Diff2Html.html(diffText, {
        inputFormat: 'diff',
        showFiles: true,
        matching: 'lines',
        outputFormat: 'side-by-side',
      } as any);
      setHtml(result);
    }
  }, [mode, diffText]);

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setMode('react-diff-viewer')} disabled={mode === 'react-diff-viewer'}>
          React Diff Viewer
        </button>
        <button onClick={() => setMode('diff2html')} disabled={mode === 'diff2html'} style={{ marginLeft: '1rem' }}>
          Diff2HTML
        </button>
      </div>

      {mode === 'diff2html' && diffText && (
        <div dangerouslySetInnerHTML={{ __html: html }} className="diff-container" />
      )}

      {mode === 'react-diff-viewer' && diffObjects.length > 0 && (
        <>
          {diffObjects.map((diff, idx) => (
            <div key={idx} style={{ marginBottom: '2rem' }}>
              <h4>{diff.file}</h4>
              <DiffViewer
                oldValue={diff.old_code || ''}
                newValue={diff.new_code || ''}
                splitView={true}
                showDiffOnly={false}
              />
                  {suggestions[diff.file] && suggestions[diff.file].length > 0 && (
                    <div className="mt-2 bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
                      <p className="font-semibold mb-1">AI Suggestions:</p>
                      <ul className="list-disc pl-5">
                        {suggestions[diff.file].map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default SmartDiffViewer;
