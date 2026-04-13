import { useState } from 'react';
import { Button } from './ui/button';

interface PaginateProps<T> {
  data: T[];
  rowsPerPage?: number;
  children: (paginatedData: T[]) => React.ReactNode;
}

/**
 * Reusable client-side pagination component using render props.
 * Handles pagination state and displays First/Previous/Page/Next/Last controls.
 */
export function Paginate<T>({ data = [], rowsPerPage = 50, children }: PaginateProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  return (
    <>
      {children(paginatedData)}

      {data.length > rowsPerPage && (
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 px-2 py-2">
          <span className="text-sm text-muted-foreground">
            Showing {startIndex + 1}–{Math.min(endIndex, data.length)} of {data.length} entries
          </span>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleFirstPage} disabled={currentPage === 1}>
              First
            </Button>
            <Button size="sm" variant="outline" onClick={handlePreviousPage} disabled={currentPage === 1}>
              Previous
            </Button>
            <span className="text-sm px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button size="sm" variant="outline" onClick={handleNextPage} disabled={currentPage === totalPages}>
              Next
            </Button>
            <Button size="sm" variant="outline" onClick={handleLastPage} disabled={currentPage === totalPages}>
              Last
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
