import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Submission, WorkflowSchema } from '../../types';
import {
  Search,
  Download,
  Filter,
  FileSpreadsheet,
  FileJson,
  Trash2,
  Eye,
  CheckCircle2,
  X,
  FileDown,
  ArrowUpDown,
  Calendar,
  FileText,
  Table,
} from 'lucide-react';

interface SubmissionsTablePageProps {
  onViewDetail: (submissionId: string) => void;
}

export const SubmissionsTablePage: React.FC<SubmissionsTablePageProps> = ({ onViewDetail }) => {
  const { organization, role } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowSchema[]>([]);
  const [search, setSearch] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Date Range Filter States (Table + Export)
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [exportScope, setExportScope] = useState<'filtered' | 'all' | 'custom_date'>('filtered');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  const fetchRecords = async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const [subsRes, wfRes] = await Promise.all([
        api.getSubmissions({
          orgId: organization.id,
          workflowId: selectedWorkflowId,
          status: selectedStatus,
          search,
        }),
        api.getWorkflows(organization.id),
      ]);
      setSubmissions(subsRes.submissions || []);
      setWorkflows(wfRes.workflows || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [organization, selectedWorkflowId, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    if (!organization) return;
    if (!window.confirm('Delete this submission record?')) return;
    try {
      await api.deleteSubmission(id, organization.id);
      setSubmissions(submissions.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateCsvContent = (records: Submission[], withMetadata = true): string => {
    if (records.length === 0) return '';
    const fieldKeys = new Set<string>();
    for (const sub of records) {
      for (const k of Object.keys(sub.structuredData || {})) {
        fieldKeys.add(k);
      }
    }
    const fieldKeysList = Array.from(fieldKeys);
    const headers = withMetadata
      ? ['Submission ID', 'Workflow Name', 'Respondent Name', 'Status', 'Submitted At', 'Submitted By', ...fieldKeysList]
      : ['Respondent Name', 'Workflow Name', ...fieldKeysList];

    const rows = records.map((sub) => {
      const data = sub.structuredData || {};
      const baseValues = withMetadata
        ? [
            `"${sub.id}"`,
            `"${(sub.workflowName || '').replace(/"/g, '""')}"`,
            `"${(sub.respondentName || '').replace(/"/g, '""')}"`,
            `"${sub.status}"`,
            `"${sub.submittedAt}"`,
            `"${(sub.submittedBy || '').replace(/"/g, '""')}"`,
          ]
        : [
            `"${(sub.respondentName || '').replace(/"/g, '""')}"`,
            `"${(sub.workflowName || '').replace(/"/g, '""')}"`,
          ];

      const fieldValues = fieldKeysList.map((k) => {
        const val = data[k];
        if (val === undefined || val === null) return '""';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      });

      return [...baseValues, ...fieldValues].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  /**
   * Generates native Microsoft Excel SpreadsheetML XML format (.xls / .xlsx-compatible)
   * Opens seamlessly in Microsoft Excel, Google Sheets, LibreOffice, and Numbers
   */
  const generateExcelXmlContent = (records: Submission[], withMetadata = true): string => {
    if (records.length === 0) return '';

    const escapeXml = (unsafe: any): string => {
      if (unsafe === undefined || unsafe === null) return '';
      const str = typeof unsafe === 'object' ? JSON.stringify(unsafe) : String(unsafe);
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const fieldKeys = new Set<string>();
    for (const sub of records) {
      for (const k of Object.keys(sub.structuredData || {})) {
        fieldKeys.add(k);
      }
    }
    const fieldKeysList = Array.from(fieldKeys);
    const headers = withMetadata
      ? ['Submission ID', 'Workflow Name', 'Respondent Name', 'Status', 'Submitted At', 'Submitted By', ...fieldKeysList]
      : ['Respondent Name', 'Workflow Name', ...fieldKeysList];

    let rowsXml = '';

    // Header row
    rowsXml += '      <Row ss:StyleID="headerStyle">\n';
    for (const h of headers) {
      rowsXml += `        <Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>\n`;
    }
    rowsXml += '      </Row>\n';

    // Data rows
    for (const sub of records) {
      const data = sub.structuredData || {};
      const baseValues = withMetadata
        ? [
            sub.id,
            sub.workflowName || '',
            sub.respondentName || '',
            sub.status,
            sub.submittedAt,
            sub.submittedBy || '',
          ]
        : [
            sub.respondentName || '',
            sub.workflowName || '',
          ];

      rowsXml += '      <Row ss:StyleID="dataStyle">\n';
      for (const val of baseValues) {
        rowsXml += `        <Cell><Data ss:Type="String">${escapeXml(val)}</Data></Cell>\n`;
      }

      for (const k of fieldKeysList) {
        const val = data[k];
        const isNumeric = typeof val === 'number';
        const type = isNumeric ? 'Number' : 'String';
        rowsXml += `        <Cell><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>\n`;
      }
      rowsXml += '      </Row>\n';
    }

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Borders/>
      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>
    <Style ss:ID="headerStyle">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
      <Interior ss:Color="#18181B" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="dataStyle">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#18181B"/>
      <Alignment ss:Vertical="Center"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Submissions">
    <Table ss:DefaultRowHeight="20">
${rowsXml}    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <Selected/>
      <ProtectObjects>False</ProtectObjects>
      <ProtectScenarios>False</ProtectScenarios>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;
  };

  // Filter submissions by date range for the active view
  const displaySubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (!filterStartDate && !filterEndDate) return true;
      const subTime = new Date(sub.submittedAt).getTime();
      if (filterStartDate) {
        const start = new Date(filterStartDate + 'T00:00:00').getTime();
        if (subTime < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate + 'T23:59:59').getTime();
        if (subTime > end) return false;
      }
      return true;
    });
  }, [submissions, filterStartDate, filterEndDate]);

  const handleExecuteExport = async () => {
    if (!organization) return;
    let targetRecords: Submission[] = displaySubmissions;

    if (exportScope === 'all') {
      try {
        const allRes = await api.getSubmissions({ orgId: organization.id });
        targetRecords = allRes.submissions || [];
      } catch (err) {
        console.error(err);
      }
    } else if (exportScope === 'custom_date') {
      try {
        const allRes = await api.getSubmissions({ orgId: organization.id });
        const all = allRes.submissions || [];
        targetRecords = all.filter((sub: Submission) => {
          const subTime = new Date(sub.submittedAt).getTime();
          if (exportStartDate) {
            const start = new Date(exportStartDate + 'T00:00:00').getTime();
            if (subTime < start) return false;
          }
          if (exportEndDate) {
            const end = new Date(exportEndDate + 'T23:59:59').getTime();
            if (subTime > end) return false;
          }
          return true;
        });
      } catch (err) {
        console.error(err);
      }
    }

    if (targetRecords.length === 0) {
      alert('No records found for the selected export criteria.');
      return;
    }

    const dateStamp = new Date().toISOString().split('T')[0];
    const baseSlug = organization.slug || 'export';

    if (exportFormat === 'csv') {
      const csvString = generateCsvContent(targetRecords, includeMetadata);
      const filename = `collectai-${baseSlug}-submissions-${dateStamp}.csv`;
      triggerDownload(csvString, filename, 'text/csv;charset=utf-8;');
      setExportNotification(`Exported ${targetRecords.length} records as CSV`);
    } else if (exportFormat === 'excel') {
      const excelXmlString = generateExcelXmlContent(targetRecords, includeMetadata);
      const filename = `collectai-${baseSlug}-submissions-${dateStamp}.xls`;
      triggerDownload(excelXmlString, filename, 'application/vnd.ms-excel;charset=utf-8;');
      setExportNotification(`Exported ${targetRecords.length} records as Excel`);
    } else {
      const jsonData = targetRecords.map((sub) => {
        if (!includeMetadata) {
          return {
            respondentName: sub.respondentName,
            workflowName: sub.workflowName,
            ...sub.structuredData,
          };
        }
        return sub;
      });

      const jsonString = JSON.stringify(jsonData, null, 2);
      const filename = `collectai-${baseSlug}-submissions-${dateStamp}.json`;
      triggerDownload(jsonString, filename, 'application/json;charset=utf-8;');
      setExportNotification(`Exported ${targetRecords.length} records as JSON`);
    }

    setIsExportModalOpen(false);
    setTimeout(() => setExportNotification(null), 3000);
  };

  const handleExportSingleRecord = (sub: Submission, format: 'csv' | 'json' | 'excel') => {
    if (format === 'json') {
      const filename = `collectai-record-${sub.id}.json`;
      const jsonStr = JSON.stringify(sub, null, 2);
      triggerDownload(jsonStr, filename, 'application/json;charset=utf-8;');
    } else if (format === 'excel') {
      const filename = `collectai-record-${sub.id}.xls`;
      const excelStr = generateExcelXmlContent([sub], true);
      triggerDownload(excelStr, filename, 'application/vnd.ms-excel;charset=utf-8;');
    } else {
      const filename = `collectai-record-${sub.id}.csv`;
      const csvStr = generateCsvContent([sub], true);
      triggerDownload(csvStr, filename, 'text/csv;charset=utf-8;');
    }
    setExportNotification(`Exported record ${sub.id.substring(0, 10)}...`);
    setTimeout(() => setExportNotification(null), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Submissions
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Collected records across conversational chat, forms, and operator counters
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Export Notification Toast */}
      {exportNotification && (
        <div className="bg-zinc-900 text-white px-3.5 py-2 rounded-md text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
            <span>{exportNotification}</span>
          </div>
          <button onClick={() => setExportNotification(null)} className="text-zinc-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search respondent or data..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-zinc-200 focus:border-zinc-400 focus:outline-hidden bg-zinc-50/50"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={selectedWorkflowId}
              onChange={(e) => setSelectedWorkflowId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white focus:outline-hidden text-zinc-700 flex-1 sm:flex-none"
            >
              <option value="">All Workflows</option>
              {workflows.map((w) => (
                <option key={w.workflowId} value={w.workflowId}>
                  {w.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white focus:outline-hidden text-zinc-700 flex-1 sm:flex-none"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="needs_review">Needs Review</option>
              <option value="archived">Archived</option>
            </select>

            {/* Quick Export Shortcuts */}
            <div className="flex items-center space-x-1 pl-1 border-l border-zinc-200">
              <button
                onClick={() => {
                  setExportFormat('csv');
                  setExportScope('filtered');
                  handleExecuteExport();
                }}
                title="Quick Export Filtered CSV"
                className="inline-flex items-center space-x-1 px-2 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV</span>
              </button>

              <button
                onClick={() => {
                  setExportFormat('excel');
                  setExportScope('filtered');
                  handleExecuteExport();
                }}
                title="Quick Export Filtered Excel (.xls)"
                className="inline-flex items-center space-x-1 px-2 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
              >
                <Table className="w-3.5 h-3.5 text-emerald-700" />
                <span>Excel</span>
              </button>

              <button
                onClick={() => {
                  setExportFormat('json');
                  setExportScope('filtered');
                  handleExecuteExport();
                }}
                title="Quick Export Filtered JSON"
                className="inline-flex items-center space-x-1 px-2 py-1.5 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-indigo-600" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Filtering Row */}
        <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Date Range:</span>
            </span>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded-md bg-zinc-50/50 text-zinc-700 focus:outline-hidden focus:border-zinc-400"
                title="Start Date"
              />
              <span className="text-zinc-400 text-xs">to</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 rounded-md bg-zinc-50/50 text-zinc-700 focus:outline-hidden focus:border-zinc-400"
                title="End Date"
              />
            </div>

            {(filterStartDate || filterEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 underline px-1"
              >
                Clear Dates
              </button>
            )}
          </div>

          <div className="text-[11px] text-zinc-500 font-mono">
            Showing {displaySubmissions.length} of {submissions.length} records
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-zinc-400">Loading records...</div>
        ) : displaySubmissions.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-400">
            No matching submission records found for the selected criteria or date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/70 border-b border-zinc-100 text-zinc-500 text-[11px] font-medium">
                <tr>
                  <th className="py-2.5 px-4 font-normal">Respondent</th>
                  <th className="py-2.5 px-4 font-normal">Workflow</th>
                  <th className="py-2.5 px-4 font-normal">Summary</th>
                  <th className="py-2.5 px-4 font-normal">Status</th>
                  <th className="py-2.5 px-4 font-normal">Submitted</th>
                  <th className="py-2.5 px-4 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {displaySubmissions.map((sub) => {
                  const data = sub.structuredData || {};
                  const summary =
                    data.serviceType ||
                    (data.orderType ? `${data.orderType} (₹${data.grandTotal || 0})` : '') ||
                    Object.values(data).slice(0, 2).join(', ');

                  return (
                    <tr key={sub.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-zinc-900">{sub.respondentName || 'Anonymous'}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {sub.id.substring(0, 10)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-700">{sub.workflowName}</td>
                      <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">
                        {summary || '—'}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 capitalize">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle" />
                        {sub.status.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-[11px] font-mono tabular-nums">
                        {new Date(sub.submittedAt).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => onViewDetail(sub.id)}
                          className="text-zinc-700 hover:text-zinc-900 font-medium text-xs transition-colors"
                        >
                          View
                        </button>

                        <button
                          onClick={() => handleExportSingleRecord(sub, 'csv')}
                          title="Export CSV"
                          className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleExportSingleRecord(sub, 'excel')}
                          title="Export Excel (.xls)"
                          className="p-1 text-zinc-400 hover:text-emerald-700 rounded transition-colors"
                        >
                          <Table className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleExportSingleRecord(sub, 'json')}
                          title="Export JSON"
                          className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                        >
                          <FileJson className="w-3.5 h-3.5" />
                        </button>

                        {(role === 'org_admin' || role === 'super_admin') && (
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-zinc-700" />
                <h3 className="text-xs font-semibold text-zinc-900">Export Submissions Data</h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Format Options: CSV, Excel, JSON */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-600 block">Select File Format</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`p-2.5 rounded-lg border text-center text-xs transition-colors flex flex-col items-center justify-center gap-1 ${
                    exportFormat === 'csv'
                      ? 'border-zinc-900 bg-zinc-50 font-semibold text-zinc-900 ring-1 ring-zinc-900'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>CSV</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Spreadsheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('excel')}
                  className={`p-2.5 rounded-lg border text-center text-xs transition-colors flex flex-col items-center justify-center gap-1 ${
                    exportFormat === 'excel'
                      ? 'border-zinc-900 bg-zinc-50 font-semibold text-zinc-900 ring-1 ring-zinc-900'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  <Table className="w-4 h-4 text-emerald-700" />
                  <span>Excel</span>
                  <span className="text-[10px] text-zinc-400 font-normal">.xls workbook</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  className={`p-2.5 rounded-lg border text-center text-xs transition-colors flex flex-col items-center justify-center gap-1 ${
                    exportFormat === 'json'
                      ? 'border-zinc-900 bg-zinc-50 font-semibold text-zinc-900 ring-1 ring-zinc-900'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  <FileJson className="w-4 h-4 text-indigo-600" />
                  <span>JSON</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Structured API</span>
                </button>
              </div>
            </div>

            {/* Scope & Date Range Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-600 block">Export Scope</label>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center space-x-2 p-2 rounded-md border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={exportScope === 'filtered'}
                    onChange={() => setExportScope('filtered')}
                    className="accent-zinc-900"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span>Active table filters ({displaySubmissions.length} records)</span>
                    {(filterStartDate || filterEndDate) && (
                      <span className="text-[10px] font-mono text-zinc-400">Date filtered</span>
                    )}
                  </div>
                </label>

                <label className="flex items-center space-x-2 p-2 rounded-md border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={exportScope === 'all'}
                    onChange={() => setExportScope('all')}
                    className="accent-zinc-900"
                  />
                  <span>All organization records ({submissions.length})</span>
                </label>

                <label className="flex items-start space-x-2 p-2 rounded-md border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={exportScope === 'custom_date'}
                    onChange={() => {
                      setExportScope('custom_date');
                      if (!exportStartDate && filterStartDate) setExportStartDate(filterStartDate);
                      if (!exportEndDate && filterEndDate) setExportEndDate(filterEndDate);
                    }}
                    className="accent-zinc-900 mt-0.5"
                  />
                  <div className="flex-1 space-y-1.5">
                    <span>Custom Date Range Export</span>
                    {exportScope === 'custom_date' && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          className="px-2 py-1 text-xs border border-zinc-300 rounded bg-white text-zinc-800 focus:outline-hidden"
                          title="From Date"
                        />
                        <span className="text-zinc-400">to</span>
                        <input
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          className="px-2 py-1 text-xs border border-zinc-300 rounded bg-white text-zinc-800 focus:outline-hidden"
                          title="To Date"
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Metadata checkbox */}
            <div>
              <label className="flex items-center space-x-2 text-xs text-zinc-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded border-zinc-300 accent-zinc-900"
                />
                <span>Include audit metadata (Record ID, status, timestamps, operator)</span>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-mono">
                {exportFormat === 'excel' ? '.xls XML workbook' : exportFormat === 'csv' ? '.csv plain text' : '.json format'}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteExport}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-md transition-colors shadow-2xs"
                >
                  Download {exportFormat.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
