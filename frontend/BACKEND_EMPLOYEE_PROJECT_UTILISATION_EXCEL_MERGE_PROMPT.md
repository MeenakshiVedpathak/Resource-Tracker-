# Backend Prompt — Employee Project Utilisation: Excel Export Cell Merging

## Context

The `GET /reports/employee-project-utilisation/export` endpoint generates an Excel file.

The table in the UI groups rows by employee — each employee can have multiple project rows, and the following columns are **identical on every row** for the same employee:

- **Employee Name** (+ Employee Code shown below it in the UI)
- **Original Util %** (`originalUtilizationPercentage`)
- **Total Util % after Sync** (`totalUtilizationPercentage`)

In the UI these columns are visually merged (one cell spans all project rows for that employee). The Excel export currently repeats the value on every row.

---

## Required Change

In the exported Excel sheet, **merge the cells** for the following columns across consecutive rows that belong to the same employee:

| Column | Field |
|---|---|
| Employee Name | `employeeName` (include `employeeCode` in the same cell, on a second line) |
| Original Util % | `originalUtilizationPercentage` |
| Total Util % after Sync | `totalUtilizationPercentage` |

### Merge logic

1. Sort all rows by `employeeId` (the export already arrives sorted by employee — maintain that order).
2. Group consecutive rows with the same `employeeId` into a block.
3. For each block of N rows (row indices `startRow` to `startRow + N - 1`):
   - Call `worksheet.mergeCells(startRow, colIndex, startRow + N - 1, colIndex)` for each of the three columns above.
   - Write the value only into the top-left cell of the merged range; the remaining cells in the range must be left empty (ExcelJS / xlsx merge semantics).
4. For blocks of N = 1 (employee with a single project), no merge is needed — the cell is written normally.

### Cell content for Employee Name column

```
<employeeName>
<employeeCode>          ← smaller, muted — use a lighter font color (#6B7280) and font size 9
```

Use `cell.value = { richText: [...] }` (ExcelJS) or write the name on row 1 and code on row 2 within the same cell using `\n` with `cell.alignment = { wrapText: true }`.

### Alignment for merged cells

- Employee Name column: `vertical: 'middle'`, `horizontal: 'left'`, `wrapText: true`
- Util % columns: `vertical: 'middle'`, `horizontal: 'right'`

### Row height

When a block has N > 1 rows, do **not** change individual row heights — the merge itself handles the span. Only if the Employee Name cell wraps (due to `\n`) should the row height be adjusted for the first row of a single-row employee block.

---

## Columns that must NOT be merged

- Project Name
- Client Name
- Logged Hrs
- Adjusted Hrs

These repeat per-project and must stay unmerged.

---

## Export endpoint reference

`GET /reports/employee-project-utilisation/export`

Params mirror the main list endpoint (same filters, no `page`/`limit`).

The response is a binary Excel blob (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), downloaded client-side as `Employee_Project_Utilisation_<period>.xlsx`.

---

## No frontend changes required

The frontend calls `reportsApi.exportEmployeeProjectUtilisation(params)` and downloads the blob as-is. All merging logic lives entirely in the backend Excel generation.
