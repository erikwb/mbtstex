import { parseDocx } from './lib/docx.js';
import { lintDocument } from './lib/rules.js';

self.onmessage = ({ data }) => {
  try {
    const document = parseDocx(data.buffer, data.name);
    self.postMessage({ report: lintDocument(document) });
  } catch (error) {
    self.postMessage({ error: error.message || 'This document could not be checked. Try saving a fresh .docx copy.' });
  }
};
