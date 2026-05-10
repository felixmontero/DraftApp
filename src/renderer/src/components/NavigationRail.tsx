import React from 'react'

interface NavItem {
  key: string
  label: string
  active?: boolean
  icon: React.JSX.Element
}

function NavButton({ item }: { item: NavItem }): React.JSX.Element {
  return (
    <div className={`flex h-14 w-full flex-col items-center justify-center gap-1 border-l-2 transition-colors ${
      item.active
        ? 'border-l-lol-gold bg-lol-gold/10 text-lol-gold-light'
        : 'border-l-transparent text-lol-text-dim'
    }`}>
      {item.icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
    </div>
  )
}

export default function NavigationRail({ inDraft, compactMode }: { inDraft: boolean; compactMode: boolean }): React.JSX.Element {
  const items: NavItem[] = [
    {
      key: 'draft',
      label: 'Draft',
      active: inDraft && !compactMode,
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2.5h10v11H3z" />
          <path d="M5.5 5h5M5.5 8h5M5.5 11h3" />
        </svg>
      )
    },
    {
      key: 'bans',
      label: 'Bans',
      active: false,
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="5.5" />
          <path d="M4.5 11.5l7-7" />
        </svg>
      )
    },
    {
      key: 'picks',
      label: 'Picks',
      active: inDraft || compactMode,
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2.5l2 3.8 4.2.7-3 3  .7 4.2L8 12.2 4.1 14.2l.7-4.2-3-3 4.2-.7L8 2.5z" />
        </svg>
      )
    },
    {
      key: 'build',
      label: 'Build',
      active: false,
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h10M4 9h8M5 6h6M6 3h4" />
        </svg>
      )
    }
  ]

  return (
    <aside className="hidden w-[58px] shrink-0 overflow-hidden rounded-lg border border-lol-border bg-lol-dark/65 md:flex md:flex-col">
      <div className="flex h-14 items-center justify-center border-b border-lol-border text-lol-gold">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2l5.5 3.2v6.6L9 15l-5.5-3.2V5.2L9 2z" />
          <path d="M9 5.5v7" />
          <path d="M5.8 7.2L9 5.5l3.2 1.7" />
        </svg>
      </div>
      <div className="flex flex-1 flex-col py-1">
        {items.map(item => <NavButton key={item.key} item={item} />)}
      </div>
    </aside>
  )
}
