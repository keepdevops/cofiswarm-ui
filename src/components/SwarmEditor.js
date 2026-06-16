import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

// Language Pack Imports
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { java } from '@codemirror/lang-java';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { sql } from '@codemirror/lang-sql';
import { php } from '@codemirror/lang-php';
import { markdown } from '@codemirror/lang-markdown';
import { xml } from '@codemirror/lang-xml';

/**
 * langMap moved to module scope to avoid re-creation on every render.
 * Maps normalized language keys to their CodeMirror extension functions.
 */
const langMap = {
  cpp, 'c++': cpp,
  python, py: python,
  javascript, js: javascript,
  rust, rs: rust,
  go,
  java,
  json,
  html,
  css,
  sql,
  php,
  markdown, md: markdown,
  xml
};

/**
 * Force both scrollbars onto the editor's scroll surface.
 * - overflow: auto on .cm-scroller gives a vertical scrollbar once the
 *   content exceeds the fixed editor height.
 * - The horizontal scrollbar only appears when long lines are allowed to
 *   overflow, so line wrapping is left off and a min-width keeps lines from
 *   being squeezed. Scrollbar styling is made explicit so the dark theme
 *   doesn't render them invisible.
 */
const scrollbarTheme = EditorView.theme({
  '.cm-scroller': {
    overflow: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#555 #1e1e1e'
  },
  '.cm-scroller::-webkit-scrollbar': {
    width: '12px',
    height: '12px'
  },
  '.cm-scroller::-webkit-scrollbar-track': {
    background: '#1e1e1e'
  },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    backgroundColor: '#555',
    borderRadius: '6px',
    border: '2px solid #1e1e1e'
  },
  '.cm-scroller::-webkit-scrollbar-thumb:hover': {
    backgroundColor: '#777'
  }
});

const SwarmEditor = ({ 
  code = '', 
  language = 'text', 
  editable = false, 
  onChange, 
  height = '400px' 
}) => {

  // Memoize extensions so the editor doesn't flicker/reset unless language changes
  const extensions = useMemo(() => {
    const langFunc = langMap[language.toLowerCase()];
    // Always include the scrollbar theme; append the language pack when known.
    return langFunc ? [scrollbarTheme, langFunc()] : [scrollbarTheme];
  }, [language]);

  return (
    <div className="matrix-editor-wrapper" style={{ border: '1px solid #333', borderRadius: '4px' }}>
      <CodeMirror
        value={code}
        height={height}
        theme={vscodeDark}
        extensions={extensions}
        readOnly={!editable}
        // Only attach onChange if we are in editable mode
        onChange={editable ? onChange : undefined}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: editable, // Only highlight line when user is editing
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: editable
        }}
        style={{ fontSize: '14px', textAlign: 'left' }}
      />
    </div>
  );
};

export default SwarmEditor;
