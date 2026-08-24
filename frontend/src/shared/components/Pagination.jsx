import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export default function Pagination({
    currentPage = 1,
    totalItems = 0,
    pageSize = 10,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50],
    itemName = 'items',
}) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

    if (totalItems === 0) return null

    const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems)
    const endItem = Math.min(currentPage * pageSize, totalItems)

    // Calculate visible page range (e.g. 1 ... 4 5 6 ... 10)
    const getPageNumbers = () => {
        const pages = []
        const maxVisible = 5

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            pages.push(1)
            let start = Math.max(2, currentPage - 1)
            let end = Math.min(totalPages - 1, currentPage + 1)

            if (currentPage <= 3) {
                start = 2
                end = 4
            } else if (currentPage >= totalPages - 2) {
                start = totalPages - 3
                end = totalPages - 1
            }

            if (start > 2) pages.push('...')
            for (let i = start; i <= end; i++) pages.push(i)
            if (end < totalPages - 1) pages.push('...')
            pages.push(totalPages)
        }
        return pages
    }

    const pages = getPageNumbers()

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
        }}>
            {/* Left: Info & Rows per page */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div>
                    Showing <strong style={{ color: 'var(--text-primary)' }}>{startItem}</strong> to{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{endItem}</strong> of{' '}
                    <strong style={{ color: 'var(--brand)' }}>{totalItems}</strong> {itemName}
                </div>

                {onPageSizeChange && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                onPageSizeChange(Number(e.target.value))
                                onPageChange(1)
                            }}
                            className="input"
                            style={{
                                padding: '2px 8px',
                                height: 28,
                                fontSize: 12,
                                width: 70,
                                borderRadius: 6,
                                cursor: 'pointer',
                            }}
                        >
                            {pageSizeOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Right: Navigation Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* First Page */}
                <button
                    type="button"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="btn-ghost"
                    style={{
                        padding: '5px 7px',
                        opacity: currentPage === 1 ? 0.35 : 1,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                    title="First page"
                >
                    <ChevronsLeft size={14} />
                </button>

                {/* Prev */}
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="btn-ghost"
                    style={{
                        padding: '5px 7px',
                        opacity: currentPage === 1 ? 0.35 : 1,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                    title="Previous page"
                >
                    <ChevronLeft size={14} />
                </button>

                {/* Page Number Buttons */}
                {pages.map((p, idx) => {
                    if (p === '...') {
                        return (
                            <span key={`dots-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>
                                ...
                            </span>
                        )
                    }

                    const isActive = p === currentPage
                    return (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onPageChange(p)}
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: isActive ? 700 : 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isActive ? 'var(--brand)' : 'transparent',
                                color: isActive ? '#ffffff' : 'var(--text-primary)',
                                border: isActive ? '1px solid var(--brand)' : '1px solid var(--border)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'var(--bg-tertiary)'
                                    e.currentTarget.style.borderColor = 'var(--brand)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.borderColor = 'var(--border)'
                                }
                            }}
                        >
                            {p}
                        </button>
                    )
                })}

                {/* Next */}
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-ghost"
                    style={{
                        padding: '5px 7px',
                        opacity: currentPage === totalPages ? 0.35 : 1,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                    title="Next page"
                >
                    <ChevronRight size={14} />
                </button>

                {/* Last Page */}
                <button
                    type="button"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="btn-ghost"
                    style={{
                        padding: '5px 7px',
                        opacity: currentPage === totalPages ? 0.35 : 1,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                    title="Last page"
                >
                    <ChevronsRight size={14} />
                </button>
            </div>
        </div>
    )
}
