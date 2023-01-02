import React from "react";
import { useReactTableContext } from "react-table-provider";
import { ReactTableDevtools } from "@tanstack/react-table-devtools";

export const Debug = () => {
    const table = useReactTableContext();
  
    return <ReactTableDevtools table={table} />;
  };