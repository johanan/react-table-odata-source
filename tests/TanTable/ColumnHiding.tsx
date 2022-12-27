import React from "react";
import { useReactTableContext } from "react-table-provider";

export const ColumnHiding = () => {
  const {
    getAllLeafColumns,
    getToggleAllColumnsVisibilityHandler,
    getIsAllColumnsVisible
  } = useReactTableContext();
  return (
    <div>
      <div>
        <input
          {...{
            type: "checkbox",
            checked: getIsAllColumnsVisible(),
            onChange: getToggleAllColumnsVisibilityHandler()
          }}
        />{" "}
        Toggle All
      </div>
      {getAllLeafColumns().map((column) => (
        <div key={column.id}>
          <label>
            <input
              {...{
                type: "checkbox",
                checked: column.getIsVisible(),
                onChange: column.getToggleVisibilityHandler()
              }}
            />{" "}
            {column.id}
          </label>
        </div>
      ))}
      <br />
    </div>
  );
};
