import { DOCUMENT_UPLOAD_ACCEPT } from '@schema-platform/ai-shared'

export interface WorkflowFileStreamInput {
  filename: string
  mimetype: string
  content: string
}

export async function fileToWorkflowPayload(file: File): Promise<WorkflowFileStreamInput> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return {
    filename: file.name,
    mimetype: file.type || 'application/octet-stream',
    content: btoa(binary),
  }
}

export function attachmentToWorkflowFileRef(attachment: {
  documentId: string
  filename: string
  mimetype: string
}): { documentId: string; filename: string; mimetype: string } {
  return {
    documentId: attachment.documentId,
    filename: attachment.filename,
    mimetype: attachment.mimetype,
  }
}

export function workflowGraphNeedsUploadStream(graph: {
  nodes: Array<{ type?: string; data?: { documentSource?: string } }>
}): boolean {
  return graph.nodes.some((node) => {
    if (node.type !== 'document-parse' && node.type !== 'vision-analyze') return false
    const source = node.data?.documentSource ?? 'stream'
    return source === 'stream'
  })
}

export function pickWorkflowTestFile(accept?: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept ?? DOCUMENT_UPLOAD_ACCEPT
    input.onchange = () => {
      resolve(input.files?.[0] ?? null)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}
