import React from "react";
import { useReactTableContext } from "react-table-provider";

export const Pagination = () => {
  const {
    getCanNextPage,
    getCanPreviousPage,
    getPageCount,
    getState,
    previousPage,
    setPageIndex,
    setPageSize,
    nextPage
  } = useReactTableContext();

  return (
    <div className="pagination">
      <button onClick={() => setPageIndex(0)} disabled={!getCanPreviousPage}>
        {"<<"}
      </button>{" "}
      <button onClick={() => previousPage()} disabled={!getCanPreviousPage()}>
        {"<"}
      </button>{" "}
      <button onClick={() => nextPage()} disabled={!getCanNextPage}>
        {">"}
      </button>{" "}
      <button
        onClick={() => setPageIndex(getPageCount() - 1)}
        disabled={!getCanNextPage}
      >
        {">>"}
      </button>{" "}
      <span>
        Page{" "}
        <strong>
          {getState().pagination.pageIndex + 1} of {getPageCount()}
        </strong>{" "}
      </span>
      <span>
        | Go to page:{" "}
        <input
          type="number"
          defaultValue={getState().pagination.pageIndex + 1}
          onChange={(e) => {
            const page = e.target.value ? Number(e.target.value) - 1 : 0;
            setPageIndex(page);
          }}
          style={{ width: "100px" }}
        />
      </span>{" "}
      <select
        value={getState().pagination.pageSize}
        onChange={(e) => {
          setPageSize(Number(e.target.value));
        }}
      >
        {[10, 20, 30, 40, 50].map((pageSize) => (
          <option key={pageSize} value={pageSize}>
            Show {pageSize}
          </option>
        ))}
      </select>
    </div>
  );
};
