import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-4 px-4 text-center border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50">
      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-tight">
        For self-review only. Not investment advice.
      </p>
    </footer>
  );
};
