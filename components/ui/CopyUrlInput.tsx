'use client'

import { ExternalLink } from 'lucide-react'

export default function CopyUrlInput({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        readOnly
        value={url}
        className="input text-xs bg-gray-50 w-64 truncate"
        onClick={e => (e.target as HTMLInputElement).select()}
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary p-2"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  )
}
