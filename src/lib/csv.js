/**
 * Generate an RFC 4180-compliant CSV string from an array of plain objects.
 * The key set is derived from the first non-empty row and applied to all rows.
 * @param {Array<Record<string, unknown>>} rows
 * @returns {string}
 */
export function toCSV(rows = []) {
	if (!rows.length) return '';

	const keys = Object.keys(rows[0]);
	const escapeCell = (/** @type {unknown} */ value) => {
		if (value === null || value === undefined) return '';
		const str = String(value);
		if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
		return str;
	};

	const header = keys.map(escapeCell).join(',');
	const body = rows
		.map((row) => keys.map((key) => escapeCell(row[key])).join(','))
		.join('\n');
	return `${header}\n${body}`;
}

/**
 * Trigger a browser download of the given CSV string.
 * @param {string} csv
 * @param {string} filename
 */
export function downloadCSV(csv, filename) {
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}