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