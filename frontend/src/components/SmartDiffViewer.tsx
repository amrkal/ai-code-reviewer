import React, { useEffect, useState } from 'react';
import * as Diff2Html from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';

interface Props {
  diff: string;
}

const SmartDiffViewer: React.FC<Props> = ({ diff }) => {
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (diff) {
const result = Diff2Html.html(diff, {
  inputFormat: 'diff',
  showFiles: true,
  matching: 'lines',
  outputFormat: 'side-by-side',
} as any);

      setHtml(result);
    }
  }, [diff]);

  return (
    <div
      className="diff-container"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default SmartDiffViewer;
