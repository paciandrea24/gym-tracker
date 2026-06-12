export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('it-IT', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
}

// Calcola l'inizio e la fine della settimana per raggruppare lo storico
export function getWeekLabel(dateString) {
    const d = new Date(dateString);
    const day = d.getDay() || 7; // Domenica diventa 7

    const monday = new Date(d);
    monday.setDate(d.getDate() - (day - 1));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatObj = { day: '2-digit', month: 'short' };
    return `Settimana ${monday.toLocaleDateString('it-IT', formatObj)} - ${sunday.toLocaleDateString('it-IT', formatObj)}`;
}

// Funzione generica per esportare dati in CSV
export function exportToCSV(filename, rows) {
    if (!rows || !rows.length) return;

    const separator = ',';
    const keys = Object.keys(rows[0]);

    const csvContent =
        keys.join(separator) +
        '\n' +
        rows.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
                return cell;
            }).join(separator);
        }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}