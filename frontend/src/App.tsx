// App.tsx
import React from 'react';
import CodeReview from './components/CodeReview';
import 'diff2html/bundles/css/diff2html.min.css';

const App: React.FC = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Code Reviewer</h1>
      <CodeReview />
    </div>
  );
};

export default App;
