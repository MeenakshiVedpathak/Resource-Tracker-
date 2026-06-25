import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, FormControl, InputLabel, Select, MenuItem,
  Stack, Chip, Button, Grid,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MOCK_DATA = {
  2025: [
    { month: 1, total_salary: 820000, total_ops: 110000 },
    { month: 2, total_salary: 835000, total_ops: 112000 },
    { month: 3, total_salary: 850000, total_ops: 115000 },
    { month: 4, total_salary: 820000, total_ops: 108000 },
    { month: 5, total_salary: 865000, total_ops: 118000 },
    { month: 6, total_salary: 870000, total_ops: 120000 },
    { month: 7, total_salary: 880000, total_ops: 122000 },
    { month: 8, total_salary: 875000, total_ops: 121000 },
    { month: 9, total_salary: 895000, total_ops: 125000 },
    { month: 10, total_salary: 900000, total_ops: 128000 },
    { month: 11, total_salary: 910000, total_ops: 130000 },
    { month: 12, total_salary: 930000, total_ops: 135000 },
  ],
  2024: [
    { month: 1, total_salary: 780000, total_ops: 105000 },
    { month: 2, total_salary: 790000, total_ops: 107000 },
    { month: 3, total_salary: 795000, total_ops: 108000 },
    { month: 4, total_salary: 785000, total_ops: 105000 },
    { month: 5, total_salary: 810000, total_ops: 110000 },
    { month: 6, total_salary: 815000, total_ops: 112000 },
    { month: 7, total_salary: 820000, total_ops: 113000 },
    { month: 8, total_salary: 825000, total_ops: 114000 },
    { month: 9, total_salary: 840000, total_ops: 117000 },
    { month: 10, total_salary: 850000, total_ops: 119000 },
    { month: 11, total_salary: 860000, total_ops: 121000 },
    { month: 12, total_salary: 870000, total_ops: 123000 },
  ],
};

function formatCurrencyShort(value) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper elevation={3} sx={{ p: 1.5, minWidth: 180 }}>
        <Typography variant="caption" fontWeight={600} display="block" mb={1}>{label}</Typography>
        {payload.map((entry) => (
          <Box key={entry.name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="caption" sx={{ color: entry.color }}>{entry.name}:</Typography>
            <Typography variant="caption" fontWeight={600}>{formatCurrency(entry.value)}</Typography>
          </Box>
        ))}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 1, pt: 0.5, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" fontWeight={600}>Total:</Typography>
          <Typography variant="caption" fontWeight={700}>
            {formatCurrency(payload.reduce((s, e) => s + e.value, 0))}
          </Typography>
        </Box>
      </Paper>
    );
  }
  return null;
};

export default function MonthlyCostSummary() {
  const [fromYear, setFromYear] = useState(CURRENT_YEAR);
  const [toYear, setToYear] = useState(CURRENT_YEAR);

  const chartData = useMemo(() => {
    const result = [];
    for (let y = fromYear; y <= toYear; y++) {
      const yearData = MOCK_DATA[y] || [];
      yearData.forEach((row) => {
        const total = row.total_salary + row.total_ops;
        result.push({
          label: `${MONTH_LABELS[row.month - 1]} ${y !== CURRENT_YEAR || fromYear !== toYear ? String(y).slice(2) : ''}`,
          'Salary Cost': row.total_salary,
          'Ops Cost': row.total_ops,
          'Total Cost': total,
          month: row.month,
          year: y,
        });
      });
    }
    return result;
  }, [fromYear, toYear]);

  const tableData = useMemo(() => {
    const result = [];
    for (let y = Math.max(fromYear, Math.min(toYear, CURRENT_YEAR)); y >= Math.min(fromYear, toYear); y--) {
      const yearData = MOCK_DATA[y] || [];
      yearData.forEach((row) => {
        result.push({ ...row, year: y, total_cost: row.total_salary + row.total_ops });
      });
    }
    return result;
  }, [fromYear, toYear]);

  const totalSalary = tableData.reduce((a, r) => a + r.total_salary, 0);
  const totalOps = tableData.reduce((a, r) => a + r.total_ops, 0);
  const grandTotal = totalSalary + totalOps;

  const handleExport = () => {
    const headers = 'Month,Year,Total Salary,Total Ops,Total Cost\n';
    const rows = tableData.map((r) =>
      `${MONTH_LABELS[r.month - 1]},${r.year},${r.total_salary},${r.total_ops},${r.total_cost}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly_cost_summary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>Monthly Cost Summary</Typography>
          <Typography variant="body2" color="text.secondary">Salary and operational costs by month with trend analysis</Typography>
        </Box>
        <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={handleExport} size="small">
          Export CSV
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Salary', value: totalSalary, color: '#1976d2' },
          { label: 'Total Ops Cost', value: totalOps, color: '#9c27b0' },
          { label: 'Grand Total', value: grandTotal, color: '#2e7d32' },
        ].map((card) => (
          <Grid item xs={12} sm={4} key={card.label}>
            <Paper elevation={0} variant="outlined" sx={{ p: 2, borderLeft: `4px solid ${card.color}` }}>
              <Typography variant="caption" color="text.secondary" display="block">{card.label}</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(card.value)}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>Year Range:</Typography>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>From</InputLabel>
          <Select value={fromYear} label="From" onChange={(e) => setFromYear(Math.min(e.target.value, toYear))}>
            {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">to</Typography>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>To</InputLabel>
          <Select value={toYear} label="To" onChange={(e) => setToYear(Math.max(e.target.value, fromYear))}>
            {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <Chip label={`${chartData.length} months`} size="small" variant="outlined" />
      </Paper>

      {/* Chart */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>Monthly Cost Trend</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: Math.max(600, chartData.length * 60) }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} width={70} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Salary Cost" fill="#1976d2" radius={[3, 3, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Ops Cost" fill="#9c27b0" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Paper>

      {/* Table */}
      <Paper elevation={0} variant="outlined" sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['Month', 'Year', 'Total Salary', 'Total Ops Cost', 'Total Cost'].map((h) => (
                  <TableCell key={h} align={h === 'Month' ? 'left' : 'right'} sx={{ fontWeight: 600, bgcolor: '#F5F6FA', whiteSpace: 'nowrap' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row, i) => (
                <TableRow key={`${row.year}-${row.month}`} hover>
                  <TableCell>{MONTH_LABELS[row.month - 1]}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.year}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.total_salary)}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.total_ops)}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'primary.main' }}>
                    {formatCurrency(row.total_cost)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: '#F5F6FA' }}>
                <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Grand Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalSalary)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalOps)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'primary.main' }}>{formatCurrency(grandTotal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
