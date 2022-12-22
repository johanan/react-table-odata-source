import React from 'react';
import { emptyArray, replaceDot } from "../../../src";
import { FilterFn, Column } from "@tanstack/react-table";

const contains = (id: string, value: any) => `contains(${replaceDot(id)}, '${value}')`;
const equals = (id: string, value: any) => `${replaceDot(id)} eq ${value}`;
const stringEquals = (id: string, value: any) => `${replaceDot(id)} eq '${value}'`;

function DebouncedInput({
    value: initialValue,
    onChange,
    debounce = 500,
    ...props
  }: {
    value: string | number
    onChange: (value: string | number) => void
    debounce?: number
  } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
    const [value, setValue] = React.useState(initialValue)
  
    React.useEffect(() => {
      setValue(initialValue)
    }, [initialValue])
  
    React.useEffect(() => {
      const timeout = setTimeout(() => {
        onChange(value)
      }, debounce)
  
      return () => clearTimeout(timeout)
    }, [value])
  
    return (
      <input {...props} value={value} onChange={e => setValue(e.target.value)} />
    )
  }

export const ODataContainsFilter = ({ column }: {
    column: Column<any, unknown>
  }) => {
    console.log(column)
    const { getFilterValue, setFilterValue, id} = column;
	return <DebouncedInput
		value={emptyArray(getFilterValue())[0] || ''}
		onChange={(value) => {
			setFilterValue(value ? [value, contains(id, value)] : undefined); // Set undefined to remove the filter entirely
		}}
		placeholder="Contains"
	/>
    };