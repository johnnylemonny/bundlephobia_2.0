import React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { sanitizeHTML } from '../../../../../../utils/common.utils'

interface InterLinksSectionCardProps {
  name: string
  description: string
  date: string
}

export default function InterLinksSectionCard({
  name,
  description,
  date,
}: InterLinksSectionCardProps) {
  return (
    <Link href={`/package/${name}`} className="interlinks-card">
      <div className="interlinks-card__wrap">
        <div className="interlinks-card__header">
          <h4 className="interlinks-card__name">{name}</h4>
        </div>
        <p
          className="interlinks-card__description"
          dangerouslySetInnerHTML={{
            __html: sanitizeHTML(description),
          }}
        />
        <div className="interlinks-card__publish-date">
          published {formatDistanceToNow(new Date(date), { addSuffix: true })}
        </div>
      </div>
    </Link>
  )
}
