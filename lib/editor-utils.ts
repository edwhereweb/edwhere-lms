import { createLowlight, common } from 'lowlight';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';

export const lowlight = createLowlight(common);

lowlight.register('c', c);
lowlight.register('cpp', cpp);
lowlight.register('javascript', js);
lowlight.register('typescript', ts);
lowlight.register('python', python);
lowlight.register('bash', bash);
lowlight.register('terminal', bash); // Alias for terminal outputs
