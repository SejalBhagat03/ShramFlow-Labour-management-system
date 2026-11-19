import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from '@/features/shared/utils/utils';

/**
 * Shared Pagination Component
 * 
 * @param {Object} props
 * @param {number} props.currentPage - The current page number.
 * @param {number} props.totalPages - The total number of pages.
 * @param {function} props.onPageChange - Callback when a page is changed.
 * @param {boolean} props.isLoading - Whether data is loading.
 */
export const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    isLoading = false 
}) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 py-6 border-t border-slate-100 animate-fade-in">
            <div className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Page <span className="text-slate-900">{currentPage}</span> of <span className="text-slate-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-30"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoading}
                    >
                        <ChevronLeft className="h-3 w-3 mr-1" />
                        Prev
                    </Button>

                    <div className="flex items-center gap-1 mx-2">
                        {[...Array(totalPages)].map((_, i) => {
                            const pageNum = i + 1;
                            if (
                                totalPages > 5 && 
                                pageNum !== 1 && 
                                pageNum !== totalPages && 
                                (pageNum < currentPage - 1 || pageNum > currentPage + 1)
                            ) {
                                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                    return <span key={pageNum} className="text-slate-300 font-bold px-1">...</span>;
                                }
                                return null;
                            }

                            return (
                                <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "ghost"}
                                    size="sm"
                                    className={cn(
                                        "w-8 h-8 rounded-xl text-[10px] font-black transition-all active:scale-90",
                                        currentPage === pageNum 
                                            ? "bg-slate-900 text-white shadow-md hover:bg-slate-800" 
                                            : "text-slate-500 hover:bg-slate-100"
                                    )}
                                    onClick={() => onPageChange(pageNum)}
                                    disabled={isLoading}
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-30"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isLoading}
                    >
                        Next
                        <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
