import type { SxProps, Theme } from "@mui/material/styles";

/**
 * Shared sx styles for all MUI DataGrid instances.
 * Implements the Quity Clinic Portal Design System § 09.
 *
 * Non-negotiable #5: No per-page DataGrid styling — every grid uses this object.
 * If a screen genuinely needs to differ, add a documented variant here.
 */
export const dataGridSx: SxProps<Theme> = {
  border: "none",
  borderRadius: 0,
  overflow: "hidden",
  fontFamily: "Outfit, sans-serif",
  fontSize: 14,

  /* ---- Header row ---- */
  "& .MuiDataGrid-columnHeader": {
    padding: "0 16px",
  },
  "& .MuiDataGrid-columnHeaderCheckbox": {
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 600,
    fontSize: 14,
    color: "var(--foreground)",
    textTransform: "none",
    letterSpacing: 0,
  },
  "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus": {
    outline: "none",
  },
  "& .MuiDataGrid-columnHeader:focus-visible, & .MuiDataGrid-cell:focus-visible": {
    outline: "2px solid var(--ring)",
    outlineOffset: -2,
  },

  /* ---- Body rows ---- */
  "& .MuiDataGrid-row": {
    cursor: "pointer",
    transition: "background-color .12s",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "var(--table-row-hover)",
  },
  "& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected.Mui-hovered, & .MuiDataGrid-row.Mui-selected:hover":
    {
      backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--table-row))",
    },

  /* ---- Cells ---- */
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid var(--table-separator)",
    fontSize: 14,
    color: "var(--foreground)",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    minWidth: 0,
  },

  /* ---- Footer ---- */
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid var(--table-separator)",
    backgroundColor: "var(--card)",
  },
  "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiDataGrid-selectedRowCount":
    {
      fontFamily: "Outfit, sans-serif",
      fontSize: 13,
      color: "var(--muted-foreground)",
    },

  /* ---- Chrome ---- */
  "& .MuiCheckbox-root": {
    color: "var(--border)",
    "&.Mui-checked": { color: "var(--primary)" },
  },
  "& .MuiDataGrid-columnSeparator": {
    color: "var(--border)",
    opacity: 0,
    transition: "opacity .15s",
  },
  "& .MuiDataGrid-columnHeader:hover .MuiDataGrid-columnSeparator": {
    opacity: 1,
  },
};

/**
 * DataGrid variant for task/worklist tables whose row actions must remain
 * visible while horizontally scrolling wide clinical records.
 */
export const dataGridPinnedActionsSx: SxProps<Theme> = [
  dataGridSx,
  {
    "& .MuiDataGrid-columnHeader.data-grid-pinned-actions, & .MuiDataGrid-cell.data-grid-pinned-actions":
      {
        position: "sticky",
        right: 0,
        overflow: "visible",
        backgroundColor: "var(--card)",
        boxShadow: "-1px 0 0 var(--table-separator)",
      },
    "& .MuiDataGrid-columnHeader.data-grid-pinned-actions::after, & .MuiDataGrid-cell.data-grid-pinned-actions::after":
      {
        content: '""',
        position: "absolute",
        insetBlock: 0,
        right: "calc(-1 * var(--DataGrid-horizontalFiller))",
        width: "var(--DataGrid-horizontalFiller)",
        pointerEvents: "none",
        background: "inherit",
      },
    "& .MuiDataGrid-columnHeader.data-grid-pinned-actions": {
      zIndex: 4,
    },
    "& .MuiDataGrid-cell.data-grid-pinned-actions": {
      zIndex: 3,
    },
    "& .MuiDataGrid-row:hover .MuiDataGrid-cell.data-grid-pinned-actions": {
      backgroundColor: "var(--table-row-hover)",
    },
    "& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell.data-grid-pinned-actions, & .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell.data-grid-pinned-actions":
      {
        backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--table-row))",
      },
  },
];
