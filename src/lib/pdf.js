// pdf.js setup — renders PDF pages into HTML (canvas + selectable text layer).
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjs }

/**
 * Start loading a PDF from an ArrayBuffer (copied, because pdf.js transfers it to the worker).
 * Returns the loading task: await `task.promise` for the document, call `task.destroy()` to clean up
 * (in pdf.js v6 the document proxy itself has no destroy()).
 */
export function loadPdf(buffer) {
  return pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) })
}
