import React from 'react';
import PageUnderConstruction from '../PageUnderConstruction';
import { PAGE_NAMES } from './constants';

export default function PageGuard({ pageKey, pagesStatus, children }) {
  const status = (pagesStatus || {})[pageKey];
  if (status && status.built === false) {
    return (
      <PageUnderConstruction
        pageName={PAGE_NAMES[pageKey] || pageKey}
        percentage={status.percentage ?? 0}
      />
    );
  }
  return children;
}
